// The hello app's API. The main app's Worker sends every request under
// /apps/hello/api/ here. Export an object with a fetch method, like a Worker.
// Plain JavaScript on purpose: `node --test` runs it on any Node, with no
// build and no type stripping. `env.DB` is the shared database: staging on a
// preview, production once saved.
//
// A new route is a handler below and one entry in `routes`. Handlers stay in
// this file: the build publishes every other .mjs file in the folder as a page.

/** GET greeting?name=Ada → { message: "Hello, Ada!" } */
function greeting(request, url) {
	const name = (url.searchParams.get("name") ?? "").trim().slice(0, 40) || "world";
	return Response.json({ message: `Hello, ${name}!` });
}

// Keyed "METHOD route". A Map, not an object, so a route like `constructor`
// can not reach a property every object inherits.
const routes = new Map([["GET greeting", greeting]]);

export default {
	/** @param {Request} request */
	async fetch(request, env) {
		const url = new URL(request.url);
		// The path is /apps/<app>/api/<route>. Match the route only, so a copy of
		// this folder under another name still works.
		const route = url.pathname.split("/api/")[1];
		const handler = routes.get(`${request.method} ${route}`);
		return handler ? handler(request, url, env) : Response.json({ error: "Not found" }, { status: 404 });
	},
};
