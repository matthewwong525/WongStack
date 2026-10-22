// Finite core operations keep people management and setup readback out of discovery.
import type { AccessIdentity } from "../access.ts";
import { appAccess } from "./apps.ts";
import { CODE_CHANGE, codeChange } from "./change.ts";
import { CODE_GIT, codeGit, codeState, codeUnavailable } from "./code.ts";
import { holds, type Level } from "./key-levels.ts";
import { checkerOwns, currentPolicy, humanEmail, policyDenied } from "./policy.ts";
import { setupStatus } from "./setup.ts";
import { management } from "./management.ts";
import { CODE_PUBLISH, codePublish } from "./publish.ts";
import { PUSHERS, pushersRoute } from "./pushers.ts";
import type { ConnectionEnv } from "./core.ts";

/** `wait` keeps work running after the answer: the Worker's `waitUntil`. */
export async function handleAccess(request: Request, env: ConnectionEnv,
  identity: AccessIdentity | null, wait: (work: Promise<unknown>) => void = () => {}): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/access/setup") return setupStatus(request, env, identity);
  if (path === "/api/access/apps") return appAccess(request, env, identity);
  if (path.startsWith(CODE_GIT)) return (await codeDenied(env, identity)) ?? codeGit(request, env);
  if (path === CODE_PUBLISH) return (await codeDenied(env, identity, "write")) ?? codePublish(request, env, humanEmail(identity) ?? "the preview check");
  if (path.startsWith(CODE_CHANGE)) return (await codeDenied(env, identity)) ?? codeChange(request, env, humanEmail(identity) ?? "the preview check");
  if (path === PUSHERS || path.startsWith(`${PUSHERS}/`)) return pushersRoute(request, env, identity, wait);
  return management(request, env, identity);
}

/** Project code at `need` now (`write` publishes), judged before anything is asked of where the project is kept.
 *  A machine is no person; on a preview the checker stands in for the owner, as elsewhere. */
async function codeDenied(env: ConnectionEnv, identity: AccessIdentity | null, need: Level = "read"): Promise<Response | null> {
  const policy = await currentPolicy(env, identity);
  if (policy.state === "unavailable" || policy.state === "denied") return policyDenied(policy);
  const state = codeState(env, policy, !!humanEmail(identity) || checkerOwns(env, identity));
  if (state === "ready" && policy.state === "current" && holds(policy.keys?.get("code"), need)) return null;
  return state === "off" ? codeUnavailable() : policyDenied(policy, { key: "code", need });
}
