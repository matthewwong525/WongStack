// The owner is the verified person whose sign-in email setup recorded; on a preview, the verification service token
// counts too. An Admin is a current person the owner gave the built-in role: same gate, never the owner.
import type { AccessIdentity } from "../access.ts";
import type { CodeEnv } from "./code.ts";
import { ADMIN_ROLE, checkerOwns, humanEmail, ownerEmail, type PolicyEnv } from "./policy.ts";

export interface ConnectionEnv extends PolicyEnv, CodeEnv {
  CF_ACCESS_APP_ID?: string;
  CF_ACCESS_WORKER_ID?: string;
  /** Production only: setup's key for this app's own sign-in list. Never on staging. */
  WONG_ACCESS_LOGIN_MANAGEMENT?: string;
}
// A mark that exists in types alone and is not exported: no other file can write a `Core`.
declare const checked: unique symbol;
/** The pass every Access read and save takes, made only by `ownerCore()` once it has checked who is asking. `live`
 *  is production; elsewhere Access keeps a practice list. `email` is always the owner's; `actor` is who is asking. */
export type Core = { db: D1DatabaseSession; env: ConnectionEnv; installationId: string; origin: string;
  email: string; actor: string; owner: boolean; subject: string; live: boolean; holder?: string;
  readonly [checked]: true };
/** The owner's own pass. A save only the owner may make takes this, so it cannot run for an Admin. */
export type OwnerCore = Core & { owner: true };
export const isOwner = (core: Core): core is OwnerCore => core.owner;
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
  const person = humanEmail(identity);
  const owns = machine || person === owner;
  // A machine, or a sign-in with no verified person, is never an Admin: refused before anything is read.
  if (!owns && !person) throw new AccessError("owner_required", 403);
  const db = env.DB.withSession("first-primary");
  // Any other person passes only as an Admin, read on this request:
  // once the role is taken or they are removed, the next one is refused.
  const managed = owns ? null : await managedInstallation(db, person!);
  if (!owns && !managed) throw new AccessError("owner_required", 403);
  const origin = new URL(request.url).origin;
  // Browser cookies cannot change people from a foreign site.
  if (request.method !== "GET" && request.headers.get("Origin") !== origin) throw new AccessError("origin_required", 403);
  // The checker has no user id: its subject is the token's own name.
  const subject = machine ? identity.id : identity.claims.sub!;
  // Only an owner request creates the installation row: an Admin exists only once it does.
  const installationId = managed ?? await installation(db, env, { origin, owner, subject });
  // The checker stands in for the owner, so its changes are recorded under the owner's email.
  return pass({ db, env, installationId, origin, email: owner, actor: person ?? owner, owner: owns, subject,
    live: env.WONG_ENVIRONMENT === "production" });
}

/** The mark has no value to write, so a pass is asserted here alone, by the two makers above and below it. */
const pass = (fields: Omit<Core, typeof checked>) => fields as Core;

/** The live app's own pass for a timed job: no request and no person. Null off the live app, on an older install,
 *  or before the owner first opened Access. It acts for the owner, as the checker does, yet is never the owner. */
export async function scheduledCore(env: ConnectionEnv): Promise<Core | null> {
  const owner = ownerEmail(env);
  if (env.WONG_ENVIRONMENT !== "production" || !owner || !env.DB) return null;
  const db = env.DB.withSession("first-primary");
  const row = await db.prepare("SELECT installation_id, origin FROM wong_access_installation WHERE slot = 1")
    .first<{ installation_id: string; origin: string }>();
  if (!row) return null;
  return pass({ db, env, installationId: row.installation_id, origin: row.origin, email: owner, actor: owner, owner: false,
    subject: "schedule", live: true });
}

/** The installation a current person manages, or null: the Admin role the owner gave, for a person not removed. */
async function managedInstallation(db: D1DatabaseSession, email: string): Promise<string | null> {
  const row = await db.prepare(`SELECT h.installation_id FROM wong_access_member_roles h
    JOIN wong_access_installation i ON i.installation_id = h.installation_id AND i.slot = 1
    JOIN wong_access_members m ON m.installation_id = h.installation_id AND m.email = h.email AND m.status = 'active'
    WHERE h.email = ? AND h.role_id = ?`).bind(email, ADMIN_ROLE).first<{ installation_id: string }>();
  return row?.installation_id ?? null;
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
    // Every installation has the Admin role. It goes on the row that won, whichever request wrote it.
    db.prepare(`INSERT INTO wong_access_roles SELECT installation_id, ?, 'Admin', revision
      FROM wong_access_installation WHERE slot = 1 ON CONFLICT DO NOTHING`).bind(ADMIN_ROLE),
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
