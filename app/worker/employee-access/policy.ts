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

/** What a route asks of its caller: apps, whatever saved keys it uses; keys alone; or a reviewed exception. `direct`
 *  marks a route that passes a request on to its one key's service: the caller's level decides, once levels start. */
export type RouteAccess = { apps: readonly string[]; keys?: readonly string[] } | { keys: readonly string[]; direct?: true } |
  { kind: "infrastructure" | "self-service" | "owner" };
type Role = "owner" | "employee";
export type CurrentPolicy = { state: "legacy" } | { state: "unavailable" } | { state: "denied" } |
  // The owner is known and permissions have not started: everyone keeps every app.
  // `manages`: the caller may manage Access. It is its own flag and gives no app, key or owner route.
  { state: "not_started"; role: Role; manages: boolean } |
  // `apps`: the apps held, each whole. `keys`: the level held per key used by itself, null until key levels start.
  // `keysStarted`: until key levels start no key is used directly, the owner's included.
  { state: "current"; role: Role; manages: boolean; revision: number; apps: ReadonlySet<string>; keys: ReadonlyMap<string, Level> | null;
    keysStarted: boolean };
/** What a refused caller lacks: an app, or a mapping that opens anything; or one key at the level the call needs. */
type Refusal = "app" | { key: string; need: Level };

// The built-in role's id: its holder has every app and key and manages Access.
// A role the owner makes gets a random id, never this one.
export const ADMIN_ROLE = "admin";

const appId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const bit = z.union([z.literal(0), z.literal(1)]);
const policyRow = z.object({
  policy_enabled: bit, keys_enabled: bit,
  revision: z.number().int().positive().safe(), status: z.enum(["active", "removed"]).nullable(), held: z.string().nullable(),
  apps: z.string(), keys: z.string(),
});
/** Key levels are read only once they have started: until then an unreadable one takes no app away. */
const storedLevels = (value: string) => z.record(z.string(), z.enum(["read", "write"])).parse(JSON.parse(value));
/** Apps are read on every call. A grant for an app that is no longer built is ignored. */
const storedApps = (value: string) => new Set(z.array(z.string()).parse(JSON.parse(value)).filter(app => catalogue().includes(app)));
/** Every built app: the owner, an Admin, and the machine that checks previews. */
const everyApp = (): Set<string> => new Set(catalogue());

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

/** The verification service token the sign-in wall admits: a machine, never a person. */
function checker(identity: AccessIdentity | null): boolean {
  return identity?.kind === "service" && !identity.claims.email && !!identity.claims.common_name &&
    identity.id === identity.claims.common_name;
}

/** On staging and its previews the checker stands in for the owner, so a walk can open and save Access against
 *  the practice list. The environment name is committed config, never something a request sets. */
export const checkerOwns = (env: PolicyEnv, identity: AccessIdentity | null): boolean =>
  env.WONG_ENVIRONMENT === "staging" && checker(identity);

/** Once permissions start, only the owner and current people pass. */
const refusedOnceStarted = (role: Role, email: string | null, status: "active" | "removed" | null) =>
  role !== "owner" && (!email || status !== "active");

/** On a preview, a signed-in person the practice list does not name: the sign-in wall let them in, a GitHub pusher
 *  included, and the data is made up. */
const unlistedOnPreview = (env: PolicyEnv, email: string | null, status: "active" | "removed" | null) =>
  !!email && status === null && env.WONG_ENVIRONMENT === "staging";

/** Every app, and every key once key levels start. */
const everything = (role: Role, manages: boolean, revision: number, keysStarted: boolean): CurrentPolicy =>
  ({ state: "current", role, manages, revision, apps: everyApp(), keys: keysStarted ? everyKey() : null, keysStarted });

