"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { User } from "firebase/auth";
import { authErrorKey, deleteCurrentGoogleAccount, signInWithGoogle, signOutFromGoogle, subscribeToAuth, type AuthErrorKey } from "./firebase-auth";
import { getFirebaseServices, isFirebaseConfigured } from "./firebase-config";
import { cloudLocale, createCloudRecords, deleteCloudRecords, hasLiveCloudRecords, hasMeaningfulLocalState, loadCloudSnapshot, mergeSoftStates, subscribeToCloud, softStatesEqual, stableSerialize, writeCloudRecords, type CloudRecordMap } from "./cloud-sync";
import { serializeSoftState } from "./soft-state-io";
import type { AppLocale, SoftState } from "./soft-challenge";

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
  onLocaleChange?: (locale: AppLocale) => void;
};

const CLIENT_ID_KEY = "75-soft-cloud-client-id";

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

export function useCloudSync({ state, setState, ready, locale, onLocaleChange }: CloudSyncProps): CloudSyncController {
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

  stateRef.current = state;

  useEffect(() => {
    if (!configured) return;
    clientIdRef.current = clientId();
    const unsubscribe = subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return unsubscribe;
  }, [configured]);

  useEffect(() => {
    if (!user && !activeRef.current) guestStateRef.current = state;
  }, [state, user]);

  const stopCloud = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    activeRef.current = false;
    activeUidRef.current = "";
    recordsRef.current = new Map();
    lastFingerprintRef.current = "";
  }, []);

  const activateCloud = useCallback(async (nextState: SoftState, uid: string, db: NonNullable<ReturnType<typeof getFirebaseServices>>["db"], baseline: CloudRecordMap, upload: boolean, preferredLocale: AppLocale | null = null) => {
    const nextRecords = createCloudRecords(nextState, uid, clientIdRef.current, baseline, Date.now(), { locale });
    recordsRef.current = nextRecords;
    activeRef.current = true;
    activeUidRef.current = uid;
    lastFingerprintRef.current = stableSerialize(nextState);
    setState(nextState);
    setErrorKey("");
    setStatus("syncing");
    if (upload) await writeCloudRecords(db, uid, nextRecords, baseline);
    if (preferredLocale && preferredLocale !== locale) onLocaleChange?.(preferredLocale);
    setMigration(null);
    unsubscribeRef.current?.();
    unsubscribeRef.current = subscribeToCloud(db, uid, (snapshot) => {
      if (!activeRef.current || activeUidRef.current !== uid) return;
      recordsRef.current = snapshot.records;
      if (snapshot.state && !softStatesEqual(snapshot.state, stateRef.current)) {
        lastFingerprintRef.current = stableSerialize(snapshot.state);
        setState(snapshot.state);
      }
      setStatus(snapshot.hasPendingWrites ? "syncing" : snapshot.fromCache && typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced");
    }, () => {
      setErrorKey("A felhős szinkronizálás megszakadt. Ellenőrizd a kapcsolatot, majd próbáld újra.");
      setStatus("error");
    }, nextState);
    setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced");
  }, [locale, onLocaleChange, setState]);

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
        const snapshot = await loadCloudSnapshot(services.db, user.uid, stateRef.current);
        if (cancelled) return;
        const localState = stateRef.current;
        const localMeaningful = hasMeaningfulLocalState(localState);
        const cloudExists = hasLiveCloudRecords(snapshot.records);
        if (cloudExists && !snapshot.state) {
          setErrorKey("A felhős adatok nem olvashatók, ezért nem töltöttem felül a helyi adatokat.");
          setStatus("error");
          return;
        }
        if (cloudExists && snapshot.state && localMeaningful && !softStatesEqual(localState, snapshot.state)) {
          setMigration({ kind: "both", localState, cloudState: snapshot.state, cloudRecords: snapshot.records });
          setStatus("syncing");
          return;
        }
        if (!cloudExists && localMeaningful) {
          setMigration({ kind: "local-to-cloud", localState, cloudState: null, cloudRecords: snapshot.records });
          setStatus("syncing");
          return;
        }
        await activateCloud(cloudExists && snapshot.state ? snapshot.state : localState, user.uid, services.db, snapshot.records, !cloudExists, cloudExists ? cloudLocale(snapshot.records) : null);
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
    void writeCloudRecords(services.db, user.uid, nextRecords, previousRecords).then(() => {
      setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced");
    }).catch(() => {
      setErrorKey("A felhős szinkronizálás megszakadt. Ellenőrizd a kapcsolatot, majd próbáld újra.");
      setStatus("error");
    });
  }, [configured, locale, migration, ready, state, user]);

  useEffect(() => {
    if (!configured || typeof window === "undefined") return;
    const setOffline = () => { if (activeRef.current) setStatus("offline"); };
    const setOnline = () => { if (activeRef.current) setRetryNonce((value) => value + 1); };
    window.addEventListener("offline", setOffline);
    window.addEventListener("online", setOnline);
    return () => { window.removeEventListener("offline", setOffline); window.removeEventListener("online", setOnline); };
  }, [configured]);

  const signIn = useCallback(async () => {
    setStatus("signing-in");
    setErrorKey("");
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorKey(authErrorKey(error));
      setStatus("guest");
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutFromGoogle();
  }, []);

  const deleteCloudData = useCallback(async () => {
    const services = getFirebaseServices();
    if (!services || !user) return;
    setStatus("syncing");
    setErrorKey("");
    stopCloud();
    try {
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
      await activateCloud(selected, user.uid, services.db, migration.cloudRecords, choice !== "cloud", choice === "cloud" ? cloudLocale(migration.cloudRecords) : null);
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
    isActive: activeRef.current,
    isRestoring: configured && (!authReady || Boolean(user && !activeRef.current && !migration && status === "syncing")),
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
