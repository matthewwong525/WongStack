import { expect, it } from "vitest";
import type { AccessIdentity } from "../../access-slots";
import { handleApp } from "../index";
import { employee, fixture, owner } from "../../../tests/employee-access/connections";
import { fakeEnv } from "../../../tests/env";
import { APPROVAL, approval, call, db, jo, later, machine, plan, PLAN, put, sam, START, tap } from "../../../tests/inbox";
import { linksOpenOwnTab } from "./sealed";

// A plain page asks nothing; any page in the inbox can be shared with the team by a link, and stopped for good.
const PAGE = "c".repeat(32);
const plainPage = { ...plan, id: PAGE, title: "Kit sales, November", body: "<p>Chart</p>", actions: [], version: "p1", plain: true };

/** A page's sealed frame, as `who`: the maker's by id, or a teammate's by token. */
const open = (who: AccessIdentity | null, route: string) =>
  handleApp(new Request(`https://business.example.com/apps/inbox/api/${route}`), fakeEnv({ DB: db.DB }), who);
const share = async (id = PAGE) => String((await call(sam, "POST", "share", { id })).json.token);
const codeOf = async (response: Response) => [response.status, ((await response.json()) as { error: { code: string } }).error.code];

it("puts a plain page straight in Artifacts marked as a page, takes no tap, and takes one only as a plan with no actions", async () => {
  expect((await put(sam, plainPage)).status).toBe(200);
  expect((await call(sam, "GET", "items")).json.items).toEqual([]);
  const listed = (await call(sam, "GET", "reviews")).json;
  expect([listed.waiting, listed.archived.map(row => [row.title, row.plain, row.shared, row.endedAt])])
    .toEqual([[], [["Kit sales, November", true, false, START]]]);
  const opened = (await call(sam, "GET", "item", { id: PAGE })).json.item;
  expect([opened.body, opened.plain, opened.shared]).toEqual(["<p>Chart</p>", true, null]);
  expect((await tap(sam, { item: PAGE, version: "p1", action: "send", text: "hi" })).json.error.code).toBe("closed");
  // A new version replaces it in place, and says when it came.
  later(1000);
  await put(sam, { ...plainPage, body: "<p>Chart v2</p>", version: "p2" });
  expect((await call(sam, "GET", "reviews")).json.archived.map(row => [row.createdAt, row.endedAt])).toEqual([[START, START + 1000]]);
  expect((await put(sam, { ...plainPage, actions: ["build"] })).json.error.code).toBe("bad_plain");
  expect((await put(sam, { ...approval, plain: true, actions: [] })).json.error.code).toBe("bad_plain");
  expect((await put(sam, { ...plainPage, plain: false })).status).toBe(400);
});

it("gives the same token on a second share; stop, then share again, gives a new one; the lists show the open one", async () => {
  await put(sam, plainPage);
  const first = await share();
  expect(first).toMatch(/^[\w-]{22}$/);
  expect(await share()).toBe(first);
  expect((await call(sam, "GET", "item", { id: PAGE })).json.item.shared).toBe(first);
  expect((await call(sam, "GET", "reviews")).json.archived[0].shared).toBe(true);
  expect((await call(sam, "POST", "share-stop", { id: PAGE })).json).toEqual({ stopped: true });
  expect((await call(sam, "GET", "item", { id: PAGE })).json.item.shared).toBeNull();
  expect((await call(sam, "GET", "reviews")).json.archived[0].shared).toBe(false);
  expect(await share()).not.toBe(first);
  // A review page shares too.
  await put(sam, plan);
  expect((await call(sam, "POST", "share", { id: PLAN })).status).toBe(200);
});

it("refuses another person's share or stop, a share of a non-page, and a machine's", async () => {
  await put(sam, plainPage);
  await put(sam, approval);
  const token = await share();
  expect((await call(jo, "POST", "share", { id: PAGE })).json.error.code).toBe("not_found");
  expect((await call(jo, "POST", "share-stop", { id: PAGE })).json.error.code).toBe("not_found");
  expect((await call(sam, "POST", "share", { id: APPROVAL })).json.error.code).toBe("not_page");
  expect((await call(machine, "POST", "share", { id: PAGE })).status).toBe(403);
  expect(db.sql.prepare("SELECT token, stopped_at FROM inbox_shares").all().map(row => ({ ...row }))).toEqual([{ token, stopped_at: null }]);
});

