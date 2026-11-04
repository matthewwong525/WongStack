import { expect, it, vi } from "vitest";
import type { AccessIdentity } from "../../access";
import { handleApp } from "../index";
import { body, type Loose } from "../../../tests/body";
import { fakeEnv } from "../../../tests/env";
import { seeded, site } from "../../../tests/employee-access/connections";
import { START, person, sam, jo, machine, db, call, PLAN, APPROVAL, plan, approval, put, tap, checkin, later } from "../../../tests/inbox";

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
  expect((await call(sam, "GET", "item", { id: PLAN })).json.item.archived).toEqual({ endedAt: START, answers: [] });
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

const DAY = 24 * 3_600_000;
const kept = () => db.sql.prepare("SELECT kind, body, (SELECT COUNT(*) FROM inbox_taps t WHERE t.item_id = i.id) AS taps FROM inbox_items i ORDER BY kind").all();

it("keys rows on the installation once Access has one; a day after closing, a review page stays with its taps and an approval goes", async () => {
  db.sql.prepare(`INSERT INTO wong_access_installation (slot, installation_id, origin, account_id, worker_id, access_app_id,
    access_policy_id, issuer, audience, owner_subject, owner_email, repository_id, repository_name, policy_enabled, activated_at)
    VALUES (1, ?, ?, '', 'w', 'a', '', 'i', 'a', 's', ?, 1, '', 0, 'now')`).run(site.installationId, site.origin, site.ownerEmail);
  await put(sam, plan);
  await put(sam, approval);
  await tap(sam, { action: "build" });
  await tap(sam, { item: APPROVAL, version: "q1", action: "approve" });
  for (const id of [PLAN, APPROVAL]) await call(sam, "POST", "item-close", { id });
  expect(db.sql.prepare("SELECT DISTINCT installation_id FROM inbox_items").all()).toEqual([{ installation_id: site.installationId }]);
  expect(kept()).toEqual([{ kind: "approval", body: "", taps: 1 }, { kind: "plan", body: "<p>The plan</p>", taps: 1 }]);
  vi.setSystemTime(START + DAY + 1);
  await checkin();
  expect(kept()).toEqual([{ kind: "plan", body: "<p>The plan</p>", taps: 1 }]);
});

it("removes a review page older code emptied a day after it closed, with its taps", async () => {
  await put(sam, plan);
  await tap(sam, { action: "build" });
  // Code before review pages were kept emptied the body on close.
  db.sql.prepare("UPDATE inbox_items SET closed_at = ?, body = ''").run(START);
  vi.setSystemTime(START + DAY - 1);
  await checkin();
  expect(kept()).toEqual([{ kind: "plan", body: "", taps: 1 }]);
  vi.setSystemTime(START + DAY + 1);
  await checkin();
  expect(kept()).toEqual([]);
});

const STATUS_PAGE = "9".repeat(32);
const page = (n: number) => n.toString(16).padStart(32, "0");
const titles = (rows: Loose) => rows.map(row => row.title);

it("opens a closed review page read-only with each answer that reached the chat, and still takes no tap on it", async () => {
  await put(sam, plan);
  const notes = (await tap(sam, { action: "send", text: "Shorter, please" })).json.tap;
  later(5000);
  const build = (await tap(sam, { action: "build" })).json.tap;
  await checkin();
  later(1000);
  await call(sam, "POST", "tap-result", { id: notes.id, state: "sent" });
  later(1000);
  await call(sam, "POST", "tap-result", { id: build.id, state: "failed" });
  await call(sam, "POST", "item-close", { id: PLAN });
  const opened = await call(sam, "GET", "item", { id: PLAN });
  expect(opened.status).toBe(200);
  expect(opened.json.item).toMatchObject({ body: "<p>The plan</p>",
    archived: { endedAt: START + 7000, answers: [{ action: "send", text: "Shorter, please", at: START + 6000 }] } });
  later(5000);
  expect(await tap(sam, { action: "send", text: "More" })).toMatchObject({ status: 410, json: { error: { code: "closed" } } });
  expect((await call(jo, "GET", "item", { id: PLAN })).status).toBe(404);
  // A page whose time ran out opens the same way; an open one carries no archive.
  await put(sam, { ...plan, id: STATUS_PAGE, closesAt: Date.now() + 1000 });
  expect((await call(sam, "GET", "item", { id: STATUS_PAGE })).json.item.archived).toBeUndefined();
  later(1000);
  expect((await call(sam, "GET", "item", { id: STATUS_PAGE })).json.item.archived).toEqual({ endedAt: Date.now(), answers: [] });
  // Any other closed item is gone.
  await put(sam, approval);
  await call(sam, "POST", "item-close", { id: APPROVAL });
  expect(await call(sam, "GET", "item", { id: APPROVAL })).toMatchObject({ status: 410, json: { error: { code: "closed" } } });
});

