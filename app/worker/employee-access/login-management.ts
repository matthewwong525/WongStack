// Exact-resource Access reconciliation. This token cannot administer hosting or memory.
import { z } from "zod";
import { type Core, AccessError, audit, now, leaseCurrent } from "./core.ts";
import { seal, unseal } from "./seal.ts";
import { provider } from "./provider.ts";
const cf = "https://api.cloudflare.com/client/v4";
const authoritySchema = z.object({ version: z.literal(1), token: z.string().min(1),
  accountId: z.string(), appId: z.string(), policyId: z.string(), policyName: z.string(),
  initialEmails: z.array(z.email()),
  permission: z.literal("Access: Apps and Policies Write"), scope: z.literal("selected-account") }).strict();
const emailRule = z.object({ email: z.object({ email: z.email() }).strict() }).strict();
const policySchema = z.object({ id: z.string(), name: z.string(), decision: z.literal("allow"),
  include: z.array(emailRule), exclude: z.array(z.unknown()), require: z.array(z.unknown()), session_duration: z.string(), app_count: z.number().optional(), reusable: z.boolean().optional() }).passthrough();
const appSchema = z.object({ id: z.string(), aud: z.string(), domain: z.string(),
  destinations: z.array(z.object({ type: z.string(), worker_id: z.string().optional(), uri: z.string().optional() })) });
const envelope = (value: unknown) => z.object({ success: z.literal(true), result: z.unknown() }).parse(value).result;
const root = (core: Core) => `/accounts/${core.pin.accountId}/access/apps/${core.pin.accessAppId}`;
const sorted = (values: string[]) => [...values].sort().join("\n");

async function read(core: Core, token: string) {
  const app = appSchema.parse(envelope(await provider(cf, root(core), token)));
  if (app.id !== core.pin.accessAppId || app.aud !== core.pin.audience ||
    app.domain !== new URL(core.pin.origin).hostname ||
    !app.destinations.some(destination => destination.type === "worker" && destination.worker_id === core.pin.workerId)) {
    throw new AccessError("login_resource_mismatch");
  }
  const policies = z.array(z.object({ id: z.string(), decision: z.string(), include: z.array(z.unknown()) }).passthrough())
    .parse(envelope(await provider(cf, `${root(core)}/policies?per_page=1000`, token)));
  // An unreviewed allow/bypass policy must never become an alternate employee admission.
  if (policies.length > 2 || policies.some(policy => policy.id !== core.pin.accessPolicyId &&
    (policy.decision !== "non_identity" || !policy.include.length || !policy.include.every(rule =>
      z.object({ service_token: z.object({ token_id: z.string().min(1) }).strict() }).strict().safeParse(rule).success)))) {
    throw new AccessError("login_policy_review_required");
  }
  const policy = policySchema.parse(policies.find(policy => policy.id === core.pin.accessPolicyId));
  if (policy.reusable || (policy.app_count !== undefined && policy.app_count !== 1)) throw new AccessError("login_policy_review_required");
  return policy;
}

