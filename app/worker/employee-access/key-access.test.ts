import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { employee, fixture, owner, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import { defineAction, dispatch, keyUses, needFor, registrations, type Action, type Route } from "../api/contract";
import { discovery } from "../api/discovery";
import type { AppEnv } from "../apps/index";
import { appAccess } from "./apps";
import { authorizeRequest, currentPolicy, listedKeys, policyAllows, type PolicyEnv, type RouteAccess } from "./policy";

vi.mock("./catalogue.ts", () => ({ catalogue: ["access", "orders", "payroll"] }));
vi.mock("../keys.ts", () => ({ keys: {
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
  bank: { title: "Bank", secrets: ["BANK_ID", "BANK_SECRET"] },
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
} }));

const secrets = { STRIPE_SECRET_KEY: "stripe-secret-value", BANK_ID: "bank-id-value", BANK_SECRET: "bank-secret-value", WONG_CLOUDFLARE_READ: "cloudflare-key-value" };
const orders: RouteAccess = { apps: ["orders"], keys: ["stripe"] };
const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access", sub: "", iss: site.issuer, aud: site.audience, exp: 9999999999 } };
const person = (email: string): AccessIdentity => ({ ...employee, id: email, claims: { ...employee.claims, email, sub: email } });
let f: ReturnType<typeof fixture>;
let env: AppEnv;
let handler: ReturnType<typeof vi.fn>;
const id = site.installationId;
const action = (extra: Partial<Action> = {}) => defineAction({ operationId: "orders.read", summary: "Orders", description: "Synthetic order action",
  input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }), encoding: "none", effect: "read", agentAvailable: true,
  errors: {}, examples: [], handler, ...extra } as Action);
const run = (route: Route, mapping: RouteAccess | undefined = orders, identity: AccessIdentity | null = employee, method = "GET", bindings = env) => {
  const request = new Request(`${site.origin}/api/orders`, { method });
  return dispatch(route, request, bindings, { url: new URL(request.url), route: "orders", identity }, mapping);
};
const message = async (response: Response) => (await response.json()).error.message;
const level = (email: string, key: string, held: string) => f.sql.prepare("INSERT INTO wong_access_key_grants VALUES (?, ?, ?, ?, 1) ON CONFLICT DO UPDATE SET level = excluded.level").run(id, email, key, held);

beforeEach(() => {
  f = fixture();
  env = { ...f.env, ...secrets } as unknown as AppEnv;
  handler = vi.fn(() => Response.json({ ok: true }));
  // Key levels have started; the employee has the orders app and no key level yet.
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  f.sql.prepare("INSERT INTO wong_access_grants VALUES (?, ?, 'orders', 1)").run(id, employee.id);
});
afterEach(() => f.sql.close());

it("works out what a call needs from the action's effect, or from the method for a bare handler", () => {
  expect([needFor(action(), "POST"), needFor(action({ effect: "write" }), "GET"), needFor(action({ effect: "external" }), "GET")]).toEqual(["read", "write", "write"]);
  expect(["GET", "HEAD", "POST", "PUT", "DELETE"].map(method => needFor(handler, method))).toEqual(["read", "read", "write", "write", "write"]);
  expect([listedKeys(undefined), listedKeys({ kind: "owner" }), listedKeys({ apps: ["orders"] }), listedKeys(orders), listedKeys({ keys: ["cloudflare"] })])
    .toEqual([[], [], [], ["stripe"], ["cloudflare"]]);
});

it("lets Read look up and refuses a change, naming the key and the level needed and no secret", async () => {
  level(employee.id, "stripe", "read");
  expect((await run(action())).status).toBe(200);
  for (const effect of ["write", "external"] as const) {
    const refused = await run(action({ effect }));
    expect(refused.status).toBe(403);
    expect(refused.headers.get("Cache-Control")).toBe("no-store");
    const body = await refused.text();
    expect(JSON.parse(body)).toMatchObject({ error: { code: "forbidden", message: "Stripe: Read & write needed", requestId: expect.any(String) } });
    expect(body).not.toContain("STRIPE_SECRET_KEY"); expect(body).not.toContain(secrets.STRIPE_SECRET_KEY);
  }
  expect(handler).toHaveBeenCalledTimes(1);
  level(employee.id, "stripe", "write");
  for (const effect of ["read", "write", "external"] as const) expect((await run(action({ effect }))).status).toBe(200);
  // Lowered during a session: the very next request with the same sign-in is judged by the new level.
  f.sql.exec("DELETE FROM wong_access_key_grants");
  expect(await message(await run(action()))).toBe("Stripe: Read needed");
  expect(handler).toHaveBeenCalledTimes(4);
});

