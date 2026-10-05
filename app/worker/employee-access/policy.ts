// Read current authority once per call, from the primary in one SQL snapshot.
import { z } from "zod";
import type { AccessEnv, AccessIdentity } from "../access.ts";
import { catalogue } from "./catalogue.ts";
import { everyKey, heldLevels, holds, keyTitle, levelName, registered, type Level } from "./key-levels.ts";

export interface PolicyEnv extends AccessEnv {
  DB?: D1Database;
  /** Committed and nonsecret: the owner's sign-in email, written by setup. Absent on an older install. */
  WONG_OWNER_EMAIL?: string;
}

/** What a route asks of its caller: apps, with the saved keys it uses; keys alone; or a reviewed exception. */
export type RouteAccess = { apps: readonly string[]; keys?: readonly string[] } | { keys: readonly string[] } |
  { kind: "infrastructure" | "self-service" | "owner" };
type Role = "owner" | "employee";
export type CurrentPolicy = { state: "legacy" } | { state: "unavailable" } | { state: "denied" } |
  // The owner is known and permissions have not started: everyone keeps every app.
  { state: "not_started"; role: Role } |
  // `keys` is null until key levels start: the app tick alone decides, and no key works alone.
  { state: "current"; role: Role; revision: number; apps: ReadonlySet<string>; keys: ReadonlyMap<string, Level> | null };
/** What a refused caller lacks: the app, or one key at the level the call needs. */
type Refusal = "app" | { key: string; need: Level };

const appId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const bit = z.union([z.literal(0), z.literal(1)]);
const policyRow = z.object({
  policy_enabled: bit, keys_enabled: bit,
  revision: z.number().int().positive().safe(), status: z.enum(["active", "removed"]).nullable(),
  apps: z.string().transform(value => z.array(z.string()).parse(JSON.parse(value))),
  keys: z.string(),
});
/** Read only once key levels have started: until then an unreadable level takes no app away. */
const storedLevels = (value: string) => z.record(z.string(), z.enum(["read", "write"])).parse(JSON.parse(value));

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
  // No migration/database/memory dependency is introduced into an older install.
  if (!owner) return { state: "legacy" };
  if (!env.DB) return { state: "unavailable" };
  const email = humanEmail(identity);
  const role = email === owner ? "owner" : "employee";
  try {
    const found = await env.DB.withSession("first-primary").prepare(`
      SELECT i.policy_enabled, i.keys_enabled, i.revision, m.status,
        CASE WHEN h.role_id IS NULL
          THEN (SELECT json_group_array(g.app_id) FROM wong_access_grants g
            WHERE g.installation_id = i.installation_id AND g.email = m.email)
          ELSE (SELECT json_group_array(r.app_id) FROM wong_access_role_apps r
            WHERE r.installation_id = i.installation_id AND r.role_id = h.role_id) END AS apps,
        CASE WHEN h.role_id IS NULL
          THEN (SELECT json_group_object(g.key_id, g.level) FROM wong_access_key_grants g
            WHERE g.installation_id = i.installation_id AND g.email = m.email)
          ELSE (SELECT json_group_object(r.key_id, r.level) FROM wong_access_role_keys r
            WHERE r.installation_id = i.installation_id AND r.role_id = h.role_id) END AS keys
      FROM wong_access_installation i
      LEFT JOIN wong_access_members m ON m.installation_id = i.installation_id AND m.email = ?
      LEFT JOIN wong_access_member_roles h ON h.installation_id = m.installation_id AND h.email = m.email
      WHERE i.slot = 1`).bind(email ?? "").first();
    // No row yet: the owner has not opened Access, so nothing has started.
    if (!found) return { state: "not_started", role };
    const row = policyRow.parse(found);
    if (!row.policy_enabled) return { state: "not_started", role };
    // The checker keeps every built app and every key, as before permissions started, so preview walks
    // and the look at the live app still reach them. It manages nobody: people management needs the owner.
    if (checker(identity)) return { state: "current", role: "employee", revision: row.revision, apps: new Set(catalogue), keys: everyKey() };
    // Once started, only the owner and current people pass.
    if (role !== "owner" && (!email || row.status !== "active")) return { state: "denied" };
    // The owner holds every key. A person's apps and levels come from their role when they hold one.
    const keys = role === "owner" ? everyKey() : row.keys_enabled ? heldLevels(storedLevels(row.keys)) : null;
    // A grant for an app that is no longer built is ignored.
    return { state: "current", role, revision: row.revision, apps: new Set(row.apps.filter(app => catalogue.includes(app))), keys };
  } catch {
    // Unreadable permission data never falls back to open.
    return { state: "unavailable" };
  }
}

