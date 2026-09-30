// Verify signed Access identity before all business content; memory keeps its own keys.
import { handleMemory, MEMORY_PREFIX } from "../../.agents/skills/memory/worker/memory-worker.mjs";
import { handleMiniApp, MINI_PREFIX } from "../../mini-apps/router.mjs";
import miniApps from "../../mini-apps/routes.mjs";
import { API_PREFIX, handleApi } from "./api/router.ts";
import { getAccessIdentity, type AccessEnv } from "./access.ts";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Session memory, served from the memory skill on the production Worker's
    // MEMORY_DB and MEMORY_BUCKET; staging binds neither and answers 404. A
    // memory key authenticates each call: wiki/development/memory.md.
    if (url.pathname.startsWith(MEMORY_PREFIX)) {
      return handleMemory(request, env);
    }

    const identity = await getAccessIdentity(request, env);
    if (!identity) {
      const configured = env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD;
      return new Response(configured ? "Unauthorized" : "Workspace access is not configured", {
        status: configured ? 401 : 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Mini apps, from mini-apps/: their pages are in the static assets, and
    // /apps/<name>/api/* goes to the app's handler. wiki/stack/mini-apps.md
    if (url.pathname.startsWith(MINI_PREFIX)) {
      return handleMiniApp(request, env, ctx, miniApps);
    }

    // The app's own API: one handler per route, listed in api/router.ts.
    if (url.pathname.startsWith(API_PREFIX)) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env & AccessEnv>;
