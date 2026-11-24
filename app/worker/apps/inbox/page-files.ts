// A plain page's files: the computer uploads each into D1 parts, then puts the page that names them; the person,
// or a teammate with its open team link, downloads them. wiki/development/plain-pages.md#a-page-with-files
import { z } from "zod";
import { humanEmail, type Route } from "../../api/contract.ts";
import { pruneUploads } from "./file-rows.ts";
import { FILE_LIMITS, PART_BYTES, readParts, safeName, startsAsNamed, Stop, typeOf } from "./files.ts";
import { fail, findItem, itemId, type ItemRow, mine, scope, type Scope } from "./store.ts";

/** Plain pages never expire, so the app's page files share one cap that keeps D1 room for the inbox's own rows. */
export const PAGE_FILES = { file: FILE_LIMITS.file, page: 5, app: 1024 ** 3 };
/** An upload no page names after a day is deleted at the next upload. */
const KEEP_MS = 24 * 3_600_000;

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
/** A file as `PUT item` names it, once uploaded. */
const pageFile = z.strictObject({ name: z.string().refine(safeName), size: z.number().int().positive().max(PAGE_FILES.file), sha256 });
export const pageFiles = z.array(pageFile).max(PAGE_FILES.page)
  .refine(files => new Set(files.map(file => file.name)).size === files.length, "Each file needs its own name.");
type PageFile = z.infer<typeof pageFile>;
type Owner = Pick<Scope, "db" | "installation" | "email">;
type FileRow = { item: string; name: string; size: number; type: string; sha256: string };

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
const noStore = { "Cache-Control": "no-store" };
const refuse = (text: string) => new Response(text, { status: 403, headers: noStore });
const PARTS = "FROM inbox_page_file_parts WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3 AND sha256 = ?4";

/** Streams `body` into the parts of `item`'s upload `hash`, hashing as it comes; refuses a file over its limit or the
 *  app's, one that does not start as `name` says, an empty one, and one whose bytes are not `hash`. */
async function storeUpload(at: Scope, item: string, name: string, hash: string, body: ReadableStream<Uint8Array>) {
  const used = await at.db.prepare("SELECT COALESCE(SUM(length(data)), 0) AS bytes FROM inbox_page_file_parts WHERE installation_id = ?1")
    .bind(at.installation).first<{ bytes: number }>();
  const digest = new crypto.DigestStream("SHA-256");
  const hashing = digest.getWriter();
  const size = await readParts(body, async (chunk, size) => {
    if (size > PAGE_FILES.file) throw new Stop(fail("too_large", 413));
    if (used!.bytes + size > PAGE_FILES.app) throw new Stop(fail("pages_full", 507));
    await hashing.write(chunk);
  }, async (data, n) => {
    if (n === 0 && !startsAsNamed(name, data)) throw new Stop(fail("bad_page_file", 400));
    await mine(at, "INSERT INTO inbox_page_file_parts (installation_id, email, item_id, sha256, n, created_at, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
      item, hash, n, at.now, data).run();
  });
  await hashing.close();
  if (!size || hex(await digest.digest) !== hash) throw new Stop(fail("bad_page_file", 400));
  return size;
}

/** PUT page-file?id=&name=&sha256= → keeps one file for the caller's page `id`, in parts, before the page names it.
 *  Only the person's computer uploads: a page on another site could ride their sign-in. */
export const pageFileUpload: Route = async (request, env, { url, identity }) => {
  if (!humanEmail(identity)) return refuse("A person's sign-in uploads a page's file.");
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return refuse("Upload the file from the computer.");
  const id = url.searchParams.get("id") ?? "", name = url.searchParams.get("name") ?? "", hash = url.searchParams.get("sha256") ?? "";
  if (!itemId.safeParse(id).success) return fail("not_found", 404);
  if (!safeName(name) || !sha256.safeParse(hash).success || !request.body) return fail("bad_page_file", 400);
  if (Number(request.headers.get("content-length") ?? 0) > PAGE_FILES.file) return fail("too_large", 413);
  const at = await scope(env, identity);
  // An id with no item yet is fine: the page is put after its files. A review page or a card takes no files.
  const row = await findItem<ItemRow & { plain: number }>(at, id, ", plain");
  if (!(row instanceof Response) && (row.kind !== "plan" || row.plain !== 1)) return fail("not_page", 400);
  await pruneUploads(at, at.now - KEEP_MS).run();
  const answer = (size: number) => Response.json({ file: { name, size, sha256: hash } }, { headers: noStore });
  // The page already names these bytes: a page put again keeps them as they are.
  const named = await mine(at, "SELECT size FROM inbox_page_files WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3 AND sha256 = ?4",
    id, hash).first<{ size: number }>();
  if (named) return answer(named.size);
  const drop = () => mine(at, `DELETE ${PARTS}`, id, hash).run();
  await drop();
  try {
    return answer(await storeUpload(at, id, name, hash, request.body));
  } catch (error) {
    await drop();
    if (error instanceof Stop) return error.answer;
    throw error;
  }
};

