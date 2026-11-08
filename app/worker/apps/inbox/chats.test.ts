import { expect, it } from "vitest";
import { call, jo, later, machine, plan, put, sam, START } from "../../../tests/inbox";

const HERE = "c".repeat(32);
const THERE = "d".repeat(32);
const DAY = 24 * 3_600_000;
const chat = (agentId: string, extra: Record<string, unknown> = {}) =>
  ({ agentId, computer: HERE, name: `Chat ${agentId}`, step: "PLAN", folder: `folder-${agentId}`, ...extra });
const putChat = (who = sam, input: Record<string, unknown> = chat("a1")) => call(who, "PUT", "chat", input);
const list = async (who = sam) => (await call(who, "GET", "chats")).json.chats;
const ids = async (who = sam) => (await list(who)).map(each => each.agentId ?? each.name);
const page = (id: string, extra: Record<string, unknown> = {}) => put(sam, { ...plan, id: id.repeat(32), title: `Page ${id}`, ...extra });

it("puts a chat's row and shows it to its person alone, with the step it is on now", async () => {
  expect(await putChat()).toEqual({ status: 200, json: { agentId: "a1" } });
  later(1000);
  await putChat(sam, chat("a1", { step: "APPLY", name: "Renamed" }));
  expect(await call(sam, "GET", "chats")).toEqual({ status: 200, json: { computerOnline: false, chats: [{ agentId: "a1", name: "Renamed",
    step: "APPLY", folder: "folder-a1", source: null, closeAskedAt: null, review: null }] } });
  expect(await list(jo)).toEqual([]);
});

it("refuses a teammate's put, remove or close of another person's chat, and keeps it as it was", async () => {
  await putChat();
  expect(await putChat(jo, chat("a1", { name: "Jo's" }))).toMatchObject({ status: 409, json: { error: { code: "not_yours" } } });
  expect(await call(jo, "POST", "chat-remove", { agentId: "a1" })).toEqual({ status: 200, json: { agentId: "a1", removed: false } });
  expect((await call(jo, "POST", "chat-close", { agentId: "a1" })).status).toBe(404);
  expect(await list()).toMatchObject([{ agentId: "a1", name: "Chat a1", closeAskedAt: null }]);
  expect((await call(machine, "GET", "chats")).status).toBe(403);
});

it("puts a waiting page on its chat's row by agent id, else by folder, and an unknown chat's page on its own row", async () => {
  await putChat(sam, chat("a1"));
  await putChat(sam, chat("a2"));
  later(1000);
  await putChat(sam, chat("a3"));
  await page("1", { chat: "a1" });
  later(1000);
  await page("2", { workspace: "folder-a2" });
  later(1000);
  await page("3", { workspace: "elsewhere", chat: "outside" });
  const chats = await list();
  expect(chats.map(each => [each.agentId, each.review?.title ?? null])).toEqual([
    [null, "Page 3"], ["a2", "Page 2"], ["a1", "Page 1"], ["a3", null]]);
  expect(chats[0]).toMatchObject({ name: "Page 3", folder: "elsewhere", step: null });
  // A closed page leaves Needs you, and its chat goes back among the working ones.
  await call(sam, "POST", "item-close", { id: "2".repeat(32) });
  expect(await ids()).toEqual(["Page 3", "a1", "a3", "a2"]);
});

it("syncs a computer's chats: adds the missing, drops the rest there, keeps another computer's and an outside-Paseo chat's", async () => {
  await putChat(sam, chat("gone"));
  await putChat(sam, chat("other", { computer: THERE }));
  await putChat(sam, chat("uuid-1", { sessionId: "claude:uuid-1" }));
  await putChat(sam, chat("kept", { step: "SHIP" }));
  const synced = await call(sam, "POST", "chats-sync", { computer: HERE, chats: [{ agentId: "kept", name: "Paseo name", folder: "x" },
    { agentId: "new", name: "New chat", folder: "desk" }] });
  expect(synced).toEqual({ status: 200, json: { chats: [{ agentId: "kept", closeAskedAt: null }, { agentId: "new", closeAskedAt: null }] } });
  expect((await ids()).sort()).toEqual(["kept", "new", "other", "uuid-1"]);
  expect((await list()).find(each => String(each.agentId) === "kept")).toMatchObject({ name: "Chat kept", step: "SHIP" });
  // Jo's sync names Sam's chat: it neither takes nor drops it.
  await call(jo, "POST", "chats-sync", { computer: HERE, chats: [{ agentId: "kept", name: "Jo", folder: "jo" }] });
  expect((await ids()).sort()).toEqual(["kept", "new", "other", "uuid-1"]);
  expect(await list(jo)).toEqual([]);
});

