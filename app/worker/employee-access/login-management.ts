// Exact-resource Access reconciliation. This key cannot administer hosting or memory.
import { z } from "zod";
import { type ConnectionEnv, type Core, AccessError, now, leaseCurrent, permissionsStarted } from "./core.ts";
import { provider } from "./provider.ts";
const cf = "https://api.cloudflare.com/client/v4";
// Setup stores this in the production Worker alone. Cloudflare scopes the key to the account; the core calls only the
// recorded applications and their human policies. Version 3 adds the previews app: that list plus GitHub pushers.
const policyId = z.string().regex(/^[A-Za-z0-9-]+$/);
const authoritySchema = z.object({ version: z.literal([2, 3]), token: z.string().min(1),
  accountId: z.string().regex(/^[a-f0-9]{32}$/), policyId,
  staging: z.object({ appId: z.string().regex(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/), policyId }).strict().optional() })
  .strict().refine(authority => (authority.version === 3) === (authority.staging !== undefined));
type Authority = z.infer<typeof authoritySchema>;
const emailRule = z.object({ email: z.object({ email: z.email() }).strict() }).strict();
const policySchema = z.object({ id: z.string(), name: z.string(), decision: z.literal("allow"),
  include: z.array(emailRule), exclude: z.array(z.unknown()), require: z.array(z.unknown()), session_duration: z.string(), app_count: z.number().optional(), reusable: z.boolean().optional() }).passthrough();
type Policy = z.infer<typeof policySchema>;
/** One application and its human policy, as read and reviewed. */
type Reviewed = { path: string; policy: Policy };
const appSchema = z.object({ id: z.string(), aud: z.string(),
  destinations: z.array(z.object({ type: z.string(), worker_id: z.string().optional() })) });
type App = z.infer<typeof appSchema>;
const envelope = (value: unknown) => z.object({ success: z.literal(true), result: z.unknown() }).parse(value).result;
const sorted = (values: string[]) => [...values].sort().join("\n");
const emails = (policy: Policy) => policy.include.map(rule => rule.email.email.trim().toLowerCase());
// Fields Cloudflare owns; everything else in the live policy goes back unchanged.
const readOnly = ["id", "created_at", "updated_at", "uid", "app_count"];
// The lease (120 s) and the provider timeout (30 s) bound how long a lost write could still land.
const SETTLED_MS = 150_000;

/** The key, read from the environment on each use; null until setup has supplied it. */
export function loginAuthority(env: ConnectionEnv): Authority | null {
  try { return authoritySchema.parse(JSON.parse(env.WONG_ACCESS_LOGIN_MANAGEMENT ?? "")); }
  catch { return null; }
}

/** The live app's application, then the previews app's once split: each reviewed alike, with its own human policy. */
async function read(core: Core, authority: Authority): Promise<Reviewed[]> {
  const { CF_ACCESS_APP_ID: appId, CF_ACCESS_AUD: audience, CF_ACCESS_WORKER_ID: workerId } = core.env;
  if (!appId || !audience || !workerId) throw new AccessError("login_resource_mismatch");
  // The live app's application must be this app's own and cover this Worker.
  const live = await review(authority, appId, authority.policyId, app => app.aud === audience &&
    app.destinations.some(destination => destination.type === "worker" && destination.worker_id === workerId));
  if (!authority.staging) return [live];
  // This Worker knows no previews audience or Worker, so the previews app is judged by its recorded id alone.
  return [live, await review(authority, authority.staging.appId, authority.staging.policyId, () => true)];
}

async function review(authority: Authority, appId: string, policyId: string, owned: (app: App) => boolean): Promise<Reviewed> {
  const path = `/accounts/${authority.accountId}/access/apps/${appId}`;
  const app = appSchema.parse(envelope(await provider(cf, path, authority.token)));
  if (app.id !== appId || !owned(app)) throw new AccessError("login_resource_mismatch");
  const policies = z.array(z.object({ id: z.string(), decision: z.string(), include: z.array(z.unknown()) }).passthrough())
    .parse(envelope(await provider(cf, `${path}/policies?per_page=1000`, authority.token)));
  // An unreviewed allow/bypass policy must never become an alternate employee admission.
  if (policies.length > 2 || policies.some(policy => policy.id !== policyId &&
    (policy.decision !== "non_identity" || !policy.include.length || !policy.include.every(rule =>
      z.object({ service_token: z.object({ token_id: z.string().min(1) }).strict() }).strict().safeParse(rule).success)))) {
    throw new AccessError("login_policy_review_required");
  }
  const policy = policySchema.parse(policies.find(policy => policy.id === policyId));
  if (policy.reusable || (policy.app_count !== undefined && policy.app_count !== 1)) throw new AccessError("login_policy_review_required");
  return { path, policy };
}

