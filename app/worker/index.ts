// This Worker is PUBLIC and deliberately enforces no identity.
//
// Do not enforce here until Cloudflare Access is actually in front of every
// hostname that reaches this Worker: on a public Worker, `Cf-Access-
// Authenticated-User-Email` is just a request header — any caller can set it to
// any address and become any user. Enforcement and the login wall are adopted in
// the same step, in that order: wiki/stack/cloudflare-access.md
//
// When you do adopt it, use `./access.ts` — it ships beside this file, inert.
// It VERIFIES the signed `Cf-Access-Jwt-Assertion` rather than trusting a plain
// header, which is what makes it correct for machine callers too: Access sets no
// email header for a service token, so the header pattern 401s CI and /verify.
import { handleMemory, MEMORY_PREFIX } from "../../.agents/skills/memory/worker/memory-worker.mjs";
import { handleMiniApp, MINI_PREFIX } from "../../mini-apps/router.mjs";
import miniApps from "../../mini-apps/routes.mjs";
import { API_PREFIX, handleApi } from "./api/router.ts";

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Session memory, served from the memory skill on the production Worker's
    // MEMORY_DB and MEMORY_BUCKET; staging binds neither and answers 404. A
    // memory key authenticates each call: wiki/development/memory.md.
    if (url.pathname.startsWith(MEMORY_PREFIX)) {
      return handleMemory(request, env);
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
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
