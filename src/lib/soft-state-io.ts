import { createInitialState, localDateString, parseLocalDate, trackedHabits, weekStart, type ChallengeSettings, type DayLog, type Ingredient, type Recipe, type SoftState } from "@/lib/soft-challenge";

export const SOFT_BACKUP_VERSION = 2;
export const MAX_BACKUP_BYTES = 12_000_000;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: UnknownRecord, key: string, fallback?: string): string | null {
  if (!(key in record)) return fallback ?? null;
  return typeof record[key] === "string" ? record[key] : null;
}

function readNonEmptyString(record: UnknownRecord, key: string, fallback?: string): string | null {
  const value = readString(record, key, fallback);
  return value && value.trim() ? value.trim() : null;
}

function readBoolean(record: UnknownRecord, key: string, fallback?: boolean): boolean | null {
  if (!(key in record)) return fallback ?? null;
  return typeof record[key] === "boolean" ? record[key] : null;
}

function readNumber(record: UnknownRecord, key: string, fallback?: number, minimum = 0): number | null {
  if (!(key in record)) return fallback ?? null;
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) && value >= minimum ? value : null;
}

function readInteger(record: UnknownRecord, key: string, fallback?: number, minimum = 0): number | null {
  const value = readNumber(record, key, fallback, minimum);
  return value !== null && Number.isInteger(value) ? value : null;
}

function isDateString(value: string, allowEmpty = false): boolean {
  if (allowEmpty && value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return localDateString(parseLocalDate(value)) === value;
}

function isTimeString(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function uniqueStrings(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function optionalStringArray(record: UnknownRecord, key: string): string[] | null {
  if (!(key in record)) return [];
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.trim())) return null;
  const normalized = value.map((item) => item.trim());
  return uniqueStrings(normalized) ? normalized : null;
}

function normalizeIngredient(value: unknown): Ingredient | null {
  if (!isRecord(value)) return null;
  const id = readNonEmptyString(value, "id");
  const name = readNonEmptyString(value, "name");
  const unit = readNonEmptyString(value, "unit");
  const category = readNonEmptyString(value, "category");
  const quantity = readNumber(value, "quantity", undefined, Number.MIN_VALUE);
  const note = readString(value, "note", "") ?? "";
  if (!id || !name || !unit || !category || quantity === null || note.length > 500) return null;
  return { id, name, quantity, unit, category, ...(note ? { note } : {}) };
}

function normalizeRecipe(value: unknown): Recipe | null {
  if (!isRecord(value)) return null;
  const id = readNonEmptyString(value, "id");
  const name = readNonEmptyString(value, "name");
  const category = readNonEmptyString(value, "category");
  const description = readString(value, "description", "");
  const ingredients = value.ingredients;
  const instructions = value.instructions;
  const servings = readInteger(value, "servings", undefined, 1);
  const activeMinutes = readInteger(value, "activeMinutes", 0);
  const totalMinutes = readInteger(value, "totalMinutes", 0);
  const mealPrep = readBoolean(value, "mealPrep", false);
  const storage = readString(value, "storage", "");
  const freezable = readBoolean(value, "freezable", false);
  const favorite = readBoolean(value, "favorite", false);
  if (!id || !name || !category || description === null || storage === null || description.length > 2_000 || !Array.isArray(ingredients) || !Array.isArray(instructions) || servings === null || activeMinutes === null || totalMinutes === null || mealPrep === null || freezable === null || favorite === null || storage.length > 500) return null;
  const normalizedIngredients = ingredients.map(normalizeIngredient);
  if (!normalizedIngredients.length || normalizedIngredients.some((item) => item === null)) return null;
  const normalizedInstructions = instructions.map((item) => typeof item === "string" ? item.trim() : "");
  if (!normalizedInstructions.length || normalizedInstructions.some((item) => !item || item.length > 2_000)) return null;
  return { id, name, category, description, ingredients: normalizedIngredients as Ingredient[], servings, activeMinutes, totalMinutes, mealPrep, storage, freezable, favorite, instructions: normalizedInstructions };
}

function normalizeCustomHabits(value: unknown): ChallengeSettings["customHabits"] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const habits = value.map((item) => {
    if (!isRecord(item)) return null;
    const id = readNonEmptyString(item, "id");
    const name = readNonEmptyString(item, "name");
    const category = readNonEmptyString(item, "category", "Saját fókusz");
    return id && name && category && name.length <= 200 ? { id, name, category } : null;
  });
  if (habits.some((item) => item === null)) return null;
  const normalized = habits as NonNullable<ChallengeSettings["customHabits"]>;
  return uniqueStrings(normalized.map((habit) => habit.id)) ? normalized : null;
}

