import { beforeEach, describe, expect, it } from "vitest";
import { detectBrowserLocale, formatCount, readPreferredLocale, savePreferredLocale, setLocale, translate, translateDay } from "@/lib/i18n";
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
});
