// Finite core operations keep people management and setup readback out of discovery.
import type { AccessIdentity } from "../access.ts";
import { appAccess } from "./apps.ts";
import { CODE_GIT, codeGit, codeState, codeUnavailable } from "./code.ts";
import { checkerOwns, currentPolicy, humanEmail, policyDenied } from "./policy.ts";
import { setupStatus } from "./setup.ts";
import { management } from "./management.ts";
import type { ConnectionEnv } from "./core.ts";

export async function handleAccess(request: Request, env: ConnectionEnv,
  identity: AccessIdentity | null): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/access/setup") return setupStatus(request, env, identity);
  if (path === "/api/access/apps") return appAccess(request, env, identity);
  if (path.startsWith(CODE_GIT)) return (await codeDenied(env, identity)) ?? codeGit(request, env);
  return management(request, env, identity);
}

/**
 * The project goes to a person who holds Project code now, judged on every call and before anything is asked of
 * where it is kept. A machine is no person; on a preview the checker stands in for the owner, as elsewhere.
 */
async function codeDenied(env: ConnectionEnv, identity: AccessIdentity | null): Promise<Response | null> {
  const policy = await currentPolicy(env, identity);
  if (policy.state === "unavailable" || policy.state === "denied") return policyDenied(policy);
  const state = codeState(env, policy, !!humanEmail(identity) || checkerOwns(env, identity));
  if (state === "ready") return null;
  return state === "lacked" ? policyDenied(policy, { key: "code", need: "read" }) : codeUnavailable();
}