function normalizeSettings(value: unknown, initial: ChallengeSettings): ChallengeSettings | null {
  if (!isRecord(value)) return null;
  const active = readBoolean(value, "active", initial.active);
  const startDate = readString(value, "startDate", initial.startDate);
  const startTime = readString(value, "startTime", initial.startTime);
  const waterTarget = readNumber(value, "waterTarget", initial.waterTarget, Number.MIN_VALUE);
  const pictureInterval = readInteger(value, "pictureInterval", initial.pictureInterval, 1);
  const includeDayOnePicture = readBoolean(value, "includeDayOnePicture", initial.includeDayOnePicture);
  const skipsEnabled = readBoolean(value, "skipsEnabled", initial.skipsEnabled);
  const skipAllowance = readInteger(value, "skipAllowance", initial.skipAllowance, 0);
  const skipScope = readString(value, "skipScope", initial.skipScope);
  const restDay = readString(value, "restDay", initial.restDay);
  const habitsValue = value.habits;
  const habits = habitsValue === undefined ? initial.habits : isRecord(habitsValue) ? trackedHabits.reduce<Record<string, boolean> | null>((result, habit) => {
    if (!result) return null;
    const habitValue = readBoolean(habitsValue, habit, initial.habits[habit]);
    if (habitValue === null) return null;
    result[habit] = habitValue;
    return result;
  }, {}) : null;
  const customHabits = normalizeCustomHabits(value.customHabits);
  if (active === null || startDate === null || !isDateString(startDate, true) || startTime === null || !isTimeString(startTime) || waterTarget === null || pictureInterval === null || includeDayOnePicture === null || skipsEnabled === null || skipAllowance === null || (skipScope !== "het" && skipScope !== "kihivas") || restDay === null || habits === null || customHabits === null) return null;
  return { active, startDate, startTime, waterTarget, pictureInterval, includeDayOnePicture, skipsEnabled, skipAllowance, skipScope, restDay, habits: habits as ChallengeSettings["habits"], customHabits };
}

function normalizeDayLog(value: unknown): DayLog | null {
  if (!isRecord(value)) return null;
  const water = readNumber(value, "water", undefined);
  const readingPages = readNumber(value, "readingPages", undefined);
  const readingMinutes = readNumber(value, "readingMinutes", undefined);
  const exerciseMinutes = readNumber(value, "exerciseMinutes", undefined);
  const exerciseType = readString(value, "exerciseType", "");
  const mindful = "mindful" in value ? readBoolean(value, "mindful") : undefined;
  const restDay = "restDay" in value ? readBoolean(value, "restDay") : undefined;
  const selfCare = readString(value, "selfCare", "");
  const alcohol = "alcohol" in value ? readString(value, "alcohol") : undefined;
  const alcoholOccasion = readString(value, "alcoholOccasion", "");
  const notes = readString(value, "notes", "");
  const skips = optionalStringArray(value, "skips");
  const customHabitsValue = value.customHabits;
  const customHabits = customHabitsValue === undefined ? {} : isRecord(customHabitsValue) && Object.values(customHabitsValue).every((item) => typeof item === "boolean") ? customHabitsValue as Record<string, boolean> : null;
  if (("water" in value && water === null) || ("readingPages" in value && readingPages === null) || ("readingMinutes" in value && readingMinutes === null) || ("exerciseMinutes" in value && exerciseMinutes === null) || exerciseType === null || mindful === null || restDay === null || selfCare === null || alcohol === null || (typeof alcohol === "string" && !["none", "yes", "unknown"].includes(alcohol)) || alcoholOccasion === null || notes === null || exerciseType.length > 200 || selfCare.length > 500 || alcoholOccasion.length > 500 || notes.length > 5_000 || skips === null || customHabits === null) return null;
  return { ...(water === null ? {} : { water }), ...(readingPages === null ? {} : { readingPages }), ...(readingMinutes === null ? {} : { readingMinutes }), ...(exerciseMinutes === null ? {} : { exerciseMinutes }), ...(exerciseType ? { exerciseType } : {}), ...(typeof mindful === "boolean" ? { mindful } : {}), ...(typeof restDay === "boolean" ? { restDay } : {}), ...(selfCare ? { selfCare } : {}), ...(typeof alcohol === "string" ? { alcohol: alcohol as DayLog["alcohol"] } : {}), ...(alcoholOccasion ? { alcoholOccasion } : {}), ...(notes ? { notes } : {}), ...(skips.length ? { skips } : {}), ...(Object.keys(customHabits).length ? { customHabits } : {}) };
}

