// The hello app's API. The mini-app Worker sends every request under
// /hello/api/ here. Export an object with a fetch method, like a Worker.
// Plain JavaScript on purpose: `node --test` runs it on any Node, with no
// build and no type stripping. `env.DB` is the shared database: staging on a
// preview, production once saved.

export default {
	/** @param {Request} request */
	async fetch(request) {
		const url = new URL(request.url);
		// The path is /<app>/api/<route>. Match the route only, so a copy of
		// this folder under another name still works.
		const route = url.pathname.split("/api/")[1];

		if (request.method === "GET" && route === "greeting") {
			const name = (url.searchParams.get("name") ?? "").trim().slice(0, 40) || "world";
			return Response.json({ message: `Hello, ${name}!` });
		}
		return Response.json({ error: "Not found" }, { status: 404 });
	},
};
