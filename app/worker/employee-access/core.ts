// The owner is the verified person whose sign-in email setup recorded; no private pin exists.
// On a preview, the verification service token counts as the owner too.
import type { AccessIdentity } from "../access.ts";
import { checkerOwns, humanEmail, ownerEmail, type PolicyEnv } from "./policy.ts";

export interface ConnectionEnv extends PolicyEnv {
  CF_ACCESS_APP_ID?: string;
  CF_ACCESS_WORKER_ID?: string;
  /** Production only: setup's key for this app's own sign-in list. Never on staging. */
  WONG_ACCESS_LOGIN_MANAGEMENT?: string;
}
/** `live` is the production Worker; anywhere else Access keeps a practice list and calls no provider. */
export type Core = { db: D1DatabaseSession; env: ConnectionEnv; installationId: string; origin: string;
  email: string; subject: string; live: boolean; holder?: string };
export class AccessError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 503) { super(code); this.code = code; this.status = status; }
}
export const reply = (body: object, status = 200) => Response.json(body,
  { status, headers: { "Cache-Control": "no-store" } });
export const now = () => new Date().toISOString();

/** Called only after the Worker has verified the Access assertion's signature. */
export async function ownerCore(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Core> {
  const owner = ownerEmail(env);
  // An older install, or an open site with no sign-in, has no owner to verify.
  if (!owner || !env.DB || !identity) throw new AccessError("owner_setup_required");
  // Service tokens, request bodies and a first visit establish nothing. One exception, on a preview only:
  // the checker stands in for the owner there, against the practice list.
  const machine = checkerOwns(env, identity);
  if (!machine && humanEmail(identity) !== owner) throw new AccessError("owner_required", 403);
  const origin = new URL(request.url).origin;
  // Browser cookies cannot change people from a foreign site.
  if (request.method !== "GET" && request.headers.get("Origin") !== origin) throw new AccessError("origin_required", 403);
  const db = env.DB.withSession("first-primary");
  // The checker has no user id: its subject is the token's own name.
  const subject = machine ? identity.id : identity.claims.sub!;
  return { db, env, installationId: await installation(db, env, { origin, owner, subject }), origin, email: owner,
    subject, live: env.WONG_ENVIRONMENT === "production" };
}

/** The single row holds the revision and the permissions switch; the first owner request creates it. */
async function installation(db: D1DatabaseSession, env: ConnectionEnv,
  first: { origin: string; owner: string; subject: string }): Promise<string> {
  const read = () => db.prepare("SELECT installation_id FROM wong_access_installation WHERE slot = 1")
    .first<{ installation_id: string }>();
  const existing = await read();
  if (existing) return existing.installation_id;
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO wong_access_installation
      (slot, installation_id, origin, account_id, worker_id, access_app_id, access_policy_id,
       issuer, audience, owner_subject, owner_email, repository_id, repository_name, activated_at)
      VALUES (1, ?, ?, '', ?, ?, '', ?, ?, ?, ?, 1, '', ?) ON CONFLICT(slot) DO NOTHING`).bind(id, first.origin,
      env.CF_ACCESS_WORKER_ID ?? "", env.CF_ACCESS_APP_ID ?? "", `https://${env.CF_ACCESS_TEAM_DOMAIN ?? ""}`,
      env.CF_ACCESS_AUD ?? "", first.subject, first.owner, now()),
    // The first-seen signed subject is written to the log, never compared.
    db.prepare(`INSERT INTO wong_access_audit SELECT ?, installation_id, owner_email,
      'owner_first_seen:' || owner_subject, revision, activated_at
      FROM wong_access_installation WHERE installation_id = ?`).bind(crypto.randomUUID(), id),
  ]);
  // A concurrent first request may have won; either way one row exists now.
  return (await read())!.installation_id;
}

export async function permissionsStarted(core: Core): Promise<boolean> {
  const row = await core.db.prepare("SELECT policy_enabled FROM wong_access_installation WHERE installation_id = ?")
    .bind(core.installationId).first<{ policy_enabled: number }>();
  return row?.policy_enabled === 1;
}

export async function lease(core: Core): Promise<string> {
  const holder = crypto.randomUUID();
  const row = await core.db.prepare(`INSERT INTO wong_access_leases VALUES (?, ?, ?)
    ON CONFLICT(installation_id) DO UPDATE SET holder = excluded.holder, expires_at = excluded.expires_at
    WHERE wong_access_leases.expires_at < ? RETURNING holder`)
    .bind(core.installationId, holder, new Date(Date.now() + 120_000).toISOString(), now()).first<{ holder: string }>();
  if (!row || row.holder !== holder) throw new AccessError("retry_pending", 409);
  return holder;
}
export async function release(core: Core, holder: string): Promise<void> {
  await core.db.prepare("DELETE FROM wong_access_leases WHERE installation_id = ? AND holder = ?")
    .bind(core.installationId, holder).run();
}

export async function leaseCurrent(core: Core): Promise<boolean> {
  const row = await core.db.prepare("SELECT holder FROM wong_access_leases WHERE installation_id = ? AND expires_at > ?")
    .bind(core.installationId, now()).first<{ holder: string }>();
  return !!core.holder && row?.holder === core.holder;
}
