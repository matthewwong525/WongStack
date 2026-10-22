// Verify signed Access identity before all business content; memory and git check the same sign-in themselves.
import { handleMemory, MEMORY_PREFIX } from "../../.agents/skills/memory/worker/memory-worker.mjs";
import { handleWalkPictures, WALK_PREFIX } from "../../.agents/skills/verify/worker/walk-pictures.mjs";
import { discovery } from "./api/discovery.ts";
import { API_PREFIX, handleApi } from "./api/router.ts";
import { services } from "./api/services.ts";
import { APP_API, handleApp } from "./apps/index.ts";
import { getAccessIdentity, type AccessEnv } from "./access.ts";
import { memoryCaller } from "./memory-caller.ts";
import type { ConnectionEnv } from "./employee-access/core.ts";
import { appPageDenied } from "./employee-access/apps.ts";
import { CODE_GIT, gitSignIn } from "./employee-access/code.ts";
import { SETUP_PATH } from "./employee-access/prompt.ts";
import { refreshOnSchedule } from "./employee-access/pushers.ts";
import { handleAccess } from "./employee-access/router.ts";
import { setupFile } from "./employee-access/setup-file.ts";

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

    const identity = await getAccessIdentity(request, env);
    // Open without login only by the committed switch, and only while no Access
    // identifier is set: a leftover switch can't weaken a private site.
    const open = env.WORKSPACE_LOGIN === "off" && !env.CF_ACCESS_TEAM_DOMAIN && !env.CF_ACCESS_AUD;
    if (!identity && !open) {
      const configured = env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD;
      // Git's route skips the edge sign-in, so its sign-in is checked here: wiki/stack/cloudflare-access.md
      if (configured && url.pathname.startsWith(CODE_GIT)) return gitSignIn(url.origin);
      return new Response(configured ? "Unauthorized" : "Workspace access is not configured", {
        status: configured ? 401 : 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // People management answers only the signed-in owner; setup readback answers each person.
    if (url.pathname.startsWith("/api/access/")) {
      return handleAccess(request, env, identity, ctx.waitUntil.bind(ctx));
    }

    // Discovery always requires company login, even on an open starter.
    if (["/api/openapi.json", "/api/actions"].includes(url.pathname)) {
      return discovery(request, env, identity);
    }
    if (url.pathname === "/api/services") {
      return services(request, env, identity);
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
      return handleApi(request, env, identity);
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
