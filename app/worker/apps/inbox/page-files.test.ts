// A plain page's files: the computer uploads each, then puts the page that names them; only its own person downloads.
import { expect, it } from "vitest";
import type { AccessIdentity } from "../../access-slots";
import { handleApp } from "../index";
import { PART_BYTES } from "./files";
import { PAGE_FILES } from "./page-files";
import { fakeEnv } from "../../../tests/env";
import { approval, APPROVAL, call, db, jo, later, machine, plan, PLAN, put, sam, sha256Of, START, upload } from "../../../tests/inbox";

const PAGE = "c".repeat(32);
const page = { ...plan, id: PAGE, title: "Q2 sales", body: "<p>Q2</p>", actions: [], version: "p1", plain: true };
const XLSM = new TextEncoder().encode("PK\x03\x04 a workbook with macros");
const named = (name: string, bytes: Uint8Array) => ({ name, size: bytes.byteLength, sha256: sha256Of(bytes) });
const download = (who: AccessIdentity | null, name: string, id = PAGE) => handleApp(new Request(
  `https://business.example.com/apps/inbox/api/page-file?${new URLSearchParams({ id, name })}`), fakeEnv({ DB: db.DB }), who);
const count = (table: string) => (db.sql.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
const bytesOf = async (response: Response) => new Uint8Array(await response.arrayBuffer());

it("downloads an uploaded file once its page names it, always as an attachment", async () => {
  expect(await upload(sam, PAGE, "wbd-q2.xlsm", XLSM)).toEqual({ status: 200, json: { file: named("wbd-q2.xlsm", XLSM) } });
  expect((await download(sam, "wbd-q2.xlsm")).status).toBe(404);
  expect((await put(sam, { ...page, files: [named("wbd-q2.xlsm", XLSM)] })).status).toBe(200);
  expect((await call(sam, "GET", "item", { id: PAGE })).json.item.pageFiles).toEqual([{ name: "wbd-q2.xlsm", size: XLSM.byteLength }]);
  const got = await download(sam, "wbd-q2.xlsm");
  expect(await bytesOf(got)).toEqual(XLSM);
  expect(Object.fromEntries(["content-type", "content-length", "content-disposition", "x-content-type-options", "content-security-policy", "cache-control"]
    .map(header => [header, got.headers.get(header)]))).toEqual({
    "content-type": "application/octet-stream", "content-length": String(XLSM.byteLength), "content-disposition": "attachment; filename*=UTF-8''wbd-q2.xlsm",
    "x-content-type-options": "nosniff", "content-security-policy": "sandbox", "cache-control": "private, no-store",
  });
  // The same bytes again skip the store, as the page already names them: the stored part is not written again.
  const stamp = () => db.sql.prepare("SELECT created_at FROM inbox_page_file_parts").all().map(row => row.created_at);
  const before = stamp();
  later(1000);
  expect((await upload(sam, PAGE, "wbd-q2.xlsm", XLSM)).status).toBe(200);
  expect(stamp()).toEqual(before);
});

it("refuses a page that names stored bytes under a name they do not start as", async () => {
  const notes = new TextEncoder().encode("plain notes");
  await upload(sam, PAGE, "notes.txt", notes);
  expect(await put(sam, { ...page, files: [named("notes.pdf", notes)] }))
    .toMatchObject({ status: 400, json: { error: { code: "bad_page_file" } } });
  // Uploaded again under the new name once the page names them, the bytes skip the check there, but not at the put.
  expect((await put(sam, { ...page, files: [named("notes.txt", notes)] })).status).toBe(200);
  expect((await upload(sam, PAGE, "notes.pdf", notes)).status).toBe(200);
  expect(await put(sam, { ...page, version: "p2", files: [named("notes.pdf", notes)] }))
    .toMatchObject({ status: 400, json: { error: { code: "bad_page_file" } } });
  expect((await call(sam, "GET", "item", { id: PAGE })).json.item.pageFiles).toEqual([{ name: "notes.txt", size: notes.byteLength }]);
});

it("escapes a name's own characters in the download's name, gives a known ending its type, and streams every part", async () => {
  const pdf = new Uint8Array(PART_BYTES * 2 + 5);
  pdf.set(new TextEncoder().encode("%PDF-1.7"));
  pdf[PART_BYTES + 1] = 7;
  const name = "Kim's (final) é.pdf";
  expect((await upload(sam, PAGE, name, pdf)).status).toBe(200);
  await put(sam, { ...page, files: [named(name, pdf)] });
  expect(count("inbox_page_file_parts")).toBe(3);
  const got = await download(sam, name);
  expect([got.headers.get("content-disposition"), got.headers.get("content-type")])
    .toEqual(["attachment; filename*=UTF-8''Kim%27s%20%28final%29%20%C3%A9.pdf", "application/pdf"]);
  // A hash, as toEqual on a megabyte of bytes takes many seconds.
  expect(sha256Of(await bytesOf(got))).toBe(sha256Of(pdf));
  // A part gone from under the page fails the download, never hands back a short file.
  db.sql.prepare("DELETE FROM inbox_page_file_parts WHERE n = 1").run();
  await expect((await download(sam, name)).arrayBuffer()).rejects.toThrow();
});

it("gives another person no bytes of Sam's file, and refuses a service token and another site", async () => {
  await upload(sam, PAGE, "wbd-q2.xlsm", XLSM);
  await put(sam, { ...page, files: [named("wbd-q2.xlsm", XLSM)] });
  expect((await download(jo, "wbd-q2.xlsm")).status).toBe(404);
  expect((await download(sam, "wbd-q2.xlsm", "nope")).status).toBe(404);
  const bare = (method: string, query: string) => handleApp(new Request(`https://business.example.com/apps/inbox/api/page-file${query}`,
    { method }), fakeEnv({ DB: db.DB }), sam);
  expect([(await bare("GET", "")).status, (await bare("GET", `?id=${PAGE}`)).status]).toEqual([404, 404]);
  expect([(await bare("PUT", "")).status, (await bare("PUT", `?id=${PAGE}`)).status]).toEqual([404, 400]);
  expect((await bare("PUT", `?id=${PAGE}&name=a.txt`)).status).toBe(400);
  expect((await download(machine, "wbd-q2.xlsm")).status).toBe(403);
  expect((await upload(machine, PAGE, "wbd-q2.xlsm", XLSM)).status).toBe(403);
  expect((await upload(sam, PAGE, "wbd-q2.xlsm", XLSM, {}, { origin: "https://evil.example.com" })).status).toBe(403);
  expect((await upload(sam, PAGE, "wbd-q2.xlsm", XLSM, {}, { origin: "https://business.example.com" })).status).toBe(200);
  // Jo's page of the same id can't name Sam's upload: his files sit apart.
  expect((await put(jo, { ...page, files: [named("wbd-q2.xlsm", XLSM)] })).json.error.code).toBe("no_upload");
});

it("refuses a file over 25 MB, a bad name, a wrong hash, bytes that are not what the name says, and a review page's id", async () => {
  const big = new Uint8Array(PAGE_FILES.file + 1);
  expect(await upload(sam, PAGE, "big.zip", big)).toMatchObject({ status: 413, json: { error: { code: "too_large" } } });
  expect(await upload(sam, PAGE, "big.bin", big, {}, { "content-length": String(big.byteLength) }))
    .toMatchObject({ status: 413, json: { error: { code: "too_large" } } });
  for (const name of ["a/b.csv", "a\\b.csv", "a\nb.csv", "", "x".repeat(201)]) {
    expect(await upload(sam, PAGE, name, XLSM), name).toMatchObject({ status: 400, json: { error: { code: "bad_page_file" } } });
  }
  const refused = [
    upload(sam, PAGE, "wbd-q2.xlsm", XLSM, { sha256: "0".repeat(64) }), upload(sam, PAGE, "wbd-q2.xlsm", XLSM, { sha256: "nope" }),
    upload(sam, PAGE, "brief.pdf", XLSM), upload(sam, PAGE, "empty.txt", new Uint8Array()),
  ];
  for (const answer of refused) expect(await answer).toMatchObject({ status: 400, json: { error: { code: "bad_page_file" } } });
  expect((await upload(sam, "nope", "wbd-q2.xlsm", XLSM)).status).toBe(404);
  // A body cut off midway fails the call and keeps none of its parts.
  const cut = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(XLSM); controller.error(new Error("cut")); } });
  await expect(handleApp(new Request(`https://business.example.com/apps/inbox/api/page-file?${new URLSearchParams({ id: PAGE,
    name: "wbd-q2.xlsm", sha256: sha256Of(XLSM) })}`, { method: "PUT", body: cut, duplex: "half" } as RequestInit), fakeEnv({ DB: db.DB }), sam))
    .rejects.toThrow("cut");
  await put(sam, approval);
  expect(await upload(sam, APPROVAL, "wbd-q2.xlsm", XLSM)).toMatchObject({ status: 400, json: { error: { code: "not_page" } } });
  await put(sam, plan);
  expect(await upload(sam, PLAN, "wbd-q2.xlsm", XLSM)).toMatchObject({ status: 400, json: { error: { code: "not_page" } } });
  expect(count("inbox_page_file_parts")).toBe(0);
});

