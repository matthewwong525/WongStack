// The daily's writes to a chat's to-do on the board: its plan link and chat name, and its removal.
import { BoardError, NOW } from "./board.ts";

/** Deletes the live task with a chat's key, softly: its chat closed with the work not done. */
export async function removeKeyedTask(db: D1DatabaseSession, importKey: string) {
  const gone = await db.prepare(`UPDATE tasks SET deleted_at = ${NOW}, updated_at = ${NOW} WHERE import_key = ? AND deleted_at IS NULL
    RETURNING id`).bind(importKey).all<{ id: string }>();
  return { importKey, removed: gone.results.length > 0 };
}

/** Sets a task's plan link, its chat name, or both; a field left out keeps its value. */
export async function setTaskLink(db: D1DatabaseSession, id: string, change: { link?: string | null; chat?: string | null }) {
  const fields = (["link", "chat"] as const).filter(field => change[field] !== undefined);
  const row = await db.prepare(`UPDATE tasks SET ${fields.map(field => `${field} = ?`).join(", ")}, updated_at = ${NOW}
    WHERE id = ? AND deleted_at IS NULL RETURNING id, link, chat`).bind(...fields.map(field => change[field]!), id)
    .first<{ id: string; link: string | null; chat: string | null }>();
  if (!row) throw new BoardError("not_found");
  return row;
}
