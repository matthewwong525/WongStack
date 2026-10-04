import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { authorizeRequest, currentPolicy, policyAllows, type PolicyEnv, type RouteAccess } from "./policy";
import type { AccessIdentity } from "../access";
import { defineAction, dispatch } from "../api/contract";
import { handleApi } from "../api/router";

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
const read = (identity: AccessIdentity | null = employee, bindings = env, req = request()) => currentPolicy(req, bindings, identity);

beforeEach(() => {
  sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../../../schema/migrations/0001_employee_access.sql", import.meta.url), "utf8"));
  sql.exec(`INSERT INTO wong_access_installation
    (slot, installation_id, origin, account_id, worker_id, access_app_id, access_policy_id,
      issuer, audience, owner_subject, owner_email, repository_id, repository_name, policy_enabled, activated_at)
    VALUES (1, 'installation', '${origin}', 'account', 'worker', 'application', 'policy',
      '${issuer}', 'business-app', 'owner-subject', 'owner@example.com', 123, 'business/project', 1, 'now');
    INSERT INTO wong_access_members VALUES ('installation', 'employee@example.com', 'active', 0, 1, 'now');
    INSERT INTO wong_access_apps VALUES ('installation', 'orders');
    INSERT INTO wong_access_apps VALUES ('installation', 'payroll');
    INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'orders', 1);`);
  const session = { prepare: (query: string) => ({ bind: (email: string) => ({
    first: async () => sql.prepare(query).get(email) ?? null,
  }) }) };
  env = { DB: { withSession: vi.fn(() => session) } as unknown as D1Database, WONG_ACCESS_POLICY: "on",
    CF_ACCESS_TEAM_DOMAIN: "business.cloudflareaccess.com", CF_ACCESS_AUD: "business-app",
    CF_ACCESS_APP_ID: "application", CF_ACCESS_WORKER_ID: "worker" };
});
afterEach(() => sql.close());

it("preserves legacy and managed dispatch without reading any database", async () => {
  for (const value of [undefined, ""]) {
    expect(await read(null, { ...env, WONG_ACCESS_POLICY: value })).toEqual({ state: "legacy" });
  }
  expect(env.DB?.withSession).not.toHaveBeenCalled();
  expect(policyAllows({ state: "legacy" }, undefined)).toBe(true);
});

it("loads normalized email and grants in one primary statement with no role cache", async () => {
  const normalized = { ...employee, id: " EMPLOYEE@EXAMPLE.COM ", claims: {
    ...employee.claims, email: " EMPLOYEE@EXAMPLE.COM ", aud: ["other-app", "business-app"], nbf: 1,
  } };
  const first = await read(normalized);
  expect(first).toEqual({ state: "current", role: "employee", revision: 1, apps: new Set(["orders"]) });
  expect(env.DB?.withSession).toHaveBeenCalledWith("first-primary");
  expect(policyAllows(first, access)).toBe(true);
  expect(policyAllows(first, { apps: ["payroll"] })).toBe(false);
  // The same still-valid Access assertion observes the acknowledged database commit.
  sql.exec("DELETE FROM wong_access_grants; UPDATE wong_access_installation SET revision = 2;");
  const next = await read(normalized);
  expect(next).toEqual({ state: "current", role: "employee", revision: 2, apps: new Set() });
  expect(policyAllows(next, access)).toBe(false);
  sql.exec("UPDATE wong_access_members SET status = 'removed', revision = 3; UPDATE wong_access_installation SET revision = 3;");
  expect(await read(normalized)).toEqual({ state: "denied" });
  expect(env.DB?.withSession).toHaveBeenCalledTimes(3);
});

it("requires every mapped app and leaves new or empty mappings closed", async () => {
  const policy = await read();
  for (const mapping of [undefined, { apps: [] }, { apps: ["orders", "payroll"] },
    { apps: ["new-app"] }, { apps: ["invalid/app"] }]) expect(policyAllows(policy, mapping)).toBe(false);
  sql.exec("INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'payroll', 1)");
  expect(policyAllows(await read(), { apps: ["orders", "payroll"] })).toBe(true);
});

