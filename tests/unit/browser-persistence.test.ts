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

  it("round-trips export and import data without accepting malformed state", () => {
    const state = createInitialState();
    const exported = serializeSoftState(state);

    expect(parseSoftState(exported)?.recipes.length).toBe(state.recipes.length);
    expect(parseSoftState("{\"unexpected\":true}")).toBeNull();
    expect(parseSoftState("not-json")).toBeNull();
  });

  it("preserves legacy rest-day settings and existing logs during import", () => {
    const state = createInitialState();
    state.settings.restDay = "vasárnap";
    state.logs["2026-11-01"] = { restDay: true, water: 2 };

    const imported = parseSoftState(serializeSoftState(state));

    expect(imported?.settings.restDay).toBe("vasárnap");
    expect(imported?.logs["2026-11-01"]).toEqual({ restDay: true, water: 2 });
  });
});
