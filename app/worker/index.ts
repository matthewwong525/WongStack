// This Worker is PUBLIC and deliberately trusts no identity header.
//
// Do not read `Cf-Access-Authenticated-User-Email` here until Cloudflare Access
// is actually in front of every hostname that reaches this Worker. Without the
// Access proxy, that header is just a request header — any caller can set it to
// any address and become any user. The header-trust code and the login wall are
// adopted together: wiki/stack/cloudflare-access.md
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
