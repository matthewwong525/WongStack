// The route's contract validates both callers and generates its discovery.
import { z } from "zod";
import { en } from "zod/locales";
import type { AppCall, AppEnv, AppHandler } from "../apps/index.ts";
import { authorizeRequest, listedKeys, type RouteAccess } from "../employee-access/policy.ts";
import { saved, scopedEnv, type Level } from "../employee-access/key-levels.ts";
import type { KeyId } from "../keys.ts";
import { boundedBytes } from "./body.ts";

/** Supported wire input, also used when building an action. @public */
export type Encoding = "none" | "query" | "json";
/** Verified caller, parsed input and provider cancellation signal. @public */
export type ActionCall = AppCall & { input: unknown; signal: AbortSignal };
/** The deliberately described handler accepted by both route registries. @public */
export type Action = {
  operationId: string;
  summary: string;
  description: string;
  input: z.ZodType;
  output: z.ZodType;
  encoding: Encoding;
  effect: "read" | "write" | "external";
  agentAvailable: boolean;
  errors: Record<string, string>;
  examples: { input: unknown; output: unknown }[];
  handler: (request: Request, env: AppEnv, call: ActionCall) => Response | Promise<Response>;
  requiresIdentity?: boolean;
  allowed?: (identity: AppCall["identity"]) => boolean;
  ready?: (env: AppEnv) => boolean;
  /** The saved keys this action uses, from `../keys.ts`. It is handed these and no others. */
  keys?: readonly KeyId[];
  limits?: { inputBytes: number; outputBytes: number; timeoutMs: number };
  /** On a write: the read action that shows whether the change happened. */
  confirmWith?: string;
};
export type Route = AppHandler | Action;
export type Registration = { method: string; path: string; app: string; action: Action; access?: RouteAccess };
type Issue = { path: string; message: string };
/** A refused request shape. Its message is fixed text, safe to return to the caller. */
class InputRefusal extends Error {}
const tooLarge = () => new InputRefusal("The input is larger than this action accepts.");
const operationIdPattern = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;
// zod loads its English messages as an import side effect, which the Worker build drops:
// without this call every issue would read "Invalid input".
z.config(en());
const defaults = { inputBytes: 65536, outputBytes: 262144, timeoutMs: 15000 };
const codes: Record<string, [number, string]> = {
  invalid_input: [400, "Invalid input"], authentication_required: [401, "Company login required"],
  forbidden: [403, "Action denied"], unavailable: [503, "Connection unavailable"],
  internal_error: [500, "Action failed"], timeout: [504, "Action timed out; its outcome may be unknown"],
};

function safeError(code: string, message: string, status: number, extras: { issues?: Issue[] } = {}): Response {
  return Response.json({ error: { code, message, requestId: crypto.randomUUID(), ...extras } },
    { status, headers: { "Cache-Control": "no-store" } });
}

export function actionError(code: string, status?: number, extras?: { issues?: Issue[] }): Response {
  return safeError(code, codes[code][1], status ?? codes[code][0], extras);
}

export function schemas(action: Action) {
  // Check the output view too: an input transform must not disappear in conversion.
  z.toJSONSchema(action.input, { unrepresentable: "throw" });
  const inputSchema = z.toJSONSchema(action.input, { io: "input", unrepresentable: "throw" });
  return {
    inputSchema: { ...inputSchema, properties: inputSchema.properties ?? {} },
    outputSchema: z.toJSONSchema(action.output, { unrepresentable: "throw" }),
  };
}

function fieldType(field: ReturnType<typeof schemas>["inputSchema"]["properties"][string] | undefined) {
  return typeof field === "object" ? field.type : undefined;
}

function validateMetadata(action: Action) {
  if (typeof action.operationId !== "string" || action.operationId.startsWith("memory.") || !operationIdPattern.test(action.operationId) || !action.summary ||
    !action.description || typeof action.agentAvailable !== "boolean" || typeof action.handler !== "function" ||
    !["read", "write", "external"].includes(action.effect) || !["none", "query", "json"].includes(action.encoding)) {
    throw new Error("Invalid action registration");
  }
  if (action.confirmWith !== undefined && (action.effect === "read" || typeof action.confirmWith !== "string" || !operationIdPattern.test(action.confirmWith))) {
    throw new Error(`Invalid confirming action: ${action.operationId}`);
  }
}

function validateEncoding(action: Action) {
  const { inputSchema } = schemas(action);
  if (inputSchema.type !== "object" || (action.encoding === "none" && Object.keys(inputSchema.properties).length)) {
    throw new Error(`Invalid input encoding: ${action.operationId}`);
  }
  if (action.encoding === "query" && Object.values(inputSchema.properties).some(field =>
    !["string", "number", "integer", "boolean"].includes(fieldType(field) as string))) {
    throw new Error(`Only scalar query fields are supported: ${action.operationId}`);
  }
}

