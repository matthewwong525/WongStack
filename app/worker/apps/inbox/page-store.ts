// The bytes of a page's HTML, files, pictures and videos: in the INBOX_PAGES bucket when the app binds one, else in
// D1 parts. A page's files stay in D1 parts. wiki/development/plain-pages.md#why-and-edge-cases
import { FILE_LIMITS, PART_BYTES, readParts, startsAsNamed, Stop, typeOf } from "./files.ts";
import { fail, mine, type Scope } from "./store.ts";

const MB = 1024 * 1024;
/** Plain pages never expire, so D1 parts share one cap that keeps room for the inbox's own rows. */
export const PAGE_FILES = { file: FILE_LIMITS.file, page: 5, app: 1024 ** 3 };
export const PAGE_BODY_BYTES = 25 * MB;
/** A picture or video: 95 MB in the bucket, a page file's 25 MB in D1. */
export const mediaBytes = (at: Pick<Scope, "pages">) => (at.pages ? 95 * MB : PAGE_FILES.file);

export type Role = "file" | "media" | "body";
export type Stored = "db" | "bucket";
export type Owner = Pick<Scope, "db" | "installation" | "email" | "pages">;
export type Blob = { item: string; sha256: string; size: number; stored: Stored };

export const PARTS = "FROM inbox_page_file_parts WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3 AND sha256 = ?4";
/** An upload to the bucket keeps this part row, with no bytes, so a day-old one no page names is found and deleted. */
const MARK = -1;

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
const digest = async (text: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));

/** Where a role's new bytes go: a file to D1, a page's HTML or media to the bucket when there is one. */
export const storeFor = (at: Pick<Scope, "pages">, role: Role): Stored => (role !== "file" && at.pages ? "bucket" : "db");

/** The bucket key: one folder an item, under its person's hashed email. */
const keyOf = async (at: Owner, item: string, sha256: string) => `inbox/${at.installation || "-"}/${await digest(at.email)}/${item}/${sha256}`;

/** Streams `body` into D1 parts, hashing as it comes; refuses one over `max` or the app's cap, an empty one, one whose
 *  first bytes `starts` refuses, and one whose bytes are not `hash`. */
async function intoParts(at: Scope, item: string, hash: string, body: ReadableStream<Uint8Array>, max: number,
  starts: (bytes: Uint8Array) => boolean) {
  const used = await at.db.prepare("SELECT COALESCE(SUM(length(data)), 0) AS bytes FROM inbox_page_file_parts WHERE installation_id = ?1")
    .bind(at.installation).first<{ bytes: number }>();
  const digesting = new crypto.DigestStream("SHA-256");
  const hashing = digesting.getWriter();
  const size = await readParts(body, async (chunk, size) => {
    if (size > max) throw new Stop(fail("too_large", 413));
    if (used!.bytes + size > PAGE_FILES.app) throw new Stop(fail("pages_full", 507));
    await hashing.write(chunk);
  }, async (data, n) => {
    if (n === 0 && !starts(data)) throw new Stop(fail("bad_page_file", 400));
    await mine(at, "INSERT INTO inbox_page_file_parts (installation_id, email, item_id, sha256, n, created_at, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
      item, hash, n, at.now, data).run();
  });
  await hashing.close();
  if (!size || hex(await digesting.digest) !== hash) throw new Stop(fail("bad_page_file", 400));
  return size;
}