it("keeps pinned owner authority separate and permits zero-app employee self-service", async () => {
  const ownerPolicy = await read(owner);
  expect(ownerPolicy).toMatchObject({ state: "current", role: "owner" });
  expect(policyAllows(ownerPolicy, { kind: "owner" })).toBe(true);
  expect(policyAllows(ownerPolicy, access)).toBe(true);
  expect(policyAllows(ownerPolicy, undefined)).toBe(false);
  expect(policyAllows(ownerPolicy, { apps: [] })).toBe(false);
  const impostor = { ...owner, claims: { ...owner.claims, sub: "other-subject" } };
  sql.exec("INSERT INTO wong_access_members VALUES ('installation', 'owner@example.com', 'active', 0, 1, 'now')");
  expect(await read(impostor)).toEqual({ state: "denied" });
  sql.exec("DELETE FROM wong_access_grants");
  const empty = await read();
  expect(policyAllows(empty, { kind: "self-service" })).toBe(true);
  expect(policyAllows(empty, { kind: "infrastructure" })).toBe(true);
  expect(policyAllows(empty, { kind: "owner" })).toBe(false);
  expect(policyAllows({ state: "denied" }, { kind: "self-service" })).toBe(false);
  expect(await authorizeRequest(request(), env, employee, { kind: "self-service" })).toBeNull();
  sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await authorizeRequest(request(), env, employee, { kind: "self-service" }))?.status).toBe(403);
});

it("refuses service, unlisted and invalid human identities without promoting them", async () => {
  const invalid: (AccessIdentity | null)[] = [null, { ...employee, kind: "service" }, { ...employee, id: "bad email" }];
  for (const claims of [{ common_name: "service" }, { sub: "" }, { sub: undefined }, { email: undefined },
    { email: "other@example.com" }, { exp: 0 }, { nbf: 9999999999 }]) {
    invalid.push({ ...employee, claims: { ...employee.claims, ...claims } });
  }
  for (const identity of invalid) expect(await read(identity)).toEqual({ state: "denied" });
  expect(env.DB?.withSession).not.toHaveBeenCalled();
  const unlisted = { ...employee, id: "unlisted@example.com", claims: { ...employee.claims, email: "unlisted@example.com" } };
  expect(await read(unlisted)).toEqual({ state: "denied" });
  for (const claims of [{ iss: "https://other.cloudflareaccess.com" }, { aud: "other" }, { aud: ["other"] }]) {
    expect(await read({ ...employee, claims: { ...employee.claims, ...claims } })).toEqual({ state: "denied" });
  }
});

it("fails closed for malformed rollout, missing migration, empty/disabled policy and invalid grants", async () => {
  for (const value of ["off", " on ", " "]) {
    expect(await read(employee, { ...env, WONG_ACCESS_POLICY: value })).toEqual({ state: "unavailable" });
  }
  expect(env.DB?.withSession).not.toHaveBeenCalled();
  expect(await read(employee, { ...env, DB: undefined })).toEqual({ state: "unavailable" });
  const failed = { ...env, DB: { withSession: () => { throw new Error("private database detail"); } } as unknown as D1Database };
  expect(await read(employee, failed)).toEqual({ state: "unavailable" });
  const denied = await authorizeRequest(request(), failed, employee, access);
  expect(denied?.status).toBe(503);
  expect(denied?.headers.get("Cache-Control")).toBe("no-store");
  expect(await denied?.json()).toMatchObject({ error: { code: "unavailable", message: "Access unavailable", requestId: expect.any(String) } });
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  expect(await read()).toEqual({ state: "unavailable" });
  sql.exec("UPDATE wong_access_installation SET policy_enabled = 1; INSERT INTO wong_access_apps VALUES ('installation', 'bad/app'); INSERT INTO wong_access_grants VALUES ('installation', 'employee@example.com', 'bad/app', 1)");
  expect(await read()).toEqual({ state: "unavailable" });
  sql.exec("DELETE FROM wong_access_grants; DELETE FROM wong_access_members; DELETE FROM wong_access_apps; DELETE FROM wong_access_installation");
  expect(await read()).toEqual({ state: "unavailable" });
  sql.exec("DROP TABLE wong_access_installation");
  expect(await read()).toEqual({ state: "unavailable" });
});