it("syncs a chat's step and source: a new row takes them, a step fills a row with none, and no step keeps its name", async () => {
  await call(sam, "POST", "chats-sync", { computer: HERE, chats: [{ agentId: "old", name: "APPLY: Fix the invoice total", folder: "x" }] });
  await putChat(sam, chat("put", { name: "Put name", step: "VERIFY", source: "schedule:sales" }));
  await call(sam, "POST", "chats-sync", { computer: HERE, chats: [{ agentId: "new", name: "Fix the invoice total", step: "APPLY", folder: "x",
    source: "schedule:invoice-check" }, { agentId: "old", name: "Fix the invoice total", step: "SHIP", folder: "x" },
  { agentId: "put", name: "VERIFY: Put name", folder: "folder-put" }] });
  // A put with no step or source, from another computer, keeps neither.
  await putChat(sam, { agentId: "bare", computer: THERE, name: "Bare", folder: "f" });
  const rows = Object.fromEntries((await list()).map(each => [each.agentId, [each.name, each.step, each.source]]));
  expect(rows).toEqual({ new: ["Fix the invoice total", "APPLY", "schedule:invoice-check"], old: ["Fix the invoice total", "SHIP", null],
    put: ["Put name", "VERIFY", "schedule:sales"], bare: ["Bare", null, null] });
});

it("keeps a row's step and name over a sync's, so a put's newer step wins over a pass that read the older name", async () => {
  await putChat(sam, chat("a1", { name: "Fix the invoice total", step: "APPLY" }));
  later(1000);
  await call(sam, "POST", "chats-sync", { computer: HERE, chats: [{ agentId: "a1", name: "Old words", step: "PLAN", folder: "folder-a1" }] });
  expect(await list()).toMatchObject([{ agentId: "a1", name: "Fix the invoice total", step: "APPLY" }]);
});

it("asks to close a chat once, and the sync answers the ask", async () => {
  await putChat();
  const asked = await call(sam, "POST", "chat-close", { agentId: "a1" });
  expect(asked).toEqual({ status: 200, json: { agentId: "a1", closeAskedAt: START } });
  later(5000);
  expect((await call(sam, "POST", "chat-close", { agentId: "a1" })).json.closeAskedAt).toBe(START);
  await putChat();
  const synced = await call(sam, "POST", "chats-sync", { computer: HERE, chats: [{ agentId: "a1", name: "Chat a1", folder: "folder-a1" }] });
  expect(synced.json.chats).toEqual([{ agentId: "a1", closeAskedAt: START }]);
  expect((await call(sam, "POST", "chat-close", { agentId: "nope" })).status).toBe(404);
});

it("removes a closed chat's row, and drops a row no computer told of in 3 days", async () => {
  await putChat(sam, chat("a1"));
  await putChat(sam, chat("a2"));
  expect(await call(sam, "POST", "chat-remove", { agentId: "a1" })).toEqual({ status: 200, json: { agentId: "a1", removed: true } });
  later(3 * DAY - 1000);
  await putChat(sam, chat("a3"));
  later(2000);
  expect(await ids()).toEqual(["a3"]);
});

it("answers the week board's old routes with retired", async () => {
  expect(await call(sam, "GET", "daily-tasks", { week: "2026-10-05" })).toMatchObject({ status: 404, json: { error: { code: "retired" } } });
  expect(await call(sam, "POST", "daily-task-add", { importKey: "chat:x", title: "x" })).toMatchObject({ status: 404, json: { error: { code: "retired" } } });
  expect((await call(sam, "PATCH", "task", { id: "x" })).status).toBe(404);
});
