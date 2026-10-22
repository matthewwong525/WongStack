import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AccessIdentity } from "../../access";
import { handleApp } from "../index";
import { body } from "../../../tests/body";
import { fakeEnv } from "../../../tests/env";
import { database, site } from "../../../tests/employee-access/connections";

const START = Date.UTC(2026, 9, 22, 9, 0);
const person = (email: string): AccessIdentity => ({ kind: "user", id: email, claims: { email, sub: `${email}-subject`,
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } });
const sam = person("sam@example.com");
const jo = person("jo@example.com");
const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access",
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } };

let db: ReturnType<typeof database>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  db = database();
});
afterEach(() => vi.useRealTimers());

async function call(who: AccessIdentity | null, method: string, route: string, input?: Record<string, unknown>) {
  const query = method === "GET" && input ? `?${new URLSearchParams(input as Record<string, string>)}` : "";
  const sends = method !== "GET" && input !== undefined;
  const response = await handleApp(new Request(`https://business.example.com/apps/inbox/api/${route}${query}`, {
    method, ...(sends && { headers: { "content-type": "application/json" }, body: JSON.stringify(input) }) }), fakeEnv({ DB: db.DB }), who);
  return { status: response.status, json: await body(response) };
}

const PLAN = "a".repeat(32);
const APPROVAL = "b".repeat(32);
const plan = { id: PLAN, kind: "plan", title: "One inbox", workspace: "lousy-dingo", body: "<p>The plan</p>", actions: ["build", "publish"],
  version: "v1", closesAt: START + 24 * 3_600_000 };
const approval = { ...plan, id: APPROVAL, kind: "approval", title: "Send the kit quote to Kim", workspace: "email",
  body: JSON.stringify({ text: "It wants to send one message." }), actions: ["approve", "decline"], version: "q1" };
const put = (who: AccessIdentity, item: Record<string, unknown>) => call(who, "PUT", "item", item);
const tap = (who: AccessIdentity, input: Record<string, unknown>) => call(who, "POST", "tap", { item: PLAN, version: "v1", ...input });
const checkin = async (who = sam, items = [PLAN, APPROVAL]) => (await call(who, "POST", "checkin", { items })).json.taps;
const later = (ms: number) => vi.setSystemTime(Date.now() + ms);

it("lists only the signed-in person's items, and never lets another read or tap one", async () => {
  expect(await put(sam, plan)).toEqual({ status: 200, json: { id: PLAN, version: "v1" } });
  expect((await put(sam, approval)).status).toBe(200);
  const listed = await call(sam, "GET", "items");
  expect(listed.json.items.map(item => item.id)).toEqual([PLAN, APPROVAL]);
  expect(listed.json.items[1]).toEqual({ id: APPROVAL, kind: "approval", title: "Send the kit quote to Kim", workspace: "email",
    actions: ["approve", "decline"], version: "q1", createdAt: START, closesAt: plan.closesAt, detail: { text: "It wants to send one message." }, tap: null });
  expect(listed.json.items[0].detail).toBeNull();

  expect(await call(jo, "GET", "items")).toEqual({ status: 200, json: { items: [], computerOnline: false } });
  expect((await call(jo, "GET", "item", { id: PLAN })).status).toBe(404);
  expect((await tap(jo, { action: "build" })).status).toBe(404);
  // Jo's own item of the same id is Jo's alone, and leaves Sam's as it was.
  await put(jo, { ...plan, body: "<p>Jo's</p>" });
  expect((await call(sam, "GET", "item", { id: PLAN })).json.item.body).toBe("<p>The plan</p>");
  expect((await call(jo, "GET", "item", { id: PLAN })).json.item.body).toBe("<p>Jo's</p>");
  expect(await checkin(jo)).toEqual([]);
});

it("refuses a service token and an open workspace, which name no person", async () => {
  for (const who of [machine, null]) {
    expect((await call(who, "GET", "items")).status).toBe(403);
    expect((await put(who as AccessIdentity, plan)).status).toBe(403);
  }
});

it("refuses a body over 512 KB, text over 20,000 characters, and an approval with no words", async () => {
  expect((await put(sam, { ...plan, body: "x".repeat(512 * 1024) })).status).toBe(200);
  expect(await put(sam, { ...plan, body: "x".repeat(512 * 1024 + 1) })).toMatchObject({ status: 413, json: { error: { code: "too_large" } } });
  expect((await tap(sam, { action: "send", text: "n".repeat(20_000) })).status).toBe(200);
  expect(await tap(sam, { action: "send", text: "n".repeat(20_001) })).toMatchObject({ status: 400, json: { error: { code: "invalid_input" } } });
  for (const bad of ["not json", JSON.stringify({ options: ["A"] })]) {
    expect(await put(sam, { ...approval, kind: "question", body: bad })).toMatchObject({ status: 400, json: { error: { code: "bad_detail" } } });
  }
});

