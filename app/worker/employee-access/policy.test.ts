import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { authorizeRequest, currentPolicy, humanEmail, ownerEmail, policyAllows, type PolicyEnv, type RouteAccess } from "./policy";
import type { AccessIdentity } from "../access";
import { defineAction, dispatch, registrations, type Registration } from "../api/contract";
import { handleApi } from "../api/router";
import { discovery } from "../api/discovery";
import { appAccess, appPageDenied } from "./apps";
import { body } from "../../tests/body";
import { fakeDatabase, fakeEnv } from "../../tests/env";

// The built folders are the catalogue; these tests name areas this repo does not build. Reports has no screen.
vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtAreas(["access", "frontend-only", "hello", "new-app", "orders", "payroll", "reports"], ["reports"]));

const origin = "https://business.example.com";
const issuer = "https://business.cloudflareaccess.com";
const employee: AccessIdentity = { kind: "user", id: "employee@example.com", claims: {
  email: "employee@example.com", sub: "employee-subject", iss: issuer, aud: "business-app", exp: 9999999999,
} };
const owner: AccessIdentity = { ...employee, id: "owner@example.com", claims: {
  ...employee.claims, email: "owner@example.com", sub: "owner-subject",
} };
let sql: DatabaseSync;
let env: PolicyEnv;
const request = () => new Request(`${origin}/api/orders`);
const access: RouteAccess = { apps: ["orders"] };
const read = (identity: AccessIdentity | null = employee, bindings = env) => currentPolicy(bindings, identity);
/** A database that answers every permission read with one fixed row. */
const answering = (row: unknown) => ({ ...env, DB: fakeDatabase({ withSession: () => ({ prepare: () => ({ bind: () => ({ first: async () => row }) }) }) }) });

beforeEach(() => {
  sql = new DatabaseSync(":memory:");
  for (const file of ["0001_employee_access.sql", "0003_key_levels.sql", "20261005142459_access_managers.sql", "20261006031500_area_levels.sql"]) {
    sql.exec(readFileSync(new URL(`../../../schema/migrations/${file}`, import.meta.url), "utf8"));
  }
  sql.exec(`INSERT INTO wong_access_installation
    (slot, installation_id, origin, account_id, worker_id, access_app_id, access_policy_id,
      issuer, audience, owner_subject, owner_email, repository_id, repository_name, policy_enabled, activated_at)
    VALUES (1, 'installation', '${origin}', 'account', 'worker', 'application', 'policy',
      '${issuer}', 'business-app', 'owner-subject', 'owner@example.com', 123, 'business/project', 1, 'now');
    INSERT INTO wong_access_members VALUES ('installation', 'employee@example.com', 'active', 0, 1, 'now');
    INSERT INTO wong_access_apps VALUES ('installation', 'orders');
    INSERT INTO wong_access_apps VALUES ('installation', 'payroll');
    INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'orders', 1, 'write');`);
  const session = { prepare: (query: string) => ({ bind: (email: string) => ({
    first: async () => sql.prepare(query).get(email) ?? null,
  }) }) };
  env = { DB: fakeDatabase({ withSession: vi.fn(() => session) }), WONG_OWNER_EMAIL: "owner@example.com",
    CF_ACCESS_TEAM_DOMAIN: "business.cloudflareaccess.com", CF_ACCESS_AUD: "business-app" };
});
afterEach(() => sql.close());

it("keeps an install with no recorded owner on its existing behavior, without reading any database", async () => {
  for (const value of [undefined, "", "  "]) {
    expect(await read(null, { ...env, WONG_OWNER_EMAIL: value })).toEqual({ state: "legacy" });
    expect(ownerEmail({ WONG_OWNER_EMAIL: value })).toBeNull();
  }
  expect(ownerEmail({ WONG_OWNER_EMAIL: " Owner@Example.com " })).toBe("owner@example.com");
  expect(env.DB?.withSession).not.toHaveBeenCalled();
  expect(policyAllows({ state: "legacy" }, undefined)).toBe(true);
});

