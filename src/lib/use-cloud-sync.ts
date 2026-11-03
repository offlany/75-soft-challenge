"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import { authErrorKey, deleteCurrentGoogleAccount, signInWithGoogle, signOutFromGoogle, subscribeToAuth, type AuthErrorKey } from "./firebase-auth";
import { getFirebaseServices, isFirebaseConfigured } from "./firebase-config";
import { cloudLocale, createCloudPreferenceRecord, createCloudRecords, decideCloudRestore, deleteCloudRecords, loadCloudSnapshot, mergeSoftStates, recordKey, resolveLocalePreference, subscribeToCloud, softStatesEqual, stableSerialize, writeCloudRecords, type CloudRecordMap } from "./cloud-sync";
import { readPreferredLocale } from "./i18n";
import { serializeSoftState } from "./soft-state-io";
import { createInitialState, type AppLocale, type SoftState } from "./soft-challenge";

export type CloudSyncStatus = "unavailable" | "guest" | "signing-in" | "syncing" | "synced" | "offline" | "error";
export type MigrationChoice = "cloud" | "local" | "merge";

export type MigrationState = {
  kind: "local-to-cloud" | "both";
  localState: SoftState;
  cloudState: SoftState | null;
  cloudRecords: CloudRecordMap;
};

export type CloudSyncController = {
  configured: boolean;
  authReady: boolean;
  isActive: boolean;
  isRestoring: boolean;
  user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null } | null;
  status: CloudSyncStatus;
  errorKey: "" | AuthErrorKey | "A felhős adat-egyeztetés nem sikerült. Az eredeti helyi adatok változatlanok maradtak." | "A felhős adatok nem olvashatók, ezért nem töltöttem felül a helyi adatokat." | "A felhős szinkronizálás megszakadt. Ellenőrizd a kapcsolatot, majd próbáld újra." | "A felhős adatkapcsolat nincs készen." | "Cloud adatok törlése nem sikerült." | "A Google-fiók törlése nem sikerült.",
  migration: MigrationState | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteCloudData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  resolveMigration: (choice: MigrationChoice) => Promise<void>;
  downloadBackup: () => void;
  retry: () => void;
  localOnlyPhotos: boolean;
};

type CloudSyncProps = {
  state: SoftState;
  setState: Dispatch<SetStateAction<SoftState>>;
  ready: boolean;
  locale: AppLocale;
  localePreferenceRevision: number;
  onLocaleChange?: (locale: AppLocale) => void;
};

const CLIENT_ID_KEY = "75-soft-cloud-client-id";
const MIGRATION_MARKERS_KEY = "75-soft-cloud-migration-markers";

function clientId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const next = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

function publicUser(user: User | null): CloudSyncController["user"] {
  if (!user) return null;
  return { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL };
}

function shortHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = ((hash * 33) ^ value.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}

function migrationFingerprint(state: SoftState): string {
  const metadataOnlyPhotos = state.photos.map(({ dataUrl: _dataUrl, ...photo }) => photo);
  return shortHash(stableSerialize({ ...state, photos: metadataOnlyPhotos }));
}

function migrationMarker(uid: string, state: SoftState): string {
  return `${uid}:${migrationFingerprint(state)}`;
}

function hasCompletedMigration(uid: string, state: SoftState): boolean {
  if (typeof window === "undefined") return false;
  try {
    const markers = JSON.parse(window.localStorage.getItem(MIGRATION_MARKERS_KEY) ?? "[]");
    return Array.isArray(markers) && markers.includes(migrationMarker(uid, state));
  } catch {
    return false;
  }
}

function rememberCompletedMigration(uid: string, state: SoftState): void {
  if (typeof window === "undefined") return;
  try {
    const current = JSON.parse(window.localStorage.getItem(MIGRATION_MARKERS_KEY) ?? "[]");
    const markers = Array.isArray(current) ? current.filter((value): value is string => typeof value === "string") : [];
    const marker = migrationMarker(uid, state);
    if (!markers.includes(marker)) markers.push(marker);
    window.localStorage.setItem(MIGRATION_MARKERS_KEY, JSON.stringify(markers.slice(-40)));
  } catch {
  }
}

