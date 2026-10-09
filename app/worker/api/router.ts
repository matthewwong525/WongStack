// The app's API. `worker/index.ts` sends every request under /api/ here.
// A new route is a handler file in this folder and one entry in `routes`.
import { health } from "./health.ts";
import { cloudflareRead } from "./cloudflare.ts";
import { forwardRoutes } from "./forward.ts";
import { dispatch, keyUses, registrations, type Route } from "./contract.ts";
import type { AccessIdentity } from "../access.ts";
import type { PolicyEnv, RouteAccess } from "../employee-access/policy.ts";
import { keys } from "../keys.ts";

export const API_PREFIX = "/api/";

// Each key whose service is set up for direct use gets its two routes from the registry, with their mappings:
// POST /api/direct/<key>/read and /change. No key ships set up, so a new install has none.
const direct = forwardRoutes(keys);

// Keyed "METHOD /path". A Map, not an object, so a path like /api/constructor
// can not reach a property every object inherits.
const routes = new Map<string, Route>([["GET /api/health", health], ["GET /api/cloudflare/read", cloudflareRead], ...direct.routes]);

// List every custom main route here with the apps it serves and the saved keys it uses:
// { apps: ["orders"], keys: ["stripe"] }. Each name is a built folder under src/apps/, and a check fails
// on any other; holding the apps is all such a route asks. A route with keys and no app,
// { keys: ["cloudflare"] }, is open to anyone holding that key's level. Once Access permissions start,
// a business route with no mapping denies everyone but the owner.
const routeAccess = new Map<string, RouteAccess>([
  ["GET /api/health", { kind: "infrastructure" }],
  ["GET /api/cloudflare/read", { keys: ["cloudflare"] }],
  ...direct.access,
]);

export const mainRouteInventory = () => [...routes.keys()].map(route => ({ route, access: routeAccess.get(route) }));

export const apiActions = registrations(routes, "main", routeAccess);
export const apiKeyUse = keyUses(routes, "main", routeAccess);

export function handleApi(request: Request, env: Env & PolicyEnv, identity: AccessIdentity | null = null): Response | Promise<Response> {
  const url = new URL(request.url);
  const key = `${request.method} ${url.pathname}`;
  const handler = routes.get(key);
  return handler ? dispatch(handler, request, env, { url, route: url.pathname, identity }, routeAccess.get(key)) : Response.json({ error: "Not found" }, { status: 404 });
}