/** Streams `body` of `length` bytes into the bucket; R2 checks the hash, and the first bytes are checked as they pass. */
async function intoBucket(at: Scope, item: string, hash: string, body: ReadableStream<Uint8Array>, length: number,
  starts: (bytes: Uint8Array) => boolean, type: string) {
  let head = new Uint8Array(0);
  const checked = new TransformStream<Uint8Array, Uint8Array>({ transform(chunk, controller) {
    if (head.byteLength < 16) {
      head = new Uint8Array([...head, ...chunk.subarray(0, 16 - head.byteLength)]);
      if ((head.byteLength === 16 || head.byteLength === length) && !starts(head)) throw new Stop(fail("bad_page_file", 400));
    }
    controller.enqueue(chunk);
  } });
  const fixed = new FixedLengthStream(length);
  const flowing = body.pipeThrough(checked).pipeTo(fixed.writable);
  try {
    await Promise.all([at.pages!.put(await keyOf(at, item, hash), fixed.readable, { sha256: hash, httpMetadata: { contentType: type } }), flowing]);
  } catch (error) {
    throw error instanceof Stop ? error : new Stop(fail("bad_page_file", 400));
  }
  await mine(at, "INSERT INTO inbox_page_file_parts (installation_id, email, item_id, sha256, n, created_at, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    item, hash, MARK, at.now, new Uint8Array(0)).run();
  return length;
}

/** Keeps the upload `hash` of `item`, named `name` (an empty name for a page's HTML), where `stored` says: refuses one
 *  over `max`, one that does not start as its name says, and one whose bytes are not `hash`. Resolves to the size. */
export async function storeUpload(at: Scope, { item, name, hash, body, stored, max, length }: { item: string; name: string; hash: string;
  body: ReadableStream<Uint8Array>; stored: Stored; max: number; length: number }) {
  const starts = (bytes: Uint8Array) => (name ? startsAsNamed(name, bytes) : !bytes.includes(0));
  if (stored === "db") return intoParts(at, item, hash, body, max, starts);
  if (!length) return Promise.reject(new Stop(fail("bad_page_file", 400)));
  if (length > max) return Promise.reject(new Stop(fail("too_large", 413)));
  return intoBucket(at, item, hash, body, length, starts, name ? typeOf(name) : "text/html; charset=utf-8");
}

/** Deletes `item`'s upload `hash` from where `stored` says, before a new upload or after a refused one. */
export async function dropUpload(at: Scope, item: string, hash: string, stored: Stored) {
  await mine(at, `DELETE ${PARTS} AND (n = ${MARK}) = ?5`, item, hash, stored === "bucket" ? 1 : 0).run();
  if (stored === "bucket") await at.pages!.delete(await keyOf(at, item, hash));
}

/** How many bytes of `item`'s upload `hash` are kept, where `stored` says. */
export async function storedSize(at: Owner, item: string, hash: string, stored: Stored) {
  if (stored === "bucket") return (await at.pages?.head(await keyOf(at, item, hash)))?.size ?? 0;
  return (await mine(at, `SELECT COALESCE(SUM(length(data)), 0) AS bytes ${PARTS}`, item, hash).first<{ bytes: number }>())!.bytes;
}

/** The first bytes of `item`'s upload `hash`. */
export async function firstBytes(at: Owner, item: string, hash: string, stored: Stored) {
  if (stored === "bucket") {
    const got = await at.pages?.get(await keyOf(at, item, hash), { range: { offset: 0, length: 4096 } });
    return got ? new Uint8Array(await got.arrayBuffer()) : new Uint8Array(0);
  }
  const first = await mine(at, `SELECT data ${PARTS} AND n = 0`, item, hash).first<{ data: ArrayBuffer | Uint8Array | number[] }>();
  return first ? new Uint8Array(first.data) : new Uint8Array(0);
}

/** `owner`'s kept `blob`, streamed: the bucket's object, or its D1 parts in order. */
export async function readStored(owner: Owner, blob: Blob): Promise<ReadableStream<Uint8Array>> {
  if (blob.stored === "bucket") {
    const got = await owner.pages?.get(await keyOf(owner, blob.item, blob.sha256));
    if (!got) throw new Error("The page's stored bytes are gone.");
    return got.body;
  }
  const parts = Math.ceil(blob.size / PART_BYTES);
  let n = 0;
  return new ReadableStream<Uint8Array>({ async pull(controller) {
    if (n === parts) return controller.close();
    const part = await mine(owner, `SELECT data ${PARTS} AND n = ?5`, blob.item, blob.sha256, n).first<{ data: ArrayBuffer | Uint8Array | number[] }>();
    if (!part) return controller.error(new Error("A part of the file is gone."));
    controller.enqueue(new Uint8Array(part.data));
    n += 1;
  } });
}

/** Deletes the bucket objects of `item` that `keep` does not name: what a page put again no longer shows. */
export async function dropUnnamed(at: Owner, item: string, keep: string[]) {
  if (!at.pages) return;
  const prefix = (await keyOf(at, item, "")).slice(0, -1) + "/";
  const named = new Set(keep);
  let cursor: string | undefined;
  do {
    const listed = await at.pages.list({ prefix, cursor });
    const gone = listed.objects.map(object => object.key).filter(key => !named.has(key.slice(prefix.length)));
    if (gone.length) await at.pages.delete(gone);
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

// An upload's parts no page names: an upload whose page never came, or one a page put again dropped.
const UNNAMED = `NOT EXISTS (SELECT 1 FROM inbox_page_files f WHERE f.installation_id = inbox_page_file_parts.installation_id
  AND f.email = inbox_page_file_parts.email AND f.item_id = inbox_page_file_parts.item_id AND f.sha256 = inbox_page_file_parts.sha256)`;

/** Deletes every person's uploads kept before `before` that no page names, in the bucket too. The app's room counts all. */
export async function pruneUploads(at: Scope, before: number) {
  if (at.pages) {
    const marks = (await at.db.prepare(`SELECT email, item_id AS item, sha256 FROM inbox_page_file_parts WHERE installation_id = ?1
      AND created_at < ?2 AND n = ${MARK} AND ${UNNAMED}`).bind(at.installation, before).all<{ email: string; item: string; sha256: string }>()).results;
    if (marks.length) await at.pages.delete(await Promise.all(marks.map(mark => keyOf({ ...at, email: mark.email }, mark.item, mark.sha256))));
  }
  await mine(at, `DELETE FROM inbox_page_file_parts WHERE installation_id = ?1 AND created_at < ?3 AND ${UNNAMED}`, before).run();
}
