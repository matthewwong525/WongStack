/**
 * The mini-app route, served by the main app's Worker. `app/worker/index.ts`
 * sends every request under `/apps/` here:
 *
 *   /apps/                  a redirect to the landing page, which lists the apps
 *   /apps/<name>/           the app's pages, copied into the build's assets
 *   /apps/<name>/api/*      the app's handler, `apps/<name>/api.mjs`, when it has one
 *
 * `scripts/mini-dashboard.mjs` copies each app's pages and writes the list's data
 * after every build. `routes.mjs` maps each app folder to its handler. Plain
 * JavaScript, so `node --test` runs this file with no build.
 */

export const MINI_PREFIX = "/apps/";

/** Source files and tests. The build never copies them; this refuses them again. */
const SOURCE = /\.[cm]?ts$|\.test\.[cm]?js$|\/api\.mjs$/i;

const notFound = () => new Response("Not found", { status: 404 });

/**
 * A handler gets the app database and nothing else, and the Worker's
 * `disallow_importable_env` flag stops it importing the rest. It still runs in
 * the Worker that serves the memory store, so its code is reviewed before it
 * publishes, like any Worker code.
 */
export function handleMiniApp(request, env, ctx, routes) {
	let path;
	try {
		path = decodeURIComponent(new URL(request.url).pathname);
	} catch {
		return notFound();
	}
	if (SOURCE.test(path)) return notFound();
	if (path === MINI_PREFIX) return Response.redirect(new URL("/", request.url), 302);

	const name = /^\/apps\/([^/]+)\/api(?:\/|$)/.exec(path)?.[1];
	if (name && Object.hasOwn(routes, name)) return routes[name].fetch(request, { DB: env.DB }, ctx);

	return env.ASSETS.fetch(request);
}
