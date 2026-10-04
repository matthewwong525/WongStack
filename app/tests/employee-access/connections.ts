import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { AccessIdentity } from "../../worker/access.ts";
import type { ConnectionEnv, Core } from "../../worker/employee-access/core.ts";
import { encode } from "../../worker/employee-access/seal.ts";
export const pin = { version: 1 as const, installationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  origin: "https://business.example.com", accountId: "a".repeat(32), workerId: "worker",
  accessAppId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", accessPolicyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  issuer: "https://business.cloudflareaccess.com", audience: "business-app", ownerSubject: "owner-subject",
  ownerEmail: "owner@example.com" };
export const owner: AccessIdentity = { kind: "user", id: pin.ownerEmail, claims: { email: pin.ownerEmail,
  sub: pin.ownerSubject, iss: pin.issuer, aud: pin.audience, exp: 9999999999 } };
export const employee: AccessIdentity = { ...owner, id: "employee@example.com", claims: { ...owner.claims,
  email: "employee@example.com", sub: "employee-subject" } };
export function fixture() {
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
  const env: ConnectionEnv = { DB: { withSession: () => session } as unknown as D1Database,
    WONG_ENVIRONMENT: "production", CF_ACCESS_TEAM_DOMAIN: "business.cloudflareaccess.com", CF_ACCESS_AUD: pin.audience,
    CF_ACCESS_APP_ID: pin.accessAppId, CF_ACCESS_WORKER_ID: pin.workerId, WONG_ACCESS_ACTIVATION: JSON.stringify(pin),
    WONG_ACCESS_SEAL_KEY: encode(new Uint8Array(32).fill(7)), WONG_ACCESS_POLICY: "on" };
  sql.prepare(`INSERT INTO wong_access_installation (slot, installation_id, origin, account_id, worker_id, access_app_id,
    access_policy_id, issuer, audience, owner_subject, owner_email, repository_id, repository_name, policy_enabled, issuance_enabled, activated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'now')`).run(pin.installationId, pin.origin,
    pin.accountId, pin.workerId, pin.accessAppId, pin.accessPolicyId, pin.issuer, pin.audience, pin.ownerSubject,
    pin.ownerEmail, 1, "");
  sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, 'now')").run(pin.installationId, employee.id);
  sql.prepare("INSERT INTO wong_access_apps VALUES (?, 'orders')").run(pin.installationId);
  const core: Core = { db: session as unknown as D1DatabaseSession, pin, env, email: pin.ownerEmail, subject: pin.ownerSubject };
  return { sql, env, core };
}
export const req = (path: string, method = "POST", body?: unknown, headers = {}) => new Request(`${pin.origin}/api/access/${path}`,
  { method, headers: { Origin: pin.origin, ...headers }, ...(body !== undefined && { body: JSON.stringify(body) }) });