export async function connectLogin(core: Core): Promise<void> {
  if (!core.env.WONG_ACCESS_LOGIN_MANAGEMENT) throw new AccessError("login_owner_setup_required");
  const authority = authoritySchema.parse(JSON.parse(core.env.WONG_ACCESS_LOGIN_MANAGEMENT));
  if (authority.accountId !== core.pin.accountId || authority.appId !== core.pin.accessAppId ||
    authority.policyId !== core.pin.accessPolicyId || !authority.initialEmails.includes(core.pin.ownerEmail)) {
    throw new AccessError("login_resource_mismatch");
  }
  const policy = await read(core, authority.token);
  if (policy.name !== authority.policyName || sorted(policy.include.map(rule => rule.email.email)) !== sorted(authority.initialEmails)) {
    throw new AccessError("login_policy_review_required");
  }
  const material = await seal(JSON.stringify({ token: authority.token, template: policy }), core.env.WONG_ACCESS_SEAL_KEY,
    `${core.pin.installationId}:access`);
  await core.db.batch([
    core.db.prepare(`INSERT INTO wong_access_connections (installation_id, provider, status, generation, sealed_material, verified_at, detail)
      VALUES (?, 'access', 'ready', 1, ?, ?, ?) ON CONFLICT(installation_id, provider) DO UPDATE SET
      status = 'ready', generation = generation + 1, sealed_material = excluded.sealed_material,
      verified_at = excluded.verified_at, detail = excluded.detail`).bind(core.pin.installationId, material, now(),
      "Selected-account Access: Apps and Policies Write; provider scope covers the account. Core calls only the pinned app and human policy. Token scope is independently verified by the private operator."),
    core.db.prepare(`INSERT INTO wong_access_work (installation_id, kind, generation, status)
      SELECT installation_id, 'policy', revision, 'pending' FROM wong_access_installation WHERE installation_id = ?
      ON CONFLICT(installation_id, kind) DO UPDATE SET generation = excluded.generation, status = 'pending'`).bind(core.pin.installationId),
  ]);
  await audit(core, "login_connected", 1);
}

async function credentials(core: Core) {
  const row = await core.db.prepare("SELECT sealed_material FROM wong_access_connections WHERE installation_id = ? AND provider = 'access' AND status = 'ready'")
    .bind(core.pin.installationId).first<{ sealed_material: string }>();
  if (!row) throw new AccessError("login_owner_setup_required");
  return z.object({ token: z.string(), template: policySchema }).parse(JSON.parse(await unseal(row.sealed_material,
    core.env.WONG_ACCESS_SEAL_KEY, `${core.pin.installationId}:access`)));
}
export async function reconcileLogin(core: Core, kind: "policy" | "sessions"): Promise<void> {
  const enabled = await core.db.prepare("SELECT policy_enabled FROM wong_access_installation WHERE installation_id = ?")
    .bind(core.pin.installationId).first<{ policy_enabled: number }>();
  if (core.env.WONG_ACCESS_POLICY !== "on" || enabled?.policy_enabled !== 1) throw new AccessError("private_rollout_required");
  const material = await credentials(core);
  for (let pass = 0; pass < 3; pass++) {
    const work = await core.db.prepare("SELECT generation, status FROM wong_access_work WHERE installation_id = ? AND kind = ?")
      .bind(core.pin.installationId, kind).first<{ generation: number; status: string }>();
    if (!work || work.status === "ready") return;
    try {
      if (!await leaseCurrent(core)) throw new AccessError("provider_lease_expired");
      const policy = await read(core, material.token);
      if (controls(policy) !== controls(material.template)) {
        throw new AccessError("login_policy_review_required");
      }
      if (kind === "policy") {
        await updatePolicy(core, material, work.generation);
      } else {
        envelope(await provider(cf, `${root(core)}/revoke_tokens`, material.token, "POST", {}));
      }
      const current = await core.db.prepare("SELECT generation FROM wong_access_work WHERE installation_id = ? AND kind = ?")
        .bind(core.pin.installationId, kind).first<{ generation: number }>();
      if (!current || current.generation !== work.generation || !await leaseCurrent(core)) {
        // Even a later job's earlier success can be invalidated by this stale external write.
        await core.db.prepare("UPDATE wong_access_work SET status = 'pending', outcome = NULL WHERE installation_id = ? AND kind = ?")
          .bind(core.pin.installationId, kind).run();
        continue;
      }
      const unresolved = kind === "policy" ? await core.db.prepare("SELECT COUNT(*) pending FROM wong_access_policy_writes WHERE installation_id = ? AND status != 'completed'")
        .bind(core.pin.installationId).first<{ pending: number }>() : null;
      if (unresolved?.pending) {
        await core.db.prepare("UPDATE wong_access_work SET status = 'pending', outcome = 'previous_policy_write_unresolved' WHERE installation_id = ? AND kind = 'policy'")
          .bind(core.pin.installationId).run();
        return;
      }
      await core.db.prepare(`UPDATE wong_access_work SET status = 'ready', retry_after = NULL, error_code = NULL, outcome = ?
        WHERE installation_id = ? AND kind = ? AND generation = ?
          AND EXISTS(SELECT 1 FROM wong_access_leases WHERE installation_id = ? AND holder = ? AND expires_at > ?)
          AND (? != 'policy' OR NOT EXISTS(SELECT 1 FROM wong_access_policy_writes WHERE installation_id = ? AND status != 'completed'))`).bind(kind === "policy" ? "policy_readback_matches" :
        "session_revocation_accepted_propagation_unverified", core.pin.installationId, kind, work.generation, core.pin.installationId, core.holder ?? "", now(), kind, core.pin.installationId).run();
      return;
    } catch (error) {
      await core.db.prepare(`UPDATE wong_access_work SET status = 'failed', retry_after = ?, error_code = ?, outcome = NULL
        WHERE installation_id = ? AND kind = ? AND generation = ?`).bind(new Date(Date.now() + 30_000).toISOString(),
        error instanceof AccessError ? error.code : "login_provider_unavailable", core.pin.installationId, kind, work.generation).run();
      return;
    }
  }
}

