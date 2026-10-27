import path from "node:path";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createInitialState, type SoftState } from "@/lib/soft-challenge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dataDirectory = process.env.SOFT_DATA_DIR ?? path.join(process.cwd(), "data");
mkdirSync(dataDirectory, { recursive: true });
const database = new DatabaseSync(path.join(dataDirectory, "75-soft.sqlite"));
database.exec("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL)");

function readState(): SoftState {
  const row = database.prepare("SELECT payload FROM app_state WHERE id = 1").get() as { payload?: string } | undefined;
  if (!row?.payload) return createInitialState();
  try {
    return JSON.parse(row.payload) as SoftState;
  } catch {
    return createInitialState();
  }
}

export async function GET() {
  return Response.json(readState());
}

export async function PUT(request: Request) {
  const incoming = (await request.json()) as SoftState;
  const payload = JSON.stringify(incoming);
  database.prepare("INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at").run(payload);
  return Response.json({ ok: true });
}
