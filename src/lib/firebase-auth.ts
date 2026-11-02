import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from "firebase/auth";
import { getFirebaseServices } from "./firebase-config";

export type AuthErrorKey =
  | "A Firebase nincs konfigurálva ezen a példányon."
  | "A bejelentkezési ablakot a böngésző blokkolta. Engedélyezd a felugró ablakokat, majd próbáld újra."
  | "A bejelentkezést megszakítottad."
  | "A Google-bejelentkezés nem sikerült. Próbáld újra később.";

export function subscribeToAuth(listener: (user: User | null) => void): () => void {
  const services = getFirebaseServices();
  if (!services) return () => undefined;
  return onAuthStateChanged(services.auth, listener, () => listener(null));
}

export async function signInWithGoogle(): Promise<User> {
  const services = getFirebaseServices();
  if (!services) throw new Error("firebase-not-configured");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(services.auth, provider);
  return result.user;
}

export async function signOutFromGoogle(): Promise<void> {
  const services = getFirebaseServices();
  if (services) await firebaseSignOut(services.auth);
}

export function authErrorKey(error: unknown): AuthErrorKey {
  if (error instanceof Error && error.message === "firebase-not-configured") return "A Firebase nincs konfigurálva ezen a példányon.";
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "auth/popup-blocked") return "A bejelentkezési ablakot a böngésző blokkolta. Engedélyezd a felugró ablakokat, majd próbáld újra.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "A bejelentkezést megszakítottad.";
  return "A Google-bejelentkezés nem sikerült. Próbáld újra később.";
}
