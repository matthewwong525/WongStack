// The app's API. `worker/index.ts` sends every request under /api/ here.
// A new route is a handler file in this folder and one entry in `routes`.
import { health } from "./health.ts";

export const API_PREFIX = "/api/";

type Handler = (request: Request, env: Env) => Response | Promise<Response>;

// Keyed "METHOD /path". A Map, not an object, so a path like /api/constructor
// can not reach a property every object inherits.
const routes = new Map<string, Handler>([["GET /api/health", health]]);

export function handleApi(request: Request, env: Env): Response | Promise<Response> {
  const handler = routes.get(`${request.method} ${new URL(request.url).pathname}`);
  return handler ? handler(request, env) : Response.json({ error: "Not found" }, { status: 404 });
}