/** Everyone the live app's sign-in list admits now, for the first open's import. */
export async function admittedEmails(core: Core, authority: Authority): Promise<string[]> {
  return emails((await read(core, authority))[0].policy);
}

export async function reconcileLogin(core: Core, kind: "policy" | "sessions"): Promise<void> {
  const authority = loginAuthority(core.env);
  // No provider call outside production, without the key, or before permissions start:
  // until the first open has listed everyone already admitted, a write could drop a teammate.
  if (!core.live || !authority || !await permissionsStarted(core)) return;
  for (let pass = 0; pass < 3; pass++) {
    const work = await core.db.prepare("SELECT generation, status, scope FROM wong_access_work WHERE installation_id = ? AND kind = ?")
      .bind(core.installationId, kind).first<{ generation: number; status: string; scope: Scope }>();
    if (!work || work.status === "ready") return;
    try {
      if (await attempt(core, authority, kind, work)) return;
    } catch (error) {
      await core.db.prepare(`UPDATE wong_access_work SET status = 'failed', retry_after = ?, error_code = ?, outcome = NULL
        WHERE installation_id = ? AND kind = ? AND generation = ?`).bind(new Date(Date.now() + 30_000).toISOString(),
        error instanceof AccessError ? error.code : "login_provider_unavailable", core.installationId, kind, work.generation).run();
      return;
    }
  }
}

/** Which sign-ins a sessions job ends: everyone's, or the previews app's alone when only a pusher left. */
type Scope = "both" | "previews";

/** One provider attempt. False means a newer change arrived meanwhile, so go round again. */
async function attempt(core: Core, authority: Authority, kind: "policy" | "sessions",
  { generation, scope }: { generation: number; scope: Scope }): Promise<boolean> {
  const id = core.installationId;
  if (!await leaseCurrent(core)) throw new AccessError("provider_lease_expired");
  const live = await read(core, authority);
  if (kind === "policy") await updatePolicy(core, authority, live, generation);
  else for (const { path } of scope === "previews" ? live.slice(1) : live) envelope(await provider(cf, `${path}/revoke_tokens`, authority.token, "POST", {}));
  const current = await core.db.prepare("SELECT generation FROM wong_access_work WHERE installation_id = ? AND kind = ?")
    .bind(id, kind).first<{ generation: number }>();
  if (!current || current.generation !== generation || !await leaseCurrent(core)) {
    // Even a later job's earlier success can be invalidated by this stale external write.
    await core.db.prepare("UPDATE wong_access_work SET status = 'pending', outcome = NULL WHERE installation_id = ? AND kind = ?")
      .bind(id, kind).run();
    return false;
  }
  if (kind === "policy" && await unresolvedWrites(core)) {
    await core.db.prepare("UPDATE wong_access_work SET status = 'pending', outcome = 'previous_policy_write_unresolved' WHERE installation_id = ? AND kind = 'policy'")
      .bind(id).run();
    return true;
  }
  await core.db.batch([
    core.db.prepare(`UPDATE wong_access_work SET status = 'ready', retry_after = NULL, error_code = NULL, outcome = ?
      WHERE installation_id = ? AND kind = ? AND generation = ?
        AND EXISTS(SELECT 1 FROM wong_access_leases WHERE installation_id = ? AND holder = ? AND expires_at > ?)
        AND (? != 'policy' OR NOT EXISTS(SELECT 1 FROM wong_access_policy_writes WHERE installation_id = ? AND status != 'completed'))`)
      .bind(kind === "policy" ? "policy_readback_matches" : "session_revocation_accepted_propagation_unverified",
        id, kind, generation, id, core.holder!, now(), kind, id),
    // The newest generation the sign-in list is known to match: each person's status reads from it.
    core.db.prepare(`INSERT INTO wong_access_connections (installation_id, provider, status, generation, verified_at)
      SELECT installation_id, 'access', 'ready', generation, ? FROM wong_access_work
      WHERE installation_id = ? AND kind = 'policy' AND generation = ? AND status = 'ready' AND ? = 'policy'
      ON CONFLICT(installation_id, provider) DO UPDATE SET status = 'ready', sealed_material = NULL,
        generation = MAX(wong_access_connections.generation, excluded.generation), verified_at = excluded.verified_at`)
      .bind(now(), id, generation, kind),
  ]);
  return true;
}

/** An earlier write whose outcome is unknown keeps the list unconfirmed until it can no longer land. */
async function unresolvedWrites(core: Core): Promise<boolean> {
  const id = core.installationId;
  await core.db.prepare(`UPDATE wong_access_policy_writes SET status = 'completed'
    WHERE installation_id = ? AND status != 'completed' AND started_at < ?`)
    .bind(id, new Date(Date.now() - SETTLED_MS).toISOString()).run();
  const row = await core.db.prepare("SELECT COUNT(*) pending FROM wong_access_policy_writes WHERE installation_id = ? AND status != 'completed'")
    .bind(id).first<{ pending: number }>();
  return row!.pending > 0;
}

