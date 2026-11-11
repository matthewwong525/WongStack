// Verify signed Access identity before all business content; memory and git check the same sign-in themselves.
import { handleMemory, MEMORY_PREFIX } from "../../.agents/memory/d1/store.mjs";
import { handleWalkPictures, WALK_PREFIX } from "../../.agents/skills/verify/worker/walk-pictures.mjs";
import { discovery } from "./api/discovery.ts";
import { API_PREFIX, handleApi } from "./api/router.ts";
import { services } from "./api/services.ts";
import { APP_API, handleApp } from "./apps/index.ts";
import { PUBLIC_KNOWLEDGE, publicKnowledge } from "./apps/knowledge/public.ts";
import { getAccessIdentity, type AccessEnv, type AccessIdentity } from "./access.ts";
import { memoryCaller } from "./memory-caller.ts";
import type { ConnectionEnv } from "./employee-access/core.ts";
import { appPageDenied } from "./employee-access/apps.ts";
import { withTools } from "./employee-access/key-levels.ts";
import { humanEmail } from "./employee-access/policy.ts";
import { CODE_GIT, gitSignIn } from "./employee-access/code.ts";
import { KNOWLEDGE_GIT } from "./employee-access/knowledge.ts";
import { knowledgeReader } from "./employee-access/knowledge-reader.ts";
import { SETUP_PATH } from "./employee-access/prompt.ts";
import { refreshOnSchedule } from "./employee-access/pushers.ts";
import { handleAccess } from "./employee-access/router.ts";
import { setupFile } from "./employee-access/setup-file.ts";

/** The bindings with this request's registry, for a route that reads keys: the code's keys and the tools added from a
 *  chat. Only a signed-in person's request reads those tools: a machine is refused before anything is read. */
const keyed = async <E extends Parameters<typeof withTools>[0]>(env: E, identity: AccessIdentity | null, reads = true): Promise<E> =>
  reads && humanEmail(identity) ? withTools(env) : env;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // The setup file Connect your assistant names: public, no key in it. It sits under the memory prefix, the one
    // opening every install's sign-in wall already has: wiki/stack/employee-project.md
    if (url.pathname === SETUP_PATH) {
      return setupFile(request);
    }

    // Session memory, served by the memory skill from production's MEMORY_DB and MEMORY_BUCKET; staging binds
    // neither and answers 404. The company sign-in authenticates each call: wiki/development/memory.md.
    if (url.pathname.startsWith(MEMORY_PREFIX)) {
      return handleMemory(request, env, memoryCaller);
    }

    // Company knowledge's pages marked public, and only those, open with no sign-in: wiki/stack/knowledge-reader.md
    if (url.pathname.startsWith(PUBLIC_KNOWLEDGE)) {
      return publicKnowledge(request, knowledgeReader(env));
    }

    const identity = await getAccessIdentity(request, env);
    // Open without login only by the committed switch, and only while no Access
    // identifier is set: a leftover switch can't weaken a private site.
    const open = env.WORKSPACE_LOGIN === "off" && !env.CF_ACCESS_TEAM_DOMAIN && !env.CF_ACCESS_AUD;
    if (!identity && !open) {
      const configured = env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD;
      // Git's routes skip the edge sign-in, so their sign-in is checked here: wiki/stack/cloudflare-access.md
      if (configured && [CODE_GIT, KNOWLEDGE_GIT].some(prefix => url.pathname.startsWith(prefix))) return gitSignIn(url.origin);
      return new Response(configured ? "Unauthorized" : "Workspace access is not configured", {
        status: configured ? 401 : 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // People management answers only the signed-in owner; setup readback answers each person.
    if (url.pathname.startsWith("/api/access/")) {
      return handleAccess(request, await keyed(env, identity), identity, ctx.waitUntil.bind(ctx));
    }

    // Discovery always requires company login, even on an open starter.
    if (["/api/openapi.json", "/api/actions"].includes(url.pathname)) {
      return discovery(request, await keyed(env, identity), identity);
    }
    if (url.pathname === "/api/services") {
      return services(request, await keyed(env, identity), identity);
    }

    // A preview check's kept pictures, served from the verify skill. The route gets the memory bucket alone and
    // reaches only its walks/ folder: wiki/development/staging-walkthrough.md
    if (url.pathname.startsWith(WALK_PREFIX)) {
      return handleWalkPictures(request, env.MEMORY_BUCKET, identity);
    }

    // Mini apps: the home page lists them, so /apps/ goes there. Each app's page is the single-page app's, and
    // /apps/<name>/api/* goes to the app's handler with who is calling. wiki/stack/mini-apps.md
    if (url.pathname === "/apps/") {
      return Response.redirect(new URL("/", request.url).href, 302);
    }
    if (APP_API.test(url.pathname)) {
      return handleApp(request, env, identity);
    }

    // The app's own API: one handler per route, listed in api/router.ts.
    if (url.pathname.startsWith(API_PREFIX)) {
      return handleApi(request, await keyed(env, identity, url.pathname.startsWith("/api/direct/")), identity);
    }
    const denied = await appPageDenied(request, env, identity);
    if (denied) return denied;
    return env.ASSETS.fetch(request);
  },

  // Every 15 minutes on the live app alone: who can push on GitHub joins the previews' sign-in list.
  // Staging's schedule is empty, and a preview never reads GitHub: wiki/stack/preview-access.md
  async scheduled(_controller, env) {
    await refreshOnSchedule(env);
  },
} satisfies ExportedHandler<Env & AccessEnv & ConnectionEnv>;