it("loads normalized email and grants in one primary statement with no role cache", async () => {
  const normalized = { ...employee, id: " EMPLOYEE@EXAMPLE.COM ", claims: {
    ...employee.claims, email: " EMPLOYEE@EXAMPLE.COM ", aud: ["other-app", "business-app"], nbf: 1,
  } };
  const first = await read(normalized);
  expect(first).toEqual({ state: "current", role: "employee", manages: false, revision: 1, apps: new Map([["orders", "write"]]), keys: null });
  expect(env.DB?.withSession).toHaveBeenCalledWith("first-primary");
  expect(policyAllows(first, access)).toBe(true);
  expect(policyAllows(first, { apps: ["payroll"] })).toBe(false);
  // The same still-valid Access assertion observes the acknowledged database commit.
  sql.exec("DELETE FROM wong_access_grants; UPDATE wong_access_installation SET revision = 2;");
  const next = await read(normalized);
  expect(next).toEqual({ state: "current", role: "employee", manages: false, revision: 2, apps: new Map(), keys: null });
  expect(policyAllows(next, access)).toBe(false);
  sql.exec("UPDATE wong_access_members SET status = 'removed', revision = 3; UPDATE wong_access_installation SET revision = 3;");
  expect(await read(normalized)).toEqual({ state: "denied" });
  expect(env.DB?.withSession).toHaveBeenCalledTimes(3);
});

it("requires every mapped area and leaves new or empty mappings closed", async () => {
  const policy = await read();
  for (const mapping of [undefined, { apps: [] }, { apps: ["orders", "payroll"] },
    { apps: ["new-app"] }, { apps: ["invalid/app"] }]) expect(policyAllows(policy, mapping)).toBe(false);
  sql.exec("INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'payroll', 1, 'read')");
  // A shared route needs each of its areas at the level the call needs.
  const shared = { apps: ["orders", "payroll"] };
  expect([policyAllows(await read(), shared, "read"), policyAllows(await read(), shared)]).toEqual([true, false]);
  expect(await (await authorizeRequest(env, employee, shared))?.json()).toMatchObject({ error: { code: "forbidden", message: "Payroll: Look up & change needed" } });
  sql.exec("UPDATE wong_access_grants SET level = 'write'");
  expect(policyAllows(await read(), shared)).toBe(true);
});

it("knows the owner by the recorded email alone and permits zero-app employee self-service", async () => {
  const ownerPolicy = await read(owner);
  expect(ownerPolicy).toMatchObject({ state: "current", role: "owner" });
  expect(policyAllows(ownerPolicy, { kind: "owner" })).toBe(true);
  expect(policyAllows(ownerPolicy, access)).toBe(true);
  expect(policyAllows(ownerPolicy, undefined)).toBe(false);
  expect(policyAllows(ownerPolicy, { apps: [] })).toBe(false);
  // The signed user id is logged, never pinned: a new sign-in for the same email is still the owner.
  expect(await read({ ...owner, claims: { ...owner.claims, sub: "another-device" } })).toMatchObject({ role: "owner" });
  expect(await read(owner, { ...env, WONG_OWNER_EMAIL: " OWNER@example.com " })).toMatchObject({ role: "owner" });
  // A leftover person row under the owner's email takes nothing from the owner.
  sql.exec("INSERT INTO wong_access_members VALUES ('installation', 'owner@example.com', 'removed', 0, 1, 'now')");
  expect(await read(owner)).toMatchObject({ state: "current", role: "owner" });
  // The owner's email carried by a machine, or with no signed user id, is nobody.
  for (const impostor of [{ ...owner, kind: "service" as const }, { ...owner, claims: { ...owner.claims, sub: "" } },
    { ...owner, claims: { ...owner.claims, common_name: "machine" } }]) expect(await read(impostor)).toEqual({ state: "denied" });
  sql.exec("DELETE FROM wong_access_grants");
  const empty = await read();
  expect(policyAllows(empty, { kind: "self-service" })).toBe(true);
  expect(policyAllows(empty, { kind: "infrastructure" })).toBe(true);
  expect(policyAllows(empty, { kind: "owner" })).toBe(false);
  expect(policyAllows({ state: "denied" }, { kind: "self-service" })).toBe(false);
  expect(await authorizeRequest(env, employee, { kind: "self-service" })).toBeNull();
  sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await authorizeRequest(env, employee, { kind: "self-service" }))?.status).toBe(403);
});

