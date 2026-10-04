// Only private operator configuration can nominate an installation's owner.
import { z } from "zod";
import type { AccessEnv, AccessIdentity } from "../access.ts";

export interface ActivationEnv extends AccessEnv {
  DB: D1Database;
  CF_ACCESS_APP_ID?: string;
  CF_ACCESS_WORKER_ID?: string;
  WONG_ACCESS_ACTIVATION?: string;
}

const pinSchema = z.object({
  version: z.literal(1),
  installationId: z.uuid(),
  origin: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value;
  }),
  accountId: z.string().regex(/^[a-f0-9]{32}$/),
  workerId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  accessAppId: z.uuid(),
  accessPolicyId: z.uuid(),
  issuer: z.string().regex(/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/),
  audience: z.string().min(1),
  ownerSubject: z.string().trim().min(1),
  ownerEmail: z.email().transform((email) => email.trim().toLowerCase()),
  // Read old private records compatibly; repository fields confer no authority.
  repositoryId: z.number().int().positive().safe().optional(),
  repositoryName: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/).optional(),
}).strict();

export type Pin = z.infer<typeof pinSchema>;

export function readPin(value: string): Pin | null {
  try {
    const parsed = pinSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function ownerMatches(pin: Pin, identity: AccessIdentity | null): boolean {
  if (!identity || identity.kind !== "user") return false;
  const { claims } = identity;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  return !claims.common_name && identity.id.trim().toLowerCase() === pin.ownerEmail &&
    claims.email?.trim().toLowerCase() === pin.ownerEmail && claims.sub === pin.ownerSubject &&
    claims.iss === pin.issuer && audiences.includes(pin.audience) &&
    claims.exp > Math.floor(Date.now() / 1000) &&
    (claims.nbf === undefined || claims.nbf <= Math.floor(Date.now() / 1000));
}

function response(status: number, code: string): Response {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Called only after the Worker has verified the Access assertion's signature. */
export async function activateAccess(request: Request, env: ActivationEnv, identity: AccessIdentity | null): Promise<Response> {
  if (request.method !== "POST") return response(405, "method_not_allowed");
  if (env.WONG_ENVIRONMENT !== "production" || !env.WONG_ACCESS_ACTIVATION) {
    return response(503, "owner_setup_required");
  }
  const pin = readPin(env.WONG_ACCESS_ACTIVATION);
  if (!pin || pin.origin !== new URL(request.url).origin ||
    pin.issuer !== `https://${env.CF_ACCESS_TEAM_DOMAIN}` || pin.audience !== env.CF_ACCESS_AUD ||
    pin.accessAppId !== env.CF_ACCESS_APP_ID || pin.workerId !== env.CF_ACCESS_WORKER_ID) {
    return response(503, "installation_mismatch");
  }
  if (!ownerMatches(pin, identity)) return response(403, "owner_required");
  // Browser cookies cannot trigger activation from a foreign site. Private CLI
  // clients supply this same public origin header; no request body is trusted.
  if (request.headers.get("Origin") !== pin.origin) return response(403, "origin_required");

  try {
    const db = env.DB.withSession("first-primary");
    const values = [pin.installationId, pin.origin, pin.accountId, pin.workerId, pin.accessAppId,
      pin.accessPolicyId, pin.issuer, pin.audience, pin.ownerSubject, pin.ownerEmail,
      1, ""];
    const existing = await db.prepare("SELECT * FROM wong_access_installation WHERE slot = 1").first<Record<string, unknown>>();
    if (existing) return installationMatches(existing, values);
    const now = new Date().toISOString();
    await db.batch([
      db.prepare(`INSERT INTO wong_access_installation
        (slot, installation_id, origin, account_id, worker_id, access_app_id, access_policy_id,
         issuer, audience, owner_subject, owner_email, repository_id, repository_name, activated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slot) DO NOTHING`).bind(...values, now),
      db.prepare(`INSERT INTO wong_access_audit (event_id, installation_id, actor_email, event, revision, created_at)
        SELECT ?, installation_id, owner_email, 'owner_activated', revision, activated_at
        FROM wong_access_installation WHERE installation_id = ? AND activated_at = ?
        ON CONFLICT(event_id) DO NOTHING`).bind(`activation:${pin.installationId}`, pin.installationId, now),
    ]);
    const installed = await db.prepare("SELECT * FROM wong_access_installation WHERE slot = 1").first<Record<string, unknown>>();
    if (!installed) return response(503, "activation_unavailable");
    return installationMatches(installed, values);
  } catch {
    return response(503, "activation_unavailable");
  }
}

function installationMatches(row: Record<string, unknown>, values: (string | number)[]): Response {
  const columns = ["installation_id", "origin", "account_id", "worker_id", "access_app_id", "access_policy_id",
    "issuer", "audience", "owner_subject", "owner_email"];
  return columns.every((column, index) => row[column] === values[index])
    ? response(200, "owner_activated") : response(409, "installation_already_pinned");
}
