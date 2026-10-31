import path from "node:path";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createInitialState, type SoftState } from "@/lib/soft-challenge";
import { MAX_BACKUP_BYTES, parseSoftState } from "@/lib/soft-state-io";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dataDirectory = process.env.SOFT_DATA_DIR ?? path.join(process.cwd(), "data");
mkdirSync(dataDirectory, { recursive: true });
const database = new DatabaseSync(path.join(dataDirectory, "75-soft.sqlite"));
database.exec("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL)");

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function readState(): SoftState {
  const row = database.prepare("SELECT payload FROM app_state WHERE id = 1").get() as { payload?: string } | undefined;
  if (!row?.payload) return createInitialState();
  return parseSoftState(row.payload) ?? createInitialState();
}

export async function GET() {
  return jsonResponse(readState());
}

export async function PUT(request: Request) {
  let body: string;
  try {
    body = await request.text();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request body." }, 400);
  }
  if (new TextEncoder().encode(body).byteLength > MAX_BACKUP_BYTES) return jsonResponse({ ok: false, error: "State payload is too large." }, 413);
  let incoming: SoftState | null;
  try {
    incoming = parseSoftState(body);
  } catch {
    incoming = null;
  }
  if (!incoming) return jsonResponse({ ok: false, error: "State payload is invalid." }, 400);
  const payload = JSON.stringify(incoming);
  database.prepare("INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at").run(payload);
  return jsonResponse({ ok: true });
}