// An assistant fills in the top-level inputs first, so each one says what it is.
function validateDescriptions(action: Action) {
  for (const [field, schema] of Object.entries(schemas(action).inputSchema.properties)) {
    if (typeof schema !== "object" || typeof schema.description !== "string" || !schema.description.trim()) {
      throw new Error(`Undescribed input field: ${action.operationId}.${field}`);
    }
  }
}

function validateLimits(action: Action) {
  const limits = action.limits ?? defaults;
  if (Object.values(limits).some(value => !Number.isSafeInteger(value) || value < 1) ||
    limits.inputBytes > 1048576 || limits.outputBytes > 4194304 || limits.timeoutMs > 60000) {
    throw new Error(`Invalid action limits: ${action.operationId}`);
  }
}

export function defineAction(action: Action): Action {
  validateMetadata(action);
  validateEncoding(action);
  validateDescriptions(action);
  validateLimits(action);
  for (const example of action.examples) {
    action.input.parse(example.input);
    action.output.parse(example.output);
  }
  return action;
}

/** What a call needs of each area it belongs to and each key its route lists: `read` looks things up, `write`
 *  changes or sends them. A bare handler has no effect to read, so its method decides: describe a `POST` that
 *  only looks things up as an action with `effect: "read"`. */
export const needFor = (route: Route, method: string): Level =>
  (typeof route === "function" ? ["GET", "HEAD"].includes(method) : route.effect === "read") ? "read" : "write";

/** The mapping a route is judged by: an action's own keys come before its app's or its mapping's. */
function accessFor(route: Route, mapping: RouteAccess | undefined): RouteAccess | undefined {
  if (!mapping || "kind" in mapping) return mapping;
  const keys = (typeof route === "function" ? undefined : route.keys) ?? mapping.keys ?? [];
  return "apps" in mapping ? { apps: mapping.apps, keys } : { keys };
}

/** A main route's reviewed mapping, or a mini app's folder with the keys its api.ts exports. */
const mappingFor = (app: string, key: string, access?: ReadonlyMap<string, RouteAccess>, keys?: readonly string[]): RouteAccess | undefined =>
  app === "main" ? access?.get(key) : { apps: [app], keys };

/** One route's use of saved keys: the apps it serves, none for a key working alone, and the level a call needs. */
type KeyUse = { apps: readonly string[]; keys: readonly string[]; need: Level };

/** Every route's key use, bare handlers included, so Access shows what the server enforces. */
export function keyUses(routes: Map<string, Route>, app = "main", access?: ReadonlyMap<string, RouteAccess>, keys?: readonly string[]): KeyUse[] {
  return [...routes].map(([key, route]) => {
    const judged = accessFor(route, mappingFor(app, key, access, keys));
    return { apps: judged && "apps" in judged ? judged.apps : [], keys: listedKeys(judged), need: needFor(route, key.split(" ")[0]) };
  }).filter(use => use.keys.length);
}

