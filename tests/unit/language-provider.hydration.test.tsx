import { act, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider, useLanguage } from "@/components/language-provider";
import HomePage from "@/app/page";

function LanguageProbe() {
  const { locale, t } = useLanguage();
  return <div data-locale={locale}>{t("Betöltés…")}</div>;
}

function TestApp() {
  return <LanguageProvider><LanguageProbe /></LanguageProvider>;
}

async function hydrateServerMarkup(element: ReactElement = <TestApp />): Promise<{ container: HTMLDivElement; root: Root; errors: string[] }> {
  const markup = renderToString(element);
  const container = document.createElement("div");
  container.innerHTML = markup;
  const errors: string[] = [];
  const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => {
    errors.push(args.map(String).join(" "));
  });
  let root: Root;
  await act(async () => {
    root = hydrateRoot(container, element);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
  consoleError.mockRestore();
  return { container, root: root!, errors };
}

describe("LanguageProvider SSR hydration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, "language", { configurable: true, value: "hu-HU" });
  });

  it("hydrates a fresh Hungarian session without a mismatch", async () => {
    const { container, root, errors } = await hydrateServerMarkup();

    expect(container.querySelector("[data-locale]")?.textContent).toBe("Betöltés…");
    expect(container.querySelector("[data-locale]")?.getAttribute("data-locale")).toBe("hu");
    expect(errors.filter((error) => error.includes("Hydration failed"))).toEqual([]);
    root.unmount();
  });

  it("applies the saved English preference only after hydration", async () => {
    window.localStorage.setItem("75-soft-language", "en");
    const { container, root, errors } = await hydrateServerMarkup();

    expect(container.querySelector("[data-locale]")?.textContent).toBe("Loading…");
    expect(container.querySelector("[data-locale]")?.getAttribute("data-locale")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(errors.filter((error) => error.includes("Hydration failed"))).toEqual([]);
    root.unmount();
  });

  it("uses the browser language for a fresh English session after hydration", async () => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "en-US" });
    const { container, root } = await hydrateServerMarkup();

    expect(container.querySelector("[data-locale]")?.getAttribute("data-locale")).toBe("en");
    expect(container.querySelector("[data-locale]")?.textContent).toBe("Loading…");
    root.unmount();
  });

  it("hydrates the real app shell without reporting a mismatch", async () => {
    const { root, errors } = await hydrateServerMarkup(<HomePage />);

    expect(errors.filter((error) => error.includes("Hydration failed"))).toEqual([]);
    root.unmount();
  });
});