it("lists the caller's review pages alone: waiting ones, then the Archive, newest first, by title words", async () => {
  await put(sam, { ...plan, id: page(1), title: "Weekly profit summary" });
  later(1000);
  await put(sam, { ...plan, id: page(2), title: "Profit by channel" });
  await tap(sam, { item: page(2), action: "build" });
  const [sent] = await checkin(sam, [page(2)]);
  await call(sam, "POST", "tap-result", { id: sent.id, state: "sent" });
  await call(sam, "POST", "item-close", { id: page(2) });
  later(1000);
  await put(sam, { ...plan, id: page(3), title: "Stock check", closesAt: Date.now() + 1000 });
  later(1000);
  await put(sam, { ...plan, id: page(4), title: "100% off sale" });
  await put(sam, { ...plan, id: page(5), title: "Hidden watch", hidden: true });
  await put(sam, approval);
  await put(jo, { ...plan, id: page(6), title: "Jo's profit plan" });
  const listed = (await call(sam, "GET", "reviews")).json;
  expect(titles(listed.waiting)).toEqual(["100% off sale", "Weekly profit summary"]);
  expect(listed.waiting[0]).toEqual({ id: page(4), title: "100% off sale", workspace: "lousy-dingo", createdAt: START + 3000,
    closesAt: plan.closesAt, endedAt: null, answered: false });
  expect(listed.archived).toEqual([
    { id: page(3), title: "Stock check", workspace: "lousy-dingo", createdAt: START + 2000, closesAt: START + 3000, endedAt: START + 3000, answered: false },
    { id: page(2), title: "Profit by channel", workspace: "lousy-dingo", createdAt: START + 1000, closesAt: plan.closesAt, endedAt: START + 1000, answered: true },
  ]);
  expect(listed.more).toBe(false);
  expect(titles((await call(sam, "GET", "reviews", { q: "PROFIT" })).json.waiting)).toEqual(["Weekly profit summary"]);
  expect(titles((await call(sam, "GET", "reviews", { q: "profit channel" })).json.archived)).toEqual(["Profit by channel"]);
  // A % is a character to find, not a wildcard.
  expect(titles((await call(sam, "GET", "reviews", { q: "%" })).json.waiting)).toEqual(["100% off sale"]);
  expect(titles((await call(jo, "GET", "reviews")).json.waiting)).toEqual(["Jo's profit plan"]);
  expect((await call(machine, "GET", "reviews")).status).toBe(403);
});

it("reads the Archive 50 pages at a time, the next after the last one shown", async () => {
  const row = db.sql.prepare(`INSERT INTO inbox_items (installation_id, email, id, kind, title, workspace, body, actions, version,
    created_at, closes_at, closed_at) VALUES ('', 'sam@example.com', ?, 'plan', ?, 'desk', '<p>Page</p>', '[]', 'v1', ?, ?, ?)`);
  // Two pages share a moment, so the id orders them.
  for (let n = 1; n <= 52; n++) row.run(page(n), `Page ${n}`, START - (n === 52 ? 51 : n) * 1000, START, START - 1);
  const first = (await call(sam, "GET", "reviews")).json;
  expect([first.archived.length, first.more, first.archived[0].title, first.archived[49].title]).toEqual([50, true, "Page 1", "Page 50"]);
  const last = first.archived[49];
  const next = (await call(sam, "GET", "reviews", { before: `${last.createdAt}:${last.id}` })).json;
  expect([titles(next.archived), next.more, next.waiting]).toEqual([["Page 52", "Page 51"], false, []]);
  expect((await call(sam, "GET", "reviews", { before: "soon" })).status).toBe(400);
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
    ["bfcm-brief", "question", undefined], ["bfcm-brief", "start", "ready"], ["bfcm-landing-page", "plan", undefined],
    ["landing-check", "agent", "working"], ["ronald-files", "agent", "done"], ["weekly-profit-summary", "plan", undefined]]);
  const [{ detail }] = items.filter(item => String(item.kind) === "question");
  expect(String(detail.text).split("\n\n")).toHaveLength(2);
  expect(detail.options.map(option => String(option).length > 180)).toEqual([true, true]);
});

it("starts staging with Fay's review pages: two waiting, and an Archive answered with notes, with Build it, and not at all", async () => {
  const { DB } = seeded().env;
  const fay = person("fay@example.invalid");
  const read = async (route: string) => body(await handleApp(new Request(`https://business.example.com/apps/inbox/api/${route}`), fakeEnv({ DB }), fay));
  const { waiting, archived } = await read("reviews");
  expect(titles(waiting)).toEqual(["Weekly profit summary", "New BFCM landing page"]);
  expect(archived.map(row => [row.title, row.answered])).toEqual([["Weekly profit summary", true], ["Stock check each Friday", true],
    ["BFCM countdown banner", false]]);
  const pages = await Promise.all(archived.map(row => read(`item?id=${row.id}`)));
  expect(pages.map(({ item }) => [item.workspace, item.archived.answers.map(answer => answer.action), String(item.body).includes(`data-change="${item.workspace}"`)]))
    .toEqual([["weekly-profit-summary", ["send"], true], ["stock-check-friday", ["build"], true], ["bfcm-landing-page", [], true]]);
});
