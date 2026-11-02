import { describe, expect, it } from "vitest";
import { isFirebaseConfigured } from "@/lib/firebase-config";

describe("Firebase configuration", () => {
  it("keeps the app in guest mode when public Firebase variables are absent", () => {
    expect(isFirebaseConfigured()).toBe(false);
  });
});