/** The saved keys a route lists; a reviewed exception lists none. */
export const listedKeys = (access: RouteAccess | undefined): readonly string[] =>
  !access || "kind" in access ? [] : access.keys ?? [];

/** The first listed key the caller does not hold at the level needed. */
function lackingKey(held: ReadonlyMap<string, Level> | null, keys: readonly string[], need: Level, alone: boolean): Refusal | null {
  // Until key levels start, the app tick alone decides, and no key works alone.
  if (!held && !alone) return null;
  const key = keys.find(id => !holds(held?.get(id), need));
  return key ? { key, need } : null;
}

/** Empty or malformed app lists never turn an unreviewed business route into an exception. */
const appsHeld = (policy: CurrentPolicy & { state: "current" }, apps: readonly string[]): boolean =>
  apps.length > 0 && apps.every(app => appId.safeParse(app).success) &&
  (policy.role === "owner" || apps.every(app => policy.apps.has(app)));

/** Null when the call may run; otherwise what the caller lacks. */
function refusal(policy: CurrentPolicy, access: RouteAccess | undefined, need: Level): Refusal | null {
  const keys = listedKeys(access);
  const alone = !!access && !("kind" in access) && !("apps" in access);
  // A mapping with no keys, or with a key nobody registered, opens nothing by a key alone.
  if (alone && !(keys.length && keys.every(registered))) return "app";
  if (policy.state === "legacy" || policy.state === "not_started") {
    // Everyone keeps what the sign-in wall gave them. A key working alone is new: only the owner has it yet.
    const owner = policy.state === "not_started" && policy.role === "owner";
    return alone && !owner ? { key: keys[0], need } : null;
  }
  if (policy.state !== "current" || !access) return "app";
  if ("kind" in access) return access.kind !== "owner" || policy.role === "owner" ? null : "app";
  if (("apps" in access && !appsHeld(policy, access.apps)) || !keys.every(registered)) return "app";
  return lackingKey(policy.keys, keys, need, alone);
}

/** `need` is what the call does with each listed key: `read` looks up, `write` changes or sends. */
export function policyAllows(policy: CurrentPolicy, access: RouteAccess | undefined, need: Level = "write"): boolean {
  return refusal(policy, access, need) === null;
}

/** Public infrastructure must be an explicit reviewed route, with no business data. */
export async function authorizeRequest(env: PolicyEnv, identity: AccessIdentity | null,
  access: RouteAccess | undefined, need: Level = "write"): Promise<Response | null> {
  if (access && "kind" in access && access.kind === "infrastructure") return null;
  const policy = await currentPolicy(env, identity);
  const lacking = refusal(policy, access, need);
  return lacking ? policyDenied(policy, lacking) : null;
}

/** A refusal names the key and the level needed, never a secret. */
export function policyDenied(policy: CurrentPolicy, lacking: Refusal = "app"): Response {
  const unavailable = policy.state === "unavailable";
  const message = unavailable ? "Access unavailable" : lacking === "app" ? "App access denied" :
    `${keyTitle(lacking.key)}: ${levelName(lacking.need)} needed`;
  return Response.json({ error: { code: unavailable ? "unavailable" : "forbidden", message, requestId: crypto.randomUUID() } },
    { status: unavailable ? 503 : 403, headers: { "Cache-Control": "no-store" } });
}
