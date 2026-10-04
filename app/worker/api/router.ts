// The app's API. `worker/index.ts` sends every request under /api/ here.
// A new route is a handler file in this folder and one entry in `routes`.
import { health } from "./health.ts";
import { dispatch, registrations, type Route } from "./contract.ts";
import type { AccessIdentity } from "../access.ts";
import type { PolicyEnv, RouteAccess } from "../employee-access/policy.ts";

export const API_PREFIX = "/api/";


// Keyed "METHOD /path". A Map, not an object, so a path like /api/constructor
// can not reach a property every object inherits.
const routes = new Map<string, Route>([["GET /api/health", health]]);

// List every custom main route here with the apps it serves. Once Access permissions
// start, a business route with no mapping denies everyone but the owner.
const routeAccess = new Map<string, RouteAccess>([["GET /api/health", { kind: "infrastructure" }]]);

export const mainRouteInventory = () => [...routes.keys()].map(route => ({ route, access: routeAccess.get(route) }));

export const apiActions = registrations(routes, "main", routeAccess);

export function handleApi(request: Request, env: Env & PolicyEnv, identity: AccessIdentity | null = null): Response | Promise<Response> {
  const url = new URL(request.url);
  const key = `${request.method} ${url.pathname}`;
  const handler = routes.get(key);
  return handler ? dispatch(handler, request, env, { url, route: url.pathname, identity }, routeAccess.get(key)) : Response.json({ error: "Not found" }, { status: 404 });
}