it("judges a bare handler by its method: a GET looks up, anything else changes", async () => {
  level(employee.id, "stripe", "read");
  for (const method of ["GET", "HEAD"]) expect((await run(handler, orders, employee, method)).status).toBe(200);
  expect(await message(await run(handler, orders, employee, "POST"))).toBe("Stripe: Read & write needed");
  level(employee.id, "stripe", "write");
  expect((await run(handler, orders, employee, "POST")).status).toBe(200);
});

it("checks an action's own keys before its app's, and every key a route lists", async () => {
  level(employee.id, "stripe", "read");
  // The app lists the bank key, but this action uses Stripe alone: a missing bank level does not block it.
  expect((await run(action({ keys: ["stripe"] } as Partial<Action>), { apps: ["orders"], keys: ["bank"] })).status).toBe(200);
  expect(await message(await run(action(), { apps: ["orders"], keys: ["bank"] }))).toBe("Bank: Read needed");
  expect(await message(await run(action(), { apps: ["orders"], keys: ["stripe", "bank"] }))).toBe("Bank: Read needed");
  level(employee.id, "bank", "read");
  expect((await run(action(), { apps: ["orders"], keys: ["stripe", "bank"] })).status).toBe(200);
  // The level adds to the app tick and never replaces it.
  expect(await message(await run(action(), { apps: ["payroll"], keys: ["stripe"] }))).toBe("App access denied");
  // A route that lists a key nobody registered stays closed, for the owner too.
  for (const identity of [employee, owner]) expect((await run(action(), { apps: ["orders"], keys: ["retired"] }, identity)).status).toBe(403);
});

it("lets a key work with no app for a person whose level permits it, and for nobody else", async () => {
  const alone: RouteAccess = { keys: ["cloudflare"] };
  f.sql.exec("DELETE FROM wong_access_grants");
  expect(await message(await run(action(), alone))).toBe("Cloudflare: Read needed");
  level(employee.id, "cloudflare", "read");
  expect((await run(action(), alone)).status).toBe(200);
  // Every app's actions stay refused: the level opens the key's own look-ups and nothing else.
  expect(await message(await run(action()))).toBe("App access denied");
  expect((await run(action(), alone, owner)).status).toBe(200);
  // A mapping with no keys, or with a key nobody registered, opens nothing, even for the owner.
  for (const mapping of [{ keys: [] }, { keys: ["retired"] }, { keys: ["cloudflare", "retired"] }]) {
    for (const identity of [employee, owner]) expect(await message(await run(action(), mapping, identity))).toBe("App access denied");
  }
  // Read & write stored for a key that offers only Read counts as Read.
  level(employee.id, "cloudflare", "write");
  expect(await currentPolicy(env, employee)).toMatchObject({ keys: new Map([["cloudflare", "read"]]) });
  expect(await message(await run(action({ effect: "write" }), alone))).toBe("Cloudflare: Read & write needed");
});

it("gives the owner and the machine that checks previews every key, and a signed-out caller none", async () => {
  for (const identity of [owner, machine]) {
    expect((await run(action({ effect: "write" }), orders, identity)).status).toBe(200);
    expect((await run(action(), { keys: ["cloudflare"] }, identity)).status).toBe(200);
  }
  expect(await currentPolicy(env, owner)).toMatchObject({ keys: new Map([["stripe", "write"], ["bank", "write"], ["cloudflare", "read"]]) });
  expect((await run(action(), { kind: "owner" }, machine)).status).toBe(403);
  expect((await run(action(), orders, null)).status).toBe(403);
});

