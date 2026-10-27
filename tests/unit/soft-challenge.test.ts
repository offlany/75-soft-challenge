import { describe, expect, it } from "vitest";
import {
  addDays,
  aggregateGroceries,
  challengeEndDate,
  completionForDay,
  createDemoState,
  createInitialState,
  dayNumber,
  progressPictureDays,
  type DayLog
} from "@/lib/soft-challenge";

describe("75 Soft calculations", () => {
  it("creates a generic active demo state without personal data", () => {
    const state = createDemoState();

    expect(state.settings.active).toBe(true);
    expect(state.logs[Object.keys(state.logs)[0]]?.notes).toBe("Synthetic demo entry");
    expect(state.assignments).toHaveLength(2);
  });

  it("counts the start date as day one and ends on day 75", () => {
    expect(dayNumber("2026-11-01", "2026-11-01")).toBe(1);
    expect(dayNumber("2026-11-01", "2027-01-14")).toBe(75);
    expect(challengeEndDate("2026-11-01")).toBe("2027-01-14");
    expect(addDays("2026-11-01", 74)).toBe("2027-01-14");
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
});