it("refuses an upload once the app's page files would pass 1 GB", async () => {
  const app = PAGE_FILES.app;
  PAGE_FILES.app = XLSM.byteLength + 1;
  try {
    expect((await upload(sam, PAGE, "one.xlsm", XLSM)).status).toBe(200);
    expect(await upload(jo, PAGE, "two.xlsm", new TextEncoder().encode("PK\x03\x04 another workbook!")))
      .toMatchObject({ status: 507, json: { error: { code: "pages_full" } } });
  } finally { PAGE_FILES.app = app; }
  expect(count("inbox_page_file_parts")).toBe(1);
});

it("drops a page's old file when it is put again with another, and refuses a file named but never uploaded whole", async () => {
  const v1 = new TextEncoder().encode("PK\x03\x04 v1"), v2 = new TextEncoder().encode("PK\x03\x04 v2");
  expect((await put(sam, { ...page, files: [named("wbd-q2.xlsm", v1)] })).json.error.code).toBe("no_upload");
  expect(count("inbox_items")).toBe(0);
  await upload(sam, PAGE, "wbd-q2.xlsm", v1);
  expect((await put(sam, { ...page, files: [{ ...named("wbd-q2.xlsm", v1), size: 3 }] })).json.error.code).toBe("no_upload");
  await put(sam, { ...page, files: [named("wbd-q2.xlsm", v1)] });
  await upload(sam, PAGE, "wbd-q2-v2.xlsm", v2);
  await put(sam, { ...page, version: "p2", files: [named("wbd-q2-v2.xlsm", v2)] });
  expect((await call(sam, "GET", "item", { id: PAGE })).json.item.pageFiles).toEqual([{ name: "wbd-q2-v2.xlsm", size: v2.byteLength }]);
  expect((await download(sam, "wbd-q2.xlsm")).status).toBe(404);
  expect(await bytesOf(await download(sam, "wbd-q2-v2.xlsm"))).toEqual(v2);
  expect(db.sql.prepare("SELECT sha256 FROM inbox_page_file_parts").all().map(row => row.sha256)).toEqual([sha256Of(v2)]);
  // Put with no files, the page carries none.
  await put(sam, { ...page, version: "p3" });
  expect([(await call(sam, "GET", "item", { id: PAGE })).json.item.pageFiles, count("inbox_page_file_parts")]).toEqual([[], 0]);
});

