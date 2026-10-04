// Finite core operations keep people management and setup readback out of discovery.
import type { AccessIdentity } from "../access.ts";
import { appAccess } from "./apps.ts";
import { setupStatus } from "./setup.ts";
import { management } from "./management.ts";
import type { ConnectionEnv } from "./core.ts";

export async function handleAccess(request: Request, env: ConnectionEnv,
  identity: AccessIdentity | null): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/access/setup") return setupStatus(request, env, identity);
  if (path === "/api/access/apps") return appAccess(request, env, identity);
  return management(request, env, identity);
}
