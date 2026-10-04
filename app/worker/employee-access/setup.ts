// Self-service proves current API authority; repository and memory remain separate.
import type { AccessIdentity } from "../access.ts";
import { type ConnectionEnv, reply } from "./core.ts";
import { setupPrompt } from "./prompt.ts";
import { catalogue } from "./apps.ts";
import { currentPolicy, policyDenied } from "./policy.ts";
export async function setupStatus(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Response> {
  if (request.method !== "GET") return reply({ code: "method_not_allowed" }, 405);
  const policy = await currentPolicy(request, env, identity);
  if (policy.state !== "current" || !identity) return policyDenied(policy);
  return reply({ identity: { email: identity.id.trim().toLowerCase(), subject: identity.claims.sub },
    role: policy.role, revision: policy.revision, apps: policy.role === "owner" ? catalogue.filter(app => app !== "access") : [...policy.apps],
    prompt: setupPrompt(new URL(request.url).origin), api: "authenticated",
    repository: "manual_provider_setup", memory: "independent_operator_setup" });
}
