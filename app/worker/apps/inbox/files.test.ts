// Files a review page sends from the Inbox: kept for their own item and person, read by the computer, gone in a day.
import { expect, it } from "vitest";
import type { AccessIdentity } from "../../access-slots";
import { handleApp } from "../index";
import { FILE_LIMITS } from "./files";
import { body } from "../../../tests/body";
import { fakeEnv } from "../../../tests/env";
import { START, sam, jo, machine, db, call, PLAN, APPROVAL, plan, approval, put, tap, checkin, later } from "../../../tests/inbox";

const ORIGIN = "https://business.example.com";
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
async function send(who: AccessIdentity, query: Record<string, string>, bytes: Uint8Array = PNG, origin = ORIGIN) {
  const response = await handleApp(new Request(`${ORIGIN}/apps/inbox/api/file?${new URLSearchParams({ item: PLAN, name: "shot.png",
    question: "A picture of the old page", ...query })}`, { method: "POST", headers: { origin, "content-type": "application/octet-stream" },
  body: bytes }), fakeEnv({ DB: db.DB }), who);
  const json = response.headers.get("content-type")?.includes("json") ? await body(response) : null;
  return { status: response.status, json };
}
const read = (who: AccessIdentity, id: string, part = 0) => call(who, "GET", "file", { id, part: String(part) });
const ascii = (text: string) => Uint8Array.from(text, c => c.charCodeAt(0));
const count = (table: string) => (db.sql.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

it("keeps a file sent from the person's own plan page, and refuses another's item, another site and the wrong bytes", async () => {
  await put(sam, plan);
  await put(sam, approval);
  const sent = await send(sam, {});
  expect(sent).toEqual({ status: 200, json: { file: { id: expect.stringMatching(/^[0-9a-f]{32}$/) } } });
  expect((await send(jo, {})).status).toBe(404);
  expect((await send(sam, { item: APPROVAL })).status).toBe(404);
  expect((await send(sam, { item: "not-an-id" })).status).toBe(404);
  expect((await send(sam, {}, PNG, "https://evil.example.com")).status).toBe(403);
  expect((await send(machine, {})).status).toBe(403);
  const bad: Record<string, string>[] = [{ name: "shot.jpg" }, { name: "run.exe" }, { name: "shot" }, { name: "../shot.png" }, { name: `${"a".repeat(197)}.png` },
    { question: "" }, { question: "q".repeat(301) }];
  for (const query of bad) {
    expect(await send(sam, query)).toMatchObject({ status: 400, json: { error: { code: "bad_file" } } });
  }
  expect(await send(sam, {}, new Uint8Array())).toMatchObject({ status: 400, json: { error: { code: "bad_file" } } });
  expect(await send(sam, { name: "notes.txt" }, new TextEncoder().encode("a\0b"))).toMatchObject({ status: 400 });
  expect((await send(sam, { name: "notes.md" }, new TextEncoder().encode("# Notes"))).status).toBe(200);
  const big = new Uint8Array(25 * 1024 * 1024 + 1);
  big.set(PNG);
  expect(await send(sam, {}, big)).toMatchObject({ status: 413, json: { error: { code: "too_large" } } });
  // Only the two kept files have parts: a refused one leaves none behind.
  expect([count("inbox_files"), count("inbox_file_parts")]).toEqual([2, 2]);
  // A tap can't carry another person's file, nor one that is not on its item: to the tap, it is not held.
  const mine = String(sent.json?.file.id);
  await put(jo, plan);
  expect(await tap(jo, { action: "build", files: [mine] })).toMatchObject({ status: 409, json: { error: { code: "files_gone" } } });
  expect((await call(jo, "GET", "item", { id: PLAN })).json.item.files).toEqual([]);
});

it("hands the computer a tap's files and lets it read them only while it delivers that tap, then deletes them", async () => {
  await put(sam, plan);
  const id = String((await send(sam, {})).json?.file.id);
  expect((await read(sam, id)).status).toBe(404);
  const sent = (await tap(sam, { action: "build", text: "with a picture", files: [id] })).json.tap;
  expect(await tap(sam, { action: "send", text: "again", files: [id] })).toMatchObject({ status: 400 });
  expect((await read(sam, id)).status).toBe(404);
  expect(await checkin(sam, [PLAN])).toEqual([{ id: sent.id, item: PLAN, action: "build", text: "with a picture", version: "v1",
    files: [{ id, name: "shot.png", question: "A picture of the old page", size: PNG.byteLength }] }]);
  const part = await read(sam, id);
  expect(part).toEqual({ status: 200, json: { name: "shot.png", type: "image/png", question: "A picture of the old page", size: PNG.byteLength,
    parts: 1, data: Buffer.from(PNG).toString("base64") } });
  expect((await read(sam, id, 1)).status).toBe(404);
  expect((await read(jo, id)).status).toBe(404);
  await call(sam, "POST", "tap-result", { id: sent.id, state: "sent" });
  expect((await read(sam, id)).status).toBe(404);
  expect([count("inbox_files"), count("inbox_file_parts")]).toEqual([0, 0]);
});

it("lists the files it still holds with the plan, and refuses a tap naming one it deleted, so the page can ask for it again", async () => {
  await put(sam, { ...plan, closesAt: START + 48 * 3_600_000 });
  const logo = String((await send(sam, {})).json?.file.id);
  await call(sam, "POST", "tap-cancel", { id: (await tap(sam, { action: "build", files: [logo] })).json.tap.id });
  expect([count("inbox_files"), count("inbox_file_parts")]).toEqual([0, 0]);
  later(5000);
  const brief = String((await send(sam, { name: "brief.pdf" }, ascii("%PDF-1.7"))).json?.file.id);
  expect((await call(sam, "GET", "item", { id: PLAN })).json.item.files).toEqual([brief]);
  expect(await tap(sam, { action: "build", files: [logo, brief] })).toMatchObject({ status: 409, json: { error: { code: "files_gone" } } });
  // A day on, the app holds none: the page opened then hears so.
  later(24 * 3_600_000 + 1);
  expect((await call(sam, "GET", "item", { id: PLAN })).json.item.files).toEqual([]);
  expect(await tap(sam, { action: "build", files: [brief] })).toMatchObject({ status: 409, json: { error: { code: "files_gone" } } });
});

it("deletes a day-old file at any call, check-in or not, so a computer that never comes back leaves its tap not delivered", async () => {
  for (const who of [sam, jo]) await put(who, { ...plan, closesAt: START + 48 * 3_600_000 });
  const stale = (await tap(sam, { action: "build", files: [String((await send(sam, {})).json?.file.id)] })).json.tap;
  await send(jo, {});
  later(24 * 3_600_000 + 1);
  expect((await call(sam, "GET", "tap", { id: stale.id })).json.tap.state).toBe("failed");
  // Sam's call cleared Jo's bytes too, as the app's room counts every person's; Jo's own call clears the rest.
  expect([count("inbox_files"), count("inbox_file_parts")]).toEqual([1, 0]);
  expect(await checkin(jo)).toEqual([]);
  expect(count("inbox_files")).toBe(0);
});

it("holds a check-in's taps while the computer reads their files, however long the reads take", async () => {
  await put(sam, plan);
  const big = String((await send(sam, { name: "notes.txt" }, ascii("a".repeat(512 * 1024 + 10)))).json?.file.id);
  const first = (await tap(sam, { action: "build", files: [big] })).json.tap;
  later(5000);
  const second = (await tap(sam, { action: "send", text: "and this" })).json.tap;
  expect((await checkin()).map(each => each.id)).toEqual([first.id, second.id]);
  for (const part of [0, 1]) { later(100_000); expect((await read(sam, big, part)).status).toBe(200); }
  later(100_000);
  for (const each of [first, second]) expect((await call(sam, "POST", "tap-result", { id: each.id, state: "sent" })).json.tap.state).toBe("sent");
  // With no read, the claim runs out as before.
  later(5000);
  const third = (await tap(sam, { action: "send", text: "late" })).json.tap;
  await checkin();
  later(120_000);
  expect((await call(sam, "GET", "tap", { id: third.id })).json.tap.state).toBe("failed");
});

it("reads a file over 512 KB back in parts, each whole", async () => {
  await put(sam, plan);
  const text = "a".repeat(512 * 1024) + "b".repeat(10);
  const id = String((await send(sam, { name: "notes.txt" }, new TextEncoder().encode(text))).json?.file.id);
  await tap(sam, { action: "build", files: [id] });
  await checkin();
  const parts = [await read(sam, id, 0), await read(sam, id, 1)].map(part => Buffer.from(String(part.json.data), "base64").toString());
  expect([(await read(sam, id)).json.parts, parts.join("")]).toEqual([2, text]);
});

it("takes each kind of file the page offers only when its first bytes match its name", async () => {
  await put(sam, plan);
  const kinds: [string, Uint8Array][] = [["a.jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], ["a.webp", ascii("RIFF\0\0\0\0WEBPVP8 ")],
    ["a.gif", ascii("GIF87a.")], ["a.GIF", ascii("GIF89a.")], ["a.pdf", ascii("%PDF-1.7")], ["a.csv", ascii("a,b")], ["a.json", ascii("{}")],
    ["a.docx", ascii("PK\x03\x04")], ["a.xlsx", ascii("PK\x03\x04")], ["a.pptx", ascii("PK\x03\x04")], ["a.zip", ascii("PK\x05\x06")]];
  for (const [name, bytes] of kinds) {
    expect((await send(sam, { name }, bytes)).status).toBe(200);
    expect(await send(sam, { name }, ascii("\0nope"))).toMatchObject({ status: 400, json: { error: { code: "bad_file" } } });
  }
  expect((await send(sam, { name: "a.webp" }, ascii("RIFF\0\0\0\0WAVE"))).status).toBe(400);
});

it("refuses a file that says it is too big, sends no body, passes the item's or the app's room, or is cut off", async () => {
  await put(sam, plan);
  const at = `${ORIGIN}/apps/inbox/api/file?${new URLSearchParams({ item: PLAN, name: "shot.png", question: "A picture" })}`;
  const raw = (init: RequestInit) => handleApp(new Request(at, { method: "POST", ...init, headers: { origin: ORIGIN, ...init.headers } }),
    fakeEnv({ DB: db.DB }), sam);
  expect((await raw({ body: PNG, headers: { "content-length": String(25 * 1024 * 1024 + 1) } })).status).toBe(413);
  expect((await raw({})).status).toBe(400);
  const bare = await handleApp(new Request(`${ORIGIN}/apps/inbox/api/file`, { method: "POST", headers: { origin: ORIGIN }, body: PNG }),
    fakeEnv({ DB: db.DB }), sam);
  expect(bare.status).toBe(404);
  const cut = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(PNG); controller.error(new Error("cut")); } });
  await expect(raw({ body: cut, duplex: "half" } as RequestInit)).rejects.toThrow("cut");
  const room = { ...FILE_LIMITS };
  try {
    FILE_LIMITS.item = PNG.byteLength;
    expect((await send(sam, {})).status).toBe(200);
    expect(await send(sam, {})).toMatchObject({ status: 413, json: { error: { code: "too_large" } } });
    FILE_LIMITS.item = room.item;
    FILE_LIMITS.installation = PNG.byteLength * 2 - 1;
    expect(await send(sam, {})).toMatchObject({ status: 507, json: { error: { code: "full" } } });
  } finally { Object.assign(FILE_LIMITS, room); }
  expect([count("inbox_files"), count("inbox_file_parts")]).toEqual([1, 1]);
});
