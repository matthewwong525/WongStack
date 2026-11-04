import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AccessIdentity } from "../../access";
import { handleApp } from "../index";
import { FILE_LIMITS } from "./files";
import { body } from "../../../tests/body";
import { fakeEnv } from "../../../tests/env";
import { database, seeded, site } from "../../../tests/employee-access/connections";

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
    actions: ["approve", "decline"], version: "q1", createdAt: START, closesAt: plan.closesAt, detail: { text: "It wants to send one message." }, link: null, tap: null });
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

const LINK = "d".repeat(32);
const KEY_URL = "https://quiet-fox-lamp.trycloudflare.com/#key=" + "e".repeat(64);
const keyLink = { ...plan, id: LINK, kind: "link", title: "Stripe key", body: JSON.stringify({ what: "key", url: KEY_URL }), actions: [], version: "link" };

it("lists a private link by its address alone, takes no tap on it, and shows it to nobody else", async () => {
  expect((await put(sam, keyLink)).status).toBe(200);
  expect((await call(sam, "GET", "items")).json.items).toEqual([{ id: LINK, kind: "link", title: "Stripe key", workspace: "lousy-dingo", actions: [],
    version: "link", createdAt: START, closesAt: plan.closesAt, detail: null, link: { what: "key", url: KEY_URL }, tap: null }]);
  expect(await tap(sam, { item: LINK, action: "send", version: "link", text: "the key" })).toMatchObject({ status: 400, json: { error: { code: "bad_action" } } });
  expect((await call(jo, "GET", "items")).json.items).toEqual([]);
  expect((await call(jo, "GET", "item", { id: LINK })).status).toBe(404);
  await call(sam, "POST", "item-close", { id: LINK });
  expect((await call(sam, "GET", "items")).json.items).toEqual([]);
});

it("refuses a link that is not https on a tunnel, carries a login, runs long, names no kind, or offers an action", async () => {
  const body = (url: string, what = "card") => JSON.stringify({ what, url });
  for (const bad of [body("http://quiet-fox-lamp.trycloudflare.com/#key=1"), body("https://example.com/#key=1"),
    body("https://trycloudflare.com.example.com/"), body("https://kim:pw@quiet-fox-lamp.trycloudflare.com/"),
    body("https://quiet-fox-lamp.trycloudflare.com:8443/"), body(`https://quiet-fox-lamp.trycloudflare.com/#key=${"k".repeat(2048)}`),
    body("javascript:alert(1)"), body("not a url"), body(KEY_URL, "vault"), JSON.stringify({ what: "key" }),
    JSON.stringify({ what: "key", url: KEY_URL, value: "sk_live" }), "not json"]) {
    expect(await put(sam, { ...keyLink, body: bad })).toMatchObject({ status: 400, json: { error: { code: "bad_link" } } });
  }
  expect(await put(sam, { ...keyLink, actions: ["open"] })).toMatchObject({ status: 400, json: { error: { code: "bad_link" } } });
  expect(await put(sam, { ...keyLink, title: "t".repeat(201) })).toMatchObject({ status: 400 });
  expect((await call(sam, "GET", "items")).json.items).toEqual([]);
  expect((await put(sam, { ...keyLink, body: body(`https://quiet-fox-lamp.trycloudflare.com/p/${"a".repeat(32)}/#key=k`, "form") })).status).toBe(200);
});

it("keeps a hidden item out of the list, and still hands its taps to the computer", async () => {
  expect((await put(sam, { ...approval, hidden: true })).status).toBe(200);
  expect((await call(sam, "GET", "items")).json.items).toEqual([]);
  expect((await tap(sam, { item: APPROVAL, version: "q1", action: "approve" })).status).toBe(200);
  expect(await checkin()).toMatchObject([{ item: APPROVAL, action: "approve" }]);
  // The same item put again with no mark shows.
  expect((await put(sam, approval)).status).toBe(200);
  expect((await call(sam, "GET", "items")).json.items.map(item => item.id)).toEqual([APPROVAL]);
});

