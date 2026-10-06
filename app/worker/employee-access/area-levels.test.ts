import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { authorizeRequest, currentPolicy, type PolicyEnv, type RouteAccess } from "./policy";
import type { AccessIdentity } from "../access";
import { defineAction, dispatch, registrations } from "../api/contract";
import { discovery } from "../api/discovery";

// What a person's level for an area lets them do: Look up runs a read, and only Look up & change runs a change.
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
const access: RouteAccess = { apps: ["orders"] };
const read = (identity: AccessIdentity | null = employee, bindings = env) => currentPolicy(bindings, identity);

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
  env = { DB: { withSession: vi.fn(() => session) } as unknown as D1Database, WONG_OWNER_EMAIL: "owner@example.com",
    CF_ACCESS_TEAM_DOMAIN: "business.cloudflareaccess.com", CF_ACCESS_AUD: "business-app" };
});
afterEach(() => sql.close());

it("lets Look up run a read and refuses a change by the area's name, and a lowered level governs the next request", async () => {
  const handler = vi.fn(() => Response.json({ ok: true }));
  const action = (effect: "read" | "write" | "external") => defineAction({ operationId: "orders.act", summary: "Orders", description: "Synthetic order action",
    input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }), encoding: "none", effect, agentAvailable: true, errors: {}, examples: [], handler });
  const run = (route: Parameters<typeof dispatch>[0], method = "GET") => {
    const req = new Request(`${origin}/api/orders`, { method });
    return dispatch(route, req, env, { url: new URL(req.url), route: "orders", identity: employee }, access);
  };
  // A tick from before levels is Look up & change: every call runs.
  for (const effect of ["read", "write", "external"] as const) expect((await run(action(effect))).status).toBe(200);
  expect((await run(handler, "POST")).status).toBe(200);
  // The employer lowers it: the same sign-in is judged by the new level on its very next request.
  sql.exec("UPDATE wong_access_grants SET level = 'read'; UPDATE wong_access_installation SET revision = 2");
  expect(await read()).toMatchObject({ revision: 2, apps: new Map([["orders", "read"]]) });
  expect((await run(action("read"))).status).toBe(200);
  for (const method of ["GET", "HEAD"]) expect((await run(handler, method)).status).toBe(200);
  for (const refused of [await run(action("write")), await run(action("external")), await run(handler, "POST"), await run(handler, "DELETE")]) {
    expect(refused.status).toBe(403);
    expect(refused.headers.get("Cache-Control")).toBe("no-store");
    expect(await refused.json()).toMatchObject({ error: { code: "forbidden", message: "Orders: Look up & change needed", requestId: expect.any(String) } });
  }
  expect(handler).toHaveBeenCalledTimes(7);
  // An area not held at all names the level the call needs; a name that is not built names nothing.
  expect(await (await authorizeRequest(env, employee, { apps: ["payroll"] }, "read"))?.json()).toMatchObject({ error: { message: "Payroll: Look up needed" } });
  expect(await (await authorizeRequest(env, employee, { apps: ["retired"] }, "read"))?.json()).toMatchObject({ error: { message: "App access denied" } });
  // The owner and the machine that checks previews hold every area at Look up & change.
  const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access", sub: "", iss: issuer, aud: "business-app", exp: 9999999999 } };
  for (const identity of [owner, machine]) expect(await authorizeRequest(env, identity, { apps: ["orders", "reports"] })).toBeNull();
});

