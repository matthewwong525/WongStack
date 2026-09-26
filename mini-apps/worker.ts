/**
 * The mini-app Worker. It serves every app under `apps/` from one small Worker:
 *
 *   /                    the dashboard, `apps/index.html`
 *   /<name>/             the app's pages, from `apps/<name>/`
 *   /<name>/api/*        the app's handler, `apps/<name>/api.mjs`, when it has one
 *
 * `scripts/mini-dashboard.mjs` writes the route table `apps/routes.gen.ts`
 * before every upload or deploy. Its default export maps each app folder name
 * to the default export of that app's `api.mjs`, which has the shape of a
 * Worker: `{ fetch(request, env, ctx) }`.
 *
 * A preview carries `PREVIEW_EXPIRES` (epoch ms, seven days after its upload).
 * Once that time passes, every request gets 410 and a short page. Production
 * carries no expiry.
 */
import routes from "./apps/routes.gen.ts";

export interface Env {
	ASSETS: { fetch(request: Request): Promise<Response> };
	DB?: unknown;
	PREVIEW_EXPIRES?: string;
}

export interface Context {
	waitUntil(promise: Promise<unknown>): void;
}

/** The default export of an app's `api.mjs`. */
export interface AppApi {
	fetch(request: Request, env: Env, ctx: Context): Response | Promise<Response>;
}

export type Routes = Record<string, AppApi>;

const EXPIRED_PAGE = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview expired</title>
<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5">
<h1>Preview expired</h1>
<p>This preview expired. Ask the agent to rebuild it.</p>
</body>
</html>
`;

/** Source files and tests. `.assetsignore` keeps them out of the upload; this refuses them again. */
const SOURCE = /\.[cm]?ts$|\.test\.[cm]?js$|\/api\.mjs$/i;

/** An expiry that is set but not a number counts as passed: fail closed. */
function expired(expires: string | undefined): boolean {
	return expires !== undefined && expires !== "" && !(Date.now() <= Number(expires));
}

function notFound(): Response {
	return new Response("Not found", { status: 404 });
}

/** The request handler, with the route table as a parameter so a test can pass its own. */
export async function handle(request: Request, env: Env, ctx: Context, table: Routes): Promise<Response> {
	if (expired(env.PREVIEW_EXPIRES)) {
		return new Response(EXPIRED_PAGE, {
			status: 410,
			headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
		});
	}

	let path: string;
	try {
		path = decodeURIComponent(new URL(request.url).pathname);
	} catch {
		return notFound();
	}
	if (SOURCE.test(path)) return notFound();

	const name = /^\/([^/]+)\/api(?:\/|$)/.exec(path)?.[1];
	if (name && Object.hasOwn(table, name)) return table[name].fetch(request, env, ctx);

	return env.ASSETS.fetch(request);
}

export default {
	fetch(request: Request, env: Env, ctx: Context): Promise<Response> {
		return handle(request, env, ctx, routes);
	},
};
