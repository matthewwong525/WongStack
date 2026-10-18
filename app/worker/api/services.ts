// GET /api/services: one short list of the outside services a caller can use, the saved keys they hold a level for
// and every MCP on the app, each with its purpose and whether it's ready for them. wiki/stack/service-catalogue.md
import type { AccessIdentity } from "../access.ts";
import { actionError, containsCredential } from "./contract.ts";
import type { AppEnv } from "../apps/index.ts";
import { currentPolicy, policyAllows, policyDenied, type CurrentPolicy } from "../employee-access/policy.ts";
import { described, forwards, keyIds, keyTitle, offered, saved, type Level } from "../employee-access/key-levels.ts";
import { connectLink, mcpCaller, purposeOf, readiness, serverRows, type McpEnv } from "../mcp/store.ts";

const MAX = 200;

/** The level the caller holds for a key now, or null. Before permissions start, only the owner holds one. */
function heldLevel(policy: CurrentPolicy, id: string): Level | null {
  if (policy.state === "current") return policy.keys?.get(id) ?? null;
  return policy.state === "not_started" && policy.role === "owner" ? offered(id).at(-1)! : null;
}

/** Every MCP as this caller would use it. None when the app holds no MCPs yet or can't read them. */
async function mcps(request: Request, env: AppEnv & McpEnv, identity: AccessIdentity, policy: CurrentPolicy) {
  const caller = await mcpCaller(request, env, identity, policy);
  if (caller instanceof Response) return [];
  // MCP tables not migrated yet, or unreadable, leave the keys listed.
  return (await serverRows(caller).catch(() => [])).map(row => {
    const { own, share } = readiness(caller, row);
    return { id: `mcp:${row.id}`, kind: "mcp" as const, name: row.name, purpose: purposeOf(row.instructions), ready: own || !!share,
      own: row.own_state, ...(share && { using: share }), tools: row.tools, ...(!own && { connect: connectLink(caller.origin, row.id) }) };
  });
}

async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function services(request: Request, env: AppEnv & McpEnv, identity: AccessIdentity | null): Promise<Response> {
  if (!identity) return actionError("authentication_required");
  if (request.method !== "GET") return Response.json({ error: "Not found" }, { status: 404 });
  const policy = await currentPolicy(env, identity);
  if (!policyAllows(policy, { kind: "self-service" })) return policyDenied(policy);
  const all = new URL(request.url).searchParams.get("all") === "1";
  // Project code is the stack's own key, not a service a chat calls.
  const listed = keyIds().filter(id => id !== "code").map(id => ({ id, kind: "key" as const, name: keyTitle(id), ...described(id),
    ready: saved(env, id), level: heldLevel(policy, id), direct: forwards(id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const rows = [...listed.filter(key => all || key.level), ...await mcps(request, env, identity, policy)].slice(0, MAX);
  const value = { services: rows, needAccess: listed.filter(key => !key.level).length };
  if (containsCredential(value, env)) return actionError("internal_error");
  const revision = await digest(value);
  const headers = { ETag: `"${await digest({ revision, caller: [identity.kind, identity.id] })}"`, "Cache-Control": "private, no-cache",
    Vary: "Cookie, Cf-Access-Jwt-Assertion, cf-access-token" };
  if (request.headers.get("if-none-match") === headers.ETag) return new Response(null, { status: 304, headers });
  return Response.json({ revision, ...value }, { headers });
}