it("reads a row written before area levels at Look up & change", async () => {
  const before = new DatabaseSync(":memory:");
  for (const file of ["0001_employee_access.sql", "0003_key_levels.sql", "20261005142459_access_managers.sql"]) {
    before.exec(readFileSync(new URL(`../../../schema/migrations/${file}`, import.meta.url), "utf8"));
  }
  // An older Worker's rows: a tick with no level, for a person and for a role.
  before.exec(`INSERT INTO wong_access_installation
    (slot, installation_id, origin, account_id, worker_id, access_app_id, access_policy_id,
      issuer, audience, owner_subject, owner_email, repository_id, repository_name, policy_enabled, activated_at)
    VALUES (1, 'installation', '${origin}', 'account', 'worker', 'application', 'policy',
      '${issuer}', 'business-app', 'owner-subject', 'owner@example.com', 123, 'business/project', 1, 'now');
    INSERT INTO wong_access_members VALUES ('installation', 'employee@example.com', 'active', 0, 1, 'now'), ('installation', 'held@example.com', 'active', 0, 1, 'now');
    INSERT INTO wong_access_apps VALUES ('installation', 'orders'), ('installation', 'payroll');
    INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'orders', 1);
    INSERT INTO wong_access_roles VALUES ('installation', 'sales', 'Sales', 1);
    INSERT INTO wong_access_role_apps VALUES ('installation', 'sales', 'payroll');
    INSERT INTO wong_access_member_roles VALUES ('installation', 'held@example.com', 'sales');`);
  before.exec(readFileSync(new URL("../../../schema/migrations/20261006031500_area_levels.sql", import.meta.url), "utf8"));
  const session = { prepare: (query: string) => ({ bind: (email: string) => ({ first: async () => before.prepare(query).get(email) ?? null }) }) };
  const updated = { ...env, DB: { withSession: () => session } as unknown as D1Database };
  const held = { ...employee, id: "held@example.com", claims: { ...employee.claims, email: "held@example.com" } };
  expect(await read(employee, updated)).toMatchObject({ state: "current", apps: new Map([["orders", "write"]]) });
  expect(await read(held, updated)).toMatchObject({ state: "current", apps: new Map([["payroll", "write"]]) });
  // Nobody is refused a call they could make before the update.
  expect(await authorizeRequest(updated, employee, access)).toBeNull();
  expect(await authorizeRequest(updated, held, { apps: ["payroll"] })).toBeNull();
  // Only the two levels can be stored.
  expect(() => before.exec("UPDATE wong_access_grants SET level = 'admin'")).toThrow();
  expect(() => before.exec("UPDATE wong_access_role_apps SET level = 'admin'")).toThrow();
  before.close();
});

it("shows a person at Look up an area's read actions and not its changing ones, in the list, one action and OpenAPI", async () => {
  const base = { summary: "Orders", description: "Synthetic order action", input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }),
    encoding: "none" as const, agentAvailable: true, errors: {}, examples: [], handler: () => Response.json({ ok: true }) };
  const registry = registrations(new Map([["GET list", defineAction({ ...base, operationId: "orders.list", effect: "read" })],
    ["POST refund", defineAction({ ...base, operationId: "orders.refund", effect: "write", confirmWith: "orders.list" })],
    ["POST send", defineAction({ ...base, operationId: "orders.send", effect: "external" })]]), "orders");
  const published = (path: string) => discovery(new Request(`${origin}${path}`), env as Env & PolicyEnv, employee, registry);
  const ids = async () => (await (await published("/api/actions")).json()).actions.map((item: { operationId: string }) => item.operationId);
  expect(await ids()).toEqual(["orders.list", "orders.refund", "orders.send"]);
  const fields = Object.keys(await (await published("/api/actions?id=orders.list")).json());
  const tag = (await published("/api/actions")).headers.get("ETag");
  sql.exec("UPDATE wong_access_grants SET level = 'read'; UPDATE wong_access_installation SET revision = 2");
  expect(await ids()).toEqual(["orders.list"]);
  expect((await published("/api/actions")).headers.get("ETag")).not.toBe(tag);
  for (const id of ["orders.refund", "orders.send"]) expect((await published(`/api/actions?id=${id}`)).status).toBe(404);
  expect(Object.keys((await (await published("/api/openapi.json")).json()).paths)).toEqual(["/apps/orders/api/list"]);
  // The level adds no field: an action is described as before.
  expect(Object.keys(await (await published("/api/actions?id=orders.list")).json())).toEqual(fields);
});
