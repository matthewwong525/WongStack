// Only deliberately described routes enter the company catalogue.
import { selectOperations } from "../../../.agents/skills/memory/scripts/lib/operations.mjs";
import { apiActions } from "./router.ts";
import { appActions, type AppEnv } from "../apps/index.ts";
import type { AccessIdentity } from "../access.ts";
import { actionError, containsCredential, needFor, schemas, uniqueActions, type Registration } from "./contract.ts";
import { currentPolicy, listedKeys, policyAllows, policyDenied } from "../employee-access/policy.ts";
import { described, keyTitle, registered, saved, type Level } from "../employee-access/key-levels.ts";

const issuesSchema = { type: "array", maxItems: 10, items: { type: "object", required: ["path", "message"], additionalProperties: false,
  properties: { path: { type: "string", maxLength: 200 }, message: { type: "string", maxLength: 200 } } } };

/** A key an action uses: its name, what it is for, its service's API guide if any, and the level a call needs. */
const keyEntry = (id: string, level: Level) => registered(id) ? { id, name: keyTitle(id), ...described(id), level } : { id, level };

// `visible` holds the caller's operation IDs: a confirming read they cannot see is never named.
function describe({ method, path, app, action, access }: Registration, env: AppEnv, visible: Set<string>) {
  const level = needFor(action, method);
  return {
    operationId: action.operationId, summary: action.summary, description: action.description,
    app, method, path, encoding: action.encoding, effect: action.effect,
    // The saved keys the action uses and the level a caller needs, so an assistant can explain a refusal.
    keys: listedKeys(access).map(id => keyEntry(id, level)),
    source: "company", transport: "http", authentication: "cloudflare-access",
    // A listed key that is not saved answers `unavailable` when called, so the list says so first.
    readiness: (action.ready && !action.ready(env)) || !listedKeys(access).every(id => saved(env, id)) ? "unavailable" : "available",
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

// How to use the document, read before any operation. Editing it changes every ETag, as any contract edit does.
const GUIDE = "Search with GET /api/actions?q=<words>, then open one action with ?id=<operationId> before calling it. " +
  "x-effect says whether it reads or changes. Every error is { error: { code, message, requestId } }. " +
  "A timeout leaves a change's outcome unknown: check it before repeating, with x-confirm-with when named. " +
  "Each tag is a saved key, with what it is for and its service's API guide.";

type Operation = ReturnType<typeof describe>;
type Tag = { name: string; description: string; externalDocs?: { url: string; description: string } };

/** A key's group: its name, what it is for, and its service's guide when it has one. */
const tagFor = ({ name, purpose, docs }: { name: string; purpose: string; docs?: string }): Tag =>
  ({ name, description: purpose, ...(docs ? { externalDocs: { url: docs, description: `${name}'s API guide` } } : {}) });

/** The registered keys an operation lists, with their names. */
const named = (operation: Operation) => operation.keys.flatMap(key => "name" in key ? [key] : []);

/** A main route named for its one key, `<key>.read` or `<key>.change`, sends the whole request to that service,
 *  so the service's guide is its reference. A built action's guide stays on its tag: its handler is the contract. */
function ownGuide(operation: Operation) {
  const [key] = named(operation);
  return operation.app === "main" && operation.keys.length === 1 && key && [`${key.id}.read`, `${key.id}.change`].includes(operation.operationId)
    ? tagFor(key).externalDocs : undefined;
}

function openApi(operations: Operation[], version: string) {
  const paths: Record<string, Record<string, unknown>> = {};
  // Only keys of operations the caller can see, so a key's group never shows to someone who can't use it.
  const tags = new Map(operations.flatMap(named).map(key => [key.id, tagFor(key)]));
  for (const operation of operations) {
    const { operationId, summary, description, inputSchema, outputSchema, encoding, method, path } = operation;
    const parameters = encoding === "query" ? Object.entries(inputSchema.properties).map(([name, schema]) => ({
      name, in: "query", required: inputSchema.required?.includes(name) ?? false, style: "form", explode: true, schema,
    })) : [];
    paths[path] ??= {};
    const guide = ownGuide(operation);
    const groups = named(operation).map(key => key.name);
    paths[path][method.toLowerCase()] = {
      operationId, summary, description, ...(groups.length ? { tags: groups } : {}),
      ...(guide ? { externalDocs: guide } : {}), parameters,
      ...(encoding === "json" ? { requestBody: { required: true, content: { "application/json": { schema: inputSchema } } } } : {}),
      responses: {
        "2XX": { description: "Successful result", content: { "application/json": { schema: outputSchema } } },
        default: { description: "Safe action error", content: { "application/json": { schema: operation.errorSchema } } },
      },
      security: [{ employeeLogin: [] }], "x-effect": operation.effect, "x-readiness": operation.readiness,
      ...(operation.confirmWith ? { "x-confirm-with": operation.confirmWith } : {}),
    };
  }
  return { openapi: "3.1.1", info: { title: "Company actions", version, description: GUIDE },
    tags: [...tags.values()].sort((a, b) => a.name.localeCompare(b.name)), paths,
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
  const visible = uniqueActions(registry).filter(({ action, access, method }) => policyAllows(policy, access, needFor(action, method)) &&
    action.agentAvailable && (!action.allowed || action.allowed(identity)));
  const ids = new Set(visible.map(({ action }) => action.operationId));
  const operations = visible.map(item => describe(item, env, ids)).sort((a, b) => a.operationId.localeCompare(b.operationId));
  if (containsCredential(operations, env)) return actionError("internal_error");
  const version = await revision(operations);
  // Key levels can start with no new revision, so whether they have is part of the caller.
  const caller = { identity: [identity.kind, identity.id, identity.claims.sub],
    policy: policy.state === "current" ? [policy.revision, policy.keys !== null] : policy.state };
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
  // A summary keeps each key short: its id and the level a call needs. The name and guide wait for ?id=.
  const keys = new Map(operations.map(operation => [operation.operationId, operation.keys.map(({ id, level }) => ({ id, level }))]));
  return discoveryJson(request, { revision: version, ...selected,
    actions: selected.actions.map(action => ({ ...action, keys: keys.get(action.operationId) })) }, caller);
}