it("rejects foreign installation routing and Access configuration", async () => {
  expect(await read(employee, env, new Request("https://preview.example.com/api/orders"))).toEqual({ state: "unavailable" });
  for (const update of [{ CF_ACCESS_TEAM_DOMAIN: "other.cloudflareaccess.com" }, { CF_ACCESS_AUD: "other" },
    { CF_ACCESS_APP_ID: "other" }, { CF_ACCESS_WORKER_ID: "other" }]) {
    expect(await read(employee, { ...env, ...update })).toEqual({ state: "unavailable" });
  }
});

it("gates bare and described main dispatch before business work, with no unmapped fallback", async () => {
  const handler = vi.fn(() => Response.json({ ok: true }));
  const action = defineAction({ operationId: "orders.read", summary: "Orders", description: "Synthetic order check",
    input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }), encoding: "none", effect: "read",
    agentAvailable: true, errors: {}, examples: [], handler });
  const req = request();
  const call = { url: new URL(req.url), route: req.url, identity: employee };
  for (const route of [handler, action]) {
    expect((await dispatch(route, req, env, call, access)).status).toBe(200);
    for (const mapping of [undefined, { apps: ["payroll"] }]) {
      const result = await dispatch(route, req, env, call, mapping);
      expect(result.status).toBe(403);
      expect(result.headers.get("Cache-Control")).toBe("no-store");
      expect(await result.json()).toMatchObject({ error: { code: "forbidden", message: "App access denied" } });
    }
  }
  expect(handler).toHaveBeenCalledTimes(2);
  sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await dispatch(handler, req, env, call, access)).status).toBe(403);
  expect(handler).toHaveBeenCalledTimes(2);
});

it("preserves action visibility, record guards, identity and readiness checks conjunctively", async () => {
  const handler = vi.fn(() => Response.json({ ok: true }));
  const action = defineAction({ operationId: "orders.read", summary: "Orders", description: "Synthetic guarded action",
    input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }), encoding: "none", effect: "read",
    agentAvailable: true, errors: {}, examples: [], handler });
  const req = request();
  const call = { url: new URL(req.url), route: "orders", identity: employee };
  expect((await dispatch({ ...action, allowed: () => false }, req, env, call, access)).status).toBe(403);
  expect((await dispatch({ ...action, ready: () => false }, req, env, call, access)).status).toBe(503);
  expect((await dispatch(action, req, env, { ...call, identity: null }, access)).status).toBe(403);
  expect(handler).not.toHaveBeenCalled();
  const recordGuard = vi.fn(() => new Response("private record diagnostics", { status: 403 }));
  const result = await dispatch({ ...action, handler: recordGuard }, req, env, call, access);
  expect(result.status).toBe(403);
  expect(await result.text()).not.toContain("private record diagnostics");
  expect(recordGuard).toHaveBeenCalledTimes(1);
});

it("keeps the reviewed harmless health exception independent of employee and database authority", async () => {
  const failed = { ...env, DB: { withSession: vi.fn(() => { throw new Error("offline"); }) } as unknown as D1Database };
  expect(await authorizeRequest(request(), failed, null, { kind: "infrastructure" })).toBeNull();
  const health = await handleApi(new Request(`${origin}/api/health`), failed as Env & PolicyEnv);
  expect(await health.json()).toEqual({ ok: true });
  expect(failed.DB?.withSession).not.toHaveBeenCalled();
});
