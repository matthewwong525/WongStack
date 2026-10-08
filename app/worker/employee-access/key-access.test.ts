import { afterEach, beforeEach, expect, it, vi, type Mock } from "vitest";
import { z } from "zod";
import { employee, fixture, owner, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import { defineAction, dispatch, keyUses, needFor, registrations, type Action, type Route } from "../api/contract";
import { discovery } from "../api/discovery";
import type { AppEnv, AppHandler } from "../apps/index";
import type { KeyId } from "../keys";
import { appAccess } from "./apps";
import { authorizeRequest, currentPolicy, listedKeys, policyAllows, type PolicyEnv, type RouteAccess } from "./policy";
import { body } from "../../tests/body";
import { fakeEnv } from "../../tests/env";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtApps(["access", "orders", "payroll"]));
vi.mock("../keys.ts", () => ({ keys: {
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
  bank: { title: "Bank", secrets: ["BANK_ID", "BANK_SECRET"] },
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
} }));

const secrets = { STRIPE_SECRET_KEY: "stripe-secret-value", BANK_ID: "bank-id-value", BANK_SECRET: "bank-secret-value", WONG_CLOUDFLARE_READ: "cloudflare-key-value" };
// Orders is an app that uses Stripe. `alone` is Stripe used by itself, with no app.
const orders: RouteAccess = { apps: ["orders"], keys: ["stripe"] };
const alone: RouteAccess = { keys: ["stripe"] };
const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access", sub: "", iss: site.issuer, aud: site.audience, exp: 9999999999 } };
const person = (email: string): AccessIdentity => ({ ...employee, id: email, claims: { ...employee.claims, email, sub: email } });
let f: ReturnType<typeof fixture>;
let env: AppEnv;
let handler: Mock<AppHandler>;
const id = site.installationId;
/** Key names from the registry mocked above, which the real registry's type does not hold. */
const listed = (...ids: string[]) => ids as KeyId[];
const action = (extra: Partial<Action> = {}) => defineAction({ operationId: "orders.read", summary: "Orders", description: "Synthetic order action",
  input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }), encoding: "none", effect: "read", agentAvailable: true,
  errors: {}, examples: [], handler, ...extra } as Action);
const run = (route: Route, mapping: RouteAccess | undefined = orders, identity: AccessIdentity | null = employee, method = "GET", bindings = env) => {
  const request = new Request(`${site.origin}/api/orders`, { method });
  return dispatch(route, request, bindings, { url: new URL(request.url), route: "orders", identity }, mapping);
};
const message = async (response: Response) => (await body(response)).error.message;
const level = (email: string, key: string, held: string) => f.sql.prepare("INSERT INTO wong_access_key_grants VALUES (?, ?, ?, ?, 1) ON CONFLICT DO UPDATE SET level = excluded.level").run(id, email, key, held);

beforeEach(() => {
  f = fixture();
  env = fakeEnv({ ...f.env, ...secrets });
  handler = vi.fn<AppHandler>(() => Response.json({ ok: true }));
  // Key levels have started; the employee has the orders app and no key level yet.
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  f.sql.prepare("INSERT INTO wong_access_grants VALUES (?, ?, 'orders', 1, 'write')").run(id, employee.id);
});
afterEach(() => f.sql.close());

it("works out what a call needs from the action's effect, or from the method for a bare handler", () => {
  expect([needFor(action(), "POST"), needFor(action({ effect: "write" }), "GET"), needFor(action({ effect: "external" }), "GET")]).toEqual(["read", "write", "write"]);
  expect(["GET", "HEAD", "POST", "PUT", "DELETE"].map(method => needFor(handler, method))).toEqual(["read", "read", "write", "write", "write"]);
  expect([listedKeys(undefined), listedKeys({ kind: "owner" }), listedKeys({ apps: ["orders"] }), listedKeys(orders), listedKeys({ keys: ["cloudflare"] })])
    .toEqual([[], [], [], ["stripe"], ["cloudflare"]]);
});

