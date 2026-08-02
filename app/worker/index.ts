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
// email header for a service token, so the header pattern 401s CI and /walk.
export default {
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
      });
    }
		return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
