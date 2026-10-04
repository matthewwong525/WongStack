// Management authority is pinned independently of the optional legacy policy latch.
import type { AccessIdentity } from "../access.ts";
import { readPin, ownerMatches, type ActivationEnv, type Pin } from "./activation.ts";

export interface ConnectionEnv extends ActivationEnv {
  WONG_ACCESS_POLICY?: string;
  WONG_ACCESS_ROLLOUT?: string;
  WONG_GITHUB_PUBLICATION?: string;
  WONG_ACCESS_SEAL_KEY?: string;
  /** Separate account-scoped Access-only authority, provided privately by the operator. */
  WONG_ACCESS_LOGIN_MANAGEMENT?: string;
}
export type Core = { db: D1DatabaseSession; pin: Pin; env: ConnectionEnv; email: string; subject: string; holder?: string };
export class AccessError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 503) { super(code); this.code = code; this.status = status; }
}
export const reply = (body: object, status = 200) => Response.json(body,
  { status, headers: { "Cache-Control": "no-store" } });

export async function ownerCore(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Core> {
  const pin = env.WONG_ACCESS_ACTIVATION && readPin(env.WONG_ACCESS_ACTIVATION);
  if (env.WONG_ENVIRONMENT !== "production" || !pin || !env.DB) throw new AccessError("owner_setup_required");
  if (!routingMatches(request, env, pin)) throw new AccessError("owner_setup_required");
  if (!ownerMatches(pin, identity)) throw new AccessError("owner_required", 403);
  if (request.method !== "GET" && request.headers.get("Origin") !== pin.origin) throw new AccessError("origin_required", 403);
  const db = env.DB.withSession("first-primary");
  const row = await db.prepare("SELECT * FROM wong_access_installation WHERE slot = 1").first<Record<string, unknown>>();
  if (!row || !installationMatches(pin, row)) throw new AccessError("installation_mismatch");
  return { db, pin, env, email: pin.ownerEmail, subject: pin.ownerSubject };
}

export const now = () => new Date().toISOString();
export async function audit(core: Core, event: string, revision: number): Promise<void> {
  await core.db.prepare(`INSERT INTO wong_access_audit VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), core.pin.installationId, core.email, event, revision, now()).run();
}

export async function lease(core: Core): Promise<string> {
  const holder = crypto.randomUUID();
  const row = await core.db.prepare(`INSERT INTO wong_access_leases VALUES (?, ?, ?)
    ON CONFLICT(installation_id) DO UPDATE SET holder = excluded.holder, expires_at = excluded.expires_at
    WHERE wong_access_leases.expires_at < ? RETURNING holder`)
    .bind(core.pin.installationId, holder, new Date(Date.now() + 120_000).toISOString(), now()).first<{ holder: string }>();
  if (!row || row.holder !== holder) throw new AccessError("retry_pending", 409);
  return holder;
}
export async function release(core: Core, holder: string): Promise<void> {
  await core.db.prepare("DELETE FROM wong_access_leases WHERE installation_id = ? AND holder = ?")
    .bind(core.pin.installationId, holder).run();
}

export async function leaseCurrent(core: Core): Promise<boolean> {
  const row = await core.db.prepare("SELECT holder FROM wong_access_leases WHERE installation_id = ? AND expires_at > ?")
    .bind(core.pin.installationId, now()).first<{ holder: string }>();
  return !!core.holder && row?.holder === core.holder;
}

function routingMatches(request: Request, env: ConnectionEnv, pin: Pin): boolean {
  return [[pin.origin, new URL(request.url).origin], [pin.issuer, `https://${env.CF_ACCESS_TEAM_DOMAIN}`],
    [pin.audience, env.CF_ACCESS_AUD], [pin.workerId, env.CF_ACCESS_WORKER_ID], [pin.accessAppId, env.CF_ACCESS_APP_ID]]
    .every(([expected, actual]) => expected === actual);
}
function installationMatches(pin: Pin, row: Record<string, unknown>): boolean {
  const columns: [keyof Pin, string][] = [["installationId", "installation_id"], ["origin", "origin"],
    ["ownerSubject", "owner_subject"], ["ownerEmail", "owner_email"], ["repositoryId", "repository_id"],
    ["repositoryName", "repository_name"], ["accountId", "account_id"], ["accessAppId", "access_app_id"],
    ["accessPolicyId", "access_policy_id"], ["workerId", "worker_id"], ["issuer", "issuer"], ["audience", "audience"]];
  return columns.every(([field, column]) => pin[field] === row[column]);
}