it("lets Read look up with a key by itself and refuses a change, naming the key and the level needed and no secret", async () => {
  level(employee.id, "stripe", "read");
  expect((await run(action(), alone)).status).toBe(200);
  for (const effect of ["write", "external"] as const) {
    const refused = await run(action({ effect }), alone);
    expect(refused.status).toBe(403);
    expect(refused.headers.get("Cache-Control")).toBe("no-store");
    const body = await refused.text();
    expect(JSON.parse(body)).toMatchObject({ error: { code: "forbidden", message: "Stripe: Read & write needed", requestId: expect.any(String) } });
    expect(body).not.toContain("STRIPE_SECRET_KEY"); expect(body).not.toContain(secrets.STRIPE_SECRET_KEY);
  }
  expect(handler).toHaveBeenCalledTimes(1);
  level(employee.id, "stripe", "write");
  for (const effect of ["read", "write", "external"] as const) expect((await run(action({ effect }), alone)).status).toBe(200);
  // Lowered during a session: the very next request with the same sign-in is judged by the new level.
  f.sql.exec("DELETE FROM wong_access_key_grants");
  expect(await message(await run(action(), alone))).toBe("Stripe: Read needed");
  expect(handler).toHaveBeenCalledTimes(4);
});

it("judges a bare handler of a key alone by its method: a GET looks up, anything else changes", async () => {
  level(employee.id, "stripe", "read");
  for (const method of ["GET", "HEAD"]) expect((await run(handler, alone, employee, method)).status).toBe(200);
  expect(await message(await run(handler, alone, employee, "POST"))).toBe("Stripe: Read & write needed");
  level(employee.id, "stripe", "write");
  expect((await run(handler, alone, employee, "POST")).status).toBe(200);
});

it("checks an action's own keys before its mapping's, and every key a key-alone route lists", async () => {
  level(employee.id, "stripe", "read");
  // The mapping lists the bank key, but this action uses Stripe alone: a missing bank level does not block it.
  expect((await run(action({ keys: listed("stripe") }), { keys: ["bank"] })).status).toBe(200);
  expect(await message(await run(action(), { keys: ["bank"] }))).toBe("Bank: Read needed");
  expect(await message(await run(action(), { keys: ["stripe", "bank"] }))).toBe("Bank: Read needed");
  level(employee.id, "bank", "read");
  expect((await run(action(), { keys: ["stripe", "bank"] })).status).toBe(200);
});

it("runs every call of a held app, changes too, whatever the caller's level for the keys the app uses", async () => {
  // The employee holds Orders and no key level at all: Orders uses Stripe, and its refund still runs.
  for (const effect of ["read", "write", "external"] as const) {
    expect((await run(action({ effect }))).status, effect).toBe(200);
    expect((await run(action({ effect }), { apps: ["orders"], keys: ["stripe", "bank"] })).status, effect).toBe(200);
  }
  expect((await run(handler, orders, employee, "POST")).status).toBe(200);
  expect(await currentPolicy(env, employee)).toMatchObject({ apps: new Set(["orders"]), keys: new Map() });
  expect(handler).toHaveBeenCalledTimes(7);
  // A key level never stands in for the app: Read & write on Stripe opens nothing of an app the person lacks.
  level(employee.id, "stripe", "write");
  const refused = await run(action(), { apps: ["payroll"], keys: ["stripe"] });
  expect([refused.status, await message(refused)]).toEqual([403, "App access denied"]);
  // A row left at `read` could only look: it is not held, for a look-up either.
  f.sql.exec("UPDATE wong_access_grants SET level = 'read'");
  expect(await currentPolicy(env, employee)).toMatchObject({ apps: new Set() });
  for (const effect of ["read", "write"] as const) expect(await message(await run(action({ effect })))).toBe("App access denied");
  expect(handler).toHaveBeenCalledTimes(7);
  // A route that lists a key nobody registered never reaches its handler, for the owner too: no such key is saved.
  for (const identity of [owner, machine]) expect((await run(action(), { apps: ["orders"], keys: ["retired"] }, identity)).status).toBe(503);
});

