// GET /api/services: one short list of the saved keys a caller can use, each with its purpose and whether it is
// ready. wiki/stack/service-catalogue.md
import type { AccessIdentity } from "../access.ts";
import { actionError, containsCredential } from "./contract.ts";
import type { AppEnv } from "../apps/index.ts";
import { currentPolicy, policyAllows, policyDenied, type CurrentPolicy } from "../employee-access/policy.ts";
import { described, forwards, keyIds, keyTitle, offered, saved, mcpPath, type Level } from "../employee-access/key-levels.ts";

const MAX = 200;

/** The level the caller holds for a key now, or null. Before permissions start, only the owner holds one. */
function heldLevel(policy: CurrentPolicy, id: string): Level | null {
  if (policy.state === "current") return policy.keys?.get(id) ?? null;
  return policy.state === "not_started" && policy.role === "owner" ? offered(id).at(-1)! : null;
}

/** An MCP server's row names its path, so the helper can open a session. */
const mcpRow = (id: string) => { const path = mcpPath(id); return path === null ? {} : { mcp: { path } }; };

async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function services(request: Request, env: AppEnv, identity: AccessIdentity | null): Promise<Response> {
  if (!identity) return actionError("authentication_required");
  if (request.method !== "GET") return Response.json({ error: "Not found" }, { status: 404 });
  const policy = await currentPolicy(env, identity);
  if (!policyAllows(policy, { kind: "self-service" })) return policyDenied(policy);
  const all = new URL(request.url).searchParams.get("all") === "1";
  // Project code is the stack's own key, not a service a chat calls.
  const listed = keyIds().filter(id => id !== "code").map(id => ({ id, name: keyTitle(id), ...described(id),
    ready: saved(env, id), level: heldLevel(policy, id), direct: forwards(id), ...mcpRow(id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const value = { services: listed.filter(key => all || key.level).slice(0, MAX), needAccess: listed.filter(key => !key.level).length };
  if (containsCredential(value, env)) return actionError("internal_error");
  const revision = await digest(value);
  const headers = { ETag: `"${await digest({ revision, caller: [identity.kind, identity.id] })}"`, "Cache-Control": "private, no-cache",
    Vary: "Cookie, Cf-Access-Jwt-Assertion, cf-access-token" };
  if (request.headers.get("if-none-match") === headers.ETag) return new Response(null, { status: 304, headers });
  return Response.json({ revision, ...value }, { headers });
}
