import { z } from "zod";
import { CONTENT_TYPE, FIELDS, forwardActions, METHODS } from "../../../.agents/skills/access/server/forward.mjs";
import type { Registry } from "../../../.agents/skills/access/server/levels.mjs";
import { defineAction, type Action } from "./contract.ts";
import type { RouteAccess } from "../access-slots.ts";

// POST /api/direct/<key>/read and /change: the Access module's request, wrapped in the app's action contract.
// wiki/stack/company-api.md#use-a-key-directly

const input = z.strictObject({
  method: z.enum(METHODS).describe(FIELDS.method),
  path: z.string().min(1).max(2000).describe(FIELDS.path),
  query: z.string().max(4000).optional().describe(FIELDS.query),
  body: z.unknown().optional().describe(FIELDS.body),
  contentType: z.string().regex(CONTENT_TYPE).optional().describe(FIELDS.contentType),
});
const output = z.strictObject({ status: z.number().int(), contentType: z.string(), body: z.unknown() });

/** The direct-use routes of every key whose service is set up: a look-up action, and a change action when the key
 *  offers Read & write. Throws, naming the key, on a bad `forward` entry. `send` is the request; a test replaces it. */
export function forwardRoutes(registry: Registry, send: typeof fetch = (...call) => fetch(...call)) {
  let built: ReturnType<typeof forwardActions>;
  try { built = forwardActions(registry, send); }
  catch (error) { throw new Error(`app/worker/keys.ts: ${(error as Error).message}`); }
  const routes = new Map<string, Action>();
  for (const [route, made] of built.routes) {
    const { handler, id: _id, kind: _kind, ...words } = made;
    routes.set(route, defineAction({ ...words, input, output, encoding: "json", agentAvailable: true,
      // Dispatch has already refused a call with no verified caller.
      handler: (_request, env, call) => handler(call.input, { secret: name => Reflect.get(env, name), signal: call.signal, caller: call.identity!.id }) }));
  }
  return { routes, access: built.access as Map<string, RouteAccess> };
}