it("keeps a question that takes several answers", async () => {
  const several = { ...approval, kind: "question", body: JSON.stringify({ text: "Which suppliers?", options: ["Acme", "Boxco"], multi: true }), actions: [] };
  expect((await put(sam, several)).status).toBe(200);
  expect((await call(sam, "GET", "items")).json.items[0].detail).toEqual({ text: "Which suppliers?", options: ["Acme", "Boxco"], multi: true });
  expect(await put(sam, { ...several, body: JSON.stringify({ text: "Which?", multi: "yes" }) })).toMatchObject({ status: 400 });
});

it("refuses a service token and an open workspace, which name no person", async () => {
  for (const who of [machine, null]) {
    expect((await call(who, "GET", "items")).status).toBe(403);
    expect((await put(who as AccessIdentity, plan)).status).toBe(403);
  }
});

it("refuses a body over 1.6 MB, text over 20,000 characters, and an approval with no words", async () => {
  const most = Math.round(1.6 * 1024 * 1024);
  expect((await put(sam, { ...plan, body: "x".repeat(most) })).status).toBe(200);
  expect(await put(sam, { ...plan, body: "x".repeat(most + 1) })).toMatchObject({ status: 413, json: { error: { code: "too_large" } } });
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

it("shows only a tap on the version shown, so a rebuilt plan opens with no answer from the one before", async () => {
  await put(sam, plan);
  const sent = (await tap(sam, { action: "build" })).json.tap;
  await checkin();
  await call(sam, "POST", "tap-result", { id: sent.id, state: "sent" });
  expect((await call(sam, "GET", "item", { id: PLAN })).json.item.tap).toMatchObject({ id: sent.id, state: "sent" });
  await put(sam, { ...plan, body: "<p>Rebuilt</p>", version: "v2" });
  expect((await call(sam, "GET", "item", { id: PLAN })).json.item.tap).toBeNull();
  expect((await call(sam, "GET", "items")).json.items[0].tap).toBeNull();
  // The old answer is still there to look up by its own id.
  expect((await call(sam, "GET", "tap", { id: sent.id })).json.tap.state).toBe("sent");
  later(5000);
  const next = (await tap(sam, { action: "build", version: "v2" })).json.tap;
  expect((await call(sam, "GET", "item", { id: PLAN })).json.item.tap).toMatchObject({ id: next.id, state: "waiting" });
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
  expect(await checkin(sam, [PLAN])).toEqual([{ id: first.id, item: PLAN, action: "build", text: "", version: "v1", files: [] }]);
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

const START_CARD = "e".repeat(32);
const STATUS = "f".repeat(32);
const morning = { willDo: ["Read last year's ads.", "Draft the brief."], needs: ["Last year's results."], askFirst: ["Sending the brief."],
  questions: [{ text: "Which offer leads?", options: ["Gift card", "Free shipping"] }, { text: "Which channels?", options: ["Meta", "TikTok"], several: true }] };
const startCard = { ...plan, id: START_CARD, kind: "start", title: "Write the ad brief", workspace: "bfcm-brief",
  body: JSON.stringify({ state: "ready", plan: morning }), actions: ["go", "skip"], version: "s1" };
const status = { ...plan, id: STATUS, kind: "agent", title: "Write the ad brief", workspace: "bfcm-brief",
  body: JSON.stringify({ state: "working", step: "Drafting the brief", action: "Kept going: Write the ad brief" }), actions: [], version: "w1" };

it("keeps a sound morning plan and lists it as the card's detail, and refuses one past its limits or offering other taps", async () => {
  expect((await put(sam, startCard)).status).toBe(200);
  expect((await call(sam, "GET", "items")).json.items[0]).toMatchObject({ kind: "start", actions: ["go", "skip"], detail: { state: "ready", plan: morning }, link: null });
  for (const state of ["planning", "no-plan"]) expect((await put(sam, { ...startCard, body: JSON.stringify({ state }) })).status).toBe(200);
  const card = (more: Record<string, unknown>) => JSON.stringify({ state: "ready", plan: { ...morning, ...more } });
  for (const bad of [card({ willDo: Array(7).fill("Read") }), card({ needs: ["n".repeat(301)] }), card({ askFirst: [""] }),
    card({ questions: [{ text: "q".repeat(2001) }] }), card({ questions: [{ text: "Which?", options: Array(7).fill("o") }] }),
    card({ questions: [{ text: "Which?", several: "yes" }] }), card({ hours: 3 }), JSON.stringify({ state: "ready" }),
    JSON.stringify({ state: "planning", plan: morning }), JSON.stringify({ state: "done" }), JSON.stringify({ state: "ready", plan: { willDo: [] } }),
    "<script>alert(1)</script>"]) {
    expect(await put(sam, { ...startCard, body: bad })).toMatchObject({ status: 400, json: { error: { code: "bad_start" } } });
  }
  for (const actions of [["go"], ["go", "skip", "build"], ["go", "later"]]) {
    expect(await put(sam, { ...startCard, actions })).toMatchObject({ status: 400, json: { error: { code: "bad_start" } } });
  }
});

it("queues a go tap with the person's note and answers, once per version, and only go or skip", async () => {
  await put(sam, startCard);
  const go = await tap(sam, { item: START_CARD, version: "s1", action: "go", text: "Note: keep it short\n\nWhich offer leads?\nGift card" });
  expect(go.json.tap).toMatchObject({ item: START_CARD, action: "go", state: "waiting" });
  later(5000);
  expect(await tap(sam, { item: START_CARD, version: "s1", action: "go" })).toMatchObject({ status: 409, json: { error: { code: "done" } } });
  expect(await tap(sam, { item: START_CARD, version: "s1", action: "build" })).toMatchObject({ status: 400, json: { error: { code: "bad_action" } } });
  expect(await checkin(sam, [START_CARD])).toEqual([{ id: go.json.tap.id, item: START_CARD, action: "go", text: "Note: keep it short\n\nWhich offer leads?\nGift card", version: "s1", files: [] }]);
});

it("keeps an agent's status, refuses a long step, an action or an unknown state, and takes no tap on it", async () => {
  expect((await put(sam, status)).status).toBe(200);
  expect((await call(sam, "GET", "items")).json.items[0]).toMatchObject({ kind: "agent", actions: [], detail: { state: "working", step: "Drafting the brief" } });
  expect((await put(sam, { ...status, body: JSON.stringify({ state: "done", proof: "https://example.com/brief" }), version: "w2" })).status).toBe(200);
  for (const bad of [JSON.stringify({ state: "working", step: "s".repeat(201) }), JSON.stringify({ state: "asleep" }), JSON.stringify({ state: "working", last: "all of it" }), "{}"]) {
    expect(await put(sam, { ...status, body: bad })).toMatchObject({ status: 400, json: { error: { code: "bad_agent" } } });
  }
  expect(await put(sam, { ...status, actions: ["approve"] })).toMatchObject({ status: 400, json: { error: { code: "bad_agent" } } });
  for (const action of ["send", "approve"]) {
    expect(await tap(sam, { item: STATUS, version: "w2", action, text: "hi" })).toMatchObject({ status: 400, json: { error: { code: "bad_action" } } });
  }
  expect((await call(jo, "GET", "items")).json.items).toEqual([]);
});

it("starts staging with a sample day in Fay's inbox, one agent per group, and a question with long answers", async () => {
  const { DB } = seeded().env;
  const fay = person("fay@example.invalid");
  const response = await handleApp(new Request("https://business.example.com/apps/inbox/api/items"), fakeEnv({ DB }), fay);
  const { items } = await body(response);
  expect(items.map(item => [item.workspace, item.kind, item.detail?.state]).sort()).toEqual([["bfcm-brief", "agent", "planning"],
    ["bfcm-brief", "question", undefined], ["bfcm-brief", "start", "ready"], ["landing-check", "agent", "working"], ["ronald-files", "agent", "done"]]);
  const [{ detail }] = items.filter(item => String(item.kind) === "question");
  expect(String(detail.text).split("\n\n")).toHaveLength(2);
  expect(detail.options.map(option => String(option).length > 180)).toEqual([true, true]);
});

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
