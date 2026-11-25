// A page's HTML, pictures and videos: in the bucket when the app binds one, else in D1 parts; each test runs both ways.
import { describe, expect, it } from "vitest";
import type { AccessIdentity } from "../../access-slots";
import { handleApp } from "../index";
import { PART_BYTES } from "./files";
import { approval, call, db, frameOf, inboxEnv, jo, later, pages, plan, PLAN, put, sam, sha256Of, upload, addBucket } from "../../../tests/inbox";

const MB = 1024 * 1024;
const PAGE = "c".repeat(32);
const plainPage = { ...plan, id: PAGE, title: "Kit sales", actions: [], version: "p1", plain: true };
const text = (value: string) => new TextEncoder().encode(value);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...text("a picture of a kit")]);
const MP4 = new Uint8Array([0, 0, 0, 0x18, ...text("ftypisom a video of a kit")]);
const named = (name: string, bytes: Uint8Array) => ({ name, size: bytes.byteLength, sha256: sha256Of(bytes) });
const REVIEW = `<html><body data-change="kit-ads" data-own-back><img data-media="shot.png">${"x".repeat(6 * MB)}`
  + `<div id="ready" data-actions="[{&quot;name&quot;:&quot;build&quot;,&quot;label&quot;:&quot;Build it&quot;}]"></div></body></html>`;

