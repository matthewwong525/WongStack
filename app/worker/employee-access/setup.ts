// Every signed-in person gets their own setup prompt; repository and memory remain separate.
import type { AccessIdentity } from "../access.ts";
import { type ConnectionEnv, reply } from "./core.ts";
import { setupPrompt } from "./prompt.ts";
import { businessApps } from "./sets.ts";
import { currentPolicy, humanEmail, policyDenied } from "./policy.ts";
export async function setupStatus(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Response> {
  if (request.method !== "GET") return reply({ code: "method_not_allowed" }, 405);
  const policy = await currentPolicy(env, identity);
  const email = humanEmail(identity);
  // An open site, a service token and a removed person have no setup of their own.
  if (policy.state === "unavailable" || policy.state === "denied" || !email) return policyDenied(policy);
  return reply({ identity: { email, subject: identity!.claims.sub },
    role: policy.state === "legacy" ? "employee" : policy.role,
    permissions: policy.state === "current" ? "started" : "not_started",
    // Before permissions start, everyone keeps every app; the owner always does.
    apps: policy.state === "current" && policy.role === "employee" ? [...policy.apps].sort() : businessApps(),
    prompt: setupPrompt(new URL(request.url).origin), api: "authenticated",
    repository: "manual_provider_setup", memory: "independent_operator_setup" });
}
