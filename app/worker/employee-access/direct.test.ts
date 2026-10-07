import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { employee, fixture, owner, req, seeded, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import { discovery } from "../api/discovery";
import { apiActions, handleApi } from "../api/router";
import type { KeyEntry } from "./key-levels";
import { management } from "./management";
import { authorizeRequest, currentPolicy } from "./policy";
import { listSkills } from "./skills";
import { body } from "../../tests/body";
import { fakeEnv } from "../../tests/env";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtAreas(["access", "orders"]));
// Notion is set up for direct use at both levels and Ledger at Read alone; Stripe is not set up.
const registry = vi.hoisted(() => ({ keys: {
  notion: { title: "Notion", secrets: ["NOTION_TOKEN"], forward: { base: "https://api.notion.example/v1/", secret: "NOTION_TOKEN", header: "Authorization", prefix: "Bearer " } },
  ledger: { title: "Ledger", secrets: ["LEDGER_KEY"], levels: ["read"], forward: { base: "https://ledger.example/", secret: "LEDGER_KEY", header: "X-Api-Key" } },
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
} satisfies Record<string, KeyEntry> }));
vi.mock("../keys.ts", () => registry);

const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access", sub: "", iss: site.issuer, aud: site.audience, exp: 9999999999 } };
const kim: AccessIdentity = { ...employee, id: "kim@example.com", claims: { ...employee.claims, email: "kim@example.com", sub: "kim-subject" } };
const id = site.installationId;
let f: ReturnType<typeof fixture>;
let fetch: ReturnType<typeof vi.fn>;
const env = (bindings: object = f.env) => fakeEnv({ ...bindings, NOTION_TOKEN: "notion-token-value", LEDGER_KEY: "ledger-key-value", STRIPE_SECRET_KEY: "stripe-secret-value" });
/** One direct request through the app's own router: a look-up is a GET, a change a POST. */
const ask = (key: string, kind: "read" | "change", identity: AccessIdentity | null = employee, bindings = env()) =>
  handleApi(new Request(`${site.origin}/api/direct/${key}/${kind}`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: kind === "read" ? "GET" : "POST", path: "pages" }) }), bindings, identity);
const told = async (response: Response) => [response.status, (await body(response)).error.message];
const level = (email: string, key: string, held: string) => f.sql.prepare("INSERT INTO wong_access_key_grants VALUES (?, ?, ?, ?, 1) ON CONFLICT DO UPDATE SET level = excluded.level").run(id, email, key, held);
const choose = (key: string, mode: string | null) => {
  f.sql.prepare("DELETE FROM wong_access_key_direct WHERE key_id = ?").run(key);
  if (mode) f.sql.prepare("INSERT INTO wong_access_key_direct VALUES (?, ?, ?, 1)").run(id, key, mode);
};
const save = (value: unknown, identity: AccessIdentity = owner) => management(req("direct", "POST", value), f.env, identity);
const stored = () => f.sql.prepare("SELECT key_id, mode FROM wong_access_key_direct ORDER BY key_id").all().map(row => `${row.key_id} ${row.mode}`);
const revision = () => (f.sql.prepare("SELECT revision FROM wong_access_installation").get() as { revision: number }).revision;
const listed = async (identity: AccessIdentity, path = "/api/actions?app=main&limit=50") => await body(await discovery(new Request(`${site.origin}${path}`), env(), identity));
const direct = async (identity: AccessIdentity) => (await listed(identity)).actions.map(action => String(action.operationId)).filter(name => !name.startsWith("main.") && !name.startsWith("cloudflare."));