/** Uploads `bytes` as page `id`'s HTML, as `who`'s computer. */
async function uploadBody(who: AccessIdentity, id: string, bytes: Uint8Array, headers: Record<string, string> = {}, sha256 = sha256Of(bytes)) {
  const response = await handleApp(new Request(`https://business.example.com/apps/inbox/api/page-body?${new URLSearchParams({ id, sha256 })}`,
    { method: "PUT", headers: { "content-length": String(bytes.byteLength), ...headers }, body: bytes }), inboxEnv(), who);
  return { status: response.status, json: await response.json() as { file?: object; error?: { code: string } } };
}
const read = (who: AccessIdentity | null, route: string) => handleApp(new Request(`https://business.example.com/apps/inbox/api/${route}`), inboxEnv(), who);
const media = (id: string, name: string) => read(sam, `page-media?${new URLSearchParams({ id, name })}`);
const bytesOf = async (response: Response) => new Uint8Array(await response.arrayBuffer());
const count = (table: string) => (db.sql.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
/** What the page store keeps: bucket objects, or D1 part rows with bytes. */
const kept = () => (pages ? pages.objects.size : (db.sql.prepare("SELECT COUNT(DISTINCT sha256) AS n FROM inbox_page_file_parts WHERE n >= 0").get() as { n: number }).n);

describe.each([["with a file store", true], ["with no file store", false]])("%s", (_, bucket) => {
  const setUp = () => { if (bucket) addBucket(); };

  it("puts a 6 MB review page as an upload, reads what it needs once, and streams it sealed", async () => {
    setUp();
    const html = text(REVIEW);
    expect(await uploadBody(sam, PLAN, html)).toEqual({ status: 200, json: { file: { name: "", size: html.byteLength, sha256: sha256Of(html) } } });
    expect((await put(sam, { ...plan, body: "", bodySha256: sha256Of(html) })).status).toBe(200);
    const { item } = (await call(sam, "GET", "item", { id: PLAN })).json;
    expect(item.page).toEqual({ key: "wong-review3:kit-ads", ownBack: true, labels: { build: "Build it" } });
    expect([item.body, item.pageFiles]).toEqual([undefined, []]);
    const framed = await read(sam, `frame?id=${PLAN}`);
    expect(framed.headers.get("content-security-policy")).toContain("media-src data: blob:");
    expect(await framed.text()).toBe(REVIEW);
    expect(pages ? [...pages.objects.values()][0].byteLength : count("inbox_page_file_parts")).toBe(pages ? html.byteLength : Math.ceil(html.byteLength / PART_BYTES));
  });

  it("gives a plain uploaded page its links' own tab", async () => {
    setUp();
    const html = text("<html><head></head><body><a href=\"https://example.com\">Kits</a></body></html>");
    await uploadBody(sam, PAGE, html);
    expect((await put(sam, { ...plainPage, body: "", bodySha256: sha256Of(html) })).status).toBe(200);
    expect(await frameOf(sam, PAGE)).toContain('<head><base target="_blank">');
  });

  it("refuses HTML over 25 MB, HTML with a NUL byte, a wrong hash, and HTML named but never uploaded", async () => {
    setUp();
    expect(await uploadBody(sam, PLAN, text("<p>x</p>"), { "content-length": String(25 * MB + 1) }))
      .toMatchObject({ status: 413, json: { error: { code: "too_large" } } });
    for (const html of [text("a\0b"), text(`<p>${"\0".repeat(20)}</p>`)]) {
      expect(await uploadBody(sam, PLAN, html)).toMatchObject({ status: 400, json: { error: { code: "bad_page_file" } } });
    }
    expect(await uploadBody(sam, PLAN, text("<p>x</p>"), {}, "0".repeat(64))).toMatchObject({ status: 400, json: { error: { code: "bad_page_file" } } });
    expect(await uploadBody(sam, PLAN, text("<p>x</p>"), {}, "nope")).toMatchObject({ status: 400, json: { error: { code: "bad_page_file" } } });
    expect((await put(sam, { ...plan, body: "", bodySha256: "0".repeat(64) })).json.error.code).toBe("no_upload");
    expect([count("inbox_items"), kept()]).toEqual([0, 0]);
  });

  it("refuses uploaded HTML or media on a card, and HTML both sent and uploaded", async () => {
    setUp();
    const html = text("<p>x</p>");
    await uploadBody(sam, PLAN, html);
    expect((await put(sam, { ...plan, bodySha256: sha256Of(html) })).json.error.code).toBe("bad_media");
    expect((await put(sam, { ...approval, bodySha256: sha256Of(html) })).json.error.code).toBe("bad_media");
    expect((await put(sam, { ...approval, media: [named("shot.png", PNG)] })).json.error.code).toBe("bad_media");
  });

  it("hands the page's own person its pictures and videos, never as a download, and lists none for download", async () => {
    setUp();
    for (const [name, bytes] of [["shot.png", PNG], ["ad.mp4", MP4]] as const) {
      expect(await upload(sam, PLAN, name, bytes, { media: "1" })).toEqual({ status: 200, json: { file: named(name, bytes) } });
    }
    expect((await put(sam, { ...plan, media: [named("shot.png", PNG), named("ad.mp4", MP4)] })).status).toBe(200);
    const shot = await media(PLAN, "shot.png");
    expect([shot.headers.get("content-type"), shot.headers.get("content-disposition"), await bytesOf(shot)]).toEqual(["image/png", null, PNG]);
    expect(await bytesOf(await media(PLAN, "ad.mp4"))).toEqual(MP4);
    expect((await media(PLAN, "other.png")).status).toBe(404);
    expect((await read(jo, `page-media?${new URLSearchParams({ id: PLAN, name: "shot.png" })}`)).status).toBe(404);
    expect((await call(sam, "GET", "item", { id: PLAN })).json.item.pageFiles).toEqual([]);
    // The page's files list stays on the download route.
    expect((await read(sam, `page-file?${new URLSearchParams({ id: PLAN, name: "shot.png" })}`)).status).toBe(404);
  });

  it("refuses media that is no picture or video, too large, named twice, or not what its name says", async () => {
    setUp();
    for (const [name, bytes] of [["brief.pdf", text("%PDF-1.7")], ["notes.kit", text("kit")]] as const) {
      expect(await upload(sam, PLAN, name, bytes, { media: "1" }), name).toMatchObject({ status: 400, json: { error: { code: "bad_media" } } });
    }
    expect(await upload(sam, PLAN, "shot.png", MP4, { media: "1" })).toMatchObject({ status: 400, json: { error: { code: "bad_page_file" } } });
    const over = String((bucket ? 95 : 25) * MB + 1);
    expect(await upload(sam, PLAN, "ad.mp4", MP4, { media: "1" }, { "content-length": over })).toMatchObject({ status: 413 });
    expect((await put(sam, { ...plan, media: [{ ...named("ad.mp4", MP4), size: Number(over) }] })).json.error.code).toBe("too_large");
    await upload(sam, PAGE, "shot.png", PNG, { media: "1" });
    await upload(sam, PAGE, "shot.png", PNG);
    expect((await put(sam, { ...plainPage, files: [named("shot.png", PNG)], media: [named("shot.png", PNG)] })).json.error.code).toBe("bad_media");
    expect((await put(sam, { ...plan, media: [{ ...named("x.png", PNG), name: "x.pdf" }] })).status).toBe(400);
  });

  it("shows a team link's pictures while it is open, and none once stopped", async () => {
    setUp();
    await upload(sam, PAGE, "shot.png", PNG, { media: "1" });
    await put(sam, { ...plainPage, body: "<img data-media=\"shot.png\">", media: [named("shot.png", PNG)] });
    const token = String((await call(sam, "POST", "share", { id: PAGE })).json.token);
    const shared = (name: string) => read(jo, `shared-media?${new URLSearchParams({ token, name })}`);
    expect(await bytesOf(await shared("shot.png"))).toEqual(PNG);
    expect((await shared("other.png")).status).toBe(404);
    await call(sam, "POST", "share-stop", { id: PAGE });
    expect((await shared("shot.png")).status).toBe(410);
  });

  it("drops a page's old HTML and media when it is put again, and keeps what it still names", async () => {
    setUp();
    if (pages) pages.pageSize = 1;
    const v1 = text("<p>v1</p>"), v2 = text("<p>v2</p>");
    await uploadBody(sam, PLAN, v1);
    for (const [name, bytes] of [["shot.png", PNG], ["ad.mp4", MP4]] as const) await upload(sam, PLAN, name, bytes, { media: "1" });
    await put(sam, { ...plan, body: "", bodySha256: sha256Of(v1), media: [named("shot.png", PNG), named("ad.mp4", MP4)] });
    // The same bytes again: answered at once, kept as they are.
    expect(await upload(sam, PLAN, "shot.png", PNG, { media: "1" })).toEqual({ status: 200, json: { file: named("shot.png", PNG) } });
    await uploadBody(sam, PLAN, v2);
    await put(sam, { ...plan, version: "v2", body: "", bodySha256: sha256Of(v2), media: [named("shot.png", PNG)] });
    expect([await frameOf(sam, PLAN), (await media(PLAN, "ad.mp4")).status, await bytesOf(await media(PLAN, "shot.png"))]).toEqual(["<p>v2</p>", 404, PNG]);
    expect(kept()).toBe(2);
  });

  it("keeps a closed page that shows only its pictures, and gives a card no page", async () => {
    setUp();
    const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...text("a webm video of a kit")]);
    await put(sam, approval);
    expect((await call(sam, "GET", "item", { id: approval.id })).json.item.page).toBeNull();
    await upload(sam, PLAN, "ad.webm", WEBM, { media: "1" });
    await put(sam, { ...plan, body: "", media: [named("ad.webm", WEBM)] });
    db.sql.prepare("UPDATE inbox_items SET closed_at = ?").run(Date.now());
    later(24 * 3_600_000 + 1);
    await call(sam, "POST", "checkin", { items: [] });
    expect(await bytesOf(await media(PLAN, "ad.webm"))).toEqual(WEBM);
    expect((await call(sam, "GET", "item", { id: PLAN })).json.item.page).toEqual({ key: null, ownBack: false, labels: {} });
  });

  it("deletes an upload no page names a day later, at the next upload", async () => {
    setUp();
    await upload(jo, PLAN, "stray.png", PNG, { media: "1" });
    await uploadBody(jo, PLAN, text("<p>never put</p>"));
    later(24 * 3_600_000 + 1);
    await upload(sam, PLAN, "ad.mp4", MP4, { media: "1" });
    expect(kept()).toBe(1);
  });
});

