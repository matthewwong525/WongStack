import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { employee, fixture, owner, req, seeded, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import { discovery } from "../api/discovery";
import { handleApi } from "../api/router";
import type { KeyEntry } from "./key-levels";
import { management } from "./management";
import { authorizeRequest } from "./policy";
import { body } from "../../tests/body";
import { fakeEnv } from "../../tests/env";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtApps(["access", "orders"]));
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
/** A choice saved by a version that had the switch: its row is still there, and nothing reads it. */
const choose = (key: string, mode: string) => f.sql.prepare("INSERT INTO wong_access_key_direct VALUES (?, ?, ?, 1)").run(id, key, mode);
const save = (value: unknown, identity: AccessIdentity = owner) => management(req("people", "POST", value), f.env, identity);
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

it("runs a direct look-up for Read with no choice saved and no app, and refuses a direct change by name", async () => {
  level(employee.id, "notion", "read");
  expect((await ask("notion", "read")).status).toBe(200);
  expect(await told(await ask("notion", "change"))).toEqual([403, "Notion: Read & write needed"]);
  // The look-ups still run after the refusal, and the refused change left the app with nothing.
  expect((await ask("notion", "read")).status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(2);
  // Direct use needs no app, and gives none: every app's actions stay refused for the person.
  expect((await authorizeRequest(env(), employee, { apps: ["orders"] }, "read"))?.status).toBe(403);
});

it("refuses a person with no level, naming the key and the level, before any request leaves", async () => {
  expect(await told(await ask("notion", "read", kim))).toEqual([403, "Notion: Read needed"]);
  expect(await told(await ask("notion", "change", kim))).toEqual([403, "Notion: Read & write needed"]);
  // Nobody signed in is told nothing about the key.
  expect(await told(await ask("notion", "read", null))).toEqual([403, "App access denied"]);
  expect(fetch).not.toHaveBeenCalled();
});

it("runs a direct change for Read & write, and for the owner and the checker on every key set up, with nothing switched on", async () => {
  level(kim.id, "notion", "write");
  for (const identity of [kim, owner, machine]) {
    for (const kind of ["read", "change"] as const) expect((await ask("notion", kind, identity)).status, `${identity.id} ${kind}`).toBe(200);
  }
  // A key that offers Read alone has no change to run, for anyone.
  expect((await ask("ledger", "read", owner)).status).toBe(200);
  expect((await ask("ledger", "change", owner)).status).toBe(404);
  expect(fetch).toHaveBeenCalledTimes(7);
  // Lowered during a session: the very next request with the same sign-in is judged by the new level, then by none.
  level(kim.id, "notion", "read");
  expect(await told(await ask("notion", "change", kim))).toEqual([403, "Notion: Read & write needed"]);
  f.sql.prepare("DELETE FROM wong_access_key_grants WHERE email = ?").run(kim.id);
  expect(await told(await ask("notion", "read", kim))).toEqual([403, "Notion: Read needed"]);
  expect(fetch).toHaveBeenCalledTimes(7);
});

it("ignores a choice saved before the switch went: off, or look-ups only, changes nothing", async () => {
  level(employee.id, "notion", "write");
  // No row was Off. Look-ups only once refused every change.
  for (const kind of ["read", "change"] as const) expect((await ask("notion", kind)).status).toBe(200);
  choose("notion", "read");
  for (const identity of [employee, owner]) expect((await ask("notion", "change", identity)).status).toBe(200);
  // A choice of look-ups and changes gives nobody a level: Kim holds none and is still refused.
  f.sql.exec("DELETE FROM wong_access_key_direct");
  choose("notion", "write");
  expect(await told(await ask("notion", "read", kim))).toEqual([403, "Notion: Read needed"]);
  // The table is not read at all: a database without it answers the same.
  f.sql.exec("DROP TABLE wong_access_key_direct");
  expect((await ask("notion", "read")).status).toBe(200);
  expect((await ask("notion", "read", owner)).status).toBe(200);
});

it("runs no direct request before permissions or key levels have started, the owner's included", async () => {
  level(employee.id, "notion", "write");
  // An install with no recorded owner, and one whose owner never opened Access.
  expect(await told(await ask("notion", "read", owner, env({ ...f.env, WONG_OWNER_EMAIL: undefined })))).toEqual([403, "Notion: Read needed"]);
  const fresh = fixture({ started: false });
  expect(await told(await ask("notion", "read", owner, env(fresh.env)))).toEqual([403, "Notion: Read needed"]);
  fresh.sql.close();
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  for (const identity of [owner, employee]) expect(await told(await ask("notion", "change", identity))).toEqual([403, "Notion: Read & write needed"]);
  // Permissions started and key levels not yet: a held level does not count, and neither does being the owner.
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 1, keys_enabled = 0");
  for (const identity of [owner, machine, employee]) expect(await told(await ask("notion", "read", identity)), identity.id).toEqual([403, "Notion: Read needed"]);
  expect(fetch).not.toHaveBeenCalled();
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  for (const identity of [owner, employee]) expect((await ask("notion", "read", identity)).status).toBe(200);
  // Unreadable permission data never falls back to open.
  f.sql.exec("DROP TABLE wong_access_key_grants");
  const denied = await ask("notion", "read", owner);
  expect([denied.status, (await body(denied)).error.code]).toEqual([503, "unavailable"]);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("tells Access which keys are set up to be used directly, as a yes or no, and keeps no save for a choice", async () => {
  const status = await body(await management(req("status", "GET"), f.env, owner));
  // A direct route is not what makes a key work with no app: `direct` says it.
  expect(status.keys).toMatchObject([{ id: "notion", alone: false, direct: true }, { id: "ledger", alone: false, direct: true }, { id: "stripe", alone: false, direct: false }]);
  const refused = await management(req("direct", "POST", { key: "notion", mode: "read" }), f.env, owner);
  expect([refused.status, await refused.json()]).toEqual([404, { error: "Not found" }]);
  expect(f.sql.prepare("SELECT COUNT(*) AS count FROM wong_access_key_direct").get()).toEqual({ count: 0 });
  // A preview's seeded list holds no choice either.
  const practice = seeded();
  expect(practice.sql.prepare("SELECT COUNT(*) AS count FROM wong_access_key_direct").get()).toEqual({ count: 0 });
  practice.sql.close();
});

it("lists a key's direct actions to a caller by their level alone", async () => {
  // No level: nothing is listed, in the list, the single-action view or the OpenAPI document.
  expect(await direct(employee)).toEqual([]);
  expect((await discovery(new Request(`${site.origin}/api/actions?id=notion.read`), env(), employee)).status).toBe(404);
  expect(Object.keys((await listed(employee, "/api/openapi.json")).paths).filter(path => path.startsWith("/api/direct/"))).toEqual([]);
  // The owner holds every key, so every direct action is theirs with nothing saved.
  expect(await direct(owner)).toEqual(["ledger.read", "notion.change", "notion.read"]);
  // Read: the look-up is listed, with the key and the level it needs, and the change is not.
  const first = await discovery(new Request(`${site.origin}/api/actions?app=main`), env(), employee);
  expect((await save({ email: employee.id, removed: false, keys: { notion: "read" } })).status).toBe(200);
  expect([await direct(employee), await direct(kim)]).toEqual([["notion.read"], []]);
  const one = await listed(employee, "/api/actions?id=notion.read");
  expect(one).toMatchObject({ operationId: "notion.read", method: "POST", path: "/api/direct/notion/read", effect: "read", readiness: "available", keys: [{ id: "notion", level: "read" }] });
  expect(Object.keys(one).sort()).toEqual(Object.keys(await listed(employee, "/api/actions?id=main.health")).sort());
  expect((await discovery(new Request(`${site.origin}/api/actions?id=notion.change`), env(), employee)).status).toBe(404);
  expect(Object.keys((await listed(employee, "/api/openapi.json")).paths).filter(path => path.startsWith("/api/direct/"))).toEqual(["/api/direct/notion/read"]);
  // The save moved the revision, so a list cached before it is not served again.
  const again = await discovery(new Request(`${site.origin}/api/actions?app=main`, { headers: { "if-none-match": first.headers.get("etag")! } }), env(), employee);
  expect(again.status).toBe(200);
  // Read & write: both are listed, and the look-up alone for a key held at Read.
  level(employee.id, "notion", "write");
  level(employee.id, "ledger", "read");
  expect(await direct(employee)).toEqual(["ledger.read", "notion.change", "notion.read"]);
  expect((await listed(employee, "/api/actions?id=notion.change"))).toMatchObject({ effect: "external", keys: [{ id: "notion", level: "write" }] });
  expect(Object.keys((await listed(employee, "/api/openapi.json")).paths).filter(path => path.startsWith("/api/direct/")))
    .toEqual(["/api/direct/ledger/read", "/api/direct/notion/change", "/api/direct/notion/read"]);
  // A choice saved before the switch went hides nothing and shows nothing.
  choose("notion", "read");
  expect([await direct(employee), await direct(kim)]).toEqual([["ledger.read", "notion.change", "notion.read"], []]);
  // No list ever holds a key's value.
  expect(JSON.stringify(await listed(employee))).not.toContain("notion-token-value");
});
