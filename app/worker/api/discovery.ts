// Only deliberately described routes enter the company catalogue.
import { selectOperations } from "../../../.agents/skills/memory/scripts/lib/operations.mjs";
import { apiActions } from "./router.ts";
import { appActions, type AppEnv } from "../apps/index.ts";
import type { AccessIdentity } from "../access.ts";
import { actionError, containsCredential, schemas, uniqueActions, type Registration } from "./contract.ts";
import { currentPolicy, policyAllows, policyDenied } from "../employee-access/policy.ts";

const issuesSchema = { type: "array", maxItems: 10, items: { type: "object", required: ["path", "message"], additionalProperties: false,
  properties: { path: { type: "string", maxLength: 200 }, message: { type: "string", maxLength: 200 } } } };

// `visible` holds the caller's operation IDs: a confirming read they cannot see is never named.
function describe({ method, path, app, action }: Registration, env: AppEnv, visible: Set<string>) {
  return {
    operationId: action.operationId, summary: action.summary, description: action.description,
    app, method, path, encoding: action.encoding, effect: action.effect,
    source: "company", transport: "http", authentication: "cloudflare-access",
    readiness: action.ready && !action.ready(env) ? "unavailable" : "available",
    ...(visible.has(action.confirmWith ?? "") ? { confirmWith: action.confirmWith } : {}),
    ...schemas(action), errorSchema: { type: "object", required: ["error"], additionalProperties: false,
      properties: { error: { type: "object", required: ["code", "message", "requestId"], additionalProperties: false,
        properties: { code: { type: "string" }, message: { type: "string" }, requestId: { type: "string" }, issues: issuesSchema } } } }, errors: action.errors, examples: action.examples,
  };
}

async function revision(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function openApi(operations: ReturnType<typeof describe>[], version: string) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const operation of operations) {
    const { operationId, summary, description, inputSchema, outputSchema, encoding, method, path } = operation;
    const parameters = encoding === "query" ? Object.entries(inputSchema.properties).map(([name, schema]) => ({
      name, in: "query", required: inputSchema.required?.includes(name) ?? false, style: "form", explode: true, schema,
    })) : [];
    paths[path] ??= {};
    paths[path][method.toLowerCase()] = {
      operationId, summary, description, parameters,
      ...(encoding === "json" ? { requestBody: { required: true, content: { "application/json": { schema: inputSchema } } } } : {}),
      responses: {
        "2XX": { description: "Successful result", content: { "application/json": { schema: outputSchema } } },
        default: { description: "Safe action error", content: { "application/json": { schema: operation.errorSchema } } },
      },
      security: [{ employeeLogin: [] }], "x-effect": operation.effect, "x-readiness": operation.readiness,
      ...(operation.confirmWith ? { "x-confirm-with": operation.confirmWith } : {}),
    };
  }
  return { openapi: "3.1.1", info: { title: "Company actions", version }, paths,
    components: { securitySchemes: { employeeLogin: { type: "apiKey", in: "header", name: "cf-access-token" } } } };
}

async function discoveryJson(request: Request, value: unknown, caller: unknown) {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 1048576) return actionError("internal_error");
  const headers = { "ETag": `"${await revision({ value, caller })}"`, "Cache-Control": "private, no-cache",
    "Vary": "Cookie, Cf-Access-Jwt-Assertion, cf-access-token" };
  if (request.headers.get("if-none-match") === headers.ETag) return new Response(null, { status: 304, headers });
  return Response.json(value, { headers });
}

export async function discovery(request: Request, env: AppEnv, identity: AccessIdentity | null,
  registry: Registration[] = [...apiActions, ...appActions]): Promise<Response> {
  if (!identity) return actionError("authentication_required");
  const url = new URL(request.url);
  if (request.method !== "GET") return Response.json({ error: "Not found" }, { status: 404 });
  const policy = await currentPolicy(env, identity);
  if (!policyAllows(policy, { kind: "self-service" })) return policyDenied(policy);
  const visible = uniqueActions(registry).filter(({ action, access }) => policyAllows(policy, access) &&
    action.agentAvailable && (!action.allowed || action.allowed(identity)));
  const ids = new Set(visible.map(({ action }) => action.operationId));
  const operations = visible.map(item => describe(item, env, ids)).sort((a, b) => a.operationId.localeCompare(b.operationId));
  if (containsCredential(operations, env)) return actionError("internal_error");
  const version = await revision(operations);
  const caller = { identity: [identity.kind, identity.id, identity.claims.sub],
    policy: policy.state === "current" ? policy.revision : policy.state };
  if (url.pathname === "/api/openapi.json") return discoveryJson(request, openApi(operations, version), caller);
  if (url.searchParams.has("id")) {
    const selected = operations.find(item => item.operationId === url.searchParams.get("id"));
    return selected ? discoveryJson(request, { ...selected, revision: version }, caller) :
      Response.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const query = url.searchParams.get("q") ?? "";
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0 || query.length > 200) return actionError("invalid_input");
  const selected = selectOperations(operations.map(operation => ({ ...operation, revision: version })),
    { q: query, app: url.searchParams.get("app") ?? undefined, limit, offset });
  return discoveryJson(request, { revision: version, ...selected }, caller);
}
