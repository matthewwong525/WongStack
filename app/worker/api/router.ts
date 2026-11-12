// The app's API. `worker/index.ts` sends every request under /api/ here.
// A new route is a handler file in this folder and one entry in `routes`.
import { health } from "./health.ts";
import { cloudflareRead } from "./cloudflare.ts";
import { forwardRoutes } from "./forward.ts";
import { dispatch, keyUses, registrations, type Route } from "./contract.ts";
import { registryOf, type AccessIdentity, type PolicyEnv, type RouteAccess } from "../access-slots.ts";
import { chatTools } from "../../../.agents/skills/access/server/levels.mjs";
import { keys } from "../keys.ts";

export const API_PREFIX = "/api/";

// Each key whose service is set up for direct use gets its two routes from the registry, with their mappings:
// POST /api/direct/<key>/read and /change. No key ships set up, so a new install has none.
const direct = forwardRoutes(keys);

// Keyed "METHOD /path". A Map, not an object, so a path like /api/constructor
// can not reach a property every object inherits.
const routes = new Map<string, Route>([["GET /api/health", health], ["GET /api/cloudflare/read", cloudflareRead], ...direct.routes]);

// Map every custom main route here: { apps: ["orders"], keys: ["stripe"] }, each app a built folder under src/apps/.
// { keys: ["cloudflare"] } asks that key's level alone. Once permissions start, unmapped denies all but the owner.
const routeAccess = new Map<string, RouteAccess>([
  ["GET /api/health", { kind: "infrastructure" }],
  ["GET /api/cloudflare/read", { keys: ["cloudflare"] }],
  ...direct.access,
]);

export const mainRouteInventory = () => [...routes.keys()].map(route => ({ route, access: routeAccess.get(route) }));

export const apiActions = registrations(routes, "main", routeAccess);
export const apiKeyUse = keyUses(routes, "main", routeAccess);

/** The direct routes of the tools added from a chat, built from the request's registry: the same actions as a code
 *  key's. wiki/stack/connect-your-tools.md */
const toolRoutes = (env: object) => forwardRoutes(chatTools(registryOf(env)));
export const toolActions = (env: object) => { const tools = toolRoutes(env); return registrations(tools.routes, "main", tools.access); };

export function handleApi(request: Request, env: Env & PolicyEnv, identity: AccessIdentity | null = null): Response | Promise<Response> {
  const url = new URL(request.url);
  const key = `${request.method} ${url.pathname}`;
  const tools = routes.has(key) || !url.pathname.startsWith("/api/direct/") ? null : toolRoutes(env);
  const handler = routes.get(key) ?? tools?.routes.get(key);
  const access = routeAccess.get(key) ?? tools?.access.get(key);
  return handler ? dispatch(handler, request, env, { url, route: url.pathname, identity }, access) : Response.json({ error: "Not found" }, { status: 404 });
}