it("shows the maker's own page sealed, its links in their own tab; another's page or a non-page is refused", async () => {
  await put(sam, plainPage);
  await put(sam, approval);
  const shown = await open(sam, `frame?id=${PAGE}`);
  expect(await shown.text()).toBe('<base target="_blank"><p>Chart</p>');
  expect(shown.headers.get("content-security-policy")).toMatch(/^sandbox allow-scripts .*connect-src 'none'/);
  expect(shown.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(await codeOf(await open(jo, `frame?id=${PAGE}`))).toEqual([404, "not_found"]);
  expect(await codeOf(await open(sam, `frame?id=${APPROVAL}`))).toEqual([400, "not_page"]);
  expect((await open(sam, "frame?id=nope")).status).toBe(404);
  expect((await open(sam, "frame")).status).toBe(404);
  expect((await open(jo, "shared-frame")).status).toBe(404);
  expect((await open(machine, `frame?id=${PAGE}`)).status).toBe(403);
});

it("lets any person who may open the Inbox read a shared page's title, maker and newest version, sealed", async () => {
  await put(sam, plainPage);
  const token = await share();
  expect(await call(jo, "GET", "shared", { token })).toEqual({ status: 200, json: { title: "Kit sales, November", sharedBy: "sam", updatedAt: START } });
  const frame = await open(jo, `shared-frame?token=${token}`);
  expect(await frame.text()).toBe('<base target="_blank"><p>Chart</p>');
  const policy = frame.headers.get("content-security-policy") ?? "";
  for (const part of ["sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox;", "default-src 'none'", "connect-src 'none'", "form-action 'none'"]) {
    expect(policy).toContain(part);
  }
  expect([frame.headers.get("x-content-type-options"), frame.headers.get("cache-control")]).toEqual(["nosniff", "private, no-store"]);
  later(1000);
  await put(sam, { ...plainPage, body: "<p>Chart v2</p>", version: "p2" });
  expect(await (await open(jo, `shared-frame?token=${token}`)).text()).toBe('<base target="_blank"><p>Chart v2</p>');
  expect((await call(jo, "GET", "shared", { token })).json.updatedAt).toBe(START + 1000);
});

it("keeps a plain page's own base, and serves a shared review page as put, so its jump links stay in the page", async () => {
  await put(sam, plainPage);
  const token = await share();
  const own = '<html><head><base target="_self"></head><a href="#top">Top</a></html>';
  await put(sam, { ...plainPage, body: own, version: "p2" });
  expect(await (await open(jo, `shared-frame?token=${token}`)).text()).toBe(own);
  await put(sam, { ...plan, id: PAGE, body: '<head></head><a href="#why">Why</a>', version: "r1" });
  expect(await (await open(jo, `shared-frame?token=${token}`)).text()).toBe('<head></head><a href="#why">Why</a>');
  expect((await call(jo, "GET", "shared", { token })).json.updatedAt).toBe(START);
  // A review page's new version moves its date too.
  later(1000);
  await put(sam, { ...plan, id: PAGE, body: "<p>Why v2</p>", version: "r2" });
  expect((await call(jo, "GET", "shared", { token })).json.updatedAt).toBe(START + 1000);
});

it("refuses a machine, and answers a stopped link 410 for good, even after a new share, and a missing one 404", async () => {
  await put(sam, plainPage);
  const old = await share();
  expect((await call(machine, "GET", "shared", { token: old })).status).toBe(403);
  expect((await open(machine, `shared-frame?token=${old}`)).status).toBe(403);
  expect((await open(null, `shared-frame?token=${old}`)).status).toBe(401);
  await call(sam, "POST", "share-stop", { id: PAGE });
  const fresh = await share();
  expect(await call(jo, "GET", "shared", { token: old })).toMatchObject({ status: 410, json: { error: { code: "stopped" } } });
  expect(await codeOf(await open(jo, `shared-frame?token=${old}`))).toEqual([410, "stopped"]);
  expect((await call(jo, "GET", "shared", { token: fresh })).status).toBe(200);
  expect(await share()).toBe(fresh);
  for (const token of ["nope", "bad token!"]) {
    expect((await call(jo, "GET", "shared", { token })).status).toBe(token === "nope" ? 404 : 400);
    expect((await open(jo, `shared-frame?token=${encodeURIComponent(token)}`)).status).toBe(404);
  }
});

it("refuses a signed-in person who may not open the Inbox, on both of a link's routes", async () => {
  const { env } = fixture();
  const as = (who: AccessIdentity, route: string, input?: object) => handleApp(new Request(`https://business.example.com/apps/inbox/api/${route}`,
    input && { method: route === "item" ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }), fakeEnv(env), who);
  expect((await as(owner, "item", plainPage)).status).toBe(200);
  const { token } = (await (await as(owner, "share", { id: PAGE })).json()) as { token: string };
  for (const route of [`shared?token=${token}`, `shared-frame?token=${token}`]) {
    expect((await as(owner, route)).status, route).toBe(200);
    const refused = await as(employee, route);
    expect([refused.status, await refused.text()], route).toEqual([403, expect.not.stringContaining("Chart")]);
  }
});

it("answers 404 for a link whose page left the inbox, never an empty page", async () => {
  await put(sam, plainPage);
  const token = await share();
  db.sql.prepare("DELETE FROM inbox_items WHERE id = ?").run(PAGE);
  expect(await call(jo, "GET", "shared", { token })).toMatchObject({ status: 404, json: { error: { code: "not_found" } } });
  expect(await codeOf(await open(jo, `shared-frame?token=${token}`))).toEqual([404, "not_found"]);
});

it("opens a link in its own tab: the base goes after <head>, else after the doctype, and a # link stays in the page", () => {
  expect(linksOpenOwnTab("<!DOCTYPE html><header>x</header>")).toBe('<!DOCTYPE html><base target="_blank"><header>x</header>');
  expect(linksOpenOwnTab('<HEAD lang="en"><title>t</title>')).toBe('<HEAD lang="en"><base target="_blank"><title>t</title>');
  expect(linksOpenOwnTab('<a class="c" href=\'#top\'>Top</a><a target="_top" href="#k">k</a>'))
    .toBe('<base target="_blank"><a target="_self" class="c" href=\'#top\'>Top</a><a target="_top" href="#k">k</a>');
});
