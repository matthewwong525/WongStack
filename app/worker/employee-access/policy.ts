// Read current authority once per call, from the primary in one SQL snapshot.
import { z } from "zod";
import type { AccessEnv, AccessIdentity } from "../access.ts";

export interface PolicyEnv extends AccessEnv {
  DB?: D1Database;
  CF_ACCESS_APP_ID?: string;
  CF_ACCESS_WORKER_ID?: string;
  /** Trusted rollout latch. Once enabled, preserve it through rollback. */
  WONG_ACCESS_POLICY?: string;
}

export type RouteAccess = { apps: readonly string[] } | { kind: "infrastructure" | "self-service" | "owner" };
export type CurrentPolicy = { state: "legacy" } | { state: "unavailable" | "denied" } |
  { state: "current"; role: "owner" | "employee"; revision: number; apps: ReadonlySet<string> };

const appId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const policyRow = z.object({
  origin: z.string(), issuer: z.string(), audience: z.string(), access_app_id: z.string(), worker_id: z.string(),
  owner_email: z.email(), owner_subject: z.string().min(1), policy_enabled: z.literal(1),
  revision: z.number().int().positive().safe(), status: z.enum(["active", "removed"]).nullable(),
  apps: z.string().transform(value => z.array(appId).parse(JSON.parse(value))),
});

function humanEmail(identity: AccessIdentity | null): string | null {
  if (!identity || identity.kind !== "user" || identity.claims.common_name || !identity.claims.sub ||
    identity.claims.exp <= Math.floor(Date.now() / 1000) ||
    (identity.claims.nbf !== undefined && identity.claims.nbf > Math.floor(Date.now() / 1000))) return null;
  const email = identity.id.trim().toLowerCase();
  return z.email().safeParse(email).success && identity.claims.email?.trim().toLowerCase() === email ? email : null;
}

/** The identity has already passed signed Access verification in the Worker. */
export async function currentPolicy(request: Request, env: PolicyEnv, identity: AccessIdentity | null): Promise<CurrentPolicy> {
  // No migration/database/memory dependency is introduced into an old or managed starter.
  if (!env.WONG_ACCESS_POLICY) return { state: "legacy" };
  if (env.WONG_ACCESS_POLICY !== "on" || !env.DB) return { state: "unavailable" };
  const email = humanEmail(identity);
  if (!email || !identity) return { state: "denied" };
  try {
    const row = policyRow.parse(await env.DB.withSession("first-primary").prepare(`
      SELECT i.origin, i.issuer, i.audience, i.access_app_id, i.worker_id,
        i.owner_email, i.owner_subject, i.policy_enabled, i.revision, m.status,
        (SELECT json_group_array(g.app_id) FROM wong_access_grants g
          JOIN wong_access_apps a ON a.installation_id = g.installation_id AND a.app_id = g.app_id
          WHERE g.installation_id = i.installation_id AND g.email = m.email) AS apps
      FROM wong_access_installation i
      LEFT JOIN wong_access_members m ON m.installation_id = i.installation_id AND m.email = ?
      WHERE i.slot = 1`).bind(email).first());
    const audiences = Array.isArray(identity.claims.aud) ? identity.claims.aud : [identity.claims.aud];
    if (row.origin !== new URL(request.url).origin || row.issuer !== `https://${env.CF_ACCESS_TEAM_DOMAIN}` ||
      row.audience !== env.CF_ACCESS_AUD || row.access_app_id !== env.CF_ACCESS_APP_ID ||
      row.worker_id !== env.CF_ACCESS_WORKER_ID) return { state: "unavailable" };
    if (identity.claims.iss !== row.issuer || !audiences.includes(row.audience)) return { state: "denied" };
    if (email === row.owner_email && identity.claims.sub === row.owner_subject) {
      return { state: "current", role: "owner", revision: row.revision, apps: new Set(row.apps) };
    }
    // An owner email with a different signed subject cannot downgrade into employee authority.
    if (email === row.owner_email || row.status !== "active") return { state: "denied" };
    return { state: "current", role: "employee", revision: row.revision, apps: new Set(row.apps) };
  } catch {
    return { state: "unavailable" };
  }
}

export function policyAllows(policy: CurrentPolicy, access: RouteAccess | undefined): boolean {
  if (policy.state === "legacy") return true;
  if (policy.state !== "current" || !access) return false;
  if ("kind" in access) return access.kind !== "owner" || policy.role === "owner";
  // Empty mappings never turn an unreviewed business route into an exception.
  if (!access.apps.length || !access.apps.every(app => appId.safeParse(app).success)) return false;
  return policy.role === "owner" || access.apps.every(app => policy.apps.has(app));
}

/** Public infrastructure must be an explicit reviewed route, with no business data. */
export async function authorizeRequest(request: Request, env: PolicyEnv, identity: AccessIdentity | null,
  access: RouteAccess | undefined): Promise<Response | null> {
  if (access && "kind" in access && access.kind === "infrastructure") return null;
  const policy = await currentPolicy(request, env, identity);
  if (policyAllows(policy, access)) return null;
  return policyDenied(policy);
}

export function policyDenied(policy: CurrentPolicy): Response {
  const unavailable = policy.state === "unavailable";
  return Response.json({ error: { code: unavailable ? "unavailable" : "forbidden",
    message: unavailable ? "Access unavailable" : "App access denied", requestId: crypto.randomUUID() } },
  { status: unavailable ? 503 : 403, headers: { "Cache-Control": "no-store" } });
}