/** The identity has already passed signed Access verification in the Worker. */
export async function currentPolicy(env: PolicyEnv, identity: AccessIdentity | null): Promise<CurrentPolicy> {
  const owner = ownerEmail(env);
  // No migration/database/memory dependency is introduced into an older install.
  if (!owner) return { state: "legacy" };
  if (!env.DB) return { state: "unavailable" };
  const email = humanEmail(identity);
  const role = email === owner || checkerOwns(env, identity) ? "owner" : "employee";
  try {
    const found = await env.DB.withSession("first-primary").prepare(`
      SELECT i.policy_enabled, i.keys_enabled, i.revision, m.status, h.role_id AS held,
        CASE WHEN h.role_id IS NULL
          THEN (SELECT json_group_array(g.app_id) FROM wong_access_grants g
            WHERE g.installation_id = i.installation_id AND g.email = m.email AND g.level = 'write')
          ELSE (SELECT json_group_array(r.app_id) FROM wong_access_role_apps r
            WHERE r.installation_id = i.installation_id AND r.role_id = h.role_id AND r.level = 'write') END AS apps,
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
    if (!found) return { state: "not_started", role, manages: role === "owner" };
    const row = policyRow.parse(found);
    // The owner manages Access, and so does an Admin: a current person holding the built-in role.
    // No machine has a person's row.
    const admin = !!email && row.status === "active" && row.held === ADMIN_ROLE;
    const manages = role === "owner" || admin;
    const outsider = refusedOnceStarted(role, email, row.status);
    // Only a removal writes `removed`, so it holds even before permissions start.
    if (outsider && row.status === "removed") return { state: "denied" };
    if (!row.policy_enabled) return { state: "not_started", role, manages };
    const keysStarted = row.keys_enabled === 1;
    // The checker keeps every built app and every key, as before permissions started, so preview walks
    // and the look at the live app still reach them. On the live app it manages nobody: that needs the owner.
    if (checker(identity)) return { state: "current", role, manages, revision: row.revision, apps: everyApp(), keys: everyKey(), keysStarted };
    // One the practice list names keeps what it gives.
    if (outsider && unlistedOnPreview(env, email, row.status)) return everything(role, false, row.revision, keysStarted);
    if (outsider) return { state: "denied" };
    // The owner holds every app and every key. A person's apps and levels come from their role when they hold one.
    // Only a row at `write` is a held app: one left at `read` could only look, and a tick can not say that.
    if (role === "owner") return { state: "current", role, manages, revision: row.revision, apps: everyApp(), keys: everyKey(), keysStarted };
    // An Admin's set is worked out like the owner's, so an app built later is theirs too.
    // Their keys wait for key levels.
    if (admin) return everything(role, manages, row.revision, keysStarted);
    return { state: "current", role, manages, revision: row.revision, apps: storedApps(row.apps), keys: keysStarted ? heldLevels(storedLevels(row.keys)) : null, keysStarted };
  } catch {
    // Unreadable permission data never falls back to open.
    return { state: "unavailable" };
  }
}

/** The saved keys a route lists; a reviewed exception lists none. */
export const listedKeys = (access: RouteAccess | undefined): readonly string[] =>
  !access || "kind" in access ? [] : access.keys ?? [];

/** Whether a route passes a request on to its key's service. */
export const usedDirectly = (access: RouteAccess | undefined): boolean => !!access && "direct" in access && access.direct === true;

/** The first listed key the caller lacks at the level needed. Until key levels start, only the owner holds one. */
function lackingKey(held: ReadonlyMap<string, Level> | null, keys: readonly string[], need: Level): Refusal | null {
  const key = keys.find(id => !holds(held?.get(id), need));
  return key ? { key, need } : null;
}

/** Whether the caller holds every mapped app: a shared route needs each one. Empty or malformed lists never
 *  turn an unreviewed business route into an exception. */
function holdsApps(policy: CurrentPolicy & { state: "current" }, apps: readonly string[]): boolean {
  if (!apps.length || !apps.every(app => appId.safeParse(app).success)) return false;
  // The owner reaches a route mapped to a name that is not built yet; nobody else does, an Admin included.
  return policy.role === "owner" || apps.every(app => policy.apps.has(app));
}

/** Null when the call may run; otherwise what the caller lacks. */
function refusal(policy: CurrentPolicy, access: RouteAccess | undefined, need: Level): Refusal | null {
  const keys = listedKeys(access);
  const alone = !!access && !("kind" in access) && !("apps" in access);
  // A mapping with no keys, or with a key nobody registered, opens nothing by a key alone.
  if (alone && !(keys.length && keys.every(registered))) return "app";
  const direct = usedDirectly(access);
  if (policy.state === "legacy" || policy.state === "not_started") {
    // Direct use waits for key levels, which start after permissions: no direct call runs yet, the owner's included.
    if (direct) return { key: keys[0], need };
    // Everyone keeps what the sign-in wall gave them. A key working alone is new: only the owner has it yet.
    const owner = policy.state === "not_started" && policy.role === "owner";
    return alone && !owner ? { key: keys[0], need } : null;
  }
  if (policy.state !== "current" || !access) return "app";
  if ("kind" in access) return access.kind !== "owner" || policy.role === "owner" ? null : "app";
  // An app's call asks for the app and nothing else: no key level, whatever the call does.
  if ("apps" in access) return holdsApps(policy, access.apps) ? null : "app";
  // A key's own call is judged by what it does and the caller's level; a direct one too, once key levels start.
  if (direct && !policy.keysStarted) return { key: keys[0], need };
  return lackingKey(policy.keys, keys, need);
}

/** `need` is what a key's own call does: `read` looks up, `write` changes or sends. An app's call ignores it. */
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

/** A refusal names the key and the level that is missing, never a secret. */
export function policyDenied(policy: CurrentPolicy, lacking: Refusal = "app"): Response {
  const unavailable = policy.state === "unavailable";
  const message = unavailable ? "Access unavailable" : lacking === "app" ? "App access denied" :
    `${keyTitle(lacking.key)}: ${levelName(lacking.need)} needed`;
  return Response.json({ error: { code: unavailable ? "unavailable" : "forbidden", message, requestId: crypto.randomUUID() } },
    { status: unavailable ? 503 : 403, headers: { "Cache-Control": "no-store" } });
}