it("needs the length of a page's HTML or media before it goes to the file store", async () => {
  addBucket();
  expect(await uploadBody(sam, PLAN, text("<p>x</p>"), { "content-length": "" })).toMatchObject({ status: 400, json: { error: { code: "bad_page_file" } } });
  expect(pages!.objects.size).toBe(0);
});

it("checks the first bytes of HTML that comes in small pieces, and refuses an upload with no body", async () => {
  addBucket();
  const send = (pieces: string[], sha256: string) => {
    const bytes = pieces.map(text), length = bytes.reduce((sum, piece) => sum + piece.byteLength, 0);
    const body = new ReadableStream<Uint8Array>({ start(controller) { bytes.forEach(piece => controller.enqueue(piece)); controller.close(); } });
    return handleApp(new Request(`https://business.example.com/apps/inbox/api/page-body?${new URLSearchParams({ id: PLAN, sha256 })}`,
      { method: "PUT", headers: { "content-length": String(length) }, body, duplex: "half" } as RequestInit), inboxEnv(), sam);
  };
  const good = ["<p>", "a page that comes", " in pieces</p>"];
  expect((await send(good, sha256Of(text(good.join(""))))).status).toBe(200);
  const bad = ["<p>a", "\0", "b, and more than 16 bytes", "</p>"];
  expect((await send(bad, sha256Of(text(bad.join(""))))).status).toBe(400);
  const empty = await handleApp(new Request(`https://business.example.com/apps/inbox/api/page-body?${new URLSearchParams({ id: PLAN,
    sha256: "0".repeat(64) })}`, { method: "PUT" }), inboxEnv(), sam);
  expect(empty.status).toBe(400);
  expect(pages!.objects.size).toBe(1);
});

it("keeps a page's files in the database, even with a file store", async () => {
  addBucket();
  const csv = text("month,kits\nNov,40\n");
  await upload(sam, PAGE, "kits.csv", csv);
  expect((await put(sam, { ...plainPage, body: "<p>Kits</p>", files: [named("kits.csv", csv)] })).status).toBe(200);
  expect([pages!.objects.size, count("inbox_page_file_parts")]).toEqual([0, 1]);
});