/** The statements that make `files` the page `item`'s own, once each is checked to be uploaded whole and to start as
 *  its name says, and drop the parts it no longer names; or the refusal. */
export async function replaceFiles(at: Scope, item: string, files: PageFile[]) {
  for (const file of files) {
    const stored = await mine(at, `SELECT COALESCE(SUM(length(data)), 0) AS bytes ${PARTS}`, item, file.sha256).first<{ bytes: number }>();
    if (stored!.bytes !== file.size) return fail("no_upload", 400);
    // An upload checks its first bytes against the name it came with; the page may name the same bytes otherwise.
    const first = await mine(at, `SELECT data ${PARTS} AND n = 0`, item, file.sha256).first<{ data: ArrayBuffer | Uint8Array | number[] }>();
    if (!startsAsNamed(file.name, new Uint8Array(first!.data))) return fail("bad_page_file", 400);
  }
  return [
    mine(at, "DELETE FROM inbox_page_files WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3", item),
    ...files.map(file => mine(at, `INSERT INTO inbox_page_files (installation_id, email, item_id, name, size, type, sha256, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`, item, file.name, file.size, typeOf(file.name), file.sha256, at.now)),
    mine(at, `DELETE FROM inbox_page_file_parts WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3
      AND sha256 NOT IN (SELECT value FROM json_each(?4))`, item, JSON.stringify(files.map(file => file.sha256))),
  ];
}

/** The files page `item` lists, as it was put: each name and size. */
export const filesOfPage = async (at: Owner, item: string) => (await mine(at, `SELECT name, size FROM inbox_page_files
  WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3 ORDER BY rowid`, item).all<{ name: string; size: number }>()).results;

/** The page `item`'s file `name`, or null. */
export const fileOfPage = (at: Owner, item: string, name: string) => mine(at, `SELECT item_id AS item, name, size, type, sha256
  FROM inbox_page_files WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3 AND name = ?4`, item, name).first<FileRow>();

/** `name` for a `filename*` value: RFC 5987 leaves `'()*` out of what may stand bare. */
const headerName = (name: string) => encodeURIComponent(name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** `owner`'s file `row` as a download the browser saves, never shows on the app's origin; its parts stream in order. */
export function downloaded(owner: Owner, row: FileRow | null) {
  if (!row) return fail("not_found", 404);
  const parts = Math.ceil(row.size / PART_BYTES);
  let n = 0;
  const body = new ReadableStream<Uint8Array>({ async pull(controller) {
    if (n === parts) return controller.close();
    const part = await mine(owner, `SELECT data ${PARTS} AND n = ?5`, row.item, row.sha256, n).first<{ data: ArrayBuffer | Uint8Array | number[] }>();
    if (!part) return controller.error(new Error("A part of the file is gone."));
    controller.enqueue(new Uint8Array(part.data));
    n += 1;
  } });
  return new Response(body, { headers: {
    "Content-Type": row.type, "Content-Length": String(row.size), "Content-Disposition": `attachment; filename*=UTF-8''${headerName(row.name)}`,
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox", "Cache-Control": "private, no-store",
  } });
}

/** GET page-file?id=&name= → the caller's own page file, as a download. */
export const pageFileRead: Route = async (_request, env, { url, identity }) => {
  if (!humanEmail(identity)) return refuse("A person's sign-in downloads a page's file.");
  const id = url.searchParams.get("id") ?? "";
  if (!itemId.safeParse(id).success) return fail("not_found", 404);
  const at = await scope(env, identity);
  return downloaded(at, await fileOfPage(at, id, url.searchParams.get("name") ?? ""));
};