it("lets the verification machine open every built app, and manage people on a preview only", async () => {
  const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: {
    common_name: "checker.access", sub: "", iss: issuer, aud: "business-app", exp: 9999999999,
  } };
  const policy = await read(machine);
  expect(policy).toEqual({ state: "current", role: "employee", manages: false, revision: 1,
    apps: new Map(["access", "frontend-only", "hello", "new-app", "orders", "payroll", "reports"].map(area => [area, "write"] as const)), keys: new Map([["cloudflare", "read"], ["code", "read"]]) });
  expect(humanEmail(machine)).toBeNull();
  expect(policyAllows(policy, { apps: ["orders", "payroll"] })).toBe(true);
  expect(policyAllows(policy, { kind: "owner" })).toBe(false);
  expect(policyAllows(policy, undefined)).toBe(false);
  // A machine carrying an email, no name, or a name that is not its own identity is nobody.
  for (const forged of [{ ...machine, claims: { ...machine.claims, email: "owner@example.com" } },
    { ...machine, claims: { ...machine.claims, common_name: undefined } },
    { ...machine, claims: { ...machine.claims, common_name: "another.access" } }]) {
    expect(await read(forged)).toEqual({ state: "denied" });
  }
  // On a preview it stands in for the owner, so a walk can open the owner's Access screens. Nowhere else.
  const preview = { ...env, WONG_ENVIRONMENT: "staging" };
  const standIn = await read(machine, preview);
  expect(standIn).toEqual({ ...policy, role: "owner", manages: true });
  expect(policyAllows(standIn, { kind: "owner" })).toBe(true);
  expect(await authorizeRequest(preview, machine, { kind: "owner" })).toBeNull();
  expect(await (await appAccess(new Request(`${origin}/api/access/apps`), preview, machine)).json()).toMatchObject({ state: "current", role: "owner", manages: true });
  for (const environment of ["production", "local", "Staging", undefined]) {
    const bindings = { ...env, WONG_ENVIRONMENT: environment };
    expect(await read(machine, bindings), String(environment)).toEqual(policy);
    expect((await authorizeRequest(bindings, machine, { kind: "owner" }))?.status, String(environment)).toBe(403);
  }
  // A forged machine and a person who is not the owner gain nothing from the preview.
  expect(await read({ ...machine, claims: { ...machine.claims, email: "owner@example.com" } }, preview)).toEqual({ state: "denied" });
  expect(await read(employee, preview)).toMatchObject({ state: "current", role: "employee" });
  // Before permissions start the preview names it the owner too, and the live app never does.
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  expect(await read(machine, preview)).toEqual({ state: "not_started", role: "owner", manages: true });
  expect(await read(machine)).toEqual({ state: "not_started", role: "employee", manages: false });
});

it("lets a current person the owner ticked manage Access, and gives them no app, key or owner route for it", async () => {
  const tick = () => sql.exec("INSERT INTO wong_access_managers VALUES ('installation', 'employee@example.com')");
  expect(await read()).toMatchObject({ role: "employee", manages: false });
  expect(await read(owner)).toMatchObject({ role: "owner", manages: true });
  tick();
  // The role stays as it was, and so do their apps: managing is its own flag.
  const policy = await read();
  expect(policy).toEqual({ state: "current", role: "employee", manages: true, revision: 1, apps: new Map([["orders", "write"]]), keys: null });
  expect(policyAllows(policy, access)).toBe(true);
  // A manager is still refused an unmapped route, an owner route and an app they were not given.
  for (const mapping of [undefined, { kind: "owner" as const }, { apps: ["payroll"] }]) expect(policyAllows(policy, mapping)).toBe(false);
  expect((await authorizeRequest(env, employee, { kind: "owner" }))?.status).toBe(403);
  // Their key levels are their own too: the owner holds every key, a manager only what they were given.
  sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  expect(await read()).toMatchObject({ manages: true, keys: new Map() });
  expect((await authorizeRequest(env, employee, { keys: ["cloudflare"] }, "read"))?.status).toBe(403);
  expect(await authorizeRequest(env, owner, { keys: ["cloudflare"] }, "read")).toBeNull();
  // A machine carrying a manager's email is no person, on the live app and on a preview.
  const machines = [{ ...employee, kind: "service" as const }, { ...employee, claims: { ...employee.claims, common_name: "machine" } }];
  for (const bindings of [env, { ...env, WONG_ENVIRONMENT: "staging" }]) {
    for (const machine of machines) expect(await read(machine, bindings)).toEqual({ state: "denied" });
  }
  // The tick counts as soon as the owner makes it, before permissions start. A machine still manages nothing.
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  expect(await read()).toEqual({ state: "not_started", role: "employee", manages: true });
  for (const machine of machines) expect(await read(machine)).toEqual({ state: "not_started", role: "employee", manages: false });
  // A removed person never manages, even with a row left behind: denied once permissions are on, and nobody before.
  sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect(await read()).toEqual({ state: "not_started", role: "employee", manages: false });
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 1");
  expect(await read()).toEqual({ state: "denied" });
  // Unticked, the same person is an ordinary employee on their next request.
  sql.exec("UPDATE wong_access_members SET status = 'active'; DELETE FROM wong_access_managers");
  expect(await read()).toMatchObject({ state: "current", role: "employee", manages: false });
});

