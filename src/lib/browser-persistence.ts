import type { SoftState } from "@/lib/soft-challenge";
import { parseSoftState, serializeSoftState } from "@/lib/soft-state-io";

const DATABASE_NAME = "75-soft-challenge";
const DATABASE_VERSION = 1;
const STORE_NAME = "app-state";
const STATE_KEY = "current";
const STORAGE_KEY = "75-soft-state";
const LEGACY_STORAGE_KEY = "75-soft-fallback";

export type BrowserPersistenceBackend = "indexeddb" | "localStorage";

export type BrowserStateResult = {
  state: SoftState | null;
  backend: BrowserPersistenceBackend;
};

function parseState(value: unknown): SoftState | null {
  return parseSoftState(value);
}

function localStorageState(): SoftState | null {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage;
  return parseState(storage.getItem(STORAGE_KEY)) ?? parseState(storage.getItem(LEGACY_STORAGE_KEY));
}

function openDatabase(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onerror = () => reject(request.error ?? new Error("IndexedDB could not be opened."));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function readIndexedDb(indexedDb: IDBFactory): Promise<SoftState | null> {
  const database = await openDatabase(indexedDb);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("IndexedDB state could not be read."));
    };
    request.onsuccess = () => {
      database.close();
      const value = request.result as string | undefined;
      resolve(parseState(value));
    };
  });
}

async function writeIndexedDb(indexedDb: IDBFactory, state: SoftState): Promise<void> {
  const database = await openDatabase(indexedDb);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(serializeSoftState(state), STATE_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("IndexedDB state could not be saved."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("IndexedDB state transaction was aborted."));
    };
  });
}

function indexedDbAvailable(): IDBFactory | undefined {
  return typeof window !== "undefined" ? window.indexedDB : undefined;
}

export async function loadBrowserState(): Promise<BrowserStateResult> {
  const indexedDb = indexedDbAvailable();
  if (indexedDb) {
    try {
      const state = await readIndexedDb(indexedDb);
      return { state: state ?? localStorageState(), backend: "indexeddb" };
    } catch {}
  }

  if (typeof window === "undefined") throw new Error("Browser storage is unavailable outside the browser.");
  try {
    return { state: localStorageState(), backend: "localStorage" };
  } catch {
    throw new Error("Browser storage is unavailable.");
  }
}

export async function saveBrowserState(state: SoftState): Promise<BrowserPersistenceBackend> {
  const indexedDb = indexedDbAvailable();
  if (indexedDb) {
    try {
      await writeIndexedDb(indexedDb, state);
      return "indexeddb";
    } catch {}
  }

  if (typeof window === "undefined") throw new Error("Browser storage is unavailable outside the browser.");
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return "localStorage";
  } catch {
    throw new Error("Browser storage is unavailable.");
  }
}
