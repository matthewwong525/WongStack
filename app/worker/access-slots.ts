// WongStack's slots for the Access module: who signed in, where the data is kept, who the owner is, and what the app
// holds. Every Worker part asks Access through here. wiki/stack/employee-access.md
import { access, type Access, type CurrentPolicy, type KeyEntry, type Level, type Refusal, type Registry,
  type RouteAccess } from "../../.agents/skills/access/server/index.mjs";
import { keyIds, saved as keySaved, worksAlone } from "../../.agents/skills/access/server/levels.mjs";
import { ADMIN_ROLE, listedKeys, ownerOf, policyAllows as allows, policyDenied as denied,
  usedDirectly } from "../../.agents/skills/access/server/policy.mjs";
import { cloudflareList } from "../../.agents/skills/access/signin/cloudflare-list.mjs";
import { callerOf, getAccessIdentity, hasSignIn, machineOf, personOf, type AccessEnv,
  type AccessIdentity } from "../../.agents/skills/access/signin/cloudflare.mjs";
import { d1Store } from "./access-store/index.ts";
import { containsCredential } from "./api/contract.ts";
import type { AppEnv } from "./apps/index.ts";
import { apps } from "./employee-access/catalogue.ts";
import { codeSource, codeStep, saveStep, type CodeEnv } from "./employee-access/code.ts";
import type { KnowledgeEnv } from "./employee-access/knowledge.ts";
import { pusherEmails, pushers, refreshOnSchedule } from "./employee-access/pushers.ts";
import { keys } from "./keys.ts";

export { ADMIN_ROLE, getAccessIdentity, hasSignIn, listedKeys, usedDirectly };
export type { AccessEnv, AccessIdentity, CurrentPolicy, KeyEntry, Level, Registry, RouteAccess };

export interface PolicyEnv extends AccessEnv {
  DB?: D1Database;
  /** Committed and nonsecret: the owner's sign-in email, written by setup. Absent on an older install. */
  WONG_OWNER_EMAIL?: string;
}
export interface ConnectionEnv extends PolicyEnv, CodeEnv, KnowledgeEnv {
  CF_ACCESS_APP_ID?: string;
  CF_ACCESS_WORKER_ID?: string;
  /** Production only: setup's key for this app's own sign-in list. Never on staging. */
  WONG_ACCESS_LOGIN_MANAGEMENT?: string;
  /** The publish's public key, which seals a key sent to the app: scripts/seal-keys.mjs writes it. */
  WONG_KEY_SEAL_PUBLIC?: string;
}

/** Where a request's registry rides on its bindings: every copy of them keeps it. */
const REGISTRY = Symbol("key registry");
/** The code's keys as Access reads them. Project code is saved when the project can be handed out: a Cloudflare-kept
 *  one needs no secret. */
const projectKeys = (env: object): Registry => !Object.hasOwn(keys, "code") ? keys
  : { ...keys, code: { ...keys.code, saved: codeSource(env) !== null } };
/** The registry a request's bindings carry; bindings with none hold the code's keys alone. */
export const registryOf = (env: object): Registry => (Reflect.get(env, REGISTRY) as Registry | undefined) ?? projectKeys(env);
/** The bindings with this request's registry on them, read once. */
export const withRegistry = <E extends object>(env: E, registry: Registry): E => ({ ...env, [REGISTRY]: registry });
const secretOf = (env: object) => (name: string): unknown => Reflect.get(env, name);
/** A key is saved when every one of its secrets is a non-empty string here. Only this yes or no leaves the Worker. */
export const saved = (env: object, id: string): boolean => keyIds(registryOf(env)).includes(id) && keySaved(registryOf(env), secretOf(env), id);

/** A copy of the bindings without the secrets of any registered key the route does not list, and without any tool
 *  secret it does not list. A key the Worker's own route uses is handed to no route, listed or not. */
export function scopedEnv<E extends object>(env: E, listed: readonly string[]): E {
  const registry = registryOf(env);
  const copy = { ...env } as E & Record<string, unknown>;
  const kept = new Set<string>();
  for (const id of keyIds(registry)) {
    const names = [...registry[id].secrets, ...registry[id].bindings ?? []];
    if (!listed.includes(id) || worksAlone(registry, id)) for (const name of names) delete copy[name];
    else for (const name of names) kept.add(name);
  }
  for (const name of Object.keys(copy)) if (name.startsWith("TOOL_") && !kept.has(name)) delete copy[name];
  return copy;
}

