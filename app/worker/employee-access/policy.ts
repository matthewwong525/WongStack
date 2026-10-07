// Read current authority once per call, from the primary in one SQL snapshot.
import { z } from "zod";
import type { AccessEnv, AccessIdentity } from "../access.ts";
import { areaTitle, catalogue } from "./catalogue.ts";
import { directModes, everyKey, heldLevels, holds, keyTitle, levelName, registered, type Level } from "./key-levels.ts";

export interface PolicyEnv extends AccessEnv {
  DB?: D1Database;
  /** Committed and nonsecret: the owner's sign-in email, written by setup. Absent on an older install. */
  WONG_OWNER_EMAIL?: string;
}

/** What a route asks of its caller: areas, with the saved keys it uses; keys alone; or a reviewed exception.
 *  `apps` names areas by folder: an area is an app's server side, with or without a screen. `direct` marks a
 *  route that passes a request on to its one key's service: the owner's choice for that key must reach it too. */
export type RouteAccess = { apps: readonly string[]; keys?: readonly string[] } | { keys: readonly string[]; direct?: Level } |
  { kind: "infrastructure" | "self-service" | "owner" };
type Role = "owner" | "employee";
export type CurrentPolicy = { state: "legacy" } | { state: "unavailable" } | { state: "denied" } |
  // The owner is known and permissions have not started: everyone keeps every app.
  // `manages`: the caller may manage Access. It is its own flag and gives no app, key or owner route.
  { state: "not_started"; role: Role; manages: boolean } |
  // `apps` is the level held for each area: `read` looks things up, `write` also changes or sends things.
  // `keys` is null until key levels start: the area alone decides, and no key works alone.
  // `direct` is the owner's choice for each key used directly: `read` passes on look-ups, `write` changes too. No entry is off.
  { state: "current"; role: Role; manages: boolean; revision: number; apps: ReadonlyMap<string, Level>; keys: ReadonlyMap<string, Level> | null;
    direct: ReadonlyMap<string, Level> };
/** What a refused caller lacks: a mapping that opens anything, one area or one key at the level the call needs,
 *  or the owner's choice for a key used directly: `use` when it is off, `changes` when it allows look-ups only. */
type Refusal = "app" | { area: string; need: Level } | { key: string; need: Level } | { key: string; off: "use" | "changes" };

