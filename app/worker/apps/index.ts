// Every mini app's server side. `worker/index.ts` sends /apps/<name>/api/<route>
// here, and the handler `apps/<name>/api.ts` lists for "<METHOD> <route>"
// answers it. Vite finds each app's api.ts at build time, so a new app needs
// no edit here. wiki/stack/mini-apps.md
import { dispatch, registrations, type Route } from "../api/contract.ts";
import type { AccessIdentity } from "../access.ts";
import type { PolicyEnv } from "../employee-access/policy.ts";

type MemoryBindings = "MEMORY_DB" | "MEMORY_BUCKET" | "WONG_ACCESS_ACTIVATION";

/**
 * Everything the Worker has but the memory store: the database, saved keys, and settings.
 * @public
 */
export type AppEnv = Omit<Env, MemoryBindings> & PolicyEnv;

/**
 * What a handler knows about its call. `identity` is null only on an open workspace.
 * @public
 */
export type AppCall = { url: URL; route: string; identity: AccessIdentity | null };

/**
 * One route's handler, listed in an app's api.ts.
 * @public
 */
export type AppHandler = (request: Request, env: AppEnv, call: AppCall) => Response | Promise<Response>;

/** An address the app API answers: /apps/<name>/api, then a route. */
export const APP_API = /^\/apps\/([^/]+)\/api(?:\/(.*))?$/;

// Each app's routes, keyed "METHOD route". Maps, not objects, so a route or an
// app named `constructor` can't reach a property every object inherits.
const apps = new Map(
  Object.entries(import.meta.glob<{ routes: Map<string, Route> }>("./*/api.ts", { eager: true })).map(
    ([path, module]) => [path.split("/")[1], module.routes],
  ),
);

export const appActions = [...apps].flatMap(([name, routes]) => registrations(routes, name));

/**
 * Answer an app API call. The handler gets a copy of the env without the
 * memory store's bindings, and the Worker's `disallow_importable_env` flag
 * stops it importing them. It still runs in the Worker that serves memory, so
 * this stops mistakes, not code written to get around it.
 */
export function handleApp(request: Request, env: Env & PolicyEnv, identity: AccessIdentity | null): Response | Promise<Response> {
  const url = new URL(request.url);
  const [, name = "", route = ""] = APP_API.exec(url.pathname) ?? [];
  const handler = apps.get(name)?.get(`${request.method} ${route}`);
  if (!handler) return Response.json({ error: "Not found" }, { status: 404 });

  // Typed so the copy compiles before setup binds a memory store, too.
  const appEnv: AppEnv & Partial<Record<MemoryBindings, unknown>> = { ...env };
  delete appEnv.MEMORY_DB;
  delete appEnv.MEMORY_BUCKET;
  delete appEnv.WONG_ACCESS_ACTIVATION;
  return dispatch(handler, request, appEnv, { url, route, identity }, { apps: [name] });
}