function controls(value: z.infer<typeof policySchema>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(value)
    .filter(([field]) => !["include", "id", "created_at", "updated_at", "uid", "app_count"].includes(field))
    .sort(([a], [b]) => a.localeCompare(b))));
}
async function updatePolicy(core: Core, material: Awaited<ReturnType<typeof credentials>>, generation: number): Promise<void> {
  const members = await core.db.prepare("SELECT email FROM wong_access_members WHERE installation_id = ? AND status = 'active'")
    .bind(core.pin.installationId).all<{ email: string }>();
  const emails = [...new Set([core.pin.ownerEmail, ...members.results.map(row => row.email)])].sort();
  const template = Object.fromEntries(Object.entries(material.template)
    .filter(([field]) => !["id", "created_at", "updated_at", "uid", "app_count"].includes(field)));
  const intent = crypto.randomUUID();
  await core.db.batch([
    core.db.prepare(`INSERT INTO wong_access_policy_writes SELECT ?, ?, ?, 'in_flight', ?
      WHERE EXISTS(SELECT 1 FROM wong_access_leases WHERE installation_id = ? AND holder = ? AND expires_at > ?)
        AND EXISTS(SELECT 1 FROM wong_access_work WHERE installation_id = ? AND kind = 'policy' AND generation = ?)`)
      .bind(intent, core.pin.installationId, generation, now(), core.pin.installationId, core.holder ?? "", now(), core.pin.installationId, generation),
    core.db.prepare(`UPDATE wong_access_work SET status = 'pending', outcome = NULL WHERE installation_id = ? AND kind = 'policy'
      AND EXISTS(SELECT 1 FROM wong_access_policy_writes WHERE intent_id = ?)`)
      .bind(core.pin.installationId, intent),
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
    await provider(cf, `${root(core)}/policies/${core.pin.accessPolicyId}`, material.token, "PUT",
      { ...template, include: emails.map(email => ({ email: { email } })) });
    await core.db.prepare("UPDATE wong_access_policy_writes SET status = 'completed' WHERE intent_id = ?").bind(intent).run();
  } catch (error) {
    await core.db.prepare("UPDATE wong_access_policy_writes SET status = 'unknown' WHERE intent_id = ? AND status = 'in_flight'").bind(intent).run();
    throw error;
  }
  const checked = await read(core, material.token);
  if (sorted(checked.include.map(rule => rule.email.email)) !== sorted(emails) || controls(checked) !== controls(material.template)) throw new AccessError("login_policy_readback_pending");
}
