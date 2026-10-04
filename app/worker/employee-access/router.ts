// Finite core operations keep owner activation and employee readback out of discovery.
import type { AccessIdentity } from "../access.ts";
import { activateAccess, type ActivationEnv } from "./activation.ts";
import { activationIdentity } from "./identity.ts";
import { authorizeRequest, type PolicyEnv } from "./policy.ts";
import { appAccess } from "./apps.ts";
import { setupStatus } from "./setup.ts";
import { management } from "./management.ts";
import { ownerCore, type ConnectionEnv } from "./core.ts";

export async function handleAccess(request: Request, env: ActivationEnv & PolicyEnv & ConnectionEnv,
  identity: AccessIdentity | null): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/access/activate") return activateAccess(request, env, identity);
  if (path === "/api/access/setup") return setupStatus(request, env, identity);
  if (path === "/api/access/apps") return appAccess(request, env, identity);
  if (path === "/api/access/identity") {
    // A verified pinned owner can finish rollout while employee policy is closed.
    try { await ownerCore(request, env, identity); return activationIdentity(request, env, identity); }
    catch { /* unactivated installs and employees use the existing self-service guard */ }
    const denied = await authorizeRequest(request, env, identity, { kind: "self-service" });
    return denied ?? activationIdentity(request, env, identity);
  }
  return management(request, env, identity);
}
