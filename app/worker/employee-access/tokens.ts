// Distinct per-machine receipts bind renewal/retry to current employee authority.
import { z } from "zod";
import type { AccessIdentity } from "../access.ts";
import { readPin } from "./activation.ts";
import { currentPolicy } from "./policy.ts";
import { type Core, type ConnectionEnv, AccessError, audit, now, reply } from "./core.ts";
import { seal, unseal } from "./seal.ts";
import { createRepositoryToken, editorPermissions, githubMaterial, revokeRepositoryToken, verifyGithub } from "./github.ts";
const input = z.object({ receiptId: z.uuid(), machineId: z.uuid() }).strict();
type Receipt = { receipt_id: string; email: string; machine_id: string; grant_revision: number;
  repository_id: number; status: string; sealed_token: string | null; expires_at: string; created_at: string };
const context = (core: Core, id: string) => `${core.pin.installationId}:receipt:${id}`;

async function editorCore(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Core> {
  const policy = await currentPolicy(request, env, identity);
  const pin = env.WONG_ACCESS_ACTIVATION && readPin(env.WONG_ACCESS_ACTIVATION);
  if (env.WONG_ENVIRONMENT !== "production" || !pin || policy.state !== "current" || policy.role !== "employee" ||
    !identity || identity.kind !== "user" || !identity.claims.sub || request.headers.get("Origin") !== pin.origin) {
    throw new AccessError("editing_not_allowed", 403);
  }
  const core = { db: env.DB.withSession("first-primary"), pin, env, email: identity.id.trim().toLowerCase(), subject: identity.claims.sub };
  await grant(core);
  return core;
}
async function grant(core: Core): Promise<{ revision: number }> {
  const row = await core.db.prepare(`SELECT m.revision FROM wong_access_members m
    JOIN wong_access_installation i ON i.installation_id = m.installation_id
    JOIN wong_access_connections c ON c.installation_id = i.installation_id AND c.provider = 'github' AND c.status = 'ready'
    WHERE i.slot = 1 AND i.installation_id = ? AND i.origin = ? AND i.account_id = ? AND i.worker_id = ?
      AND i.access_app_id = ? AND i.access_policy_id = ? AND i.issuer = ? AND i.audience = ?
      AND i.owner_subject = ? AND i.owner_email = ? AND i.repository_id = ? AND i.repository_name = ?
      AND i.policy_enabled = 1 AND i.issuance_enabled = 1 AND m.email = ? AND m.status = 'active' AND m.project_editing = 1`)
    .bind(core.pin.installationId, core.pin.origin, core.pin.accountId, core.pin.workerId, core.pin.accessAppId,
      core.pin.accessPolicyId, core.pin.issuer, core.pin.audience, core.pin.ownerSubject, core.pin.ownerEmail,
      core.pin.repositoryId, core.pin.repositoryName, core.email).first<{ revision: number }>();
  if (!row) throw new AccessError("editing_not_allowed", 403);
  return row;
}
async function receipt(core: Core, id: string): Promise<Receipt | null> {
  return core.db.prepare("SELECT * FROM wong_access_receipts WHERE receipt_id = ? AND installation_id = ?")
    .bind(id, core.pin.installationId).first<Receipt>();
}
async function deliver(core: Core, row: Receipt): Promise<Response> {
  const current = await grant(core);
  if (current.revision !== row.grant_revision || row.status !== "issued" || !row.sealed_token ||
    row.repository_id !== core.pin.repositoryId || Date.parse(row.expires_at) <= Date.now()) throw new AccessError("receipt_not_ready", 409);
  const token = await unseal(row.sealed_token, core.env.WONG_ACCESS_SEAL_KEY, context(core, row.receipt_id));
  // Seal/decrypt is asynchronous too: the last admission reads current state again.
  const final = await receipt(core, row.receipt_id);
  if ((await grant(core)).revision !== row.grant_revision || final?.status !== "issued") throw new AccessError("receipt_not_ready", 409);
  return reply({ token, expiresAt: row.expires_at, receiptId: row.receipt_id, repository: core.pin.repositoryName,
    repositoryId: core.pin.repositoryId, attribution: "GitHub App", publishing: "owner_required" });
}
export async function issueToken(request: Request, env: ConnectionEnv, identity: AccessIdentity | null, value: unknown): Promise<Response> {
  const parsed = input.safeParse(value);
  if (!parsed.success) throw new AccessError("invalid_machine_receipt", 400);
  const core = await editorCore(request, env, identity);
  const { receiptId, machineId } = parsed.data;
  const existing = await receipt(core, receiptId);
  if (existing) {
    if (existing.email !== core.email || existing.machine_id !== machineId) throw new AccessError("receipt_mismatch", 403);
    return deliver(core, existing);
  }
  const allowed = await grant(core);
  // Creation is admitted for at most ten minutes. The App JWT can remain valid
  // nine more minutes; unknown token expiry is conservatively eighty minutes
  // after admission. Never retry uncertain creation with a new token blindly.
  const started = now(), deadline = Date.now() + 600_000;
  const inserted = await core.db.prepare(`INSERT INTO wong_access_receipts SELECT ?, ?, ?, ?, ?, ?, 'issuing', NULL, ?, ?
    WHERE NOT EXISTS(SELECT 1 FROM wong_access_receipts WHERE installation_id = ? AND email = ? AND machine_id = ?
      AND status IN ('issuing', 'unknown') AND expires_at > ?)
      AND EXISTS(SELECT 1 FROM wong_access_members WHERE installation_id = ? AND email = ?
        AND status = 'active' AND project_editing = 1 AND revision = ?)
    ON CONFLICT(receipt_id) DO NOTHING RETURNING receipt_id`).bind(receiptId, core.pin.installationId, core.email,
    machineId, allowed.revision, core.pin.repositoryId, new Date(Date.now() + 4_800_000).toISOString(), started, core.pin.installationId, core.email, machineId, started, core.pin.installationId, core.email, allowed.revision).first();
  if (!inserted) throw new AccessError("receipt_retry_pending", 409);
  let token: string | null = null;
  try {
    const app = await githubMaterial(core);
    await verifyGithub(core, app);
    if ((await grant(core)).revision !== allowed.revision || Date.now() >= deadline) throw new AccessError("editing_changed", 403);
    const created = await createRepositoryToken(core, app, editorPermissions);
    token = created.token;
    const sealed = await seal(token, env.WONG_ACCESS_SEAL_KEY, context(core, receiptId));
    // Persist even after removal so revocation can recover from a lost response.
    await core.db.prepare(`UPDATE wong_access_receipts SET sealed_token = ?, expires_at = ?, status =
      CASE WHEN EXISTS(SELECT 1 FROM wong_access_members WHERE installation_id = ? AND email = ?
        AND status = 'active' AND project_editing = 1 AND revision = ?) THEN 'issued' ELSE 'revoke_pending' END
      WHERE receipt_id = ? AND status = 'issuing'`)
      .bind(sealed, created.expires_at, core.pin.installationId, core.email, allowed.revision, receiptId).run();
    await audit(core, "repository_token_issued", allowed.revision);
    const saved = await receipt(core, receiptId);
    if (!saved) throw new AccessError("receipt_not_ready", 409);
    return await deliver(core, saved);
  } catch (error) {
    if (token) {
      try {
        await revokeRepositoryToken(token);
        await core.db.prepare("UPDATE wong_access_receipts SET status = 'revoked', sealed_token = NULL WHERE receipt_id = ?")
          .bind(receiptId).run();
      } catch {
        await core.db.prepare("UPDATE wong_access_receipts SET status = 'revoke_pending' WHERE receipt_id = ?").bind(receiptId).run();
      }
    } else {
      await core.db.prepare("UPDATE wong_access_receipts SET status = 'unknown' WHERE receipt_id = ? AND status = 'issuing'").bind(receiptId).run();
    }
    throw error;
  }
}
export async function revokeTokens(core: Core): Promise<void> {
  const rows = await core.db.prepare(`SELECT r.* FROM wong_access_receipts r
    LEFT JOIN wong_access_members m ON m.installation_id = r.installation_id AND m.email = r.email
    WHERE r.installation_id = ? AND (r.status IN ('issuing', 'unknown', 'revoke_pending') OR
      (r.status = 'issued' AND (m.status != 'active' OR m.project_editing = 0 OR m.revision != r.grant_revision)))`)
    .bind(core.pin.installationId).all<Receipt>();
  for (const row of rows.results) {
    if (Date.parse(row.expires_at) <= Date.now()) {
      await core.db.prepare("UPDATE wong_access_receipts SET status = 'expired', sealed_token = NULL WHERE receipt_id = ?")
        .bind(row.receipt_id).run();
    } else if (row.sealed_token) {
      try {
        await revokeRepositoryToken(await unseal(row.sealed_token, core.env.WONG_ACCESS_SEAL_KEY, context(core, row.receipt_id)));
        await core.db.prepare("UPDATE wong_access_receipts SET status = 'revoked', sealed_token = NULL WHERE receipt_id = ?")
          .bind(row.receipt_id).run();
      } catch {
        await core.db.prepare("UPDATE wong_access_receipts SET status = 'revoke_pending' WHERE receipt_id = ?").bind(row.receipt_id).run();
      }
    }
  }
  const unresolved = "EXISTS(SELECT 1 FROM wong_access_receipts r WHERE r.installation_id = wong_access_work.installation_id AND r.status IN ('issuing', 'unknown', 'revoke_pending'))";
  await core.db.prepare(`UPDATE wong_access_work SET status = CASE WHEN ${unresolved} THEN 'pending' ELSE 'ready' END,
    outcome = CASE WHEN ${unresolved} THEN 'revocation_or_unknown_expiry_pending' ELSE 'tracked_tokens_revoked_or_expired' END
    WHERE installation_id = ? AND kind = 'github_tokens'`).bind(core.pin.installationId).run();
}