function normalizeState(value: unknown): SoftState | null {
  if (!isRecord(value) || !isRecord(value.settings) || !Array.isArray(value.recipes)) return null;
  const initial = createInitialState();
  const settings = normalizeSettings(value.settings, initial.settings);
  const recipes = value.recipes.map(normalizeRecipe);
  if (!settings || recipes.some((item) => item === null)) return null;
  const normalizedRecipes = recipes as Recipe[];
  if (!uniqueStrings(normalizedRecipes.map((recipe) => recipe.id))) return null;
  const recipeIngredientIds = normalizedRecipes.flatMap((recipe) => recipe.ingredients.map((item) => item.id));
  if (!uniqueStrings(recipeIngredientIds)) return null;

  const batchesValue = value.batches === undefined ? [] : value.batches;
  const assignmentsValue = value.assignments === undefined ? [] : value.assignments;
  const photosValue = value.photos === undefined ? [] : value.photos;
  const manualGroceriesValue = value.manualGroceries === undefined ? [] : value.manualGroceries;
  const logsValue = value.logs === undefined ? {} : value.logs;
  const groceryStatusValue = value.groceryStatus === undefined ? {} : value.groceryStatus;
  if (!Array.isArray(batchesValue) || !Array.isArray(assignmentsValue) || !Array.isArray(photosValue) || !Array.isArray(manualGroceriesValue) || !isRecord(logsValue) || !isRecord(groceryStatusValue)) return null;

  const batches = batchesValue.map((item) => {
    if (!isRecord(item)) return null;
    const id = readNonEmptyString(item, "id");
    const recipeId = readNonEmptyString(item, "recipeId");
    const batchWeekStart = readString(item, "weekStart");
    const servings = readInteger(item, "servings", undefined, 1);
    const mealPrep = readBoolean(item, "mealPrep", false);
    return id && recipeId && batchWeekStart && isDateString(batchWeekStart) && servings !== null && mealPrep !== null ? { id, recipeId, weekStart: batchWeekStart, servings, ...(mealPrep ? { mealPrep: true } : {}) } : null;
  });
  if (batches.some((item) => item === null)) return null;
  const normalizedBatches = batches as SoftState["batches"];
  if (!uniqueStrings(normalizedBatches.map((batch) => batch.id)) || normalizedBatches.some((batch) => !normalizedRecipes.some((recipe) => recipe.id === batch.recipeId))) return null;

  const assignments = assignmentsValue.map((item) => {
    if (!isRecord(item)) return null;
    const id = readNonEmptyString(item, "id");
    const date = readString(item, "date");
    const slot = readString(item, "slot");
    const batchId = readNonEmptyString(item, "batchId");
    const servings = readInteger(item, "servings", undefined, 1);
    return id && date && isDateString(date) && (slot === "reggeli" || slot === "ebed" || slot === "vacsora") && batchId && servings !== null ? { id, date, slot, batchId, servings } : null;
  });
  if (assignments.some((item) => item === null)) return null;
  const normalizedAssignments = assignments as SoftState["assignments"];
  if (!uniqueStrings(normalizedAssignments.map((assignment) => assignment.id)) || normalizedAssignments.some((assignment) => !normalizedBatches.some((batch) => batch.id === assignment.batchId))) return null;
  const assignmentKeys = normalizedAssignments.map((assignment) => `${assignment.date}|${assignment.slot}`);
  if (!uniqueStrings(assignmentKeys)) return null;
  const assignedServings = normalizedAssignments.reduce<Record<string, number>>((totals, assignment) => ({ ...totals, [assignment.batchId]: (totals[assignment.batchId] ?? 0) + assignment.servings }), {});
  if (normalizedBatches.some((batch) => (assignedServings[batch.id] ?? 0) > batch.servings)) return null;

  const logs: SoftState["logs"] = {};
  for (const [date, log] of Object.entries(logsValue)) {
    const normalizedLog = normalizeDayLog(log);
    if (!isDateString(date) || !normalizedLog) return null;
    logs[date] = normalizedLog;
  }
  const restWeeks = new Set<string>();
  Object.keys(logs).sort().forEach((date) => {
    if (!logs[date].restDay) return;
    const key = weekStart(date);
    if (restWeeks.has(key)) logs[date] = { ...logs[date], restDay: false };
    else restWeeks.add(key);
  });

  const photos = photosValue.map((item) => {
    if (!isRecord(item)) return null;
    const id = readNonEmptyString(item, "id");
    const date = readString(item, "date");
    const dataUrl = readString(item, "dataUrl", "") ?? "";
    const note = readString(item, "note", "") ?? "";
    return id && date && isDateString(date) && dataUrl.length <= MAX_BACKUP_BYTES && (!dataUrl || /^data:image\/(?:png|jpeg|webp);base64,/i.test(dataUrl)) && note.length <= 500 ? { id, date, ...(dataUrl ? { dataUrl } : {}), ...(note ? { note } : {}) } : null;
  });
  if (photos.some((item) => item === null)) return null;
  const normalizedPhotos = photos as SoftState["photos"];
  if (!uniqueStrings(normalizedPhotos.map((photo) => photo.id))) return null;

  const manualGroceries = manualGroceriesValue.map((item) => {
    if (!isRecord(item)) return null;
    const id = readNonEmptyString(item, "id");
    const name = readNonEmptyString(item, "name");
    const quantity = readNumber(item, "quantity", undefined, Number.MIN_VALUE);
    const unit = readNonEmptyString(item, "unit");
    const category = readNonEmptyString(item, "category");
    return id && name && quantity !== null && unit && category ? { id, name, quantity, unit, category } : null;
  });
  if (manualGroceries.some((item) => item === null)) return null;
  const normalizedManualGroceries = manualGroceries as SoftState["manualGroceries"];
  if (!uniqueStrings(normalizedManualGroceries.map((item) => item.id))) return null;

  const groceryStatus: SoftState["groceryStatus"] = {};
  for (const [key, status] of Object.entries(groceryStatusValue)) {
    if (!isRecord(status) || ("purchased" in status && typeof status.purchased !== "boolean") || ("pantry" in status && typeof status.pantry !== "boolean")) return null;
    groceryStatus[key] = { ...(typeof status.purchased === "boolean" ? { purchased: status.purchased } : {}), ...(typeof status.pantry === "boolean" ? { pantry: status.pantry } : {}) };
  }

  return { settings, logs, recipes: normalizedRecipes, batches: normalizedBatches, assignments: normalizedAssignments, photos: normalizedPhotos, groceryStatus, manualGroceries: normalizedManualGroceries };
}

export function serializeSoftState(state: SoftState): string {
  return JSON.stringify({ format: "75-soft-backup", version: SOFT_BACKUP_VERSION, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function parseSoftState(value: unknown): SoftState | null {
  try {
    if (typeof value === "string") {
      if (value.length > MAX_BACKUP_BYTES) return null;
      value = JSON.parse(value) as unknown;
    }
    if (isRecord(value) && value.format === "75-soft-backup") {
      if (value.version !== SOFT_BACKUP_VERSION || !isRecord(value.state)) return null;
      value = value.state;
    }
    return normalizeState(value);
  } catch {
    return null;
  }
}