/** production is the live app, staging and its previews keep a practice list, and anything else is a local run. */
const environmentOf = (env: PolicyEnv) => env.WONG_ENVIRONMENT === "production" ? "live" as const
  : env.WONG_ENVIRONMENT === "staging" ? "preview" as const : "local" as const;

/** Open without login only by the committed switch, and only while no Access identifier is set: a leftover switch
 *  can't weaken a private site. */
export const openStarter = (env: AccessEnv): boolean => env.WORKSPACE_LOGIN === "off" && !env.CF_ACCESS_TEAM_DOMAIN && !env.CF_ACCESS_AUD;

/** The live app's own sign-in list, kept with setup's key. A preview has none. */
const signInList = (env: ConnectionEnv) => env.WONG_ENVIRONMENT !== "production" ? undefined : cloudflareList({
  key: () => env.WONG_ACCESS_LOGIN_MANAGEMENT, appId: env.CF_ACCESS_APP_ID, audience: env.CF_ACCESS_AUD,
  workerId: env.CF_ACCESS_WORKER_ID, previews: ({ store }) => pusherEmails(store as ReturnType<typeof d1Store>) });

/** Access over this request's bindings. `identity` is the caller the Worker has already verified. */
export function accessFor(env: ConnectionEnv, identity: AccessIdentity | null = null): Access & { schedule(): Promise<void> } {
  const list = signInList(env);
  const gate = access({
    signIn: () => callerOf(identity),
    open: () => openStarter(env),
    store: () => {
      if (!env.DB) throw new Error("no database");
      return d1Store(env.DB, { workerId: env.CF_ACCESS_WORKER_ID, appId: env.CF_ACCESS_APP_ID, teamDomain: env.CF_ACCESS_TEAM_DOMAIN,
        audience: env.CF_ACCESS_AUD });
    },
    owner: () => env.WONG_OWNER_EMAIL,
    apps: apps,
    keys: () => registryOf(env),
    secret: secretOf(env),
    sealing: { publicKey: env.WONG_KEY_SEAL_PUBLIC },
    environment: () => environmentOf(env),
    // Any service token the sign-in wall admits is the machine that checks a preview.
    checker: () => true,
    ...(list && { signInList: list }),
    // Why Project code can not be given out yet, and the same for saving a change through the app: a word each.
    status: () => ({ project: codeStep(env), projectSave: saveStep(env) }),
    leaks: value => containsCredential(value, env as AppEnv),
    extras: [pushers(env, list)],
  });
  // Every 15 minutes on the live app alone: who can push on GitHub joins the previews' sign-in list.
  return { ...gate, schedule: () => gate.scheduled(refreshOnSchedule(env, list)) };
}

/** A request with no address of its own, for a decision made outside a request. */
const asked = () => new Request("https://access.invalid/");

/** The caller's policy, read once for the call. */
export const currentPolicy = (env: PolicyEnv, identity: AccessIdentity | null): Promise<CurrentPolicy> =>
  accessFor(env, identity).decide(asked());
/** `need` is what a key's own call does: `read` looks up, `write` changes or sends. An app's call ignores it. */
export const policyAllows = (policy: CurrentPolicy, need: RouteAccess | undefined, level: Level = "write", registry = registryOf({})): boolean =>
  allows(policy, need, level, registry);
/** A refusal names the key and the level that is missing, never a secret. */
export const policyDenied = (policy: CurrentPolicy, lacking: Refusal = "app", registry: Registry = registryOf({})): Response =>
  denied(policy, lacking, registry);
/** Null when the caller may make the call, or the refusal. Public infrastructure is an explicit reviewed route. */
export const authorizeRequest = (env: PolicyEnv, identity: AccessIdentity | null, need: RouteAccess | undefined,
  level: Level = "write"): Promise<Response | null> => accessFor(env, identity).gate(asked(), need, level);

/** The owner email setup recorded, or null on an older install. */
export const ownerEmail = (env: PolicyEnv): string | null => ownerOf(env.WONG_OWNER_EMAIL);
/** A verified person's email. A service token, a missing subject or a stale assertion is no person. */
export const humanEmail = (identity: AccessIdentity | null): string | null => personOf(identity);
/** On staging and its previews the checker stands in for the owner, against the practice list. */
export const checkerOwns = (env: PolicyEnv, identity: AccessIdentity | null): boolean =>
  environmentOf(env) === "preview" && !!machineOf(identity);
