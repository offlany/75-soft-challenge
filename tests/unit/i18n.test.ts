import { beforeEach, describe, expect, it } from "vitest";
import { detectBrowserLocale, formatCount, missingTranslations, readPreferredLocale, savePreferredLocale, setLocale, translate, translateDay, translations } from "@/lib/i18n";
import { builtInRecipeIds, localizeRecipe } from "@/lib/recipe-localization";
import { formatDate, seedRecipes } from "@/lib/soft-challenge";

describe("HU/EN localization", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLocale("hu");
  });

  it("detects Hungarian and falls back to English", () => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "hu-HU" });
    expect(detectBrowserLocale()).toBe("hu");
    Object.defineProperty(navigator, "language", { configurable: true, value: "de-DE" });
    expect(detectBrowserLocale()).toBe("en");
  });

  it("persists the explicit preference independently of challenge data", () => {
    savePreferredLocale("en");
    expect(readPreferredLocale()).toBe("en");
    expect(window.localStorage.getItem("75-soft-language")).toBe("en");
  });

  it("translates labels, days, counts, and dates without losing locale formatting", () => {
    setLocale("en");
    expect(translate("Áttekintés")).toBe("Overview");
    expect(translateDay("vasárnap")).toBe("Sunday");
    expect(formatCount(2, "nap", "day")).toBe("2 days");
    expect(formatDate("2026-01-05", { month: "long", day: "numeric" })).toBe("5 January");
  });

  it("keeps the upcoming countdown natural in both languages", () => {
    setLocale("hu");
    expect(translate("Holnap indul a kihívásod")).toBe("Holnap indul a kihívásod");
    expect(translate("nap múlva indul a kihívásod")).toBe("nap múlva indul a kihívásod");
    setLocale("en");
    expect(translate("Holnap indul a kihívásod")).toBe("Your challenge starts tomorrow");
    expect(translate("nap múlva indul a kihívásod")).toBe("days until your challenge starts");
  });

  it("localizes all built-in recipes by stable ID and preserves custom recipes", () => {
    expect(builtInRecipeIds()).toHaveLength(30);
    const source = seedRecipes.find((recipe) => recipe.id === "r1");
    expect(source).toBeDefined();
    const localized = localizeRecipe(source!, "en");
    expect(localized.id).toBe(source!.id);
    expect(localized.name).toBe("Mixed berry yogurt muesli bowl");
    expect(localized.ingredients[0].name).toBe("Greek yogurt");
    expect(source!.name).toBe("Erdei gyümölcsös joghurtos müzlitál");

    const custom = { ...source!, id: "recipe-custom", name: "My family recipe", instructions: ["Keep my wording."] };
    expect(localizeRecipe(custom, "en")).toEqual(custom);
  });

  it("detects missing English translation keys", () => {
    expect(missingTranslations(Object.keys(translations))).toEqual([]);
    expect(missingTranslations(["This key was not registered"])).toEqual(["This key was not registered"]);
  });
});