function controls(value: Policy): string {
  return JSON.stringify(Object.fromEntries(Object.entries(value)
    .filter(([field]) => field !== "include" && !readOnly.includes(field))
    .sort(([a], [b]) => a.localeCompare(b))));
}
/** Each application's list, live app first: the owner and active people; the previews app, once split, adds pushers. */
async function desiredLists(core: Core, count: number): Promise<string[][]> {
  const id = core.installationId;
  const [members, pushers] = await Promise.all([
    core.db.prepare("SELECT email FROM wong_access_members WHERE installation_id = ? AND status = 'active'").bind(id).all<{ email: string }>(),
    core.db.prepare("SELECT email FROM wong_access_pushers WHERE installation_id = ? AND email IS NOT NULL").bind(id).all<{ email: string }>(),
  ]);
  const people = [core.email, ...members.results.map(row => row.email)];
  const list = (emails: string[]) => [...new Set(emails)].sort();
  return Array.from({ length: count }, (_, at) => list(at === 0 ? people : [...people, ...pushers.results.map(row => row.email)]));
}

/** Whether the previews app's list differs from the saved people and pushers: setup's rerun rewrites it without them.
 *  One read, and none while a list write waits; an unreadable list counts as matching until the next refresh. */
export async function previewsDrifted(core: Core): Promise<boolean> {
  const authority = loginAuthority(core.env);
  const waiting = await core.db.prepare("SELECT 1 FROM wong_access_work WHERE installation_id = ? AND kind = 'policy' AND status != 'ready'")
    .bind(core.installationId).first();
  if (!authority?.staging || waiting) return false;
  try {
    const path = `/accounts/${authority.accountId}/access/apps/${authority.staging.appId}/policies?per_page=1000`;
    const found = z.array(z.object({ id: z.string() }).passthrough()).parse(envelope(await provider(cf, path, authority.token)))
      .find(policy => policy.id === authority.staging!.policyId);
    return sorted(emails(policySchema.parse(found))) !== sorted((await desiredLists(core, 2))[1]);
  } catch { return false; }
}

/** Read each live policy, change only its email list, and send the rest back unchanged. */
async function updatePolicy(core: Core, authority: Authority, live: Reviewed[], generation: number): Promise<void> {
  const id = core.installationId;
  const desired = await desiredLists(core, live.length);
  const body = (policy: Policy, at: number) => ({ ...Object.fromEntries(Object.entries(policy).filter(([field]) => !readOnly.includes(field))),
    include: desired[at].map(email => ({ email: { email } })) });
  const intent = crypto.randomUUID();
  await core.db.batch([
    core.db.prepare(`INSERT INTO wong_access_policy_writes SELECT ?, ?, ?, 'in_flight', ?
      WHERE EXISTS(SELECT 1 FROM wong_access_leases WHERE installation_id = ? AND holder = ? AND expires_at > ?)
        AND EXISTS(SELECT 1 FROM wong_access_work WHERE installation_id = ? AND kind = 'policy' AND generation = ?)`)
      .bind(intent, id, generation, now(), id, core.holder!, now(), id, generation),
    core.db.prepare(`UPDATE wong_access_work SET status = 'pending', outcome = NULL WHERE installation_id = ? AND kind = 'policy'
      AND EXISTS(SELECT 1 FROM wong_access_policy_writes WHERE intent_id = ?)`)
      .bind(id, intent),
  ]);
  const admitted = await core.db.prepare(`SELECT w.generation FROM wong_access_work w
    JOIN wong_access_policy_writes p ON p.installation_id = w.installation_id
    WHERE p.intent_id = ? AND w.kind = 'policy'`).bind(intent).first<{ generation: number }>();
  if (admitted?.generation !== generation || !await leaseCurrent(core)) {
    // No external call has begun, so this intent has no unknown provider outcome.
    await core.db.prepare("UPDATE wong_access_policy_writes SET status = 'completed' WHERE intent_id = ?").bind(intent).run();
    throw new AccessError("provider_lease_expired");
  }
  try {
    for (const [at, { path, policy }] of live.entries()) await provider(cf, `${path}/policies/${policy.id}`, authority.token, "PUT", body(policy, at));
    await core.db.prepare("UPDATE wong_access_policy_writes SET status = 'completed' WHERE intent_id = ?").bind(intent).run();
  } catch (error) {
    await core.db.prepare("UPDATE wong_access_policy_writes SET status = 'unknown' WHERE intent_id = ? AND status = 'in_flight'").bind(intent).run();
    throw error;
  }
  const checked = await read(core, authority);
  if (checked.some(({ policy }, at) => sorted(emails(policy)) !== sorted(desired[at]) || controls(policy) !== controls(live[at].policy))) {
    throw new AccessError("login_policy_readback_pending");
  }
}