const appId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const bit = z.union([z.literal(0), z.literal(1)]);
const policyRow = z.object({
  policy_enabled: bit, keys_enabled: bit,
  revision: z.number().int().positive().safe(), status: z.enum(["active", "removed"]).nullable(), manager: bit,
  apps: z.string(), keys: z.string(), direct: z.string(),
});
/** Area levels are read on every call. Key levels only once they have started: until then an unreadable one takes no app away. */
const storedLevels = (value: string) => z.record(z.string(), z.enum(["read", "write"])).parse(JSON.parse(value));
/** Every built area at Look up & change: the owner, and the machine that checks previews. */
const everyArea = (): Map<string, Level> => new Map(catalogue().map(id => [id, "write"]));

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
      SELECT i.policy_enabled, i.keys_enabled, i.revision, m.status,
        EXISTS (SELECT 1 FROM wong_access_managers a
          WHERE a.installation_id = m.installation_id AND a.email = m.email) AS manager,
        CASE WHEN h.role_id IS NULL
          THEN (SELECT json_group_object(g.app_id, g.level) FROM wong_access_grants g
            WHERE g.installation_id = i.installation_id AND g.email = m.email)
          ELSE (SELECT json_group_object(r.app_id, r.level) FROM wong_access_role_apps r
            WHERE r.installation_id = i.installation_id AND r.role_id = h.role_id) END AS apps,
        CASE WHEN h.role_id IS NULL
          THEN (SELECT json_group_object(g.key_id, g.level) FROM wong_access_key_grants g
            WHERE g.installation_id = i.installation_id AND g.email = m.email)
          ELSE (SELECT json_group_object(r.key_id, r.level) FROM wong_access_role_keys r
            WHERE r.installation_id = i.installation_id AND r.role_id = h.role_id) END AS keys,
        (SELECT json_group_object(d.key_id, d.mode) FROM wong_access_key_direct d
          WHERE d.installation_id = i.installation_id) AS direct
      FROM wong_access_installation i
      LEFT JOIN wong_access_members m ON m.installation_id = i.installation_id AND m.email = ?
      LEFT JOIN wong_access_member_roles h ON h.installation_id = m.installation_id AND h.email = m.email
      WHERE i.slot = 1`).bind(email ?? "").first();
    // No row yet: the owner has not opened Access, so nothing has started.
    if (!found) return { state: "not_started", role, manages: role === "owner" };
    const row = policyRow.parse(found);
    // The owner manages Access, and so does a current person the owner ticked. No machine has a person's row.
    const manages = role === "owner" || (!!email && row.status === "active" && row.manager === 1);
    if (!row.policy_enabled) return { state: "not_started", role, manages };
    // The owner's choice for each key used directly binds everyone, the owner and the checker too. None counts
    // until key levels have started, and an unreadable one denies.
    const direct = row.keys_enabled ? directModes(storedLevels(row.direct)) : new Map<string, Level>();
    // The checker keeps every built area and every key, as before permissions started, so preview walks
    // and the look at the live app still reach them. On the live app it manages nobody: that needs the owner.
    if (checker(identity)) return { state: "current", role, manages, revision: row.revision, apps: everyArea(), keys: everyKey(), direct };
    // Once started, only the owner and current people pass.
    if (role !== "owner" && (!email || row.status !== "active")) return { state: "denied" };
    // The owner holds every area and every key. A person's areas and levels come from their role when they hold one.
    if (role === "owner") return { state: "current", role, manages, revision: row.revision, apps: everyArea(), keys: everyKey(), direct };
    // A grant for an area that is no longer built is ignored.
    const apps = new Map(Object.entries(storedLevels(row.apps)).filter(([app]) => catalogue().includes(app)));
    return { state: "current", role, manages, revision: row.revision, apps, keys: row.keys_enabled ? heldLevels(storedLevels(row.keys)) : null, direct };
  } catch {
    // Unreadable permission data never falls back to open.
    return { state: "unavailable" };
  }
}

/** The saved keys a route lists; a reviewed exception lists none. */
export const listedKeys = (access: RouteAccess | undefined): readonly string[] =>
  !access || "kind" in access ? [] : access.keys ?? [];

/** The choice a route needs of its key's direct use, when it passes a request on to the key's service. */
export const directNeed = (access: RouteAccess | undefined): Level | undefined =>
  access && "direct" in access ? access.direct : undefined;

/** A direct call also needs the owner's choice for its key: off until picked, for the owner and the checker too. */
function lackingChoice(chosen: ReadonlyMap<string, Level>, key: string, direct: Level | undefined): Refusal | null {
  if (!direct || holds(chosen.get(key), direct)) return null;
  return { key, off: chosen.has(key) ? "changes" : "use" };
}

/** The first listed key the caller does not hold at the level needed. */
function lackingKey(held: ReadonlyMap<string, Level> | null, keys: readonly string[], need: Level, alone: boolean): Refusal | null {
  // Until key levels start, the app tick alone decides, and no key works alone.
  if (!held && !alone) return null;
  const key = keys.find(id => !holds(held?.get(id), need));
  return key ? { key, need } : null;
}

/** The first mapped area the caller does not hold at the level needed: a shared route needs every one of its areas.
 *  Empty or malformed lists never turn an unreviewed business route into an exception. */
function lackingArea(policy: CurrentPolicy & { state: "current" }, apps: readonly string[], need: Level): Refusal | null {
  if (!apps.length || !apps.every(app => appId.safeParse(app).success)) return "app";
  // The owner reaches a route mapped to a name that is not built yet; nobody else does.
  if (policy.role === "owner") return null;
  const area = apps.find(app => !holds(policy.apps.get(app), need));
  return area === undefined ? null : catalogue().includes(area) ? { area, need } : "app";
}

/** Null when the call may run; otherwise what the caller lacks. */
function refusal(policy: CurrentPolicy, access: RouteAccess | undefined, need: Level): Refusal | null {
  const keys = listedKeys(access);
  const alone = !!access && !("kind" in access) && !("apps" in access);
  // A mapping with no keys, or with a key nobody registered, opens nothing by a key alone.
  if (alone && !(keys.length && keys.every(registered))) return "app";
  const direct = directNeed(access);
  if (policy.state === "legacy" || policy.state === "not_started") {
    // No choice can have been made before permissions start, so no direct call runs, the owner's included.
    if (direct) return { key: keys[0], off: "use" };
    // Everyone keeps what the sign-in wall gave them. A key working alone is new: only the owner has it yet.
    const owner = policy.state === "not_started" && policy.role === "owner";
    return alone && !owner ? { key: keys[0], need } : null;
  }
  if (policy.state !== "current" || !access) return "app";
  if ("kind" in access) return access.kind !== "owner" || policy.role === "owner" ? null : "app";
  if (!keys.every(registered)) return "app";
  // The area comes first, then each key: both are judged by what the call does.
  return ("apps" in access ? lackingArea(policy, access.apps, need) : null) ?? lackingKey(policy.keys, keys, need, alone) ??
    lackingChoice(policy.direct, keys[0], direct);
}

/** `need` is what the call does, in each mapped area and with each listed key: `read` looks up, `write` changes or sends. */
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

/** An area's level as a refusal and the screens name it. */
const reachName = (level: Level): string => level === "read" ? "Look up" : "Look up & change";

/** A refusal names the area or the key, and the level or the direct-use choice that is missing, never a secret. */
export function policyDenied(policy: CurrentPolicy, lacking: Refusal = "app"): Response {
  const unavailable = policy.state === "unavailable";
  const message = unavailable ? "Access unavailable" : lacking === "app" ? "App access denied" :
    "area" in lacking ? `${areaTitle(lacking.area)}: ${reachName(lacking.need)} needed` :
      "off" in lacking ? `${keyTitle(lacking.key)}: direct ${lacking.off === "use" ? "use is" : "changes are"} off` :
        `${keyTitle(lacking.key)}: ${levelName(lacking.need)} needed`;
  return Response.json({ error: { code: unavailable ? "unavailable" : "forbidden", message, requestId: crypto.randomUUID() } },
    { status: unavailable ? 503 : 403, headers: { "Cache-Control": "no-store" } });
}
