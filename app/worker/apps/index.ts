// Every mini app's server side. `worker/index.ts` sends /apps/<name>/api/<route>
// here, and the handler `apps/<name>/api.ts` lists for "<METHOD> <route>"
// answers it. Vite finds each app's api.ts at build time, so a new app needs
// no edit here. wiki/stack/mini-apps.md
import { dispatch, keyUses, registrations, type Route } from "../api/contract.ts";
import type { AccessIdentity } from "../access.ts";
import { serverFolders } from "../employee-access/catalogue.ts";
import type { PolicyEnv } from "../employee-access/policy.ts";

// The memory store and the sign-in list key: a mini app is handed neither.
type MemoryBindings = "MEMORY_DB" | "MEMORY_BUCKET" | "WONG_ACCESS_LOGIN_MANAGEMENT";

/**
 * Everything the Worker has but the memory store: the database, settings, and the saved keys
 * the route lists.
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

// Each app's routes, keyed "METHOD route", and the saved keys its api.ts exports as `keys`:
// its bare handlers, and its actions that list none, get those. Maps, not objects, so a route
// or an app named `constructor` can't reach a property every object inherits. A folder with no screen
// also exports a `title` and a `description`: Access lists it by them.
type AppModule = { routes: Map<string, Route>; keys?: readonly string[]; title?: unknown; description?: unknown };
const apps = new Map(
  Object.entries(import.meta.glob<AppModule>("./*/api.ts", { eager: true })).map(
    ([path, module]) => [path.split("/")[1], module],
  ),
);

// Each folder is an area a person can be given, screen or not: the catalogue is handed them here.
serverFolders(apps);

export const appActions = [...apps].flatMap(([name, { routes, keys }]) => registrations(routes, name, undefined, keys));
export const appKeyUse = [...apps].flatMap(([name, { routes, keys }]) => keyUses(routes, name, undefined, keys));

/**
 * Answer an app API call. The handler gets a copy of the env without the
 * memory store's bindings and with only the saved keys its route lists, and
 * the Worker's `disallow_importable_env` flag stops it importing the rest. It
 * still runs in the Worker that serves memory, so this stops mistakes, not
 * code written to get around it.
 */
export function handleApp(request: Request, env: Env & PolicyEnv, identity: AccessIdentity | null): Response | Promise<Response> {
  const url = new URL(request.url);
  const [, name = "", route = ""] = APP_API.exec(url.pathname) ?? [];
  const app = apps.get(name);
  const handler = app?.routes.get(`${request.method} ${route}`);
  if (!handler) return Response.json({ error: "Not found" }, { status: 404 });

  // Typed so the copy compiles before setup binds a memory store, too.
  const appEnv: AppEnv & Partial<Record<MemoryBindings, unknown>> = { ...env };
  delete appEnv.MEMORY_DB;
  delete appEnv.MEMORY_BUCKET;
  delete appEnv.WONG_ACCESS_LOGIN_MANAGEMENT;
  return dispatch(handler, request, appEnv, { url, route, identity }, { apps: [name], keys: app!.keys });
}
