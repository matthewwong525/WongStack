import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { AccessIdentity } from "../../worker/access.ts";
import type { ConnectionEnv, Core } from "../../worker/employee-access/core.ts";
// One synthetic installation: a live app whose owner is known only by the committed email.
export const site = { installationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  origin: "https://business.example.com", accountId: "a".repeat(32), workerId: "worker",
  accessAppId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", accessPolicyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  issuer: "https://business.cloudflareaccess.com", audience: "business-app", ownerSubject: "owner-subject",
  ownerEmail: "owner@example.com" };
export const owner: AccessIdentity = { kind: "user", id: site.ownerEmail, claims: { email: site.ownerEmail,
  sub: site.ownerSubject, iss: site.issuer, aud: site.audience, exp: 9999999999 } };
export const employee: AccessIdentity = { ...owner, id: "employee@example.com", claims: { ...owner.claims,
  email: "employee@example.com", sub: "employee-subject" } };
export const key = JSON.stringify({ version: 2, token: "private-access-token", accountId: site.accountId,
  policyId: site.accessPolicyId });
/** A database from the real migrations behind the D1 calls the core makes. */
export function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys = ON");
  for (const file of ["0001_employee_access.sql", "0002_employee_connections.sql"]) {
    sql.exec(readFileSync(new URL(`../../../schema/migrations/${file}`, import.meta.url), "utf8"));
  }
  const statement = (query: string, values: SQLInputValue[] = []) => ({
    bind: (...bound: SQLInputValue[]) => statement(query, bound),
    first: async () => sql.prepare(query).get(...values) ?? null,
    all: async () => ({ results: sql.prepare(query).all(...values), success: true }),
    run: async () => sql.prepare(query).run(...values),
  });
  const session = { prepare: (query: string) => statement(query), batch: async (statements: { run: () => Promise<unknown> }[]) => {
    sql.exec("BEGIN");
    try { const results = []; for (const item of statements) results.push(await item.run()); sql.exec("COMMIT"); return results; }
    catch (error) { sql.exec("ROLLBACK"); throw error; }
  } };
  return { sql, session, DB: { withSession: () => session } as unknown as D1Database };
}
/** `started` false leaves the installation row out, as on an app whose owner never opened Access. */
export function fixture({ started = true } = {}) {
  const { sql, session, DB } = database();
  const env: ConnectionEnv = { DB, WONG_ENVIRONMENT: "production", CF_ACCESS_TEAM_DOMAIN: "business.cloudflareaccess.com",
    CF_ACCESS_AUD: site.audience, CF_ACCESS_APP_ID: site.accessAppId, CF_ACCESS_WORKER_ID: site.workerId,
    WONG_OWNER_EMAIL: site.ownerEmail, WONG_ACCESS_LOGIN_MANAGEMENT: key };
  if (started) {
    sql.prepare(`INSERT INTO wong_access_installation (slot, installation_id, origin, account_id, worker_id, access_app_id,
      access_policy_id, issuer, audience, owner_subject, owner_email, repository_id, repository_name, policy_enabled, activated_at)
      VALUES (1, ?, ?, '', ?, ?, '', ?, ?, ?, ?, 1, '', 1, 'now')`).run(site.installationId, site.origin, site.workerId,
      site.accessAppId, site.issuer, site.audience, site.ownerSubject, site.ownerEmail);
    sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, 'now')").run(site.installationId, employee.id);
    sql.prepare("INSERT INTO wong_access_apps VALUES (?, 'orders')").run(site.installationId);
  }
  const core: Core = { db: session as unknown as D1DatabaseSession, env, installationId: site.installationId,
    origin: site.origin, email: site.ownerEmail, subject: site.ownerSubject, live: true };
  return { sql, env, core };
}
export const req = (path: string, method = "POST", body?: unknown, headers = {}) => new Request(`${site.origin}/api/access/${path}`,
  { method, headers: { Origin: site.origin, ...headers }, ...(body !== undefined && { body: JSON.stringify(body) }) });
/** A fake of the two Cloudflare resources the core reads and the one policy it writes. */
export function cloudflare() {
  const state = {
    policy: { id: site.accessPolicyId, name: "Business people", decision: "allow", include: [{ email: { email: site.ownerEmail } }],
      exclude: [], require: [{ email_domain: { domain: "example.com" } }], session_duration: "24h", approval_required: true,
      approval_groups: [{ approvals_needed: 1, email_list: [site.ownerEmail] }], app_count: 1, reusable: false, created_at: "before" } as Record<string, unknown>,
    app: { id: site.accessAppId, aud: site.audience, domain: "business.example.com",
      destinations: [{ type: "worker", worker_id: site.workerId }] } as Record<string, unknown>,
    extras: [] as Record<string, unknown>[], writes: [] as Record<string, unknown>[],
    failPolicy: false, failSessions: false, duringWrite: undefined as (() => Promise<void>) | undefined,
  };
  const fetch = async (url: string, init: RequestInit): Promise<Response> => {
    if (init.method === "PUT") {
      if (state.failPolicy) return new Response("private token", { status: 503 });
      const body = JSON.parse(String(init.body)); state.writes.push(body);
      if (state.duringWrite) { const callback = state.duringWrite; state.duringWrite = undefined; await callback(); }
      state.policy = { ...state.policy, ...body };
    }
    if (url.endsWith("/revoke_tokens")) return state.failSessions ? new Response("secret", { status: 503 }) : Response.json({ success: true, result: {} });
    return Response.json({ success: true, result: url.includes("/policies") ? [state.policy, ...state.extras] : state.app });
  };
  return { state, fetch };
}
