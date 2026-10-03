// Business content uses Access; the strict production memory API uses machine grants.
import { handleMemory, MEMORY_PREFIX } from "../../.agents/skills/memory/worker/memory-worker.mjs";
import { handleWalkPictures, WALK_PREFIX } from "../../.agents/skills/verify/worker/walk-pictures.mjs";
import { API_PREFIX, handleApi } from "./api/router.ts";
import { APP_API, handleApp } from "./apps/index.ts";
import { getAccessIdentity, type AccessEnv } from "./access.ts";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // All reserved prefixes, including encoded forms, stay with the closed core.
    let memoryPath = url.pathname;
    let segment = memoryPath.split("/")[1] ?? "";
    for (let depth = 0; depth < 32; depth++) {
      if (memoryPath.startsWith(MEMORY_PREFIX) || segment.startsWith(MEMORY_PREFIX.slice(1))) return handleMemory(request, env);
      let decoded = memoryPath;
      let decodedSegment = segment;
      try { decoded = decodeURIComponent(memoryPath); } catch { /* inspect prefix independently */ }
      try { decodedSegment = decodeURIComponent(segment); } catch { /* malformed prefix stays closed below */ }
      if (decoded === memoryPath && decodedSegment === segment) break;
      memoryPath = decoded;
      segment = decodedSegment;
      if (depth === 31) return new Response("Not found", {status:404,headers:{"Cache-Control":"no-store"}});
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
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env & AccessEnv>;
