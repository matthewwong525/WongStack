// Finite core routes, never listed as employee company actions.
import type { AccessIdentity } from "../access.ts";
import { type ConnectionEnv, type Core, AccessError, ownerCore, lease, release, reply } from "./core.ts";
import { accessStatus, changeMember } from "./members.ts";
import { connectLogin, reconcileLogin } from "./login-management.ts";
import { boundedJson } from "./json.ts";
import { prepare, rollout } from "./rollout.ts";

export async function management(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Response> {
  try {
    const path = new URL(request.url).pathname.slice("/api/access/".length);
    if (!["status", "people", "login/connect", "prepare", "rollout", "retry"].includes(path)) return reply({ error: "Not found" }, 404);
    const core = await ownerCore(request, env, identity);
    if (request.method === "GET") {
      if (path === "status") return reply(await accessStatus(core));
      return reply({ code: "not_found" }, 404);
    }
    if (request.method !== "POST") return reply({ code: "method_not_allowed" }, 405);
    if (path === "people") {
      await changeMember(core, await boundedJson(request, 65_536));
      return reply({ code: "access_saved", providerWork: "pending" });
    }
    const holder = await lease(core);
    core.holder = holder;
    try {
      return await ownerOperation(path, core);
    } finally { await release(core, holder); }
  } catch (error) {
    return reply({ code: error instanceof AccessError ? error.code : "access_unavailable" }, error instanceof AccessError ? error.status : 503);
  }
}
async function ownerOperation(path: string, core: Core): Promise<Response> {
  if (path === "login/connect") await connectLogin(core);
  else if (path === "prepare") await prepare(core);
  else if (path === "rollout") await rollout(core);
  else if (path === "retry") {
    // Independent outcomes survive a failure in either other provider surface.
    for (const operation of [() => reconcileLogin(core, "policy"), () => reconcileLogin(core, "sessions")]) {
      try { await operation(); } catch { /* missing connection remains honestly pending */ }
    }
  } else return reply({ code: "not_found" }, 404);
  return reply(await accessStatus(core));
}