it("queues a tap with the version seen, refuses an old version, an unknown action, empty notes and a second of one action", async () => {
  await put(sam, plan);
  const queued = await tap(sam, { action: "build", text: " - Why: shorter " });
  expect(queued.json.tap).toEqual({ id: expect.stringMatching(/^[0-9a-f]{32}$/), item: PLAN, action: "build", text: "- Why: shorter", state: "waiting" });
  expect(await tap(sam, { action: "build" })).toMatchObject({ status: 409, json: { error: { code: "done" } } });
  expect(await tap(sam, { action: "publish", version: "v0" })).toMatchObject({ status: 409, json: { error: { code: "changed" } } });
  expect(await tap(sam, { action: "merge" })).toMatchObject({ status: 400, json: { error: { code: "bad_action" } } });
  expect(await tap(sam, { action: "send", text: "  " })).toMatchObject({ status: 400, json: { error: { code: "bad_action" } } });
  later(5000);
  expect((await tap(sam, { action: "send", text: "a note" })).status).toBe(200);
  later(5000);
  expect((await tap(sam, { action: "send", text: "another" })).status).toBe(200);
  expect((await checkin()).map(waiting => waiting.action)).toEqual(["build", "send", "send"]);
  // The list carries the newest tap, so a reload still shows where it stands.
  expect((await call(sam, "GET", "items")).json.items[0].tap).toMatchObject({ action: "send", text: "another", state: "delivering" });
});

it("re-uploading replaces the body and the version, and reopens a closed item without sending its old taps", async () => {
  await put(sam, plan);
  const old = (await tap(sam, { action: "build" })).json.tap;
  await call(sam, "POST", "item-close", { id: PLAN });
  expect(await call(sam, "GET", "item", { id: PLAN })).toMatchObject({ status: 410, json: { error: { code: "closed" } } });
  expect((await tap(sam, { action: "publish" })).status).toBe(410);
  await put(sam, { ...plan, body: "<p>Rebuilt</p>", version: "v2" });
  const opened = (await call(sam, "GET", "item", { id: PLAN })).json.item;
  expect([opened.body, opened.version, opened.createdAt]).toEqual(["<p>Rebuilt</p>", "v2", START]);
  expect((await call(sam, "GET", "tap", { id: old.id })).json.tap.state).toBe("expired");
  expect(await checkin()).toEqual([]);
  later(5000);
  expect((await tap(sam, { action: "build", version: "v2" })).status).toBe(200);
});

it("never hands the computer a cancelled or expired tap", async () => {
  await put(sam, plan);
  await put(sam, { ...approval, closesAt: START + 60_000 });
  const cancelled = (await tap(sam, { action: "publish" })).json.tap;
  expect((await call(sam, "POST", "tap-cancel", { id: cancelled.id })).json.tap.state).toBe("cancelled");
  expect(await call(sam, "POST", "tap-cancel", { id: cancelled.id })).toMatchObject({ status: 409, json: { error: { code: "not_waiting" } } });
  expect((await call(sam, "POST", "tap-cancel", { id: "c".repeat(32) })).status).toBe(404);
  const late = (await tap(sam, { item: APPROVAL, action: "approve", version: "q1" })).json.tap;
  vi.setSystemTime(START + 60_000);
  expect(await checkin()).toEqual([]);
  expect((await call(sam, "GET", "tap", { id: late.id })).json.tap.state).toBe("expired");
  expect((await call(sam, "GET", "items")).json.items.map(item => item.id)).toEqual([PLAN]);
  expect((await call(sam, "GET", "tap", { id: "c".repeat(32) })).status).toBe(404);
});

it("hands each tap out once and claims it, so a late cancel can't undo what was sent, and only a collected tap takes a result", async () => {
  await put(sam, plan);
  await put(sam, approval);
  const first = (await tap(sam, { action: "build" })).json.tap;
  const unclaimed = (await tap(sam, { item: APPROVAL, action: "approve", version: "q1" })).json.tap;
  // A result for a tap nobody collected changes nothing.
  expect((await call(sam, "POST", "tap-result", { id: unclaimed.id, state: "sent" })).json.tap.state).toBe("waiting");
  // A check-in collects only the taps on the items it names.
  expect(await checkin(sam, [PLAN])).toEqual([{ id: first.id, item: PLAN, action: "build", text: "", version: "v1" }]);
  expect(await checkin(sam, [PLAN])).toEqual([]);
  expect((await call(sam, "GET", "tap", { id: first.id })).json.tap.state).toBe("delivering");
  expect(await call(sam, "POST", "tap-cancel", { id: first.id })).toMatchObject({ status: 409, json: { error: { code: "not_waiting" } } });
  expect((await call(sam, "POST", "tap-result", { id: first.id, state: "sent" })).json.tap.state).toBe("sent");
  expect((await call(sam, "POST", "tap-result", { id: first.id, state: "changed" })).json.tap.state).toBe("sent");
  expect((await call(sam, "POST", "tap-result", { id: "c".repeat(32), state: "sent" })).status).toBe(404);
  // A tap cancelled before the computer came is never handed out, and a result can't revive it.
  await call(sam, "POST", "tap-cancel", { id: unclaimed.id });
  expect(await checkin()).toEqual([]);
  expect((await call(sam, "POST", "tap-result", { id: unclaimed.id, state: "sent" })).json.tap.state).toBe("cancelled");
});