it("refuses service, unlisted and invalid human identities once permissions have started", async () => {
  const invalid: (AccessIdentity | null)[] = [null, { ...employee, kind: "service" }, { ...employee, id: "bad email" }];
  for (const claims of [{ common_name: "service" }, { sub: "" }, { sub: undefined }, { email: undefined },
    { email: "other@example.com" }, { exp: 0 }, { nbf: 9999999999 }]) {
    invalid.push({ ...employee, claims: { ...employee.claims, ...claims } });
  }
  for (const identity of invalid) {
    expect(humanEmail(identity)).toBeNull();
    expect(await read(identity)).toEqual({ state: "denied" });
  }
  const unlisted = { ...employee, id: "unlisted@example.com", claims: { ...employee.claims, email: "unlisted@example.com" } };
  expect(await read(unlisted)).toEqual({ state: "denied" });
  // Before permissions start, the same callers keep what the sign-in wall already gave them.
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  for (const identity of [...invalid, unlisted]) expect(await read(identity)).toEqual({ state: "not_started", role: "employee", manages: false });
});

it("leaves everyone every app until permissions start, and names the owner meanwhile", async () => {
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  const before = await read();
  expect(before).toEqual({ state: "not_started", role: "employee", manages: false });
  for (const mapping of [undefined, { apps: [] }, { apps: ["payroll"] }, { kind: "owner" as const }]) expect(policyAllows(before, mapping)).toBe(true);
  expect(await read(owner)).toEqual({ state: "not_started", role: "owner", manages: true });
  expect(await authorizeRequest(env, employee, { apps: ["payroll"] })).toBeNull();
  // The owner has never opened Access: no row exists, and nothing has started.
  sql.exec("DELETE FROM wong_access_grants; DELETE FROM wong_access_members; DELETE FROM wong_access_apps; DELETE FROM wong_access_installation");
  expect(await read()).toEqual({ state: "not_started", role: "employee", manages: false });
  expect(await read(owner)).toEqual({ state: "not_started", role: "owner", manages: true });
});

it("ignores a grant for an area that is no longer built", async () => {
  sql.exec("INSERT INTO wong_access_apps VALUES ('installation', 'retired'); INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'retired', 1, 'write')");
  const policy = await read();
  expect(policy).toEqual({ state: "current", role: "employee", manages: false, revision: 1, apps: new Map([["orders", "write"]]), keys: null });
  expect(policyAllows(policy, { apps: ["retired"] })).toBe(false);
  expect(policyAllows(policy, access)).toBe(true);
});

it("denies rather than opens when started permission data is missing, unreadable or malformed", async () => {
  expect(await read(employee, { ...env, DB: undefined })).toEqual({ state: "unavailable" });
  const failed = { ...env, DB: fakeDatabase({ withSession: () => { throw new Error("private database detail"); } }) };
  expect(await read(employee, failed)).toEqual({ state: "unavailable" });
  const denied = await authorizeRequest(failed, employee, access);
  expect(denied?.status).toBe(503);
  expect(denied?.headers.get("Cache-Control")).toBe("no-store");
  expect(await denied?.json()).toMatchObject({ error: { code: "unavailable", message: "Access unavailable", requestId: expect.any(String) } });
  const row = { policy_enabled: 1, keys_enabled: 0, revision: 1, status: "active", manager: 0, apps: '{"orders":"read"}', keys: "{}" };
  expect(await read(employee, answering(row))).toMatchObject({ state: "current", apps: new Map([["orders", "read"]]) });
  // An unreadable area level never reads as held: a list from before levels, a level nobody defined.
  for (const change of [{ policy_enabled: 2 }, { keys_enabled: 2 }, { revision: 0 }, { status: "unknown" }, { manager: 2 }, { manager: undefined }, { apps: "not json" }, { apps: '{"orders":true}' },
    { apps: '["orders"]' }, { apps: '{"orders":"admin"}' }, { apps: undefined },
    { keys: undefined }, { keys_enabled: 1, keys: "not json" }, { keys_enabled: 1, keys: '{"cloudflare":"admin"}' }]) {
    expect(await read(employee, answering({ ...row, ...change }))).toEqual({ state: "unavailable" });
  }
  // Until key levels start, an unreadable key level takes no app away; the owner never depends on a stored level.
  expect(await read(employee, answering({ ...row, keys: "not json" }))).toMatchObject({ state: "current", keys: null });
  expect(await read(owner, answering({ ...row, keys_enabled: 1, status: null, apps: "not json", keys: "not json" }))).toMatchObject({ state: "current", role: "owner" });
  // A database from before the managers table denies too: it never reads as nobody managing and carries on.
  sql.exec("DROP TABLE wong_access_managers");
  expect(await read()).toEqual({ state: "unavailable" });
  expect(await read(owner)).toEqual({ state: "unavailable" });
  sql.exec("DROP TABLE wong_access_grants; DROP TABLE wong_access_members; DROP TABLE wong_access_apps; DROP TABLE wong_access_installation");
  expect(await read()).toEqual({ state: "unavailable" });
});

