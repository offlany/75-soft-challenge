import { describe, expect, it } from "vitest";
import {
  addDays,
  aggregateGroceries,
  canLogDate,
  challengeDay,
  challengePhase,
  challengeEndDate,
  calendarDayDifference,
  completionForDay,
  createInitialState,
  createRestartState,
  dayNumber,
  daysUntilStart,
  isMealPlanDate,
  mealAssignmentsOutsideChallenge,
  progressPictureDays,
  restDayInWeek,
  statusForDay,
  type DayLog
} from "@/lib/soft-challenge";

describe("75 Soft calculations", () => {
  it("starts clean and keeps the challenge inactive until onboarding", () => {
    const state = createInitialState();

    expect(state.settings.active).toBe(false);
    expect(state.settings.restDay).toBe("");
    expect(state.logs).toEqual({});
    expect(state.assignments).toEqual([]);
  });

  it("restarts the challenge without removing the recipe library", () => {
    const state = createInitialState();
    state.settings.active = true;
    state.logs["2026-11-01"] = { water: 3 };
    state.batches = [{ id: "batch-1", recipeId: "r25", weekStart: "2026-11-02", servings: 4 }];
    state.photos = [{ id: "photo-1", date: "2026-11-01" }];
    state.recipes = [{ ...state.recipes[0], name: "Saját recept" }];

    const restarted = createRestartState(state);

    expect(restarted.settings.active).toBe(false);
    expect(restarted.logs).toEqual({});
    expect(restarted.batches).toEqual([]);
    expect(restarted.photos).toEqual([]);
    expect(restarted.recipes).toEqual(state.recipes);
  });

  it("counts the start date as day one and ends on day 75", () => {
    expect(dayNumber("2026-11-01", "2026-11-01")).toBe(1);
    expect(dayNumber("2026-11-01", "2027-01-14")).toBe(75);
    expect(challengeEndDate("2026-11-01")).toBe("2027-01-14");
    expect(addDays("2026-11-01", 74)).toBe("2027-01-14");
  });

  it("keeps future starts upcoming and transitions on the configured date", () => {
    const state = createInitialState();
    state.settings.active = true;
    state.settings.startDate = "2026-11-01";

    expect(challengePhase(state.settings, "2026-10-31")).toBe("upcoming");
    expect(dayNumber(state.settings.startDate, "2026-10-31")).toBe(0);
    expect(challengeDay(state.settings, "2026-10-31")).toBe(0);
    expect(challengePhase(state.settings, "2026-11-01")).toBe("active");
    expect(challengeDay(state.settings, "2026-11-01")).toBe(1);
    expect(challengeDay(state.settings, "2026-11-02")).toBe(2);
    expect(challengePhase(state.settings, "2027-01-15")).toBe("completed");
  });

  it("calculates countdowns and calendar days without DST drift", () => {
    expect(daysUntilStart("2026-11-01", "2026-10-31")).toBe(1);
    expect(daysUntilStart("2026-11-05", "2026-10-31")).toBe(5);
    expect(calendarDayDifference("2026-03-28", "2026-03-30")).toBe(2);
    expect(calendarDayDifference("2026-12-31", "2027-01-02")).toBe(2);
  });

  it("blocks daily tracking before the challenge and only permits meal dates in the 75-day window", () => {
    const state = createInitialState();
    state.settings.active = true;
    state.settings.startDate = "2026-11-01";

    expect(canLogDate(state.settings, "2026-10-31", "2026-10-31")).toBe(false);
    expect(canLogDate(state.settings, "2026-11-01", "2026-11-01")).toBe(true);
    expect(isMealPlanDate(state.settings, "2026-10-31")).toBe(false);
    expect(isMealPlanDate(state.settings, "2026-11-01")).toBe(true);
    expect(isMealPlanDate(state.settings, "2027-01-14")).toBe(true);
    expect(isMealPlanDate(state.settings, "2027-01-15")).toBe(false);
    expect(statusForDay("2026-11-01", state.settings, {}, "2026-10-31")).toBe("future");
    expect(statusForDay("2026-11-01", state.settings, {}, "2026-11-01")).toBe("current");
  });

  it("identifies only the meal assignments made invalid by a changed start date", () => {
    const state = createInitialState();
    state.settings.active = true;
    state.settings.startDate = "2026-11-01";
    const assignments = [
      { id: "meal-1", date: "2026-11-01", slot: "ebed" as const, batchId: "batch-1", servings: 1 },
      { id: "meal-2", date: "2026-11-02", slot: "vacsora" as const, batchId: "batch-1", servings: 1 }
    ];
    const shiftedSettings = { ...state.settings, startDate: "2026-11-02" };

    expect(mealAssignmentsOutsideChallenge(shiftedSettings, assignments).map((item) => item.id)).toEqual(["meal-1"]);
    expect(mealAssignmentsOutsideChallenge(state.settings, assignments)).toEqual([]);
  });

  it("completes reading when either pages or minutes reaches target", () => {
    const state = createInitialState();
    const pages: DayLog = { readingPages: 10 };
    const minutes: DayLog = { readingMinutes: 30 };
    const incomplete: DayLog = { readingPages: 9, readingMinutes: 29 };
    expect(completionForDay(pages, state.settings)).toBe(25);
    expect(completionForDay(minutes, state.settings)).toBe(25);
    expect(completionForDay(incomplete, state.settings)).toBe(0);
  });

  it("allows one rest day per Monday-Sunday week and excuses movement only", () => {
    const state = createInitialState();
    const logs = { "2026-12-31": { restDay: true } };

    expect(restDayInWeek("2027-01-01", logs)).toBe("2026-12-31");
    expect(restDayInWeek("2027-01-02", { ...logs, "2027-01-02": { restDay: true } })).toBe("2026-12-31");
    expect(completionForDay(logs["2026-12-31"], state.settings)).toBe(25);
  });

  it("includes custom habits in daily completion", () => {
    const state = createInitialState();
    state.settings.habits = { movement: false, reading: false, water: false, mindful: false };
    state.settings.customHabits = [{ id: "habit-1", name: "10 perc nyújtás", category: "Mozgás" }];

    expect(completionForDay({}, state.settings)).toBe(0);
    expect(completionForDay({ customHabits: { "habit-1": true } }, state.settings)).toBe(100);
  });

  it("schedules day one and interval photos without duplicates", () => {
    const state = createInitialState();
    state.settings.startDate = "2026-11-01";
    state.settings.pictureInterval = 7;
    state.settings.includeDayOnePicture = true;
    expect(progressPictureDays(state.settings).slice(0, 4)).toEqual(["2026-11-01", "2026-11-07", "2026-11-14", "2026-11-21"]);
  });

  it("aggregates a cooking batch once, not once per meal assignment", () => {
    const state = createInitialState();
    state.batches = [{ id: "batch-1", recipeId: "r25", weekStart: "2026-11-02", servings: 4 }];
    state.assignments = [
      { id: "meal-1", date: "2026-11-02", slot: "ebed", batchId: "batch-1", servings: 1 },
      { id: "meal-2", date: "2026-11-02", slot: "vacsora", batchId: "batch-1", servings: 1 },
      { id: "meal-3", date: "2026-11-03", slot: "ebed", batchId: "batch-1", servings: 1 },
      { id: "meal-4", date: "2026-11-04", slot: "ebed", batchId: "batch-1", servings: 1 }
    ];
    const groceries = aggregateGroceries(state);
    expect(groceries.find((item) => item.name === "rizs")?.quantity).toBe(300);
  });

  it("scales batch ingredients and combines compatible gram units", () => {
    const state = createInitialState();
    const baseRecipe = state.recipes[0];
    state.recipes = [
      { ...baseRecipe, id: "grams", servings: 1, ingredients: [{ ...baseRecipe.ingredients[0], id: "grams-ingredient", name: "rizs", quantity: 500, unit: "g" }] },
      { ...baseRecipe, id: "kilograms", servings: 2, ingredients: [{ ...baseRecipe.ingredients[0], id: "kilograms-ingredient", name: "Rizs", quantity: 1, unit: "kg" }] }
    ];
    state.batches = [
      { id: "grams-batch", recipeId: "grams", weekStart: "2026-11-02", servings: 2 },
      { id: "kilograms-batch", recipeId: "kilograms", weekStart: "2026-11-02", servings: 2 }
    ];

    const rice = aggregateGroceries(state).find((item) => item.name === "rizs");

    expect(rice).toEqual(expect.objectContaining({ quantity: 2000, unit: "g" }));
  });
});