export function useCloudSync({ state, setState, ready, locale, localePreferenceRevision, onLocaleChange }: CloudSyncProps): CloudSyncController {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!configured);
  const [status, setStatus] = useState<CloudSyncStatus>(configured ? "guest" : "unavailable");
  const [errorKey, setErrorKey] = useState<CloudSyncController["errorKey"]>("");
  const [migration, setMigration] = useState<MigrationState | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const stateRef = useRef(state);
  const guestStateRef = useRef(state);
  const activeUidRef = useRef("");
  const activeRef = useRef(false);
  const recordsRef = useRef<CloudRecordMap>(new Map());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastFingerprintRef = useRef("");
  const clientIdRef = useRef("");
  const localeRef = useRef(locale);
  const localePreferenceRevisionRef = useRef(localePreferenceRevision);
  const onLocaleChangeRef = useRef(onLocaleChange);
  const cloudWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingLocalWriteRef = useRef(false);
  const latestWriteRef = useRef(0);
  const signInIntentRef = useRef(false);

  stateRef.current = state;
  localeRef.current = locale;
  localePreferenceRevisionRef.current = localePreferenceRevision;
  onLocaleChangeRef.current = onLocaleChange;

  const stopCloud = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    activeRef.current = false;
    activeUidRef.current = "";
    recordsRef.current = new Map();
    lastFingerprintRef.current = "";
  }, []);

  useEffect(() => {
    if (!configured) return;
    clientIdRef.current = clientId();
    const unsubscribe = subscribeToAuth((nextUser) => {
      if (!nextUser || (activeRef.current && activeUidRef.current !== nextUser.uid)) stopCloud();
      setUser(nextUser);
      setAuthReady(true);
    });
    return unsubscribe;
  }, [configured, stopCloud]);

  useEffect(() => {
    if (!user && !activeRef.current) guestStateRef.current = state;
  }, [state, user]);

  const queueCloudWrite = useCallback((db: NonNullable<ReturnType<typeof getFirebaseServices>>["db"], uid: string, nextRecords: CloudRecordMap, previousRecords: CloudRecordMap) => {
    const writeId = latestWriteRef.current + 1;
    latestWriteRef.current = writeId;
    pendingLocalWriteRef.current = true;
    const queuedWrite = cloudWriteQueueRef.current.catch(() => undefined).then(() => writeCloudRecords(db, uid, nextRecords, previousRecords));
    cloudWriteQueueRef.current = queuedWrite.then(() => undefined, () => undefined);
    void queuedWrite.then(() => {
      if (writeId === latestWriteRef.current) pendingLocalWriteRef.current = false;
    }, () => {
      if (writeId === latestWriteRef.current) pendingLocalWriteRef.current = false;
    });
    return queuedWrite;
  }, []);

  const activateCloud = useCallback(async (nextState: SoftState, uid: string, db: NonNullable<ReturnType<typeof getFirebaseServices>>["db"], baseline: CloudRecordMap, upload: boolean, preferredLocale: AppLocale | null = null, localeRevisionAtStart = localePreferenceRevisionRef.current) => {
    const storedLocale = readPreferredLocale();
    const explicitLocaleChanged = localePreferenceRevisionRef.current !== localeRevisionAtStart;
    const effectiveLocale = explicitLocaleChanged ? localeRef.current : resolveLocalePreference(localeRef.current, storedLocale, preferredLocale);
    const nextRecords = createCloudRecords(nextState, uid, clientIdRef.current, baseline, Date.now(), { locale: effectiveLocale });
    recordsRef.current = nextRecords;
    activeRef.current = true;
    activeUidRef.current = uid;
    lastFingerprintRef.current = stableSerialize(nextState);
    setState(nextState);
    setErrorKey("");
    setStatus("syncing");
    if (upload) await queueCloudWrite(db, uid, nextRecords, baseline);
    if (preferredLocale && !storedLocale && localePreferenceRevisionRef.current === localeRevisionAtStart) onLocaleChangeRef.current?.(preferredLocale);
    setMigration(null);
    unsubscribeRef.current?.();
    unsubscribeRef.current = subscribeToCloud(db, uid, (snapshot) => {
      if (!activeRef.current || activeUidRef.current !== uid) return;
      recordsRef.current = snapshot.records;
      const hasLocalPendingChanges = pendingLocalWriteRef.current || snapshot.hasPendingWrites;
      if (!hasLocalPendingChanges && snapshot.state && !softStatesEqual(snapshot.state, stateRef.current)) {
        lastFingerprintRef.current = stableSerialize(snapshot.state);
        setState(snapshot.state);
      }
      setStatus(hasLocalPendingChanges ? "syncing" : snapshot.fromCache && typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced");
    }, () => {
      setErrorKey("A felhős szinkronizálás megszakadt. Ellenőrizd a kapcsolatot, majd próbáld újra.");
      setStatus("error");
    }, nextState);
    setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced");
  }, [queueCloudWrite, setState]);

  useEffect(() => {
    if (!ready || !configured) return;
    let cancelled = false;
    if (!user) {
      stopCloud();
      setMigration(null);
      setErrorKey("");
      setStatus(configured ? "guest" : "unavailable");
      if (activeUidRef.current === "" && !softStatesEqual(stateRef.current, guestStateRef.current)) setState(guestStateRef.current);
      return;
    }

    const prepare = async () => {
      const services = getFirebaseServices();
      if (!services) {
        setErrorKey("A felhős adatkapcsolat nincs készen.");
        setStatus("error");
        return;
      }
      setStatus("syncing");
      setErrorKey("" as CloudSyncController["errorKey"]);
      try {
        if (activeRef.current && activeUidRef.current !== user.uid) stopCloud();
        const localeRevisionAtStart = localePreferenceRevisionRef.current;
        const snapshot = await loadCloudSnapshot(services.db, user.uid, stateRef.current);
        if (cancelled) return;
        const localState = stateRef.current;
        const guestState = guestStateRef.current;
        const intentionalSignIn = signInIntentRef.current;
        const cloudExists = snapshot.state !== null;
        const decision = decideCloudRestore(snapshot, localState, guestState, intentionalSignIn, hasCompletedMigration(user.uid, guestState));
        if (decision === "unavailable") {
          setErrorKey("A felhős adatok nem olvashatók, ezért nem töltöttem felül a helyi adatokat.");
          setStatus("error");
          return;
        }
        if (decision === "migration") {
          setMigration({ kind: cloudExists && snapshot.state ? "both" : "local-to-cloud", localState: guestState, cloudState: cloudExists ? snapshot.state : null, cloudRecords: snapshot.records });
          setStatus("syncing");
          return;
        }
        if (decision === "cloud" && snapshot.state) {
          await activateCloud(snapshot.state, user.uid, services.db, snapshot.records, false, cloudLocale(snapshot.records), localeRevisionAtStart);
          signInIntentRef.current = false;
          return;
        }
        const nextState = decision === "empty" ? createInitialState() : localState;
        await activateCloud(nextState, user.uid, services.db, snapshot.records, true, null, localeRevisionAtStart);
        signInIntentRef.current = false;
      } catch {
        if (cancelled) return;
        setErrorKey("A felhős adat-egyeztetés nem sikerült. Az eredeti helyi adatok változatlanok maradtak.");
        setStatus("error");
      }
    };
    void prepare();
    return () => { cancelled = true; };
  }, [activateCloud, configured, ready, retryNonce, setState, stopCloud, user]);

  useEffect(() => {
    if (!ready || !configured || !user || !activeRef.current) return;
    const storedLocale = readPreferredLocale();
    if (storedLocale !== locale) return;
    const services = getFirebaseServices();
    if (!services) return;

    const preferenceKey = recordKey("meta", "preferences");
    const previousRecords = recordsRef.current;
    const previousPreference = previousRecords.get(preferenceKey);
    if (previousPreference && !previousPreference.envelope.deleted && previousPreference.envelope.payload.locale === locale) return;

    const nextRecords = new Map(previousRecords);
    nextRecords.set(preferenceKey, createCloudPreferenceRecord(user.uid, clientIdRef.current, locale, previousPreference));
    recordsRef.current = nextRecords;
    const revision = localePreferenceRevision;
    setStatus("syncing");
    const queuedWrite = queueCloudWrite(services.db, user.uid, nextRecords, previousRecords);
    void queuedWrite.then(() => {
      if (revision === localePreferenceRevisionRef.current) setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced");
    }).catch(() => {
      if (revision !== localePreferenceRevisionRef.current) return;
      recordsRef.current = previousRecords;
      setErrorKey("A felhős szinkronizálás megszakadt. Ellenőrizd a kapcsolatot, majd próbáld újra.");
      setStatus("error");
    });
  }, [configured, locale, localePreferenceRevision, queueCloudWrite, ready, user]);

  useEffect(() => {
    if (!ready || !configured || !user || !activeRef.current || migration) return;
    const services = getFirebaseServices();
    if (!services || activeUidRef.current !== user.uid) return;
    const fingerprint = stableSerialize(state);
    if (fingerprint === lastFingerprintRef.current) return;
    const nextRecords = createCloudRecords(state, user.uid, clientIdRef.current, recordsRef.current, Date.now(), { locale });
    const previousRecords = recordsRef.current;
    recordsRef.current = nextRecords;
    lastFingerprintRef.current = fingerprint;
    setStatus("syncing");
    void queueCloudWrite(services.db, user.uid, nextRecords, previousRecords).then(() => {
      setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced");
    }).catch(() => {
      recordsRef.current = previousRecords;
      lastFingerprintRef.current = "";
      setErrorKey("A felhős szinkronizálás megszakadt. Ellenőrizd a kapcsolatot, majd próbáld újra.");
      setStatus("error");
    });
  }, [configured, locale, migration, queueCloudWrite, ready, state, user]);

  useEffect(() => {
    if (!configured || typeof window === "undefined") return;
    const setOffline = () => { if (activeRef.current) setStatus("offline"); };
    const setOnline = () => { if (!activeRef.current) setRetryNonce((value) => value + 1); };
    window.addEventListener("offline", setOffline);
    window.addEventListener("online", setOnline);
    return () => { window.removeEventListener("offline", setOffline); window.removeEventListener("online", setOnline); };
  }, [configured]);

  const signIn = useCallback(async () => {
    signInIntentRef.current = true;
    guestStateRef.current = stateRef.current;
    setStatus("signing-in");
    setErrorKey("");
    try {
      await signInWithGoogle();
    } catch (error) {
      signInIntentRef.current = false;
      setErrorKey(authErrorKey(error));
      setStatus("guest");
    }
  }, []);

  const signOut = useCallback(async () => {
    signInIntentRef.current = false;
    await signOutFromGoogle();
  }, []);

  const deleteCloudData = useCallback(async () => {
    const services = getFirebaseServices();
    if (!services || !user) return;
    setStatus("syncing");
    setErrorKey("");
    stopCloud();
    try {
      await cloudWriteQueueRef.current.catch(() => undefined);
      await deleteCloudRecords(services.db, user.uid);
      await signOutFromGoogle();
    } catch {
      setErrorKey("Cloud adatok törlése nem sikerült.");
      setStatus("error");
    }
  }, [stopCloud, user]);

  const deleteAccount = useCallback(async () => {
    const services = getFirebaseServices();
    if (!services || !user) return;
    setStatus("syncing");
    setErrorKey("");
    stopCloud();
    try {
      await cloudWriteQueueRef.current.catch(() => undefined);
      await deleteCloudRecords(services.db, user.uid);
      await deleteCurrentGoogleAccount();
    } catch (error) {
      setErrorKey(error instanceof Error && (error.message === "firebase-user-not-found" || error.message.includes("auth/")) ? authErrorKey(error) : "A Google-fiók törlése nem sikerült.");
      setStatus("error");
    }
  }, [stopCloud, user]);

  const resolveMigration = useCallback(async (choice: MigrationChoice) => {
    if (!migration || !user) return;
    const services = getFirebaseServices();
    if (!services) return;
    setStatus("syncing");
    setErrorKey("");
    try {
      const selected = choice === "cloud" ? migration.cloudState : choice === "merge" && migration.cloudState ? mergeSoftStates(migration.localState, migration.cloudState) : migration.localState;
      if (!selected) return;
      await activateCloud(selected, user.uid, services.db, migration.cloudRecords, choice !== "cloud", choice === "cloud" ? cloudLocale(migration.cloudRecords) : null, localePreferenceRevisionRef.current);
      rememberCompletedMigration(user.uid, migration.localState);
      signInIntentRef.current = false;
    } catch {
      setErrorKey("A felhős adat-egyeztetés nem sikerült. Az eredeti helyi adatok változatlanok maradtak.");
      setStatus("error");
    }
  }, [activateCloud, migration, user]);

  const downloadBackup = useCallback(() => {
    if (typeof document === "undefined") return;
    const url = URL.createObjectURL(new Blob([serializeSoftState(stateRef.current)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "75-soft-before-cloud-sync.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, []);

  return {
    configured,
    authReady,
    isActive: Boolean(user && activeRef.current && activeUidRef.current === user.uid),
    isRestoring: configured && (!authReady || Boolean(user && (activeUidRef.current !== user.uid || (!activeRef.current && !migration && status === "syncing")))),
    user: publicUser(user),
    status,
    errorKey,
    migration,
    signIn,
    signOut,
    deleteCloudData,
    deleteAccount,
    resolveMigration,
    downloadBackup,
    retry: () => setRetryNonce((value) => value + 1),
    localOnlyPhotos: true
  };
}