it("gates bare and described main dispatch before business work, with no unmapped fallback", async () => {
  const handler = vi.fn(() => Response.json({ ok: true }));
  const action = defineAction({ operationId: "orders.read", summary: "Orders", description: "Synthetic order check",
    input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }), encoding: "none", effect: "read",
    agentAvailable: true, errors: {}, examples: [], handler });
  const req = request();
  const call = { url: new URL(req.url), route: req.url, identity: employee };
  for (const route of [handler, action]) {
    expect((await dispatch(route, req, fakeEnv(env), call, access)).status).toBe(200);
    for (const mapping of [undefined, { apps: ["payroll"] }]) {
      const result = await dispatch(route, req, fakeEnv(env), call, mapping);
      expect(result.status).toBe(403);
      expect(result.headers.get("Cache-Control")).toBe("no-store");
      expect(await result.json()).toMatchObject({ error: { code: "forbidden", message: mapping ? "Payroll: Look up needed" : "App access denied" } });
    }
  }
  expect(handler).toHaveBeenCalledTimes(2);
  sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await dispatch(handler, req, fakeEnv(env), call, access)).status).toBe(403);
  expect(handler).toHaveBeenCalledTimes(2);
});

it("preserves action visibility, record guards, identity and readiness checks conjunctively", async () => {
  const handler = vi.fn(() => Response.json({ ok: true }));
  const action = defineAction({ operationId: "orders.read", summary: "Orders", description: "Synthetic guarded action",
    input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }), encoding: "none", effect: "read",
    agentAvailable: true, errors: {}, examples: [], handler });
  const req = request();
  const call = { url: new URL(req.url), route: "orders", identity: employee };
  expect((await dispatch({ ...action, allowed: () => false }, req, fakeEnv(env), call, access)).status).toBe(403);
  expect((await dispatch({ ...action, ready: () => false }, req, fakeEnv(env), call, access)).status).toBe(503);
  expect((await dispatch(action, req, fakeEnv(env), { ...call, identity: null }, access)).status).toBe(403);
  expect(handler).not.toHaveBeenCalled();
  const recordGuard = vi.fn(() => new Response("private record diagnostics", { status: 403 }));
  const result = await dispatch({ ...action, handler: recordGuard }, req, fakeEnv(env), call, access);
  expect(result.status).toBe(403);
  expect(await result.text()).not.toContain("private record diagnostics");
  expect(recordGuard).toHaveBeenCalledTimes(1);
});

it("keeps the reviewed harmless health exception independent of employee and database authority", async () => {
  const failed = { ...env, DB: fakeDatabase({ withSession: vi.fn(() => { throw new Error("offline"); }) }) };
  expect(await authorizeRequest(failed, null, { kind: "infrastructure" })).toBeNull();
  const health = await handleApi(new Request(`${origin}/api/health`), fakeEnv(failed));
  expect(await health.json()).toEqual({ ok: true });
  expect(failed.DB?.withSession).not.toHaveBeenCalled();
});

