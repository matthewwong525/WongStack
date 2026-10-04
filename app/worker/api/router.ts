// The app's API. `worker/index.ts` sends every request under /api/ here.
// A new route is a handler file in this folder and one entry in `routes`.
import { health } from "./health.ts";
import { dispatch, registrations, type Route } from "./contract.ts";
import type { AccessIdentity } from "../access.ts";

export const API_PREFIX = "/api/";


// Keyed "METHOD /path". A Map, not an object, so a path like /api/constructor
// can not reach a property every object inherits.
const routes = new Map<string, Route>([["GET /api/health", health]]);

export const apiActions = registrations(routes);

export function handleApi(request: Request, env: Env, identity: AccessIdentity | null = null): Response | Promise<Response> {
  const handler = routes.get(`${request.method} ${new URL(request.url).pathname}`);
  return handler ? dispatch(handler, request, env, { url: new URL(request.url), route: new URL(request.url).pathname, identity }) : Response.json({ error: "Not found" }, { status: 404 });
}
