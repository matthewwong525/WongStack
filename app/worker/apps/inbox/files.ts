// Files a person sends from a review page: stored in parts until their computer reads them, then deleted.
// wiki/development/reply-links.md
import { z } from "zod";
import { humanEmail, type Route } from "../../api/contract.ts";
import { dropSettledFiles } from "./file-rows.ts";
import { fail, inboxAction, itemId, mine, openItem, scope, type Scope, settleTaps } from "./store.ts";

const MB = 1024 * 1024;
export const FILE_LIMITS = { file: 25 * MB, item: 100 * MB, installation: 300 * MB, name: 200, question: 300 };
// A part's base64 fits the computer's 1 MB answer limit, and a D1 row's 2 MB.
const PART_BYTES = 512 * 1024;

const at = (bytes: Uint8Array, offset: number, text: string) => [...text].every((c, i) => bytes[offset + i] === c.charCodeAt(0));
const PNG = (b: Uint8Array) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x);
const JPEG = (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const ZIP = (b: Uint8Array) => at(b, 0, "PK\x03\x04");
const TEXT = (b: Uint8Array) => !b.subarray(0, 4096).includes(0);
/** Each name ending the page takes, its type, and the first bytes that file must start with. */
const TYPES: Record<string, { type: string; starts: (bytes: Uint8Array) => boolean }> = {
  png: { type: "image/png", starts: PNG }, jpg: { type: "image/jpeg", starts: JPEG }, jpeg: { type: "image/jpeg", starts: JPEG },
  webp: { type: "image/webp", starts: b => at(b, 0, "RIFF") && at(b, 8, "WEBP") },
  gif: { type: "image/gif", starts: b => at(b, 0, "GIF87a") || at(b, 0, "GIF89a") },
  pdf: { type: "application/pdf", starts: b => at(b, 0, "%PDF-") },
  txt: { type: "text/plain", starts: TEXT }, csv: { type: "text/csv", starts: TEXT }, md: { type: "text/markdown", starts: TEXT },
  json: { type: "application/json", starts: TEXT },
  docx: { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", starts: ZIP },
  xlsx: { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", starts: ZIP },
  pptx: { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", starts: ZIP },
  zip: { type: "application/zip", starts: b => ZIP(b) || at(b, 0, "PK\x05\x06") },
};

/** The kind of file `name` names, or null: a short name, no folder or control character, ending as the page takes. */
function fileType(name: string) {
  if (name.length > FILE_LIMITS.name || /[/\\\p{Cc}]/u.test(name)) return null;
  return TYPES[/\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase() ?? ""] ?? null;
}

const refuse = (status: number, text: string) => new Response(text, { status, headers: { "Cache-Control": "no-store" } });
/** Why the upload stopped, as its answer. */
class Stop extends Error {
  readonly answer: Response;
  constructor(answer: Response) { super("stopped"); this.answer = answer; }
}

// The app's cap counts every person's parts together, so its sum is not scoped by person.
const waitingBytes = async (at: Scope, item: string) => (await mine(at, `SELECT
  (SELECT COALESCE(SUM(size), 0) FROM inbox_files WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3) AS item,
  (SELECT COALESCE(SUM(length(data)), 0) FROM inbox_file_parts WHERE installation_id = ?1) AS installation`, item)
  .all<{ item: number; installation: number }>()).results[0];

/** Writes the body into parts, checking its first bytes and every limit as it comes; resolves to its size. */
async function storeParts(at: Scope, id: string, body: ReadableStream<Uint8Array>, kind: (typeof TYPES)[string], room: { item: number; installation: number }) {
  const reader = body.getReader();
  let part = new Uint8Array(PART_BYTES), filled = 0, n = 0, size = 0;
  const flush = async () => {
    if (n === 0 && !kind.starts(part.subarray(0, filled))) throw new Stop(fail("bad_file", 400));
    await mine(at, "INSERT INTO inbox_file_parts (installation_id, email, file_id, n, data, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
      id, n, part.slice(0, filled), at.now).run();
    n += 1; filled = 0; part = new Uint8Array(PART_BYTES);
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > FILE_LIMITS.file || room.item + size > FILE_LIMITS.item) throw new Stop(fail("too_large", 413));
      if (room.installation + size > FILE_LIMITS.installation) throw new Stop(fail("full", 507));
      for (let offset = 0; offset < value.byteLength;) {
        const take = Math.min(PART_BYTES - filled, value.byteLength - offset);
        part.set(value.subarray(offset, offset + take), filled);
        filled += take; offset += take;
        if (filled === PART_BYTES) await flush();
      }
    }
  } finally { await reader.cancel().catch(() => undefined); }
  if (filled) await flush();
  if (!size) throw new Stop(fail("bad_file", 400));
  return size;
}

/** POST file?item=&name=&question= → keeps one file the person sends from their open plan's page, in parts, and answers
 *  its id. Only the app's own page sends one: a page elsewhere could ride the person's sign-in. */
export const fileUpload: Route = async (request, env, { url, identity }) => {
  if (!humanEmail(identity)) return refuse(403, "A person's sign-in sends a file.");
  if (request.headers.get("origin") !== url.origin) return refuse(403, "Send the file from this app.");
  const item = url.searchParams.get("item") ?? "", name = url.searchParams.get("name") ?? "", question = url.searchParams.get("question") ?? "";
  if (!itemId.safeParse(item).success) return fail("not_found", 404);
  const kind = fileType(name);
  if (!kind || !question.trim() || question.length > FILE_LIMITS.question || !request.body) return fail("bad_file", 400);
  if (Number(request.headers.get("content-length") ?? 0) > FILE_LIMITS.file) return fail("too_large", 413);
  const at = await scope(env, identity);
  const row = await openItem(at, item);
  if (row instanceof Response) return row;
  if (row.kind !== "plan") return fail("not_found", 404);
  const id = crypto.randomUUID().replaceAll("-", "");
  try {
    const size = await storeParts(at, id, request.body, kind, await waitingBytes(at, item));
    await mine(at, `INSERT INTO inbox_files (installation_id, email, id, item_id, tap_id, name, type, question, size, created_at)
      VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8, ?9)`, id, item, name, kind.type, question.trim(), size, at.now).run();
    return Response.json({ file: { id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await mine(at, "DELETE FROM inbox_file_parts WHERE installation_id = ?1 AND email = ?2 AND file_id = ?3", id).run();
    if (error instanceof Stop) return error.answer;
    throw error;
  }
}

/** A part's bytes as D1 or SQLite hands them back. */
const bytesOf = (data: ArrayBuffer | Uint8Array | number[]) => new Uint8Array(data);
function base64(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

const sent = z.strictObject({ name: z.string(), type: z.string(), question: z.string(), size: z.number(), parts: z.number(), data: z.string() });

/** GET file?id=&part= → the computer reads one part of a file its collected tap carries; no other time, no one else. */
export const fileRead = inboxAction<{ id: string; part: number }>({
  operationId: "inbox.file", summary: "Read a sent file", description: "The person's computer reads one part of a file a tap it collected carries.",
  input: z.strictObject({ id: itemId.describe("The file's id."), part: z.number().int().nonnegative().describe("Which part, from 0.") }),
  output: sent, encoding: "query", effect: "read", limits: { inputBytes: 65536, outputBytes: 1048576, timeoutMs: 15000 },
  async run(at, { id, part }) {
    await settleTaps(at);
    // A 100 MB send is some 200 reads: each holds its check-in's taps, which share one claim time, a while longer.
    await mine(at, `UPDATE inbox_taps SET claimed_at = ?4 WHERE installation_id = ?1 AND email = ?2 AND state = 'delivering'
      AND claimed_at = (SELECT t.claimed_at FROM inbox_files f JOIN inbox_taps t ON t.installation_id = f.installation_id
        AND t.email = f.email AND t.id = f.tap_id WHERE f.installation_id = ?1 AND f.email = ?2 AND f.id = ?3 AND t.state = 'delivering')`,
    id, at.now).run();
    const file = await mine(at, `SELECT f.name, f.type, f.question, f.size, (SELECT COUNT(*) FROM inbox_file_parts p
      WHERE p.installation_id = f.installation_id AND p.email = f.email AND p.file_id = f.id) AS parts FROM inbox_files f
      JOIN inbox_taps t ON t.installation_id = f.installation_id AND t.email = f.email AND t.id = f.tap_id
      WHERE f.installation_id = ?1 AND f.email = ?2 AND f.id = ?3 AND t.state = 'delivering'`, id)
      .first<{ name: string; type: string; question: string; size: number; parts: number }>();
    const data = file && await mine(at, "SELECT data FROM inbox_file_parts WHERE installation_id = ?1 AND email = ?2 AND file_id = ?3 AND n = ?4",
      id, part).first<{ data: ArrayBuffer | Uint8Array | number[] }>();
    return file && data ? Response.json({ ...file, data: base64(bytesOf(data.data)) }) : fail("not_found", 404);
  },
});

/** `loose` when each of `files` is the person's file on `item` with no tap yet; `gone` once any is deleted or never
 *  theirs; else `taken` by another tap. */
export async function fileState(at: Scope, item: string, files: string[]) {
  const { results } = await mine(at, `SELECT tap_id FROM inbox_files WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3
    AND id IN (SELECT value FROM json_each(?4))`, item, JSON.stringify(files)).all<{ tap_id: string | null }>();
  return results.length < files.length ? "gone" : results.every(row => row.tap_id === null) ? "loose" : "taken";
}

/** The ids of the files the app still holds for the person's `item`, so its page forgets the ones it deleted. */
export async function heldFiles(at: Scope, item: string) {
  const { results } = await mine(at, `SELECT id FROM inbox_files WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3
    ORDER BY created_at, rowid`, item).all<{ id: string }>();
  return results.map(row => row.id);
}

/** Ties each of `files` to the tap that carries them. */
export const attachFiles = (at: Scope, tap: string, files: string[]) => mine(at, `UPDATE inbox_files SET tap_id = ?3
  WHERE installation_id = ?1 AND email = ?2 AND tap_id IS NULL AND id IN (SELECT value FROM json_each(?4))`, tap, JSON.stringify(files)).run();

export type SentFile = { id: string; name: string; question: string; size: number };
/** Each tap's files, by tap id. */
export async function filesOf(at: Scope, taps: string[]) {
  const { results } = await mine(at, `SELECT tap_id, id, name, question, size FROM inbox_files WHERE installation_id = ?1 AND email = ?2
    AND tap_id IN (SELECT value FROM json_each(?3)) ORDER BY created_at, rowid`, JSON.stringify(taps)).all<SentFile & { tap_id: string }>();
  const byTap = new Map<string, SentFile[]>();
  for (const { tap_id: tap, ...file } of results) byTap.set(tap, [...(byTap.get(tap) ?? []), file]);
  return byTap;
}

/** Deletes the files of every tap that is done, after a write that settled one. */
export const dropFiles = (at: Scope) => at.db.batch(dropSettledFiles(at));
