// Finite Access operations keep people management and setup readback out of discovery.
import { accessFor, checkerOwns, currentPolicy, humanEmail, policyDenied, registryOf, withRegistry, type AccessIdentity,
  type ConnectionEnv, type Level } from "../access-slots.ts";
import { holds } from "../../../.agents/skills/access/server/levels.mjs";
import { appAccess } from "./apps.ts";
import { CODE_CHANGE, codeChange } from "./change.ts";
import { CODE_GIT, codeGit, codeState, codeUnavailable } from "./code.ts";
import { KNOWLEDGE_GIT, knowledgeGit, knowledgeSource } from "./knowledge.ts";
import { keyUse } from "./key-use.ts";
import { setupStatus } from "./setup.ts";
import { CODE_PUBLISH, codePublish } from "./publish.ts";

/** `wait` keeps work running after the answer: the Worker's `waitUntil`. */
export async function handleAccess(request: Request, env: ConnectionEnv,
  identity: AccessIdentity | null, wait: (work: Promise<unknown>) => void = () => {}): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/access/setup") return setupStatus(request, env, identity);
  if (path === "/api/access/apps") return appAccess(request, env, identity);
  if (path.startsWith(CODE_GIT)) return (await codeDenied(env, identity)) ?? codeGit(request, env, humanEmail(identity) ?? "the preview check");
  if (path === CODE_PUBLISH) return (await codeDenied(env, identity, "write")) ?? codePublish(request, env, humanEmail(identity) ?? "the preview check");
  // Project code at Read reads and saves company knowledge, a push included, even when the code is on GitHub.
  if (path.startsWith(KNOWLEDGE_GIT)) return (await codeDenied(env, identity, "read", knowledgeSource(env) !== null)) ?? knowledgeGit(request, env, humanEmail(identity));
  if (path.startsWith(CODE_CHANGE)) return (await codeDenied(env, identity)) ?? codeChange(request, env, humanEmail(identity) ?? "the preview check");
  // People, roles, keys sent sealed, tools, and GitHub pushers: the Access module's own routes.
  return (await accessFor(routeUse(env), identity).serve(request, { wait }))!;
}

/** Access shows each key a route uses with no app: the routes are read here, where no route reads this file. */
const routeUse = (env: ConnectionEnv) => withRegistry(env, Object.fromEntries(Object.entries(registryOf(env)).map(([id, key]) =>
  [id, { ...key, routeAlone: keyUse.some(use => !use.apps.length && !use.direct && use.keys.includes(id)) }])));

/** Project code at `need` now (`write` publishes), judged before any upstream call; `available` overrides whether
 *  the project can be handed out. A machine is no person; on a preview the checker stands in for the owner. */
async function codeDenied(env: ConnectionEnv, identity: AccessIdentity | null, need: Level = "read", available?: boolean): Promise<Response | null> {
  const policy = await currentPolicy(env, identity);
  if (policy.state === "unavailable" || policy.state === "denied") return policyDenied(policy);
  const state = codeState(env, policy, !!humanEmail(identity) || checkerOwns(env, identity), available);
  if (state === "ready" && policy.state === "current" && holds(policy.keys?.get("code"), need)) return null;
  return state === "off" ? codeUnavailable() : policyDenied(policy, { key: "code", need });
}