it("ignores levels until they start, and never lets a key work alone before then", async () => {
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 0");
  // The app tick alone decides, as before: no level row, and a change still runs.
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
    INSERT INTO wong_access_role_apps VALUES ('${id}', 'sales', 'orders');
    INSERT INTO wong_access_role_keys VALUES ('${id}', 'sales', 'stripe', 'read');
    INSERT INTO wong_access_member_roles VALUES ('${id}', '${employee.id}', 'sales'), ('${id}', '${second.id}', 'sales');
    INSERT INTO wong_access_grants VALUES ('${id}', '${third.id}', 'orders', 1);
    INSERT INTO wong_access_grants VALUES ('${id}', '${employee.id}', 'payroll', 1);
    INSERT INTO wong_access_key_grants VALUES ('${id}', '${third.id}', 'stripe', 'write', 1), ('${id}', '${employee.id}', 'bank', 'write', 1)`);
  for (const holder of [employee, second]) {
    expect(await currentPolicy(env, holder)).toMatchObject({ apps: new Set(["orders"]), keys: new Map([["stripe", "read"]]) });
    expect((await run(action(), orders, holder)).status).toBe(200);
    expect(await message(await run(action({ effect: "write" }), orders, holder))).toBe("Stripe: Read & write needed");
  }
  // A role is the whole answer: rows left under a holder's own name give nothing.
  expect(await message(await run(action(), { apps: ["payroll"], keys: ["bank"] }))).toBe("App access denied");
  expect((await run(action({ effect: "write" }), orders, third)).status).toBe(200);
  f.sql.exec("UPDATE wong_access_role_keys SET level = 'write'");
  for (const holder of [employee, second]) expect((await run(action({ effect: "write" }), orders, holder)).status).toBe(200);
  f.sql.exec("DELETE FROM wong_access_role_apps");
  for (const holder of [employee, second]) expect(await message(await run(action(), orders, holder))).toBe("App access denied");
  expect((await run(action({ effect: "write" }), orders, third)).status).toBe(200);
});

it("hands a handler only the keys its route lists, and stops before it when a listed key is not saved", async () => {
  level(employee.id, "stripe", "write"); level(employee.id, "bank", "write");
  const seen: Record<string, unknown>[] = [];
  const peek = vi.fn((_request: Request, handed: Record<string, unknown>) => { seen.push(handed); return Response.json({ ok: true }); });
  await run(peek as unknown as Route);
  await run(action({ handler: peek as unknown as Action["handler"], ready: handed => "STRIPE_SECRET_KEY" in handed && !("BANK_ID" in handed) }));
  await run(peek as unknown as Route, { apps: ["orders"] });
  await run(peek as unknown as Route, { kind: "self-service" });
  expect(seen.map(handed => Object.keys(secrets).filter(name => name in handed)))
    .toEqual([["STRIPE_SECRET_KEY"], ["STRIPE_SECRET_KEY"], [], []]);
  expect(seen.every(handed => handed.DB === f.env.DB && handed.WONG_OWNER_EMAIL === site.ownerEmail)).toBe(true);
  expect(Object.keys(secrets).every(name => name in env)).toBe(true);
  // A key with two secrets is saved only when both are; an empty or missing one answers unavailable.
  for (const missing of [{ BANK_SECRET: "" }, { BANK_ID: undefined }]) {
    const unavailable = await run(peek as unknown as Route, { apps: ["orders"], keys: ["stripe", "bank"] }, employee, "GET", { ...env, ...missing } as AppEnv);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toMatchObject({ error: { code: "unavailable" } });
  }
  expect((await run(peek as unknown as Route, { apps: ["orders"], keys: ["stripe", "bank"] })).status).toBe(200);
  expect(peek).toHaveBeenCalledTimes(5);
  // An answer is still scanned against every binding, so a key the route does not list can not leave either.
  const leaked = await run(action({ output: z.strictObject({ ok: z.string() }), handler: () => Response.json({ ok: secrets.BANK_SECRET }) }));
  expect(leaked.status).toBe(500); expect(await leaked.text()).not.toContain(secrets.BANK_SECRET);
});

it("lists an action only for a caller whose level permits it, and says which keys each action uses", async () => {
  level(employee.id, "stripe", "read");
  const routes = new Map<string, Route>([["GET read", action()], ["POST refund", action({ operationId: "orders.refund", effect: "write" })],
    ["GET balance", action({ operationId: "orders.balance", keys: ["bank"] } as Partial<Action>)], ["GET bare", handler as unknown as Route]]);
  const registry = [...registrations(routes, "orders", undefined, ["stripe"]),
    ...registrations(new Map([["GET /api/cloudflare/read", action({ operationId: "cloudflare.read", keys: ["cloudflare"] } as Partial<Action>)],
      ["GET /api/unmapped", action({ operationId: "main.unmapped" })], ["GET /api/setup", action({ operationId: "main.setup", keys: ["stripe"] } as Partial<Action>)]]),
    "main", new Map<string, RouteAccess>([["GET /api/cloudflare/read", { keys: ["cloudflare"] }], ["GET /api/setup", { kind: "self-service" }]]))];
  const discover = (path = "/api/actions", headers = {}, caller = employee) =>
    discovery(new Request(`${site.origin}${path}`, { headers }), env as Env & PolicyEnv, caller, registry);
  const ids = async (caller = employee) => (await (await discover("/api/actions", {}, caller)).json()).actions.map((item: { operationId: string }) => item.operationId);
  expect(await ids()).toEqual(["main.setup", "orders.read"]);
  const listing = await (await discover()).json();
  // A reviewed exception is handed no key, so it lists none.
  expect(listing.actions).toMatchObject([{ operationId: "main.setup", keys: [] }, { operationId: "orders.read", keys: [{ id: "stripe", level: "read" }] }]);
  const selected = await discover("/api/actions?id=orders.read");
  expect((await selected.clone().json()).keys).toEqual([{ id: "stripe", level: "read" }]);
  expect((await discover("/api/actions?id=orders.refund")).status).toBe(404);
  expect(Object.keys((await (await discover("/api/openapi.json")).json()).paths)).toEqual(["/api/setup", "/apps/orders/api/read"]);
  expect(await ids(owner)).toEqual(["cloudflare.read", "main.setup", "orders.balance", "orders.read", "orders.refund"]);
  // A level change moves the revision like any save, so a cached description is never reused.
  const etag = selected.headers.get("ETag")!;
  expect((await discover("/api/actions?id=orders.read", { "if-none-match": etag })).status).toBe(304);
  level(employee.id, "stripe", "write"); level(employee.id, "cloudflare", "read");
  f.sql.exec("UPDATE wong_access_installation SET revision = revision + 1");
  const raised = await discover("/api/actions?id=orders.read", { "if-none-match": etag });
  expect(raised.status).toBe(200); expect(raised.headers.get("ETag")).not.toBe(etag);
  expect(await ids()).toEqual(["cloudflare.read", "main.setup", "orders.read", "orders.refund"]);
  expect((await (await discover("/api/actions?id=orders.refund")).json()).keys).toEqual([{ id: "stripe", level: "write" }]);
  // Key levels start with no new revision, and that alone changes the tag.
  const started = (await discover()).headers.get("ETag");
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 0");
  expect((await discover()).headers.get("ETag")).not.toBe(started);
  expect(await ids()).toEqual(["main.setup", "orders.balance", "orders.read", "orders.refund"]);
  // What Access shows of an app's key use comes from the same routes, bare handlers included.
  expect(keyUses(routes, "orders", undefined, ["stripe"])).toEqual([{ apps: ["orders"], keys: ["stripe"], need: "read" },
    { apps: ["orders"], keys: ["stripe"], need: "write" }, { apps: ["orders"], keys: ["bank"], need: "read" }, { apps: ["orders"], keys: ["stripe"], need: "read" }]);
  expect(keyUses(routes, "orders")).toEqual([{ apps: ["orders"], keys: ["bank"], need: "read" }]);
  expect(keyUses(new Map<string, Route>([["GET /api/a", handler as unknown as Route], ["POST /api/b", handler as unknown as Route], ["GET /api/c", action()], ["GET /api/d", action()]]),
    "main", new Map<string, RouteAccess>([["GET /api/a", { keys: ["cloudflare"] }], ["POST /api/b", { apps: ["orders", "payroll"], keys: ["bank"] }], ["GET /api/c", { kind: "owner" }]])))
    .toEqual([{ apps: [], keys: ["cloudflare"], need: "read" }, { apps: ["orders", "payroll"], keys: ["bank"], need: "write" }]);
});

it("tells each signed-in person their own levels, with the key's name and never its value", async () => {
  const readback = async (caller: AccessIdentity) => (await appAccess(new Request(`${site.origin}/api/access/apps`), env, caller)).json();
  level(employee.id, "stripe", "read"); level(employee.id, "cloudflare", "read");
  expect(await readback(employee)).toEqual({ state: "current", role: "employee", manages: false, signIn: true, revision: 1, apps: ["access", "orders"],
    keys: [{ id: "stripe", title: "Stripe", level: "read" }, { id: "cloudflare", title: "Cloudflare", level: "read" }] });
  expect((await readback(owner)).keys).toEqual([{ id: "stripe", title: "Stripe", level: "write" }, { id: "bank", title: "Bank", level: "write" }, { id: "cloudflare", title: "Cloudflare", level: "read" }]);
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 0");
  expect((await readback(employee)).keys).toEqual([]);
  // The default need is the stricter one, so a caller that names none is never let through on Read.
  const policy = await currentPolicy({ ...env, DB: f.env.DB }, owner);
  expect(policyAllows(policy, orders)).toBe(true);
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  expect(policyAllows(await currentPolicy(env, employee), orders)).toBe(false);
  expect(policyAllows(await currentPolicy(env, employee), orders, "read")).toBe(true);
  expect((await authorizeRequest(env, employee, orders))?.status).toBe(403);
  expect(await authorizeRequest(env, employee, orders, "read")).toBeNull();
});
