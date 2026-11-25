// A page's HTML, files, pictures and videos: the computer uploads each, then puts the page that names them; the
// person, or a teammate with its open team link, reads them. wiki/development/plain-pages.md#a-page-with-files
import { z } from "zod";
import { humanEmail, type Route } from "../../api/contract.ts";
import { isMedia, safeName, startsAsNamed, Stop, typeOf } from "./files.ts";
import { dropUnnamed, dropUpload, firstBytes, mediaBytes, type Owner, PAGE_BODY_BYTES, PAGE_FILES, pruneUploads, readStored, type Role,
  type Stored, storedSize, storeFor, storeUpload } from "./page-store.ts";
import { fail, findItem, itemId, type ItemRow, mine, scope, type Scope } from "./store.ts";

export { PAGE_FILES } from "./page-store.ts";
/** An upload no page names after a day is deleted at the next upload. */
const KEEP_MS = 24 * 3_600_000;
const MEDIA = 300;

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const unique = (files: { name: string }[]) => new Set(files.map(file => file.name)).size === files.length;
/** A file as `PUT item` names it, once uploaded. */
const pageFile = z.strictObject({ name: z.string().refine(safeName), size: z.number().int().positive().max(PAGE_FILES.file), sha256 });
export const pageFiles = z.array(pageFile).max(PAGE_FILES.page).refine(unique, "Each file needs its own name.");
/** A picture or video as `PUT item` names it, once uploaded; its size limit depends on the bucket. */
const mediaFile = z.strictObject({ name: z.string().refine(isMedia), size: z.number().int().positive(), sha256 });
export const pageMedia = z.array(mediaFile).max(MEDIA).refine(unique, "Each picture or video needs its own name.");
type Named = z.infer<typeof pageFile>;
type Entry = Named & { role: Role; stored: Stored };
type Handler = Extract<Route, (...args: never[]) => unknown>;
type FileRow = { item: string; name: string; size: number; type: string; sha256: string; stored: Stored };

const noStore = { "Cache-Control": "no-store" };
const refuse = (text: string) => new Response(text, { status: 403, headers: noStore });

/** Why an upload's query can not be kept, or null. */
function badQuery(role: Role, id: string, name: string, hash: string) {
  if (!itemId.safeParse(id).success) return fail("not_found", 404);
  if (role === "media" && !isMedia(name)) return fail("bad_media", 400);
  return (role === "body" || safeName(name)) && sha256.safeParse(hash).success ? null : fail("bad_page_file", 400);
}

/** An upload route for `role`: keeps the bytes for the caller's page `id` before the page names them. Only the
 *  person's computer uploads: a page on another site could ride their sign-in. */
const upload = (role: Role): Handler => async (request, env, { url, identity }) => {
  if (!humanEmail(identity)) return refuse("A person's sign-in uploads a page's file.");
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return refuse("Upload the file from the computer.");
  const id = url.searchParams.get("id") ?? "", name = role === "body" ? "" : url.searchParams.get("name") ?? "";
  const hash = url.searchParams.get("sha256") ?? "";
  const bad = badQuery(role, id, name, hash) ?? (request.body ? null : fail("bad_page_file", 400));
  if (bad) return bad;
  const at = await scope(env, identity);
  const max = role === "file" ? PAGE_FILES.file : role === "media" ? mediaBytes(at) : PAGE_BODY_BYTES;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > max) return fail("too_large", 413);
  // An id with no item yet is fine: the page is put after its uploads. A card takes none, and only a plain page files.
  const row = await findItem<ItemRow & { plain: number }>(at, id, ", plain");
  if (!(row instanceof Response) && (row.kind !== "plan" || (role === "file" && row.plain !== 1))) return fail("not_page", 400);
  await pruneUploads(at, at.now - KEEP_MS);
  const answer = (size: number) => Response.json({ file: { name, size, sha256: hash } }, { headers: noStore });
  const stored = storeFor(at, role);
  // The page already names these bytes there: a page put again keeps them as they are.
  const named = await mine(at, `SELECT size FROM inbox_page_files WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3 AND sha256 = ?4
    AND stored = ?5`, id, hash, stored).first<{ size: number }>();
  if (named) return answer(named.size);
  await dropUpload(at, id, hash, stored);
  try {
    return answer(await storeUpload(at, { item: id, name, hash, body: request.body!, stored, max, length }));
  } catch (error) {
    await dropUpload(at, id, hash, stored);
    if (error instanceof Stop) return error.answer;
    throw error;
  }
};

/** PUT page-file?id=&name=&sha256=[&media=1] → a plain page's file, or any page's picture or video. */
export const pageFileUpload: Route = (request, env, context) =>
  upload(context.url.searchParams.get("media") === "1" ? "media" : "file")(request, env, context);
