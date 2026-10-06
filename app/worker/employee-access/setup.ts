// Each person's own setup: the prompt that installs the project for someone who holds Project code, the
// apps-only prompt while the install can not hand the project out, and no prompt for someone who lacks it.
import type { AccessIdentity } from "../access.ts";
import { type ConnectionEnv, reply } from "./core.ts";
import { codeState } from "./code.ts";
import { setupPrompt } from "./prompt.ts";
import { areaTitle } from "./catalogue.ts";
import { businessApps } from "./sets.ts";
import { currentPolicy, humanEmail, policyDenied } from "./policy.ts";
export async function setupStatus(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Response> {
  if (request.method !== "GET") return reply({ code: "method_not_allowed" }, 405);
  const policy = await currentPolicy(env, identity);
  const email = humanEmail(identity);
  // An open site, a service token and a removed person have no setup of their own.
  if (policy.state === "unavailable" || policy.state === "denied" || !email) return policyDenied(policy);
  const code = codeState(env, policy, true);
  const origin = new URL(request.url).origin;
  // Before permissions start, everyone keeps every app; the owner always does.
  const apps = policy.state === "current" && policy.role === "employee" ? [...policy.apps.keys()].sort() : businessApps();
  return reply({ identity: { email, subject: identity!.claims.sub },
    role: policy.state === "legacy" ? "employee" : policy.role,
    permissions: policy.state === "current" ? "started" : "not_started",
    // An area with no screen has no card to take a title from, so each title travels with its id.
    apps, titles: Object.fromEntries(apps.map(app => [app, areaTitle(app)])),
    code, prompt: code === "lacked" ? { state: "unavailable", message: "Ask your admin for access to Connect your assistant." }
      : setupPrompt(origin, undefined, code === "ready"), api: "authenticated",
    repository: "manual_provider_setup", memory: "independent_operator_setup" });
}
