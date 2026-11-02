import { collection as firestoreCollection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, writeBatch, type Firestore } from "firebase/firestore";
import { createInitialState, seedRecipes, type AppLocale, type SoftState } from "./soft-challenge";
import { parseSoftState } from "./soft-state-io";

export const CLOUD_COLLECTIONS = ["meta", "logs", "recipes", "batches", "assignments", "photos", "groceryStatus", "manualGroceries"] as const;
export type CloudCollection = typeof CLOUD_COLLECTIONS[number];
export type CloudRecordKey = `${CloudCollection}:${string}`;

export type CloudEnvelope = {
  schemaVersion: 1;
  ownerUid: string;
  recordId: string;
  clientId: string;
  clientUpdatedAt: number;
  updatedAt?: unknown;
  deleted: boolean;
  payload: Record<string, unknown>;
};

export type CloudRecord = {
  collection: CloudCollection;
  id: string;
  envelope: CloudEnvelope;
};

export type CloudRecordMap = Map<CloudRecordKey, CloudRecord>;

export type CloudSnapshot = {
  records: CloudRecordMap;
  state: SoftState | null;
  fromCache: boolean;
  hasPendingWrites: boolean;
};

type Preferences = { locale: AppLocale };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneRecordMap(records: CloudRecordMap): CloudRecordMap {
  return new Map([...records.entries()].map(([key, record]) => [key, { ...record, envelope: { ...record.envelope, payload: { ...record.envelope.payload } } }]));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export function recordKey(collection: CloudCollection, id: string): CloudRecordKey {
  return `${collection}:${id}`;
}

function encodeId(id: string): string {
  return encodeURIComponent(id);
}

function decodeId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

function payload(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function liveEntries<T extends { id: string }>(values: T[]): T[] {
  return values.filter((value) => Boolean(value.id));
}

function envelopeFor(uid: string, clientId: string, id: string, value: Record<string, unknown>, previous: CloudRecord | undefined, now: number, deleted = false): CloudEnvelope {
  if (previous && !deleted && !previous.envelope.deleted && stableSerialize(previous.envelope.payload) === stableSerialize(value)) return previous.envelope;
  return { schemaVersion: 1, ownerUid: uid, recordId: id, clientId, clientUpdatedAt: now, deleted, payload: value };
}

export function createCloudRecords(state: SoftState, uid: string, clientId: string, previousRecords: CloudRecordMap = new Map(), now = Date.now(), preferences?: Preferences): CloudRecordMap {
  const next = new Map<CloudRecordKey, CloudRecord>();
  const add = (collection: CloudCollection, id: string, value: unknown) => {
    const encodedId = encodeId(id);
    const record = { collection, id: encodedId, envelope: envelopeFor(uid, clientId, encodedId, payload(value), previousRecords.get(recordKey(collection, encodedId)), now) };
    next.set(recordKey(collection, encodedId), record);
  };

  add("meta", "settings", state.settings);
  if (preferences) add("meta", "preferences", preferences);
  Object.entries(state.logs).forEach(([id, value]) => add("logs", id, value));
  liveEntries(state.recipes).forEach((value) => add("recipes", value.id, value));
  liveEntries(state.batches).forEach((value) => add("batches", value.id, value));
  liveEntries(state.assignments).forEach((value) => add("assignments", value.id, value));
  liveEntries(state.photos).forEach((value) => {
    const { dataUrl: _dataUrl, ...metadata } = value;
    add("photos", value.id, metadata);
  });
  Object.entries(state.groceryStatus).forEach(([id, value]) => add("groceryStatus", id, value));
  liveEntries(state.manualGroceries).forEach((value) => add("manualGroceries", value.id, value));

  previousRecords.forEach((previous, key) => {
    if (!next.has(key) && !previous.envelope.deleted) {
      const tombstone = { ...previous, envelope: envelopeFor(uid, clientId, previous.id, {}, previous, now, true) };
      next.set(key, tombstone);
    }
  });
  return next;
}

function recordsInCollection(records: CloudRecordMap, collection: CloudCollection): CloudRecord[] {
  return [...records.values()].filter((record) => record.collection === collection && !record.envelope.deleted);
}

function objectRecords(records: CloudRecordMap, collection: CloudCollection): Record<string, unknown> {
  return Object.fromEntries(recordsInCollection(records, collection).map((record) => [decodeId(record.id), record.envelope.payload]));
}

function arrayRecords<T>(records: CloudRecordMap, collection: CloudCollection): T[] {
  return recordsInCollection(records, collection).map((record) => record.envelope.payload as T);
}

export function hasLiveCloudRecords(records: CloudRecordMap): boolean {
  return [...records.values()].some((record) => !record.envelope.deleted);
}

export function cloudLocale(records: CloudRecordMap): AppLocale | null {
  const preferences = records.get(recordKey("meta", encodeId("preferences")));
  const value = preferences?.envelope.payload.locale;
  return value === "hu" || value === "en" ? value : null;
}

export function recordsToState(records: CloudRecordMap, fallbackState?: SoftState): SoftState | null {
  const settingsRecord = records.get(recordKey("meta", encodeId("settings")));
  if (!settingsRecord || settingsRecord.envelope.deleted) return null;
  const initial = createInitialState();
  const recipesById = new Map(initial.recipes.map((recipe) => [recipe.id, recipe]));
  recordsInCollection(records, "recipes").forEach((record) => {
    const recipe = record.envelope.payload;
    if (typeof recipe.id === "string") recipesById.set(recipe.id, recipe as SoftState["recipes"][number]);
  });
  const cloudPhotos = arrayRecords<SoftState["photos"][number]>(records, "photos").map((photo) => {
    const localPhoto = fallbackState?.photos.find((item) => item.id === photo.id);
    const { dataUrl: _remoteDataUrl, ...metadata } = photo;
    return localPhoto?.dataUrl ? { ...metadata, dataUrl: localPhoto.dataUrl } : metadata;
  });
  const candidate: SoftState = {
    settings: settingsRecord.envelope.payload as SoftState["settings"],
    logs: objectRecords(records, "logs") as SoftState["logs"],
    recipes: [...recipesById.values()],
    batches: arrayRecords<SoftState["batches"][number]>(records, "batches"),
    assignments: arrayRecords<SoftState["assignments"][number]>(records, "assignments"),
    photos: cloudPhotos,
    groceryStatus: objectRecords(records, "groceryStatus") as SoftState["groceryStatus"],
    manualGroceries: arrayRecords<SoftState["manualGroceries"][number]>(records, "manualGroceries")
  };
  return parseSoftState(candidate);
}

function readFirestoreRecords(collectionName: CloudCollection, values: { id: string; data: () => Record<string, unknown> }[]): CloudRecordMap {
  const records = new Map<CloudRecordKey, CloudRecord>();
  values.forEach((snapshot) => {
    const raw = snapshot.data();
    const envelope: CloudEnvelope = {
      schemaVersion: 1,
      ownerUid: typeof raw.ownerUid === "string" ? raw.ownerUid : "",
      recordId: typeof raw.recordId === "string" ? raw.recordId : snapshot.id,
      clientId: typeof raw.clientId === "string" ? raw.clientId : "unknown",
      clientUpdatedAt: typeof raw.clientUpdatedAt === "number" ? raw.clientUpdatedAt : 0,
      updatedAt: raw.updatedAt,
      deleted: raw.deleted === true,
      payload: payload(raw.payload)
    };
    records.set(recordKey(collectionName, snapshot.id), { collection: collectionName, id: snapshot.id, envelope });
  });
  return records;
}

function mergeRecordMaps(target: CloudRecordMap, source: CloudRecordMap): CloudRecordMap {
  source.forEach((record, key) => target.set(key, record));
  return target;
}

export async function loadCloudSnapshot(db: Firestore, uid: string, fallbackState?: SoftState): Promise<CloudSnapshot> {
  const records = new Map<CloudRecordKey, CloudRecord>();
  let fromCache = false;
  for (const collectionName of CLOUD_COLLECTIONS) {
    const snapshot = await getDocs(query(firestoreCollection(db, "users", uid, collectionName)));
    fromCache ||= snapshot.metadata.fromCache;
    mergeRecordMaps(records, readFirestoreRecords(collectionName, snapshot.docs));
  }
  return { records, state: recordsToState(records, fallbackState), fromCache, hasPendingWrites: false };
}

export function subscribeToCloud(db: Firestore, uid: string, onChange: (snapshot: CloudSnapshot) => void, onError: (error: Error) => void, fallbackState?: SoftState): () => void {
  const records = new Map<CloudRecordKey, CloudRecord>();
  const metadata = new Map<CloudCollection, { fromCache: boolean; hasPendingWrites: boolean }>();
  const unsubscribers = CLOUD_COLLECTIONS.map((collectionName) => onSnapshot(
    query(firestoreCollection(db, "users", uid, collectionName)),
    { includeMetadataChanges: true },
    (snapshot) => {
      for (const key of [...records.keys()]) if (records.get(key)?.collection === collectionName) records.delete(key);
      mergeRecordMaps(records, readFirestoreRecords(collectionName, snapshot.docs));
      metadata.set(collectionName, { fromCache: snapshot.metadata.fromCache, hasPendingWrites: snapshot.metadata.hasPendingWrites });
      if (metadata.size < CLOUD_COLLECTIONS.length) return;
      onChange({ records: cloneRecordMap(records), state: recordsToState(records, fallbackState), fromCache: [...metadata.values()].some((item) => item.fromCache), hasPendingWrites: [...metadata.values()].some((item) => item.hasPendingWrites) });
    },
    (error) => onError(error instanceof Error ? error : new Error("Firestore listener failed."))
  ));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

function recordChanged(previous: CloudRecord | undefined, next: CloudRecord): boolean {
  if (!previous) return true;
  return previous.envelope.deleted !== next.envelope.deleted || previous.envelope.clientUpdatedAt !== next.envelope.clientUpdatedAt || stableSerialize(previous.envelope.payload) !== stableSerialize(next.envelope.payload);
}

export async function writeCloudRecords(db: Firestore, uid: string, nextRecords: CloudRecordMap, previousRecords: CloudRecordMap = new Map()): Promise<void> {
  const changed = [...nextRecords.values()].filter((record) => recordChanged(previousRecords.get(recordKey(record.collection, record.id)), record));
  for (let index = 0; index < changed.length; index += 450) {
    const batch = writeBatch(db);
    changed.slice(index, index + 450).forEach((record) => {
      const reference = doc(db, "users", uid, record.collection, record.id);
      batch.set(reference, { ...record.envelope, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  }
}

export async function deleteCloudRecords(db: Firestore, uid: string): Promise<void> {
  const references: ReturnType<typeof doc>[] = [];
  for (const collectionName of CLOUD_COLLECTIONS) {
    const snapshot = await getDocs(query(firestoreCollection(db, "users", uid, collectionName)));
    snapshot.docs.forEach((snapshotDoc) => references.push(doc(db, "users", uid, collectionName, snapshotDoc.id)));
  }
  for (let index = 0; index < references.length; index += 450) {
    const batch = writeBatch(db);
    references.slice(index, index + 450).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
}

function mergeById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const result = new Map(local.map((item) => [item.id, item]));
  cloud.forEach((item) => { if (!result.has(item.id)) result.set(item.id, item); });
  return [...result.values()];
}

function repairAssignments(state: SoftState): SoftState["assignments"] {
  const used = new Map<string, number>();
  const slots = new Set<string>();
  const repaired: SoftState["assignments"] = [];
  state.assignments.forEach((assignment) => {
    const batch = state.batches.find((item) => item.id === assignment.batchId);
    const slotKey = `${assignment.date}:${assignment.slot}`;
    if (!batch || slots.has(slotKey)) return;
    const remaining = batch.servings - (used.get(batch.id) ?? 0);
    const servings = Math.min(remaining, assignment.servings);
    if (servings <= 0) return;
    used.set(batch.id, (used.get(batch.id) ?? 0) + servings);
    slots.add(slotKey);
    repaired.push({ ...assignment, servings });
  });
  return repaired;
}

export function mergeSoftStates(local: SoftState, cloud: SoftState): SoftState {
  const merged: SoftState = {
    ...cloud,
    settings: local.settings,
    logs: { ...cloud.logs, ...local.logs },
    recipes: mergeById(local.recipes, cloud.recipes),
    batches: mergeById(local.batches, cloud.batches),
    assignments: mergeById(local.assignments, cloud.assignments),
    photos: mergeById(local.photos, cloud.photos),
    groceryStatus: { ...cloud.groceryStatus, ...local.groceryStatus },
    manualGroceries: mergeById(local.manualGroceries, cloud.manualGroceries)
  };
  merged.assignments = repairAssignments(merged);
  return parseSoftState(merged) ?? local;
}

export function hasMeaningfulLocalState(state: SoftState): boolean {
  const initial = createInitialState();
  return state.settings.active || stableSerialize(state.settings) !== stableSerialize(initial.settings) || state.recipes.some((recipe) => !seedRecipes.some((seed) => seed.id === recipe.id)) || state.batches.length > 0 || state.assignments.length > 0 || state.photos.length > 0 || Object.keys(state.logs).length > 0 || Object.keys(state.groceryStatus).length > 0 || state.manualGroceries.length > 0 || state.recipes.some((recipe) => recipe.favorite !== (seedRecipes.find((seed) => seed.id === recipe.id)?.favorite ?? false));
}

export function softStatesEqual(left: SoftState, right: SoftState): boolean {
  return stableSerialize(left) === stableSerialize(right);
}
