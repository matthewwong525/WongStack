// Finite core operations keep owner activation and employee readback out of discovery.
import type { AccessIdentity } from "../access.ts";
import { activateAccess, type ActivationEnv } from "./activation.ts";
import { activationIdentity } from "./identity.ts";
import { authorizeRequest, type PolicyEnv } from "./policy.ts";
import { appAccess } from "./apps.ts";

export async function handleAccess(request: Request, env: ActivationEnv & PolicyEnv,
  identity: AccessIdentity | null): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/access/activate") return activateAccess(request, env, identity);
  if (path === "/api/access/apps") return appAccess(request, env, identity);
  if (path === "/api/access/identity") {
    const denied = await authorizeRequest(request, env, identity, { kind: "self-service" });
    return denied ?? activationIdentity(request, env, identity);
  }
  return Response.json({ error: "Not found" }, { status: 404 });
}
