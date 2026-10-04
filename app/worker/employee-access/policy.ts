// Read current authority once per call, from the primary in one SQL snapshot.
import { z } from "zod";
import type { AccessEnv, AccessIdentity } from "../access.ts";
import { catalogue } from "./catalogue.ts";

export interface PolicyEnv extends AccessEnv {
  DB?: D1Database;
  /** Committed and nonsecret: the owner's sign-in email, written by setup. Absent on an older install. */
  WONG_OWNER_EMAIL?: string;
}

export type RouteAccess = { apps: readonly string[] } | { kind: "infrastructure" | "self-service" | "owner" };
type Role = "owner" | "employee";
export type CurrentPolicy = { state: "legacy" } | { state: "unavailable" } | { state: "denied" } |
  // The owner is known and permissions have not started: everyone keeps every app.
  { state: "not_started"; role: Role } |
  { state: "current"; role: Role; revision: number; apps: ReadonlySet<string> };

const appId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const policyRow = z.object({
  policy_enabled: z.union([z.literal(0), z.literal(1)]),
  revision: z.number().int().positive().safe(), status: z.enum(["active", "removed"]).nullable(),
  apps: z.string().transform(value => z.array(z.string()).parse(JSON.parse(value))),
});

/** The owner email setup recorded, or null on an older install. */
export const ownerEmail = (env: PolicyEnv): string | null => env.WONG_OWNER_EMAIL?.trim().toLowerCase() || null;

/** A verified person's email. A service token, a missing subject or a stale assertion is no person. */
export function humanEmail(identity: AccessIdentity | null): string | null {
  if (!identity || identity.kind !== "user" || identity.claims.common_name || !identity.claims.sub ||
    identity.claims.exp <= Math.floor(Date.now() / 1000) ||
    (identity.claims.nbf !== undefined && identity.claims.nbf > Math.floor(Date.now() / 1000))) return null;
  const email = identity.id.trim().toLowerCase();
  return z.email().safeParse(email).success && identity.claims.email?.trim().toLowerCase() === email ? email : null;
}

/** The verification service token the sign-in wall admits: a machine, never a person or the owner. */
function checker(identity: AccessIdentity | null): boolean {
  return identity?.kind === "service" && !identity.claims.email && !!identity.claims.common_name &&
    identity.id === identity.claims.common_name;
}

/** The identity has already passed signed Access verification in the Worker. */
export async function currentPolicy(env: PolicyEnv, identity: AccessIdentity | null): Promise<CurrentPolicy> {
  const owner = ownerEmail(env);
  // No migration/database/memory dependency is introduced into an old or managed starter.
  if (!owner) return { state: "legacy" };
  if (!env.DB) return { state: "unavailable" };
  const email = humanEmail(identity);
  const role = email === owner ? "owner" : "employee";
  try {
    const found = await env.DB.withSession("first-primary").prepare(`
      SELECT i.policy_enabled, i.revision, m.status,
        (SELECT json_group_array(g.app_id) FROM wong_access_grants g
          WHERE g.installation_id = i.installation_id AND g.email = m.email) AS apps
      FROM wong_access_installation i
      LEFT JOIN wong_access_members m ON m.installation_id = i.installation_id AND m.email = ?
      WHERE i.slot = 1`).bind(email ?? "").first();
    // No row yet: the owner has not opened Access, so nothing has started.
    if (!found) return { state: "not_started", role };
    const row = policyRow.parse(found);
    if (!row.policy_enabled) return { state: "not_started", role };
    // The checker keeps every built app, as before permissions started, so preview walks and the
    // look at the live app still open them. It manages nobody: people management needs the owner.
    if (checker(identity)) return { state: "current", role: "employee", revision: row.revision, apps: new Set(catalogue) };
    // Once started, only the owner and current people pass.
    if (role !== "owner" && (!email || row.status !== "active")) return { state: "denied" };
    // A grant for an app that is no longer built is ignored.
    return { state: "current", role, revision: row.revision, apps: new Set(row.apps.filter(app => catalogue.includes(app))) };
  } catch {
    // Unreadable permission data never falls back to open.
    return { state: "unavailable" };
  }
}

export function policyAllows(policy: CurrentPolicy, access: RouteAccess | undefined): boolean {
  if (policy.state === "legacy" || policy.state === "not_started") return true;
  if (policy.state !== "current" || !access) return false;
  if ("kind" in access) return access.kind !== "owner" || policy.role === "owner";
  // Empty mappings never turn an unreviewed business route into an exception.
  if (!access.apps.length || !access.apps.every(app => appId.safeParse(app).success)) return false;
  return policy.role === "owner" || access.apps.every(app => policy.apps.has(app));
}

/** Public infrastructure must be an explicit reviewed route, with no business data. */
export async function authorizeRequest(env: PolicyEnv, identity: AccessIdentity | null,
  access: RouteAccess | undefined): Promise<Response | null> {
  if (access && "kind" in access && access.kind === "infrastructure") return null;
  const policy = await currentPolicy(env, identity);
  if (policyAllows(policy, access)) return null;
  return policyDenied(policy);
}

export function policyDenied(policy: CurrentPolicy): Response {
  const unavailable = policy.state === "unavailable";
  return Response.json({ error: { code: unavailable ? "unavailable" : "forbidden",
    message: unavailable ? "Access unavailable" : "App access denied", requestId: crypto.randomUUID() } },
  { status: unavailable ? 503 : 403, headers: { "Cache-Control": "no-store" } });
}
