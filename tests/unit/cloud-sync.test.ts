import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/soft-challenge";
import { createCloudPreferenceRecord, createCloudRecords, decideCloudRestore, hasMeaningfulLocalState, mergeSoftStates, recordsToState, recordKey, resolveLocalePreference, stableSerialize } from "@/lib/cloud-sync";

describe("cloud sync state mapping", () => {
  it("maps granular state records and keeps progress photo binaries local", () => {
    const state = createInitialState();
    state.settings.active = true;
    state.logs["2026-11-01"] = { water: 2 };
    state.photos = [{ id: "photo-1", date: "2026-11-01", dataUrl: "data:image/png;base64,local-only", note: "start" }];

    const records = createCloudRecords(state, "uid-a", "client-a");

    expect(records.has(recordKey("meta", "settings"))).toBe(true);
    expect(records.has(recordKey("logs", "2026-11-01"))).toBe(true);
    expect(records.get(recordKey("photos", "photo-1"))?.envelope.payload).toEqual({ id: "photo-1", date: "2026-11-01", note: "start" });
    const restored = recordsToState(records, state);
    expect(restored?.photos[0].dataUrl).toBe("data:image/png;base64,local-only");
    expect(restored?.logs["2026-11-01"]?.water).toBe(2);
  });

  it("creates tombstones for removed records instead of deleting them", () => {
    const state = createInitialState();
    state.logs["2026-11-01"] = { water: 1 };
    const first = createCloudRecords(state, "uid-a", "client-a");
    const next = createInitialState();
    const second = createCloudRecords(next, "uid-a", "client-a", first);

    const removed = second.get(recordKey("logs", "2026-11-01"));
    expect(removed?.envelope.deleted).toBe(true);
    expect(removed?.envelope.payload).toEqual({});
  });

  it("merges compatible records with local conflict precedence", () => {
    const local = createInitialState();
    local.settings.active = true;
    local.logs["2026-11-01"] = { notes: "local" };
    const cloud = createInitialState();
    cloud.settings.active = true;
    cloud.logs["2026-11-01"] = { notes: "cloud" };
    cloud.logs["2026-11-02"] = { notes: "only cloud" };

    const merged = mergeSoftStates(local, cloud);
    expect(merged.logs["2026-11-01"]?.notes).toBe("local");
    expect(merged.logs["2026-11-02"]?.notes).toBe("only cloud");
    expect(merged.settings).toEqual(local.settings);
  });

  it("recognizes a meaningful local challenge without requiring a Firebase account", () => {
    const clean = createInitialState();
    expect(hasMeaningfulLocalState(clean)).toBe(false);
    clean.settings.active = true;
    expect(hasMeaningfulLocalState(clean)).toBe(true);
    expect(stableSerialize(clean)).toBe(stableSerialize(clean));
  });

  it("keeps an explicit browser locale ahead of a stale cloud preference", () => {
    expect(resolveLocalePreference("hu", "en", "hu")).toBe("en");
    expect(resolveLocalePreference("hu", null, "en")).toBe("en");
    expect(resolveLocalePreference("hu", null, null)).toBe("hu");
  });

  it("creates a standalone locale preference record", () => {
    const record = createCloudPreferenceRecord("uid-a", "client-a", "en");
    expect(record.collection).toBe("meta");
    expect(record.id).toBe("preferences");
    expect(record.envelope.payload).toEqual({ locale: "en" });
  });

  it("restores cloud state instead of opening migration for a returning user", () => {
    const local = createInitialState();
    local.settings.active = true;
    local.logs["2026-11-01"] = { water: 1 };
    const cloud = createInitialState();
    cloud.settings.active = true;
    cloud.logs["2026-11-01"] = { water: 2 };
    const snapshot = { records: createCloudRecords(cloud, "uid-a", "client-a"), state: cloud, fromCache: false, hasPendingWrites: false };

    expect(decideCloudRestore(snapshot, local, local, false, false)).toBe("cloud");
    expect(decideCloudRestore(snapshot, local, local, true, false)).toBe("migration");
    expect(decideCloudRestore(snapshot, local, local, true, true)).toBe("cloud");
  });

  it("does not initialize an empty account from an unavailable cached snapshot", () => {
    const state = createInitialState();
    state.settings.active = true;
    const snapshot = { records: new Map(), state: null, fromCache: true, hasPendingWrites: false };

    expect(decideCloudRestore(snapshot, state, state, false, false)).toBe("unavailable");
  });

  it("keeps an authenticated empty account separate from meaningful guest data", () => {
    const guest = createInitialState();
    guest.settings.active = true;
    guest.logs["2026-11-01"] = { water: 1 };
    const snapshot = { records: new Map(), state: null, fromCache: false, hasPendingWrites: false };

    expect(decideCloudRestore(snapshot, guest, guest, false, false)).toBe("empty");
    expect(decideCloudRestore(snapshot, guest, guest, true, false)).toBe("migration");
    expect(decideCloudRestore(snapshot, guest, guest, true, true)).toBe("empty");
  });
});