beforeEach(() => {
  f = fixture();
  // Key levels have started. The employee holds no app; Kim is a second person.
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, 'now')").run(id, kim.id);
  fetch = vi.fn(async () => Response.json({ results: [] }));
  vi.stubGlobal("fetch", fetch);
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("reads every key as off on a database with no choice, a new one and a preview's seeded one alike", async () => {
  expect(await currentPolicy(env(), owner)).toMatchObject({ state: "current", direct: new Map() });
  expect(await currentPolicy(env(), employee)).toMatchObject({ state: "current", direct: new Map() });
  const practice = seeded();
  expect(practice.sql.prepare("SELECT COUNT(*) AS count FROM wong_access_key_direct").get()).toEqual({ count: 0 });
  expect(await currentPolicy(practice.env, owner)).toMatchObject({ state: "current", direct: new Map() });
  practice.sql.close();
});

it("while a key's choice is off, refuses the owner, the checker and a person with Read & write, before any request leaves", async () => {
  level(employee.id, "notion", "write");
  for (const identity of [owner, machine, employee]) {
    for (const kind of ["read", "change"] as const) expect(await told(await ask("notion", kind, identity)), `${identity.id} ${kind}`).toEqual([403, "Notion: direct use is off"]);
  }
  // A person with no level is told the level first; nobody signed in is told nothing about the key's choice.
  expect(await told(await ask("notion", "read", kim))).toEqual([403, "Notion: Read needed"]);
  expect((await ask("notion", "read", null)).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
});

it("at look-ups only, runs a look-up for a person with Read and no app, and refuses a change for Read & write", async () => {
  choose("notion", "read");
  level(employee.id, "notion", "read");
  level(kim.id, "notion", "write");
  expect((await ask("notion", "read")).status).toBe(200);
  expect(await told(await ask("notion", "change"))).toEqual([403, "Notion: Read & write needed"]);
  expect((await ask("notion", "read", kim)).status).toBe(200);
  expect(await told(await ask("notion", "change", kim))).toEqual([403, "Notion: direct changes are off"]);
  // The choice binds the owner and the checker as it binds everyone.
  for (const identity of [owner, machine]) {
    expect((await ask("notion", "read", identity)).status).toBe(200);
    expect(await told(await ask("notion", "change", identity))).toEqual([403, "Notion: direct changes are off"]);
  }
  // Direct use needs no app, and gives none: every app's actions stay refused for the person.
  expect((await authorizeRequest(env(), employee, { apps: ["orders"] }, "read"))?.status).toBe(403);
  expect(fetch).toHaveBeenCalledTimes(4);
});

it("at look-ups and changes, runs a change for Read & write and still refuses it for Read, whose look-ups run", async () => {
  choose("notion", "write");
  level(employee.id, "notion", "read");
  level(kim.id, "notion", "write");
  expect((await ask("notion", "change", kim)).status).toBe(200);
  expect((await ask("notion", "read", kim)).status).toBe(200);
  expect(await told(await ask("notion", "change"))).toEqual([403, "Notion: Read & write needed"]);
  expect((await ask("notion", "read")).status).toBe(200);
  expect((await ask("notion", "change", owner)).status).toBe(200);
  // Lowered during a session: the very next request with the same sign-in is judged by the new choice.
  choose("notion", "read");
  expect(await told(await ask("notion", "change", kim))).toEqual([403, "Notion: direct changes are off"]);
  choose("notion", null);
  expect(await told(await ask("notion", "read", kim))).toEqual([403, "Notion: direct use is off"]);
  expect(fetch).toHaveBeenCalledTimes(4);
});

it("runs no direct request before permissions or key levels have started, or while the choice can not be read", async () => {
  choose("notion", "write");
  // An install with no recorded owner, and one whose owner never opened Access: no choice can have been made.
  expect(await told(await ask("notion", "read", owner, env({ ...f.env, WONG_OWNER_EMAIL: undefined })))).toEqual([403, "Notion: direct use is off"]);
  const fresh = fixture({ started: false });
  expect(await told(await ask("notion", "read", owner, env(fresh.env)))).toEqual([403, "Notion: direct use is off"]);
  fresh.sql.close();
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  for (const identity of [owner, employee]) expect(await told(await ask("notion", "change", identity))).toEqual([403, "Notion: direct use is off"]);
  // Permissions started and key levels not yet: a stored choice does not count.
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 1, keys_enabled = 0");
  expect(await told(await ask("notion", "read", owner))).toEqual([403, "Notion: direct use is off"]);
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  expect((await ask("notion", "read", owner)).status).toBe(200);
  // Unreadable permission data never falls back to open.
  f.sql.exec("DROP TABLE wong_access_key_direct");
  const denied = await ask("notion", "read", owner);
  expect([denied.status, (await body(denied)).error.code]).toEqual([503, "unavailable"]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("counts a stored choice as it holds now: changes on a Read-only key read as look-ups only, and a key not set up has none", async () => {
  for (const key of ["ledger", "stripe", "retired"]) choose(key, "write");
  expect(await currentPolicy(env(), owner)).toMatchObject({ direct: new Map([["ledger", "read"]]) });
  expect((await ask("ledger", "read", owner)).status).toBe(200);
});

it("lets the owner or a manager set a key's choice, moves the revision, and refuses everyone and everything else", async () => {
  const before = revision();
  const saved = await save({ key: "notion", mode: "read" });
  expect(saved.status).toBe(200);
  // The status names each key's choice: the ones it offers and the one picked, or null where the service is not set up.
  expect((await body(saved)).keys).toMatchObject([
    { id: "notion", alone: false, direct: { offered: ["read", "write"], mode: "read" } },
    { id: "ledger", alone: false, direct: { offered: ["read"], mode: null } },
    { id: "stripe", alone: false, direct: null }]);
  expect([stored(), revision()]).toEqual([["notion read"], before + 1]);
  expect(f.sql.prepare("SELECT actor_email, event FROM wong_access_audit WHERE event LIKE 'direct_use_changed%'").all())
    .toEqual([{ actor_email: owner.id, event: "direct_use_changed:notion:read" }]);
  // A manager the owner chose sets it too; the same save again changes the row, and Off removes it.
  await management(req("people", "POST", { email: kim.id, removed: false, manager: true }), f.env, owner);
  expect((await save({ key: "notion", mode: "write" }, kim)).status).toBe(200);
  expect((await save({ key: "ledger", mode: "read" }, kim)).status).toBe(200);
  expect(stored()).toEqual(["ledger read", "notion write"]);
  expect((await save({ key: "notion", mode: "off" })).status).toBe(200);
  expect(stored()).toEqual(["ledger read"]);
  const at = revision();
  // An ordinary employee, a machine and a request from another site are denied, and nothing changes.
  for (const identity of [employee, machine]) {
    const refused = await save({ key: "notion", mode: "write" }, identity);
    expect([refused.status, await refused.json()], identity.id).toEqual([403, { code: "owner_required" }]);
  }
  expect((await management(req("direct", "POST", { key: "notion", mode: "write" }, { Origin: "https://elsewhere.example" }), f.env, owner)).status).toBe(403);
  // A key that is not set up, one nobody registered, a choice the key does not offer, and a malformed save.
  for (const [value, code] of [[{ key: "stripe", mode: "read" }, "direct_not_set_up"], [{ key: "retired", mode: "read" }, "direct_not_set_up"], [{ key: "constructor", mode: "off" }, "direct_not_set_up"],
    [{ key: "ledger", mode: "write" }, "level_not_offered"], [{ key: "notion", mode: "admin" }, "invalid_direct"], [{ key: "notion" }, "invalid_direct"],
    [{ key: "notion", mode: "read", extra: 1 }, "invalid_direct"], ["notion", "invalid_direct"]] as const) {
    const refused = await save(value);
    expect([refused.status, await refused.json()], JSON.stringify(value)).toEqual([400, { code }]);
  }
  expect((await management(req("direct", "GET"), f.env, owner)).status).toBe(404);
  expect([stored(), revision()]).toEqual([["ledger read"], at]);
});

it("lists a key's direct actions only to a caller the choice and their level both let run them", async () => {
  level(employee.id, "notion", "write");
  level(employee.id, "ledger", "read");
  expect([await direct(employee), await direct(owner)]).toEqual([[], []]);
  expect((await discovery(new Request(`${site.origin}/api/actions?id=notion.read`), env(), employee)).status).toBe(404);
  expect(Object.keys((await listed(employee, "/api/openapi.json")).paths).filter(path => path.startsWith("/api/direct/"))).toEqual([]);
  // Look-ups only: the look-up is listed, with the key and the level it needs, and the change is not.
  const first = await discovery(new Request(`${site.origin}/api/actions?app=main`), env(), employee);
  await save({ key: "notion", mode: "read" });
  expect([await direct(employee), await direct(owner), await direct(kim)]).toEqual([["notion.read"], ["notion.read"], []]);
  const one = await listed(employee, "/api/actions?id=notion.read");
  expect(one).toMatchObject({ operationId: "notion.read", method: "POST", path: "/api/direct/notion/read", effect: "read", readiness: "available", keys: [{ id: "notion", level: "read" }] });
  expect(Object.keys(one).sort()).toEqual(Object.keys(await listed(employee, "/api/actions?id=main.health")).sort());
  expect((await discovery(new Request(`${site.origin}/api/actions?id=notion.change`), env(), employee)).status).toBe(404);
  expect(Object.keys((await listed(employee, "/api/openapi.json")).paths).filter(path => path.startsWith("/api/direct/"))).toEqual(["/api/direct/notion/read"]);
  // The save moved the revision, so a list cached before it is not served again.
  const again = await discovery(new Request(`${site.origin}/api/actions?app=main`, { headers: { "if-none-match": first.headers.get("etag")! } }), env(), employee);
  expect(again.status).toBe(200);
  // Look-ups and changes: both are listed for Read & write, and the look-up alone for Read.
  await save({ key: "notion", mode: "write" });
  await save({ key: "ledger", mode: "read" });
  expect(await direct(employee)).toEqual(["ledger.read", "notion.change", "notion.read"]);
  expect((await listed(employee, "/api/actions?id=notion.change"))).toMatchObject({ effect: "external", keys: [{ id: "notion", level: "write" }] });
  expect(Object.keys((await listed(employee, "/api/openapi.json")).paths).filter(path => path.startsWith("/api/direct/")))
    .toEqual(["/api/direct/ledger/read", "/api/direct/notion/change", "/api/direct/notion/read"]);
  level(employee.id, "notion", "read");
  expect(await direct(employee)).toEqual(["ledger.read", "notion.read"]);
  // No list ever holds a key's value.
  expect(JSON.stringify(await listed(employee))).not.toContain("notion-token-value");
});

it("works out the key, its level and the direct-use choice a skill needs from the direct actions it lists", () => {
  const one = (actions: string[]) => listSkills({ "../../../.agents/skills/find-a-page/actions.json": { title: "Find a page", actions } }, apiActions)[0];
  expect(one(["notion.read"])).toEqual({ id: "find-a-page", title: "Find a page", areas: {}, keys: { notion: "read" }, direct: { notion: "read" } });
  // A change needs Read & write and the choice look-ups and changes, whichever action is listed first.
  for (const actions of [["notion.read", "notion.change"], ["notion.change", "notion.read"]]) {
    expect(one(actions), actions.join()).toMatchObject({ keys: { notion: "write" }, direct: { notion: "write" } });
  }
  expect(one(["ledger.read", "notion.read"])).toMatchObject({ keys: { ledger: "read", notion: "read" }, direct: { ledger: "read", notion: "read" } });
  // An action that is not a direct one asks for no choice.
  expect(one(["main.health"]).direct).toEqual({});
});