/** PUT page-body?id=&sha256= → a page's HTML, up to 25 MB. */
export const pageBodyUpload = upload("body");

/** Why `entries` can not be the page's, or null: each kept whole, and each file or picture starting as its name says. */
async function unsound(at: Scope, item: string, entries: Entry[]) {
  for (const entry of entries) {
    if (await storedSize(at, item, entry.sha256, entry.stored) !== entry.size) return fail("no_upload", 400);
    // An upload checks its first bytes against the name it came with; the page may name the same bytes otherwise.
    if (entry.role !== "body" && !startsAsNamed(entry.name, await firstBytes(at, item, entry.sha256, entry.stored))) return fail("bad_page_file", 400);
  }
  return null;
}

/** The statements that make `files`, `media` and the uploaded HTML `body` the page `item`'s own, and drop what it no
 *  longer names; the HTML's `page` blob; and `after`, which deletes the bucket objects it dropped. Or the refusal. */
export async function replacePage(at: Scope, item: string, { files = [], media = [], body }: { files?: Named[]; media?: Named[]; body?: string }) {
  if (media.some(file => file.size > mediaBytes(at))) return fail("too_large", 413);
  if (!unique([...files, ...media])) return fail("bad_media", 400);
  const entries: Entry[] = [...files.map(file => ({ ...file, role: "file" as const, stored: "db" as const })),
    ...media.map(file => ({ ...file, role: "media" as const, stored: storeFor(at, "media") }))];
  if (body) {
    const stored = storeFor(at, "body");
    const size = await storedSize(at, item, body, stored);
    if (!size) return fail("no_upload", 400);
    entries.push({ name: "", size, sha256: body, role: "body", stored });
  }
  const refused = await unsound(at, item, entries);
  if (refused) return refused;
  const kept = entries.map(entry => entry.sha256);
  return { statements: [
    mine(at, "DELETE FROM inbox_page_files WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3", item),
    ...entries.map(entry => mine(at, `INSERT INTO inbox_page_files (installation_id, email, item_id, name, size, type, sha256, created_at, role, stored)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`, item, entry.name, entry.size, entry.name ? typeOf(entry.name) : "text/html",
    entry.sha256, at.now, entry.role, entry.stored)),
    mine(at, `DELETE FROM inbox_page_file_parts WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3
      AND sha256 NOT IN (SELECT value FROM json_each(?4))`, item, JSON.stringify(kept)),
  ], page: entries.find(entry => entry.role === "body"), after: () => dropUnnamed(at, item, kept) };
}

/** The files page `item` lists for download, as it was put: each name and size. */
export const filesOfPage = async (at: Owner, item: string) => (await mine(at, `SELECT name, size FROM inbox_page_files
  WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3 AND role = 'file' ORDER BY rowid`, item).all<{ name: string; size: number }>()).results;

/** The page `item`'s `role` blob `name` (empty for its HTML), or null. */
export const blobOfPage = (at: Owner, item: string, name: string, role: Role) => mine(at, `SELECT item_id AS item, name, size, type, sha256, stored
  FROM inbox_page_files WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3 AND name = ?4 AND role = ?5`, item, name, role).first<FileRow>();

/** `name` for a `filename*` value: RFC 5987 leaves `'()*` out of what may stand bare. */
const headerName = (name: string) => encodeURIComponent(name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** `owner`'s blob `row`, never shown on the app's origin: a file as a download the browser saves, a picture or video as
 *  bytes the inbox hands to the sealed page. */
export async function served(owner: Owner, row: FileRow | null, download: boolean) {
  if (!row) return fail("not_found", 404);
  return new Response(await readStored(owner, row), { headers: {
    "Content-Type": row.type, "Content-Length": String(row.size),
    ...(download && { "Content-Disposition": `attachment; filename*=UTF-8''${headerName(row.name)}` }),
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox", "Cache-Control": "private, no-store",
  } });
}

/** A read of the caller's own page's `role` blob, by `?id=&name=`. */
const ownRead = (role: "file" | "media"): Route => async (_request, env, { url, identity }) => {
  if (!humanEmail(identity)) return refuse("A person's sign-in reads a page's file.");
  const id = url.searchParams.get("id") ?? "";
  if (!itemId.safeParse(id).success) return fail("not_found", 404);
  const at = await scope(env, identity);
  return served(at, await blobOfPage(at, id, url.searchParams.get("name") ?? "", role), role === "file");
};

/** GET page-file?id=&name= → the caller's own page file, as a download. */
export const pageFileRead = ownRead("file");
/** GET page-media?id=&name= → the caller's own page's picture or video, for its sealed frame. */
export const pageMediaRead = ownRead("media");