it("fails a collected tap whose result never came, and never hands it out again", async () => {
  await put(sam, plan);
  const lost = (await tap(sam, { action: "build" })).json.tap;
  expect(await checkin()).toHaveLength(1);
  later(119_000);
  expect((await call(sam, "GET", "tap", { id: lost.id })).json.tap.state).toBe("delivering");
  later(1000);
  expect((await call(sam, "GET", "tap", { id: lost.id })).json.tap.state).toBe("failed");
  expect(await checkin()).toEqual([]);
  // A result that arrives after the time ran out leaves it failed: the page already offered the words to copy.
  expect((await call(sam, "POST", "tap-result", { id: lost.id, state: "sent" })).json.tap.state).toBe("failed");
  expect((await tap(sam, { action: "build" })).status).toBe(200);
});

it("takes one tap per item every 5 seconds, whatever the action", async () => {
  await put(sam, plan);
  await put(sam, approval);
  expect((await tap(sam, { action: "send", text: "a note" })).status).toBe(200);
  later(4999);
  expect(await tap(sam, { action: "build" })).toMatchObject({ status: 429, json: { error: { code: "too_soon" } } });
  expect(await tap(sam, { action: "send", text: "again" })).toMatchObject({ status: 429, json: { error: { code: "too_soon" } } });
  expect((await tap(sam, { item: APPROVAL, action: "approve", version: "q1" })).status).toBe(200);
  later(1);
  expect((await tap(sam, { action: "build" })).status).toBe(200);
});

it("hands out what fits in one check-in and the rest at the next, and lists only the start of a long answer", async () => {
  await put(sam, plan);
  // Three bytes a character: each tap is about 60 KB, so eight fit in one check-in's 512 KB.
  const long = (n: number) => `${n}${"€".repeat(19_999)}`;
  for (let n = 0; n < 10; n++) {
    expect((await tap(sam, { action: "send", text: long(n) })).status).toBe(200);
    later(5000);
  }
  const first = await checkin();
  expect(first.map(waiting => waiting.text)).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map(long));
  expect((await checkin()).map(waiting => waiting.text)).toEqual([long(8), long(9)]);
  expect(await checkin()).toEqual([]);
  const listed = await call(sam, "GET", "items");
  expect(listed.status).toBe(200);
  expect(listed.json.items[0].tap.text).toBe(long(9).slice(0, 200));
  expect((await call(sam, "GET", "tap", { id: listed.json.items[0].tap.id })).json.tap.text).toBe(long(9));
});

it("says the computer is online for a minute after its last check-in", async () => {
  const online = async () => (await call(sam, "GET", "items")).json.computerOnline;
  expect(await online()).toBe(false);
  await checkin();
  vi.setSystemTime(START + 59_000);
  expect(await online()).toBe(true);
  vi.setSystemTime(START + 61_000);
  expect(await online()).toBe(false);
  expect(await online()).toBe(false);
});

it("keys rows on the installation once Access has one, and removes items closed a day ago at a check-in", async () => {
  db.sql.prepare(`INSERT INTO wong_access_installation (slot, installation_id, origin, account_id, worker_id, access_app_id,
    access_policy_id, issuer, audience, owner_subject, owner_email, repository_id, repository_name, policy_enabled, activated_at)
    VALUES (1, ?, ?, '', 'w', 'a', '', 'i', 'a', 's', ?, 1, '', 0, 'now')`).run(site.installationId, site.origin, site.ownerEmail);
  await put(sam, plan);
  await tap(sam, { action: "build" });
  await call(sam, "POST", "item-close", { id: PLAN });
  expect(db.sql.prepare("SELECT installation_id, body FROM inbox_items").all()).toEqual([{ installation_id: site.installationId, body: "" }]);
  vi.setSystemTime(START + 24 * 3_600_000 + 1);
  await checkin();
  expect(db.sql.prepare("SELECT (SELECT COUNT(*) FROM inbox_items) + (SELECT COUNT(*) FROM inbox_taps) AS count").get()).toEqual({ count: 0 });
});
