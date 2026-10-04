// Only deliberately described routes enter the company catalogue.
import { selectOperations } from "../../../.agents/skills/memory/scripts/lib/operations.mjs";
import { apiActions } from "./router.ts";
import { appActions, type AppEnv } from "../apps/index.ts";
import type { AccessIdentity } from "../access.ts";
import { actionError, containsCredential, schemas, uniqueActions, type Registration } from "./contract.ts";

function describe({ method, path, app, action }: Registration, env: AppEnv) {
  return {
    operationId: action.operationId, summary: action.summary, description: action.description,
    app, method, path, encoding: action.encoding, effect: action.effect,
    source: "company", transport: "http", authentication: "cloudflare-access",
    readiness: action.ready && !action.ready(env) ? "unavailable" : "available",
    ...schemas(action), errorSchema: { type: "object", required: ["error"], additionalProperties: false,
      properties: { error: { type: "object", required: ["code", "message", "requestId"], additionalProperties: false,
        properties: { code: { type: "string" }, message: { type: "string" }, requestId: { type: "string" } } } } }, errors: action.errors, examples: action.examples,
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
    };
  }
  return { openapi: "3.1.1", info: { title: "Company actions", version }, paths,
    components: { securitySchemes: { employeeLogin: { type: "apiKey", in: "header", name: "cf-access-token" } } } };
}

function discoveryJson(value: unknown, headers: Record<string, string>) {
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 1048576) return actionError("internal_error");
  return Response.json(value, { headers });
}

export async function discovery(request: Request, env: AppEnv, identity: AccessIdentity | null,
  registry: Registration[] = [...apiActions, ...appActions]): Promise<Response> {
  if (!identity) return actionError("authentication_required");
  const url = new URL(request.url);
  if (request.method !== "GET") return Response.json({ error: "Not found" }, { status: 404 });
  const visible = uniqueActions(registry).filter(({ action }) => action.agentAvailable && (!action.allowed || action.allowed(identity)));
  const operations = visible.map(item => describe(item, env)).sort((a, b) => a.operationId.localeCompare(b.operationId));
  if (containsCredential(operations, env)) return actionError("internal_error");
  const version = await revision(operations);
  const headers = { "ETag": `"${version}"`, "Cache-Control": "private, no-cache", "Vary": "Cookie, Cf-Access-Jwt-Assertion, cf-access-token" };
  if (request.headers.get("if-none-match") === headers.ETag) return new Response(null, { status: 304, headers });
  if (url.pathname === "/api/openapi.json") return discoveryJson(openApi(operations, version), headers);
  if (url.searchParams.has("id")) {
    const selected = operations.find(item => item.operationId === url.searchParams.get("id"));
    return selected ? discoveryJson({ ...selected, revision: version }, headers) : Response.json({ error: "Not found" }, { status: 404 });
  }
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const query = url.searchParams.get("q") ?? "";
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0 || query.length > 200) return actionError("invalid_input");
  const selected = selectOperations(operations.map(operation => ({ ...operation, revision: version })),
    { q: query, app: url.searchParams.get("app") ?? undefined, limit, offset });
  return discoveryJson({ revision: version, ...selected }, headers);
}
