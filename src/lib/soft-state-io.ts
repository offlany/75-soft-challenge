import { createInitialState, type SoftState } from "@/lib/soft-challenge";

export function serializeSoftState(state: SoftState): string {
  return JSON.stringify(state, null, 2);
}

export function parseSoftState(value: unknown): SoftState | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) as Partial<SoftState> : value as Partial<SoftState>;
    if (!parsed || typeof parsed !== "object" || !parsed.settings || typeof parsed.settings !== "object" || !Array.isArray(parsed.recipes)) return null;

    const initial = createInitialState();
    const settings = parsed.settings as SoftState["settings"];
    return {
      ...initial,
      ...parsed,
      settings: {
        ...initial.settings,
        ...settings,
        habits: { ...initial.settings.habits, ...(settings.habits ?? {}) },
        customHabits: Array.isArray(settings.customHabits) ? settings.customHabits.filter((habit) => habit && typeof habit.id === "string" && typeof habit.name === "string").map((habit) => ({ id: habit.id, name: habit.name.trim(), category: typeof habit.category === "string" && habit.category.trim() ? habit.category.trim() : "Saját fókusz" })) : []
      },
      logs: parsed.logs && typeof parsed.logs === "object" ? parsed.logs : {},
      recipes: parsed.recipes,
      batches: Array.isArray(parsed.batches) ? parsed.batches : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      groceryStatus: parsed.groceryStatus && typeof parsed.groceryStatus === "object" ? parsed.groceryStatus : {},
      manualGroceries: Array.isArray(parsed.manualGroceries) ? parsed.manualGroceries : []
    } as SoftState;
  } catch {
    return null;
  }
}
