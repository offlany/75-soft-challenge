import { act, type ReactElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/components/language-provider";
import WelcomeScreen from "@/components/welcome-screen";
import type { CloudSyncController } from "@/lib/use-cloud-sync";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>
}));

function testSync(): CloudSyncController {
  return {
    configured: true,
    authReady: true,
    isActive: false,
    isRestoring: false,
    user: null,
    status: "guest",
    errorKey: "",
    migration: null,
    signIn: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    deleteCloudData: vi.fn(async () => undefined),
    deleteAccount: vi.fn(async () => undefined),
    resolveMigration: vi.fn(async () => undefined),
    downloadBackup: vi.fn(),
    retry: vi.fn(),
    localOnlyPhotos: true
  };
}

async function renderInto(element: ReactElement): Promise<{ container: HTMLDivElement; unmount: () => Promise<void> }> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
  return { container, unmount: async () => { await act(async () => { root.unmount(); }); container.remove(); } };
}

describe("welcome entry and mobile language controls", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, "language", { configurable: true, value: "hu-HU" });
  });

  it("offers guest continuation and keeps the explanation visible", async () => {
    const sync = testSync();
    const onGuest = vi.fn();
    const rendered = await renderInto(<LanguageProvider><WelcomeScreen sync={sync} onGuest={onGuest} /></LanguageProvider>);

    expect(rendered.container.textContent).toContain("Folytatás bejelentkezés nélkül");
    expect(rendered.container.textContent).toContain("IndexedDB");
    const guestButton = [...rendered.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Folytatás bejelentkezés nélkül"));
    expect(guestButton).toBeDefined();
    await act(async () => { guestButton?.click(); });
    expect(onGuest).toHaveBeenCalledOnce();
    await rendered.unmount();
  });

  it("switches language from a touch-sized control and persists the preference", async () => {
    const rendered = await renderInto(<LanguageProvider><WelcomeScreen sync={testSync()} onGuest={vi.fn()} /></LanguageProvider>);
    const englishButton = [...rendered.container.querySelectorAll("button")].find((button) => button.textContent === "EN");
    expect(englishButton?.getAttribute("aria-pressed")).toBe("false");

    await act(async () => { englishButton?.click(); });

    expect(window.localStorage.getItem("75-soft-language")).toBe("en");
    expect(englishButton?.getAttribute("aria-pressed")).toBe("true");
    expect(rendered.container.textContent).toContain("How would you like to continue?");
    await new Promise((resolve) => window.setTimeout(resolve, 20));
    expect(englishButton?.getAttribute("aria-pressed")).toBe("true");

    const hungarianButton = [...rendered.container.querySelectorAll("button")].find((button) => button.textContent === "HU");
    await act(async () => { hungarianButton?.click(); });
    expect(window.localStorage.getItem("75-soft-language")).toBe("hu");
    expect(hungarianButton?.getAttribute("aria-pressed")).toBe("true");
    expect(rendered.container.textContent).toContain("Hogyan szeretnél továbbmenni?");
    await rendered.unmount();
  });
});