function discoveryRoutes(): Registration[] {
  const action = defineAction({ operationId: "unrelated.name", summary: "Shared report", description: "Synthetic report",
    input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }), encoding: "none", effect: "read",
    agentAvailable: true, errors: {}, examples: [], handler: () => Response.json({ ok: true }) });
  const mappings = new Map<string, RouteAccess>([
    ["GET /api/report", { apps: ["orders", "payroll"] }], ["GET /api/owner", { kind: "owner" }],
    ["GET /api/setup", { kind: "self-service" }], ["GET /api/health", { kind: "infrastructure" }],
  ]);
  const main = registrations(new Map([
    ["GET /api/report", action], ["POST /api/report", { ...action, operationId: "orders.unmapped" }],
    ["GET /api/owner", { ...action, operationId: "owner.manage" }],
    ["GET /api/setup", { ...action, operationId: "employee.setup" }],
    ["GET /api/health", { ...action, operationId: "main.health" }],
  ]), "main", mappings);
  return [...main, ...registrations(new Map([
    ["GET read", { ...action, operationId: "orders.read" }],
    ["GET hidden", { ...action, operationId: "orders.hidden", allowed: () => false }],
  ]), "orders"), ...registrations(new Map([["GET read", { ...action, operationId: "new.read" }]]), "new-app")];
}

const discover = (path = "/api/actions", headers = {}, caller = employee, bindings = env) =>
  discovery(new Request(`${origin}${path}`, { headers }), bindings as Env & PolicyEnv, caller, discoveryRoutes());

it("uses reviewed method/path scopes across summaries, details and OpenAPI without ID inference", async () => {
  const listing = await body(await discover());
  expect(listing.actions.map(item => item.operationId))
    .toEqual(["employee.setup", "main.health", "orders.read"]);
  expect((await discover("/api/actions?id=unrelated.name")).status).toBe(404);
  const document = await body(await discover("/api/openapi.json"));
  expect(Object.keys(document.paths)).toEqual(["/api/setup", "/api/health", "/apps/orders/api/read"]);
  sql.exec("INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'payroll', 1, 'write')");
  expect((await discover("/api/actions?id=unrelated.name")).status).toBe(200);
  const ownerListing = await body(await discover("/api/actions", {}, owner));
  expect(ownerListing.actions.map(item => item.operationId))
    .toEqual(["employee.setup", "main.health", "new.read", "orders.read", "owner.manage", "unrelated.name"]);
  expect(env.DB?.withSession).toHaveBeenCalledTimes(5);
});

it("names a write's confirming read only once the caller holds that read's app", async () => {
  const base = { summary: "Refunds", description: "Synthetic refund", input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }),
    encoding: "none" as const, agentAvailable: true, errors: {}, examples: [], handler: () => Response.json({ ok: true }) };
  const registry = [
    ...registrations(new Map([["POST refund", defineAction({ ...base, operationId: "orders.refund", effect: "write", confirmWith: "payroll.refunds" })]]), "orders"),
    ...registrations(new Map([["GET refunds", defineAction({ ...base, operationId: "payroll.refunds", effect: "read" })]]), "payroll"),
  ];
  const published = async (path: string) => body(await discovery(new Request(`${origin}${path}`), env as Env & PolicyEnv, employee, registry));
  expect(await published("/api/actions?id=orders.refund")).not.toHaveProperty("confirmWith");
  expect(JSON.stringify(await published("/api/openapi.json"))).not.toContain("payroll.refunds");
  sql.exec("INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'payroll', 1, 'write')");
  expect((await published("/api/actions?id=orders.refund")).confirmWith).toBe("payroll.refunds");
  expect((await published("/api/openapi.json")).paths["/apps/orders/api/refund"].post["x-confirm-with"]).toBe("payroll.refunds");
});