it("holds 5 files a page at most, each named once, and only on a plain page", async () => {
  const files = Array.from({ length: 6 }, (_, n) => ({ name: `f${n}.txt`, size: 1, sha256: "0".repeat(64) }));
  expect((await put(sam, { ...page, files })).status).toBe(400);
  expect((await put(sam, { ...page, files: [files[0], files[0]] })).status).toBe(400);
  expect((await put(sam, { ...plan, files: [files[0]] })).json.error.code).toBe("bad_plain");
  expect(count("inbox_items")).toBe(0);
});

it("deletes an upload no page names a day later, at the next upload; a named one stays", async () => {
  const next = new TextEncoder().encode("next");
  await upload(jo, PAGE, "stray.txt", new TextEncoder().encode("never named"));
  await upload(sam, PAGE, "wbd-q2.xlsm", XLSM);
  await put(sam, { ...page, files: [named("wbd-q2.xlsm", XLSM)] });
  later(24 * 3_600_000 + 1);
  await upload(sam, PAGE, "next.txt", next);
  expect(db.sql.prepare("SELECT sha256 FROM inbox_page_file_parts ORDER BY created_at").all().map(row => row.sha256))
    .toEqual([sha256Of(XLSM), sha256Of(next)]);
});

it("removes the files of an item the inbox removed", async () => {
  await upload(sam, PAGE, "notes.xlsm", XLSM);
  await put(sam, { ...page, body: "", files: [named("notes.xlsm", XLSM)] });
  // Older code emptied a closed review page's body; the inbox removes such an item, with its files.
  db.sql.prepare("UPDATE inbox_items SET closed_at = ?").run(START);
  later(24 * 3_600_000 + 1);
  await call(sam, "POST", "checkin", { items: [] });
  expect([count("inbox_items"), count("inbox_page_files"), count("inbox_page_file_parts")]).toEqual([0, 0, 0]);
});

it("keeps the bytes a page put again still names, even when a dropped name shared them", async () => {
  await upload(sam, PAGE, "a.xlsm", XLSM);
  await upload(sam, PAGE, "b.xlsm", XLSM);
  // Two names with the same bytes share one stored copy.
  expect(count("inbox_page_file_parts")).toBe(1);
  await put(sam, { ...page, files: [named("a.xlsm", XLSM), named("b.xlsm", XLSM)] });
  for (const name of ["a.xlsm", "b.xlsm"]) expect(await bytesOf(await download(sam, name)), name).toEqual(XLSM);
  // Dropping a.xlsm keeps the parts b.xlsm still names.
  expect((await put(sam, { ...page, version: "p2", files: [named("b.xlsm", XLSM)] })).status).toBe(200);
  expect((await download(sam, "a.xlsm")).status).toBe(404);
  expect(await bytesOf(await download(sam, "b.xlsm"))).toEqual(XLSM);
  // Put again with the same file and no new upload: the file stays.
  expect((await put(sam, { ...page, version: "p3", files: [named("b.xlsm", XLSM)] })).status).toBe(200);
  expect(await bytesOf(await download(sam, "b.xlsm"))).toEqual(XLSM);
  expect(count("inbox_page_file_parts")).toBe(1);
});