it("lets a key work with no app for a person whose level permits it, and for nobody else", async () => {
  const cloudflare: RouteAccess = { keys: ["cloudflare"] };
  f.sql.exec("DELETE FROM wong_access_grants");
  expect(await message(await run(action(), cloudflare))).toBe("Cloudflare: Read needed");
  level(employee.id, "cloudflare", "read");
  expect((await run(action(), cloudflare)).status).toBe(200);
  // Every app's actions stay refused: the level opens the key's own look-ups and nothing else.
  expect(await message(await run(action()))).toBe("App access denied");
  expect((await run(action(), cloudflare, owner)).status).toBe(200);
  // A mapping with no keys, or with a key nobody registered, opens nothing, even for the owner.
  for (const mapping of [{ keys: [] }, { keys: ["retired"] }, { keys: ["cloudflare", "retired"] }]) {
    for (const identity of [employee, owner]) expect(await message(await run(action(), mapping, identity))).toBe("App access denied");
  }
  // Read & write stored for a key that offers only Read counts as Read.
  level(employee.id, "cloudflare", "write");
  expect(await currentPolicy(env, employee)).toMatchObject({ keys: new Map([["cloudflare", "read"]]) });
  expect(await message(await run(action({ effect: "write" }), cloudflare))).toBe("Cloudflare: Read & write needed");
});

it("gives the owner and the machine that checks previews every app and every key, and a signed-out caller none", async () => {
  for (const identity of [owner, machine]) {
    expect(await currentPolicy(env, identity)).toMatchObject({ apps: new Set(["access", "orders", "payroll"]) });
    expect((await run(action({ effect: "write" }), orders, identity)).status).toBe(200);
    expect((await run(action({ effect: "write" }), { apps: ["payroll"] }, identity)).status).toBe(200);
    expect((await run(action({ effect: "write" }), alone, identity)).status).toBe(200);
    expect((await run(action(), { keys: ["cloudflare"] }, identity)).status).toBe(200);
  }
  expect(await currentPolicy(env, owner)).toMatchObject({ keys: new Map([["stripe", "write"], ["bank", "write"], ["cloudflare", "read"]]) });
  expect((await run(action(), { kind: "owner" }, machine)).status).toBe(403);
  expect((await run(action(), orders, null)).status).toBe(403);
});

it("never lets a key work alone before key levels start, while apps run as they do after", async () => {
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 0");
  expect(await currentPolicy(env, employee)).toMatchObject({ state: "current", keys: null });
  expect((await run(action({ effect: "write" }))).status).toBe(200);
  expect(await message(await run(action(), { keys: ["cloudflare"] }))).toBe("Cloudflare: Read needed");
  expect((await run(action(), { keys: ["cloudflare"] }, owner)).status).toBe(200);
  // Before permissions start everyone keeps every app, and only the owner has a key working alone.
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  expect((await run(action({ effect: "write" }), { apps: ["payroll"], keys: ["stripe"] })).status).toBe(200);
  expect(await message(await run(action(), { keys: ["cloudflare"] }))).toBe("Cloudflare: Read needed");
  expect((await run(action(), { keys: ["cloudflare"] }, owner)).status).toBe(200);
  expect((await run(action(), { keys: [] }, owner)).status).toBe(403);
  // An install with no recorded owner keeps its apps open, and a key working alone is nobody's.
  const legacy = { ...env, WONG_OWNER_EMAIL: undefined };
  expect((await run(action({ effect: "write" }), orders, employee, "GET", legacy)).status).toBe(200);
  for (const identity of [employee, owner]) expect((await run(action(), { keys: ["cloudflare"] }, identity, "GET", legacy)).status).toBe(403);
  expect(handler).toHaveBeenCalledTimes(5);
});