export function registrations(routes: Map<string, Route>, app = "main", access?: ReadonlyMap<string, RouteAccess>, keys?: readonly string[]): Registration[] {
  const result: Registration[] = [];
  for (const [key, route] of routes) {
    if (typeof route === "function") continue;
    const match = /^([A-Z]+) (.*)$/.exec(key);
    if (!match || !["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(match[1])) {
      throw new Error(`Invalid route: ${key}`);
    }
    const path = app === "main" ? match[2] : `/apps/${app}/api/${match[2]}`;
    if (!/^\/(?:api|apps)\/[a-zA-Z0-9/_-]+$/.test(path)) throw new Error(`Invalid route: ${key}`);
    result.push({ method: match[1], path, app, action: defineAction(route),
      access: accessFor(route, mappingFor(app, key, access, keys)) });
  }
  return result;
}

export function uniqueActions(items: Registration[]): Registration[] {
  const effects = new Map<string, Action["effect"]>();
  for (const { action } of items) {
    if (effects.has(action.operationId)) throw new Error(`Duplicate operation ID: ${action.operationId}`);
    effects.set(action.operationId, action.effect);
  }
  for (const { action } of items) {
    if (action.confirmWith !== undefined && effects.get(action.confirmWith) !== "read") throw new Error(`Invalid confirming action: ${action.operationId}`);
  }
  return items;
}

// Read streams with a bound before parsing; a declared Content-Length is not trusted.
export async function boundedText(body: ReadableStream<Uint8Array> | null, max: number,
  limitError = () => new Error("Size limit exceeded")): Promise<string> {
  if (!body) return "";
  const bytes = await boundedBytes(body, max, limitError);
  return new TextDecoder().decode(bytes);
}

async function inputFor(action: Action, request: Request, url: URL, max: number): Promise<unknown> {
  if (new TextEncoder().encode(url.search).byteLength > max) throw tooLarge();
  if (action.encoding === "json") {
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new InputRefusal("Send the input as a JSON body with the content type application/json.");
    const text = await boundedText(request.body, max, tooLarge);
    // A parser's own message quotes the body, so it never leaves the Worker.
    try { return JSON.parse(text); } catch { throw new InputRefusal("The body is not valid JSON."); }
  }
  if (request.body) throw new InputRefusal("This action takes no request body.");
  const input: Record<string, unknown> = {};
  const { inputSchema } = schemas(action);
  for (const [key, value] of url.searchParams) {
    if (Object.hasOwn(input, key)) throw new InputRefusal("A query field is given more than once.");
    const type = fieldType(inputSchema.properties[key]);
    input[key] = type === "number" || type === "integer" ?
      (value.trim() ? Number(value) : NaN) : type === "boolean" ?
        (value === "true" ? true : value === "false" ? false : value) : value;
  }
  return input;
}

// Settings setup commits in wrangler.jsonc. Anyone with the code can read them, and an honest answer
// may name them: an account is often named for its owner's email. Every other text binding is a secret.
const COMMITTED = new Set(["WONG_ENVIRONMENT", "WONG_OWNER_EMAIL", "WONG_CODE_REPOSITORY", "WORKSPACE_LOGIN",
  "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD", "CF_ACCESS_APP_ID", "CF_ACCESS_WORKER_ID"]);

export function containsCredential(output: unknown, env: AppEnv): boolean {
  const serialized = JSON.stringify(output);
  return Object.entries(env).some(([name, value]: [string, unknown]) => !COMMITTED.has(name) &&
    typeof value === "string" && value.length >= 8 && serialized.includes(value)) ||
    /(?:wongm_|wongl_|ghp_|github_pat_|sk-)[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(serialized);
}

// Which inputs failed and why: bounded, and dropped whole if a credential value appears.
function inputIssues(error: unknown, env: AppEnv): { issues?: Issue[] } {
  const issues = error instanceof z.ZodError ?
    error.issues.slice(0, 10).map(issue => ({ path: issue.path.map(String).join(".").slice(0, 200), message: issue.message.slice(0, 200) })) :
    [{ path: "", message: error instanceof InputRefusal ? error.message : "The input could not be read." }];
  return containsCredential(issues, env) ? {} : { issues };
}

async function failedAction(action: Action, response: Response, env: AppEnv): Promise<Response> {
  if (response.status === 401 || response.status === 403) return actionError(response.status === 401 ? "authentication_required" : "forbidden", response.status);
  try {
    const body = JSON.parse(await boundedText(response.body, (action.limits ?? defaults).outputBytes));
    const code = body?.error?.code;
    if (typeof code === "string" && Object.hasOwn(action.errors, code) && !containsCredential(action.errors[code], env)) {
      return safeError(code, action.errors[code], response.status);
    }
  } catch { /* undocumented provider diagnostics never leave the Worker */ }
  return actionError("internal_error", response.status);
}

/** `env` holds only the route's keys; `all` is every binding, so no saved secret can leave in an answer. */
async function execute(action: Action, request: Request, env: AppEnv, all: AppEnv, call: AppCall, signal: AbortSignal) {
  const limits = action.limits ?? defaults;
  let input: unknown;
  try { input = action.input.parse(await inputFor(action, request, call.url, limits.inputBytes)); }
  catch (error) { return actionError("invalid_input", undefined, inputIssues(error, env)); }
  if (signal.aborted) return actionError("timeout");
  try {
    const response = await action.handler(request, env, { ...call, input, signal });
    if (!response.ok) {
      // An existing record guard retains its status without forwarding provider diagnostics.
      return failedAction(action, response, all);
    }
    const output = action.output.parse(JSON.parse(await boundedText(response.body, limits.outputBytes)));
    if (containsCredential(output, all)) return actionError("internal_error");
    return Response.json(output, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return actionError("internal_error"); }
}

export async function dispatch(route: Route, request: Request, all: AppEnv, call: AppCall, mapping?: RouteAccess): Promise<Response> {
  const access = accessFor(route, mapping);
  const denied = await authorizeRequest(all, call.identity, access, needFor(route, request.method));
  if (denied) return denied;
  // A handler is handed only the keys its route lists; a listed key that is not saved stops here.
  const keys = listedKeys(access);
  if (!keys.every(key => saved(all, key))) return actionError("unavailable");
  const env = scopedEnv(all, keys);
  if (typeof route === "function") return route(request, env, call);
  if ((route.requiresIdentity !== false || route.ready) && !call.identity) return actionError("authentication_required");
  if (route.allowed && !route.allowed(call.identity)) return actionError("forbidden");
  if (route.ready && !route.ready(env)) return actionError("unavailable");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<Response>(resolve => {
    timer = setTimeout(() => { controller.abort(); resolve(actionError("timeout")); }, (route.limits ?? defaults).timeoutMs);
  });
  try { return await Promise.race([execute(route, request, env, all, call, controller.signal), timeout]); }
  finally { clearTimeout(timer!); }
}