it("rechecks current grants before conditional responses and isolates caller and representation caches", async () => {
  const selected = await discover("/api/actions?id=orders.read");
  const etag = selected.headers.get("ETag")!;
  expect(selected.headers.get("Cache-Control")).toBe("private, no-cache");
  expect(selected.headers.get("Vary")).toContain("cf-access-token");
  const headers = { "if-none-match": etag };
  expect((await discover("/api/actions?id=orders.read", headers)).status).toBe(304);
  for (const path of ["/api/actions", "/api/openapi.json", "/api/actions?id=missing.action"]) {
    expect((await discover(path, headers)).status).not.toBe(304);
  }
  sql.exec("INSERT INTO wong_access_members VALUES ('installation', 'other@example.com', 'active', 0, 1, 'now'); INSERT INTO wong_access_grants VALUES ('installation', 'other@example.com', 'orders', 1, 'write')");
  const other = { ...employee, id: "other@example.com", claims: { ...employee.claims, email: "other@example.com", sub: "other-subject" } };
  const otherResponse = await discover("/api/actions?id=orders.read", headers, other);
  expect(otherResponse.status).toBe(200); expect(otherResponse.headers.get("ETag")).not.toBe(etag);
  sql.exec("UPDATE wong_access_installation SET revision = 2");
  const revised = await discover("/api/actions?id=orders.read", headers);
  expect(revised.status).toBe(200); expect(revised.headers.get("ETag")).not.toBe(etag);
  sql.exec("DELETE FROM wong_access_grants WHERE email = 'employee@example.com'; UPDATE wong_access_installation SET revision = 3");
  const denied = await discover("/api/actions?id=orders.read", headers);
  expect(denied.status).toBe(404); expect(denied.headers.get("Cache-Control")).toBe("no-store");
  expect(await denied.text()).not.toContain("Synthetic report");
  expect((await body(await discover("/api/actions", headers))).actions.map(item => item.operationId))
    .toEqual(["employee.setup", "main.health"]);
  expect((await body(await discover("/api/openapi.json", headers))).paths).not.toHaveProperty("/apps/orders/api/read");
  sql.exec("UPDATE wong_access_members SET status = 'removed' WHERE email = 'employee@example.com'");
  for (const path of ["/api/actions", "/api/actions?id=orders.read", "/api/openapi.json"]) {
    const response = await discover(path, headers);
    expect(response.status).toBe(403); expect(response.headers.get("Cache-Control")).toBe("no-store");
  }
});

it("fails discovery closed on unavailable started policy, and keeps the existing catalogue before permissions start", async () => {
  const cached = (await discover()).headers.get("ETag")!;
  const unavailable = { ...env, DB: undefined };
  for (const path of ["/api/actions", "/api/actions?id=main.health", "/api/openapi.json"]) {
    expect((await discover(path, { "if-none-match": cached }, employee, unavailable)).status).toBe(503);
  }
  const ids = async () => (await body(await discover("/api/actions", { "if-none-match": cached }))).actions.map(item => item.operationId);
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  // Not started: the same actions as before Access existed, and never a cached started answer.
  expect(await ids()).toEqual(["employee.setup", "main.health", "new.read", "orders.read", "orders.unmapped", "owner.manage", "unrelated.name"]);
  sql.exec("DELETE FROM wong_access_grants; DELETE FROM wong_access_members; DELETE FROM wong_access_apps; DELETE FROM wong_access_installation");
  expect(await ids()).toContain("orders.unmapped");
});