it("reads a person's apps and levels from their role, so a role change reaches every holder and no one else", async () => {
  const [second, third] = [person("second@example.com"), person("third@example.com")];
  f.sql.exec(`INSERT INTO wong_access_members VALUES ('${id}', '${second.id}', 'active', 0, 1, 'now'), ('${id}', '${third.id}', 'active', 0, 1, 'now');
    INSERT INTO wong_access_apps VALUES ('${id}', 'payroll');
    INSERT INTO wong_access_roles VALUES ('${id}', 'sales', 'Sales', 1);
    INSERT INTO wong_access_role_apps VALUES ('${id}', 'sales', 'orders', 'write');
    INSERT INTO wong_access_role_keys VALUES ('${id}', 'sales', 'stripe', 'read');
    INSERT INTO wong_access_member_roles VALUES ('${id}', '${employee.id}', 'sales'), ('${id}', '${second.id}', 'sales');
    INSERT INTO wong_access_grants VALUES ('${id}', '${third.id}', 'orders', 1, 'write');
    INSERT INTO wong_access_grants VALUES ('${id}', '${employee.id}', 'payroll', 1, 'write');
    INSERT INTO wong_access_key_grants VALUES ('${id}', '${third.id}', 'stripe', 'write', 1), ('${id}', '${employee.id}', 'bank', 'write', 1)`);
  for (const holder of [employee, second]) {
    expect(await currentPolicy(env, holder)).toMatchObject({ apps: new Set(["orders"]), keys: new Map([["stripe", "read"]]) });
    // The role's app is whole; the role's Stripe level is for Stripe by itself.
    expect((await run(action({ effect: "write" }), orders, holder)).status).toBe(200);
    expect((await run(action(), alone, holder)).status).toBe(200);
    expect(await message(await run(action({ effect: "write" }), alone, holder))).toBe("Stripe: Read & write needed");
  }
  // A role is the whole answer: rows left under a holder's own name give nothing.
  expect(await message(await run(action(), { apps: ["payroll"], keys: ["bank"] }))).toBe("App access denied");
  expect(await message(await run(action(), { keys: ["bank"] }))).toBe("Bank: Read needed");
  expect((await run(action({ effect: "write" }), alone, third)).status).toBe(200);
  f.sql.exec("UPDATE wong_access_role_keys SET level = 'write'");
  for (const holder of [employee, second]) expect((await run(action({ effect: "write" }), alone, holder)).status).toBe(200);
  // A role's row left at `read` is held by none of its holders, and neither is an app the role no longer has.
  for (const change of ["UPDATE wong_access_role_apps SET level = 'read'", "DELETE FROM wong_access_role_apps"]) {
    f.sql.exec(change);
    for (const holder of [employee, second]) {
      expect(await currentPolicy(env, holder)).toMatchObject({ apps: new Set() });
      expect(await message(await run(action(), orders, holder))).toBe("App access denied");
    }
  }
  expect((await run(action({ effect: "write" }), orders, third)).status).toBe(200);
});

it("hands a handler only the keys its route lists, and stops before it when a listed key is not saved", async () => {
  const seen: AppEnv[] = [];
  const peek = vi.fn<AppHandler>((_request, handed) => { seen.push(handed); return Response.json({ ok: true }); });
  await run(peek);
  await run(action({ handler: peek, ready: handed => "STRIPE_SECRET_KEY" in handed && !("BANK_ID" in handed) }));
  await run(peek, { apps: ["orders"] });
  await run(peek, { kind: "self-service" });
  expect(seen.map(handed => Object.keys(secrets).filter(name => name in handed)))
    .toEqual([["STRIPE_SECRET_KEY"], ["STRIPE_SECRET_KEY"], [], []]);
  expect(seen.every(handed => handed.DB === f.env.DB && handed.WONG_OWNER_EMAIL === site.ownerEmail)).toBe(true);
  expect(Object.keys(secrets).every(name => name in env)).toBe(true);
  // A key with two secrets is saved only when both are; an empty or missing one answers unavailable.
  for (const missing of [{ BANK_SECRET: "" }, { BANK_ID: undefined }]) {
    const unavailable = await run(peek, { apps: ["orders"], keys: ["stripe", "bank"] }, employee, "GET", { ...env, ...missing } as AppEnv);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toMatchObject({ error: { code: "unavailable" } });
  }
  expect((await run(peek, { apps: ["orders"], keys: ["stripe", "bank"] })).status).toBe(200);
  expect(peek).toHaveBeenCalledTimes(5);
  // An answer is still scanned against every binding, so a key the route does not list can not leave either.
  const leaked = await run(action({ output: z.strictObject({ ok: z.string() }), handler: () => Response.json({ ok: secrets.BANK_SECRET }) }));
  expect(leaked.status).toBe(500); expect(await leaked.text()).not.toContain(secrets.BANK_SECRET);
});

