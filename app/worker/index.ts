// Verify signed Access identity before all business content; memory keeps its own keys.
import { handleMemory, MEMORY_PREFIX } from "../../.agents/skills/memory/worker/memory-worker.mjs";
import { associateLogin } from "../../.agents/skills/memory/worker/login-link.mjs";
import { handleWalkPictures, WALK_PREFIX } from "../../.agents/skills/verify/worker/walk-pictures.mjs";
import { discovery } from "./api/discovery.ts";
import { API_PREFIX, handleApi } from "./api/router.ts";
import { APP_API, handleApp } from "./apps/index.ts";
import { getAccessIdentity, type AccessEnv, type AccessIdentity } from "./access.ts";
import type { ActivationEnv } from "./employee-access/activation.ts";
import type { ConnectionEnv } from "./employee-access/core.ts";
import { authorizeRequest, type PolicyEnv } from "./employee-access/policy.ts";
import { catalogue } from "./employee-access/apps.ts";
import { handleAccess } from "./employee-access/router.ts";

async function labelMemoryLogin(env: Env, link: string, identity: AccessIdentity | null, open: boolean): Promise<void> {
  if (!open && env.MEMORY_DB && identity?.kind === "user") {
    await associateLogin(env.MEMORY_DB, link, identity).catch(() => false);
  }
}

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

    // Owner activation consumes only a private operator pin and signed identity.
    if (url.pathname.startsWith("/api/access/")) {
      return handleAccess(request, env, identity);
    }

    // Discovery always requires company login, even on an open starter.
    if (["/api/openapi.json", "/api/actions"].includes(url.pathname)) {
      return discovery(request, env, identity);
    }

    // A setup link labels its assistant machine after ordinary human login.
    // Always clean the URL; association failure does not interrupt the app.
    if (url.pathname === "/" && url.searchParams.has("memory_login_link")) {
      await labelMemoryLogin(env, url.searchParams.get("memory_login_link") || "", identity, open);
      return new Response(null, { status: 303, headers: { Location: new URL("/", request.url).href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    }

    // A preview check's kept pictures, served from the verify skill. The route
    // gets the memory bucket alone and reaches only its walks/ folder.
    // wiki/development/staging-walkthrough.md
    if (url.pathname.startsWith(WALK_PREFIX)) {
      return handleWalkPictures(request, env.MEMORY_BUCKET, identity);
    }

    // Mini apps: the home page lists them, so /apps/ goes there. Each app's
    // page is the single-page app's, and /apps/<name>/api/* goes to the app's
    // handler with who is calling. wiki/stack/mini-apps.md
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
    const app = /^\/apps\/([a-z0-9-]+)(?:\/|$)/.exec(url.pathname)?.[1];
    if (app && catalogue.includes(app)) {
      const denied = await authorizeRequest(request, env, identity,
        app === "access" ? { kind: "self-service" } : { apps: [app] });
      if (denied) return denied;
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env & AccessEnv & ActivationEnv & PolicyEnv & ConnectionEnv>;
