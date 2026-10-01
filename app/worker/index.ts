// Verify signed Access identity before all business content; memory keeps its own keys.
import { handleMemory, MEMORY_PREFIX } from "../../.agents/skills/memory/worker/memory-worker.mjs";
import { API_PREFIX, handleApi } from "./api/router.ts";
import { APP_API, handleApp } from "./apps/index.ts";
import { getAccessIdentity, type AccessEnv } from "./access.ts";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Session memory, served from the memory skill on the production Worker's
    // MEMORY_DB and MEMORY_BUCKET; staging binds neither and answers 404. A
    // memory key authenticates each call: wiki/development/memory.md.
    if (url.pathname.startsWith(MEMORY_PREFIX)) {
      return handleMemory(request, env);
    }

    const identity = await getAccessIdentity(request, env);
    // Open without login only by the committed switch, and only while no Access
    // identifier is set: a leftover switch can't weaken a private site.
    const open = env.WORKSPACE_LOGIN === "off" && !env.CF_ACCESS_TEAM_DOMAIN && !env.CF_ACCESS_AUD;
    if (!identity && !open) {
      const configured = env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD;
      return new Response(configured ? "Unauthorized" : "Workspace access is not configured", {
        status: configured ? 401 : 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Mini apps: the home page lists them, so /apps/ goes there. Each app's
    // page is the single-page app's, and /apps/<name>/api/* goes to the app's
    // handler with who is calling. wiki/stack/mini-apps.md
    if (url.pathname === "/apps/") {
      return Response.redirect(new URL("/", request.url), 302);
    }
    if (APP_API.test(url.pathname)) {
      return handleApp(request, env, identity);
    }

    // The app's own API: one handler per route, listed in api/router.ts.
    if (url.pathname.startsWith(API_PREFIX)) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env & AccessEnv>;