it("lists every action of a held app, and a key's own action only for a caller whose level permits it", async () => {
  const routes = new Map<string, Route>([["GET read", action()], ["POST refund", action({ operationId: "orders.refund", effect: "write" })],
    ["GET balance", action({ operationId: "orders.balance", keys: listed("bank") })], ["GET bare", handler]]);
  const registry = [...registrations(routes, "orders", undefined, ["stripe"]),
    ...registrations(new Map([["GET /api/cloudflare/read", action({ operationId: "cloudflare.read", keys: ["cloudflare"] } as Partial<Action>)],
      ["POST /api/stripe/charge", action({ operationId: "stripe.charge", effect: "write" })],
      ["GET /api/unmapped", action({ operationId: "main.unmapped" })], ["GET /api/setup", action({ operationId: "main.setup", keys: listed("stripe") })]]),
    "main", new Map<string, RouteAccess>([["GET /api/cloudflare/read", { keys: ["cloudflare"] }], ["POST /api/stripe/charge", alone], ["GET /api/setup", { kind: "self-service" }]]))];
  const discover = (path = "/api/actions", headers = {}, caller = employee) =>
    discovery(new Request(`${site.origin}${path}`, { headers }), env as Env & PolicyEnv, caller, registry);
  const ids = async (caller = employee) => (await body(await discover("/api/actions", {}, caller))).actions.map(item => item.operationId);
  // No key level at all: the app's look-ups and changes are all there, and no key's own action is.
  const held = ["main.setup", "orders.balance", "orders.read", "orders.refund"];
  expect(await ids()).toEqual(held);
  const listing = await body(await discover());
  // Each action still says which keys it uses and what it does with them. A reviewed exception is handed no key, so it lists none.
  expect(listing.actions).toMatchObject([{ operationId: "main.setup", keys: [] }, { operationId: "orders.balance", keys: [{ id: "bank", level: "read" }] },
    { operationId: "orders.read", keys: [{ id: "stripe", level: "read" }] }, { operationId: "orders.refund", keys: [{ id: "stripe", level: "write" }] }]);
  const selected = await discover("/api/actions?id=orders.refund");
  expect((await body(selected.clone())).keys).toEqual([{ id: "stripe", level: "write" }]);
  for (const id of ["cloudflare.read", "stripe.charge", "main.unmapped"]) expect((await discover(`/api/actions?id=${id}`)).status, id).toBe(404);
  expect(Object.keys((await body(await discover("/api/openapi.json"))).paths)).toEqual(["/api/setup", "/apps/orders/api/balance", "/apps/orders/api/read", "/apps/orders/api/refund"]);
  expect(await ids(owner)).toEqual(["cloudflare.read", ...held, "stripe.charge"]);
  // A level change moves the revision like any save, so a cached description is never reused.
  const etag = selected.headers.get("ETag")!;
  expect((await discover("/api/actions?id=orders.refund", { "if-none-match": etag })).status).toBe(304);
  level(employee.id, "stripe", "read"); level(employee.id, "cloudflare", "read");
  f.sql.exec("UPDATE wong_access_installation SET revision = revision + 1");
  const raised = await discover("/api/actions?id=orders.refund", { "if-none-match": etag });
  expect(raised.status).toBe(200); expect(raised.headers.get("ETag")).not.toBe(etag);
  // Read on Stripe lists no change made with Stripe alone; Read & write does.
  expect(await ids()).toEqual(["cloudflare.read", ...held]);
  level(employee.id, "stripe", "write");
  expect(await ids()).toEqual(["cloudflare.read", ...held, "stripe.charge"]);
  // Key levels start with no new revision, and that alone changes the tag.
  const started = (await discover()).headers.get("ETag");
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 0");
  expect((await discover()).headers.get("ETag")).not.toBe(started);
  expect(await ids()).toEqual(held);
  // Without the app, none of its actions is listed.
  f.sql.exec("DELETE FROM wong_access_grants");
  expect(await ids()).toEqual(["main.setup"]);
  // What Access shows of an app's key use comes from the same routes, bare handlers included.
  expect(keyUses(routes, "orders", undefined, ["stripe"])).toEqual([{ apps: ["orders"], keys: ["stripe"], need: "read" },
    { apps: ["orders"], keys: ["stripe"], need: "write" }, { apps: ["orders"], keys: ["bank"], need: "read" }, { apps: ["orders"], keys: ["stripe"], need: "read" }]);
  expect(keyUses(routes, "orders")).toEqual([{ apps: ["orders"], keys: ["bank"], need: "read" }]);
  expect(keyUses(new Map<string, Route>([["GET /api/a", handler], ["POST /api/b", handler], ["GET /api/c", action()], ["GET /api/d", action()]]),
    "main", new Map<string, RouteAccess>([["GET /api/a", { keys: ["cloudflare"] }], ["POST /api/b", { apps: ["orders", "payroll"], keys: ["bank"] }], ["GET /api/c", { kind: "owner" }]])))
    .toEqual([{ apps: [], keys: ["cloudflare"], need: "read" }, { apps: ["orders", "payroll"], keys: ["bank"], need: "write" }]);
  // A folder with no screen hands over a mapping for each route: its key use belongs to no app, and an action's own keys still come first.
  const screenless = new Map<string, RouteAccess>([...routes.keys()].map(key => [key, alone]));
  expect(keyUses(routes, "reports", screenless).map(use => [use.apps, use.keys])).toEqual([[[], ["stripe"]], [[], ["stripe"]], [[], ["bank"]], [[], ["stripe"]]]);
  expect(registrations(routes, "reports", screenless).map(({ path, app, access }) => [path, app, access])).toEqual([["/apps/reports/api/read", "reports", alone],
    ["/apps/reports/api/refund", "reports", alone], ["/apps/reports/api/balance", "reports", { keys: ["bank"] }]]);
});

