import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

const validEnvelope = {
  schemaVersion: 1,
  ownerUid: "owner-a",
  recordId: "settings",
  clientId: "test-client",
  clientUpdatedAt: 1,
  updatedAt: serverTimestamp(),
  deleted: false,
  payload: { active: false }
};

const rulesDescribe = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

rulesDescribe("Firestore user-scoped rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "75-soft-rules-test",
      firestore: {
        rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
        host: "127.0.0.1",
        port: 8080
      }
    });
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("allows an authenticated owner to write and read their own envelope", async () => {
    const ownerDb = testEnv.authenticatedContext("owner-a").firestore();
    const reference = doc(ownerDb, "users", "owner-a", "meta", "settings");
    await assertSucceeds(setDoc(reference, validEnvelope));
    await expect(assertSucceeds(getDoc(reference))).resolves.toBeDefined();
  });

  it("rejects unauthenticated and cross-user access", async () => {
    const ownerDb = testEnv.authenticatedContext("owner-a").firestore();
    const otherDb = testEnv.authenticatedContext("owner-b").firestore();
    const reference = doc(ownerDb, "users", "owner-a", "meta", "settings");
    await assertSucceeds(setDoc(reference, validEnvelope));
    await assertFails(getDoc(doc(otherDb, "users", "owner-a", "meta", "settings")));
    await assertFails(setDoc(doc(otherDb, "users", "owner-a", "meta", "other"), { ...validEnvelope, ownerUid: "owner-b", recordId: "other" }));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "users", "owner-a", "meta", "settings")));
  });

  it("allows an owner to delete own records but rejects cross-user deletes", async () => {
    const ownerDb = testEnv.authenticatedContext("owner-a").firestore();
    const otherDb = testEnv.authenticatedContext("owner-b").firestore();
    const reference = doc(ownerDb, "users", "owner-a", "meta", "settings");
    await assertSucceeds(setDoc(reference, validEnvelope));
    await assertFails(deleteDoc(doc(otherDb, "users", "owner-a", "meta", "settings")));
    await assertSucceeds(deleteDoc(reference));
  });
});