it("reads each person's screens and area levels with zero-app Access self-service, owner exceptions and no permission cache", async () => {
  const req = new Request(`${origin}/api/access/apps`);
  const catalogue = ["access", "frontend-only", "hello", "new-app", "orders", "payroll"];
  const readback = (caller: AccessIdentity | null = employee, bindings = env) => appAccess(req, bindings, caller);
  const first = await readback();
  expect(first.headers.get("Cache-Control")).toBe("no-store");
  const orders = { id: "orders", title: "Orders", screen: true, level: "write" };
  expect(await first.json()).toEqual({ state: "current", role: "employee", manages: false, signIn: true, code: "off", revision: 1, apps: ["access", "orders"], areas: [orders], keys: [] });
  // The owner holds every area at Look up & change, the one with no screen included, and every saved key at its highest level.
  expect(await (await readback(owner)).json()).toEqual({ state: "current", role: "owner", manages: true, signIn: true, code: "off", revision: 1, apps: catalogue,
    areas: [["frontend-only", "Frontend-only"], ["hello", "Hello"], ["new-app", "New-app"], ["orders", "Orders"], ["payroll", "Payroll"], ["reports", "Reports"]]
      .map(([id, title]) => ({ id, title, screen: id !== "reports", level: "write" })),
    keys: [{ id: "cloudflare", title: "Cloudflare", level: "read" }, { id: "code", title: "Project code", level: "read" }] });
  // A manager is told they manage, and keeps their own role, apps and levels.
  sql.exec("INSERT INTO wong_access_managers VALUES ('installation', 'employee@example.com')");
  expect(await (await readback()).json()).toEqual({ state: "current", code: "off", role: "employee", manages: true, signIn: true, revision: 1, apps: ["access", "orders"], areas: [orders], keys: [] });
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  expect(await (await readback()).json()).toEqual({ state: "not_started", code: "off", role: "employee", manages: true, signIn: true, apps: catalogue });
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 1; DELETE FROM wong_access_managers");
  // Client-only apps come from manifests and are allowed only when explicitly assigned.
  sql.exec("INSERT INTO wong_access_apps VALUES ('installation', 'frontend-only'); INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'frontend-only', 1, 'write')");
  expect((await body(await readback())).apps).toEqual(["access", "frontend-only", "orders"]);
  // Look up is enough to open a screen. An area with no screen is given like an app, and Home gets no card for it.
  sql.exec(`UPDATE wong_access_grants SET level = 'read' WHERE app_id = 'orders'; INSERT INTO wong_access_apps VALUES ('installation', 'reports');
    INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'reports', 1, 'write')`);
  expect(await body(await readback())).toMatchObject({ apps: ["access", "frontend-only", "orders"], areas: [{ id: "frontend-only", level: "write" },
    { ...orders, level: "read" }, { id: "reports", title: "Reports", screen: false, level: "write" }] });
  sql.exec("DELETE FROM wong_access_grants; UPDATE wong_access_installation SET revision = 2");
  expect(await (await readback()).json()).toEqual({ state: "current", code: "off", role: "employee", manages: false, signIn: true, revision: 2, apps: ["access"], areas: [], keys: [] });
  sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await readback()).status).toBe(403);
  expect((await readback(null)).status).toBe(403);
  expect((await readback(employee, { ...env, DB: undefined })).status).toBe(503);
  expect(await (await readback(null, { ...env, WONG_OWNER_EMAIL: undefined })).json()).toEqual({ state: "legacy", code: "off", signIn: true });
  // Before permissions start a removed row means nothing yet: everyone keeps every app.
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  expect(await (await readback()).json()).toEqual({ state: "not_started", code: "off", role: "employee", manages: false, signIn: true, apps: catalogue });
  expect(await (await readback(owner)).json()).toEqual({ state: "not_started", code: "off", role: "owner", manages: true, signIn: true, apps: catalogue });
  // The frame offers Sign out only where a sign-in stands in front of the site: not while it is open until the card, nor on a local run.
  const open = { ...env, CF_ACCESS_TEAM_DOMAIN: undefined, CF_ACCESS_AUD: undefined, WORKSPACE_LOGIN: "off" };
  for (const [bindings, signIn] of [[env, true], [{ ...env, WONG_ENVIRONMENT: "staging" }, true], [open, false], [{ ...env, CF_ACCESS_AUD: undefined }, false],
    [{ ...env, WONG_ENVIRONMENT: "local", SKIP_AUTH: "true" }, false]] as const) {
    expect((await body(await readback(owner, bindings))).signIn, JSON.stringify(signIn)).toBe(signIn);
    expect(await (await readback(null, { ...bindings, WONG_OWNER_EMAIL: undefined })).json()).toEqual({ state: "legacy", code: "off", signIn });
  }
  expect((await appAccess(new Request(req, { method: "POST" }), env, employee)).status).toBe(404);
});

it("direct page authorization preserves unknown routes and legacy behavior while guarding nested app and Access pages", async () => {
  const page = (path: string, bindings = env) => appPageDenied(new Request(`https://business.example.com${path}`), bindings, employee);
  for (const path of ["/", "/assets/main.js", "/apps/not-installed/", "/apps/not-installed/subpage"]) expect(await page(path)).toBeNull();
  // An install with no recorded owner uses its existing login boundary without a database read.
  for (const path of ["/apps/hello", "/apps/hello/subpage", "/apps/access/"]) {
    expect(await page(path, { ...env, WONG_OWNER_EMAIL: undefined })).toBeNull();
  }
  for (const path of ["/apps/orders/", "/apps/orders/subpage", "/apps/access/"]) expect(await page(path)).toBeNull();
  for (const path of ["/apps/hello", "/apps/payroll/subpage"]) expect((await page(path))?.status).toBe(403);
  expect(await (await page("/apps/hello"))?.json()).toMatchObject({ error: { message: "Hello: Look up needed" } });
  // A visit needs Look up, no more. An area with no screen has no page to guard.
  sql.exec("UPDATE wong_access_grants SET level = 'read'");
  for (const path of ["/apps/orders/", "/apps/orders/subpage", "/apps/reports/"]) expect(await page(path)).toBeNull();
});