it("judges a route that passes a request on to a key's service by the caller's level alone, once key levels have started", async () => {
  const direct: RouteAccess = { keys: ["stripe"], direct: true };
  const may = async (caller: AccessIdentity | null, need: "read" | "write") => (await authorizeRequest(env, caller, direct, need)) === null;
  // No level is refused by name; Read looks up and is refused a change; Read & write does both. No app is asked for.
  expect(await message((await authorizeRequest(env, employee, direct, "read"))!)).toBe("Stripe: Read needed");
  level(employee.id, "stripe", "read");
  expect([await may(employee, "read"), await may(employee, "write")]).toEqual([true, false]);
  expect(await message((await authorizeRequest(env, employee, direct, "write"))!)).toBe("Stripe: Read & write needed");
  level(employee.id, "stripe", "write");
  expect([await may(employee, "read"), await may(employee, "write")]).toEqual([true, true]);
  // The owner and the checker hold every key, so both run with nothing chosen anywhere.
  expect([await may(owner, "write"), await may(machine, "write"), await may(null, "read")]).toEqual([true, true, false]);
  expect(keyUses(new Map([["GET /api/x", action()]]), "main", new Map([["GET /api/x", direct]]))).toEqual([{ apps: [], keys: ["stripe"], need: "read", direct: true }]);
  // Until key levels start no direct request runs, the owner's included; a key's other route still runs for the owner.
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 0");
  expect([await may(owner, "read"), await may(machine, "read"), await may(employee, "read"), (await authorizeRequest(env, owner, alone, "read")) === null]).toEqual([false, false, false, true]);
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  expect([await may(owner, "read"), await may(employee, "read")]).toEqual([false, false]);
});

it("tells each signed-in person their own apps and levels, with the key's name and never its value", async () => {
  const readback = async (caller: AccessIdentity) => body(await appAccess(new Request(`${site.origin}/api/access/apps`), env, caller));
  level(employee.id, "stripe", "read"); level(employee.id, "cloudflare", "read");
  expect(await readback(employee)).toEqual({ state: "current", role: "employee", manages: false, signIn: true, code: "off", revision: 1, apps: ["access", "orders"],
    keys: [{ id: "stripe", title: "Stripe", level: "read" }, { id: "cloudflare", title: "Cloudflare", level: "read" }] });
  expect(await readback(owner)).toMatchObject({ apps: ["access", "orders", "payroll"],
    keys: [{ id: "stripe", title: "Stripe", level: "write" }, { id: "bank", title: "Bank", level: "write" }, { id: "cloudflare", title: "Cloudflare", level: "read" }] });
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 0");
  expect((await readback(employee)).keys).toEqual([]);
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  // An app's call asks for no level. A key's own call that names no need is judged by the stricter one, never let through on Read.
  const policy = await currentPolicy(env, employee);
  expect([policyAllows(policy, orders), policyAllows(policy, alone), policyAllows(policy, alone, "read")]).toEqual([true, false, true]);
  expect(await authorizeRequest(env, employee, orders)).toBeNull();
  expect((await authorizeRequest(env, employee, alone))?.status).toBe(403);
  expect(await authorizeRequest(env, employee, alone, "read")).toBeNull();
});
