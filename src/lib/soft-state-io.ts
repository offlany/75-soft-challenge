import type { SoftState } from "@/lib/soft-challenge";

export function serializeSoftState(state: SoftState): string {
  return JSON.stringify(state, null, 2);
}

export function parseSoftState(value: unknown): SoftState | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) as Partial<SoftState> : value as Partial<SoftState>;
    return parsed && typeof parsed === "object" && parsed.settings && parsed.recipes ? parsed as SoftState : null;
  } catch {
    return null;
  }
}
