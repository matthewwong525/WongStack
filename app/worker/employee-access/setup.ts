// Each person's own setup: the one setup message for everyone who may connect, and none for someone who lacks
// Project code. Setup itself decides what a person receives when it runs.
import type { AccessIdentity } from "../access.ts";
import { type ConnectionEnv, reply } from "./core.ts";
import { codeState } from "./code.ts";
import { businessName, setupMessage } from "./prompt.ts";
import { appTitle } from "./catalogue.ts";
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
  // Before permissions start, everyone keeps every app; the owner and an Admin always do.
  // Access itself is nobody's to list.
  const apps = policy.state === "current" ? businessApps().filter(app => policy.apps.has(app)) : businessApps();
  return reply({ identity: { email, subject: identity!.claims.sub },
    role: policy.state === "legacy" ? "employee" : policy.role,
    permissions: policy.state === "current" ? "started" : "not_started",
    // Each app's title travels with its id, so the popup names apps as Home does.
    apps, titles: Object.fromEntries(apps.map(app => [app, appTitle(app)])),
    code, prompt: code === "lacked" ? { state: "unavailable", message: "Ask your admin for access to Connect your assistant." }
      : { state: "ready", text: setupMessage(origin, businessName(env, origin)) }, api: "authenticated",
    repository: "manual_provider_setup", memory: "independent_operator_setup" });
}
