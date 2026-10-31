import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/soft-challenge";
import { loadBrowserState, saveBrowserState } from "@/lib/browser-persistence";
import { parseSoftState, serializeSoftState } from "@/lib/soft-state-io";

describe("browser persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and reloads state through the available browser storage", async () => {
    const state = createInitialState();
    state.settings.active = true;
    state.logs["2026-11-01"] = { water: 2.5 };

    await saveBrowserState(state);
    const loaded = await loadBrowserState();

    expect(loaded.state?.settings.active).toBe(true);
    expect(loaded.state?.logs["2026-11-01"]?.water).toBe(2.5);
  });

  it("serializes rapid saves so the newest state wins", async () => {
    const first = createInitialState();
    first.settings.active = true;
    first.logs["2026-11-01"] = { water: 1 };
    const second = createInitialState();
    second.settings.active = true;
    second.logs["2026-11-01"] = { water: 3 };

    await Promise.all([saveBrowserState(first), saveBrowserState(second)]);

    expect((await loadBrowserState()).state?.logs["2026-11-01"]?.water).toBe(3);
  });

  it("round-trips export and import data without accepting malformed state", () => {
    const state = createInitialState();
    const exported = serializeSoftState(state);

    expect(parseSoftState(exported)?.recipes.length).toBe(state.recipes.length);
    expect(parseSoftState("{\"unexpected\":true}")).toBeNull();
    expect(parseSoftState("not-json")).toBeNull();
  });

  it("rejects invalid values, duplicate IDs, dangling references, and unsupported backups", () => {
    const state = createInitialState();
    expect(parseSoftState({ ...state, logs: { "2026-11-01": { water: -1 } } })).toBeNull();
    expect(parseSoftState({ ...state, recipes: [state.recipes[0], state.recipes[0]] })).toBeNull();
    expect(parseSoftState({ ...state, batches: [{ id: "batch-1", recipeId: "missing", weekStart: "2026-11-02", servings: 1 }] })).toBeNull();
    expect(parseSoftState({ ...state, assignments: [{ id: "meal-1", date: "2026-11-02", slot: "ebed", batchId: "missing", servings: 1 }] })).toBeNull();
    const batch = { id: "batch-1", recipeId: state.recipes[0].id, weekStart: "2026-11-02", servings: 1 };
    expect(parseSoftState({ ...state, batches: [batch], assignments: [
      { id: "meal-1", date: "2026-11-02", slot: "ebed", batchId: "batch-1", servings: 1 },
      { id: "meal-2", date: "2026-11-02", slot: "ebed", batchId: "batch-1", servings: 1 }
    ] })).toBeNull();
    expect(parseSoftState({ ...state, logs: { "2026-11-01": { notes: 42 } } })).toBeNull();
    expect(parseSoftState(JSON.stringify({ format: "75-soft-backup", version: 1, state }))).toBeNull();
  });

  it("preserves legacy rest-day settings and existing logs during import", () => {
    const state = createInitialState();
    state.settings.restDay = "vasárnap";
    state.logs["2026-11-01"] = { restDay: true, water: 2 };

    const imported = parseSoftState(serializeSoftState(state));

    expect(imported?.settings.restDay).toBe("vasárnap");
    expect(imported?.logs["2026-11-01"]).toEqual({ restDay: true, water: 2 });
  });

  it("normalizes duplicate imported rest days to one per calendar week", () => {
    const state = createInitialState();
    state.settings.active = true;
    state.settings.startDate = "2026-11-01";
    state.logs = { "2026-11-02": { restDay: true }, "2026-11-04": { restDay: true } };

    const imported = parseSoftState(serializeSoftState(state));

    expect(imported?.logs["2026-11-02"]?.restDay).toBe(true);
    expect(imported?.logs["2026-11-04"]?.restDay).toBe(false);
  });
});
