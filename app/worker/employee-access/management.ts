// Finite core routes, never listed as employee company actions.
import type { AccessIdentity } from "../access.ts";
import { type ConnectionEnv, type Core, AccessError, ownerCore, lease, release, reply } from "./core.ts";
import { accessStatus, catalogueWrites, changeMember } from "./members.ts";
import { reconcileLogin } from "./login-management.ts";
import { startPermissions } from "./start.ts";
import { boundedJson } from "./json.ts";

export async function management(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Response> {
  try {
    const path = new URL(request.url).pathname.slice("/api/access/".length);
    if (!["status", "people", "retry"].includes(path)) return reply({ error: "Not found" }, 404);
    const core = await ownerCore(request, env, identity);
    if (request.method === "GET") {
      if (path !== "status") return reply({ code: "not_found" }, 404);
      // An owner read lists every built app and, the first time, starts permissions.
      await core.db.batch(catalogueWrites(core));
      await startPermissions(core);
      return reply(await accessStatus(core));
    }
    if (request.method !== "POST") return reply({ code: "method_not_allowed" }, 405);
    if (path === "status") return reply({ code: "not_found" }, 404);
    if (path === "people") {
      await changeMember(core, await boundedJson(request, 65_536));
      // The save is committed. A busy or failed sign-in step stays pending for Try again.
      await reconcile(core).catch(() => {});
    } else await reconcile(core);
    return reply(await accessStatus(core));
  } catch (error) {
    return reply({ code: error instanceof AccessError ? error.code : "access_unavailable" }, error instanceof AccessError ? error.status : 503);
  }
}

/** Bring the sign-in list and open sessions to the saved people, under the lease. */
async function reconcile(core: Core): Promise<void> {
  // A preview keeps a practice list: no lease, no provider call.
  if (!core.live) return;
  const holder = await lease(core);
  core.holder = holder;
  try {
    // Each outcome is independent: a failed list change does not stop the session step.
    await reconcileLogin(core, "policy");
    await reconcileLogin(core, "sessions");
  } finally { await release(core, holder); }
}
