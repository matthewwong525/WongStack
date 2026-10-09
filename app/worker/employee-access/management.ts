// Finite core routes, never listed as employee company actions.
import type { AccessIdentity } from "../access.ts";
import { type ConnectionEnv, type Core, AccessError, ownerCore, lease, release, reply } from "./core.ts";
import { accessStatus, changeMember } from "./members.ts";
import { changeRole } from "./roles.ts";
import { catalogueWrites } from "./sets.ts";
import { reconcileLogin } from "./login-management.ts";
import { startKeyLevels, startPermissions } from "./start.ts";
import { boundedJson } from "./json.ts";

// Each save the owner or a manager can make. Only a people save can change who signs in, or who manages.
const saves = new Map([["people", changeMember], ["roles", changeRole]]);

export async function management(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Response> {
  try {
    const path = new URL(request.url).pathname.slice("/api/access/".length);
    if (!["status", "retry", ...saves.keys()].includes(path)) return reply({ error: "Not found" }, 404);
    const core = await ownerCore(request, env, identity);
    if (request.method === "GET") {
      if (path !== "status") return reply({ code: "not_found" }, 404);
      // A read lists every built app and, the first time, starts permissions and then key levels.
      // A manager's read runs the same steps: they take nothing away, and do nothing once run.
      await core.db.batch(catalogueWrites(core));
      await startPermissions(core);
      await startKeyLevels(core);
      return reply(await accessStatus(core));
    }
    if (request.method !== "POST") return reply({ code: "method_not_allowed" }, 405);
    if (path === "status") return reply({ code: "not_found" }, 404);
    const change = saves.get(path);
    if (change) await change(core, await boundedJson(request, 65_536));
    // A people save is committed by now: a busy or failed sign-in step stays pending for Try again.
    // A role or a level changes nobody's sign-in, so those saves call no provider.
    if (path === "people") await reconcile(core).catch(() => {});
    if (path === "retry") await reconcile(core);
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
