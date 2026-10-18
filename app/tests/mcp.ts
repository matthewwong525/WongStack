// A made-up MCP and its sign-in server, answering on the `send` the MCP code is handed, and the app around them.
import type { AccessIdentity } from "../worker/access.ts";
import type { Send } from "../worker/mcp/discover.ts";
import { handleMcp } from "../worker/mcp/routes.ts";
import type { Caller } from "../worker/mcp/store.ts";
import { body } from "./body.ts";
import { fakeEnv } from "./env.ts";
import { fixture, owner, site } from "./employee-access/connections.ts";

export const SEAL_VALUE = "a-made-up-seal-long-enough-to-use-here";
export const MCP_URL = "https://mcp.canva.example/mcp";
export const AUTH = "https://auth.canva.example";
const METADATA = "https://mcp.canva.example/.well-known/oauth-protected-resource/mcp";
type Override = (url: URL, init: RequestInit, text: string) => Response | Promise<Response> | undefined;
type ToolCall = { name: string; token: string; args: unknown };

export const sse = (value: unknown) => new Response(`event: message\ndata: ${JSON.stringify(value)}\n\n`, { headers: { "Content-Type": "text/event-stream" } });

/** The MCP at MCP_URL and its sign-in server. `override` answers first when it returns a response. */
export function mcpService() {
  const state = {
    tools: [
      { name: "search", description: "Find designs. Returns ids.", annotations: { readOnlyHint: true }, inputSchema: { type: "object", properties: { query: { type: "string" } } } },
      { name: "create", title: "Create a design", inputSchema: { type: "object", properties: {} } },
    ] as unknown[],
    instructions: "Canva designs and folders.\nMore about it." as string | null,
    issued: 0, registered: 0, tokenCalls: 0, calls: [] as ToolCall[], valid: new Set<string>(), used: new Set<string>(),
    expiresIn: 3600 as number | undefined, override: undefined as Override | undefined, requests: [] as string[],
  };
  const issue = () => {
    const n = ++state.issued;
    state.valid.add(`access-${n}`);
    return { access_token: `access-${n}`, refresh_token: `refresh-${n}`, token_type: "Bearer", ...(state.expiresIn !== undefined && { expires_in: state.expiresIn }),
      id_token: `x.${btoa(JSON.stringify({ email: "designer@canva.example" }))}.y` };
  };
  const token = (form: URLSearchParams) => {
    state.tokenCalls++;
    const refresh = form.get("refresh_token");
    const good = form.get("grant_type") === "authorization_code" ? form.get("code") === "good-code"
      : !!refresh && !state.used.has(refresh) && Number(refresh.split("-")[1]) <= state.issued;
    if (refresh) state.used.add(refresh);
    return good ? Response.json(issue()) : Response.json({ error: "invalid_grant" }, { status: 400 });
  };
  const mcp = (init: RequestInit, text: string) => {
    const bearer = new Headers(init.headers).get("authorization")?.replace("Bearer ", "");
    if (!bearer || !state.valid.has(bearer)) return new Response(null, { status: 401, headers: { "WWW-Authenticate": `Bearer resource_metadata="${METADATA}"` } });
    const message = JSON.parse(text) as { id?: number; method: string; params: { cursor?: string; name?: string; arguments?: unknown } };
    if (message.method === "notifications/initialized") return new Response(null, { status: 202 });
    const answer = (result: unknown) => Response.json({ jsonrpc: "2.0", id: message.id, result }, { headers: { "Mcp-Session-Id": "session-1" } });
    if (message.method === "initialize") return answer({ protocolVersion: "2025-06-18", capabilities: {}, ...(state.instructions !== null && { instructions: state.instructions }) });
    if (message.method === "tools/list") {
      return message.params.cursor ? answer({ tools: state.tools.slice(1) }) : answer({ tools: state.tools.slice(0, 1), nextCursor: "2" });
    }
    state.calls.push({ name: message.params.name!, token: bearer, args: message.params.arguments });
    return sse({ jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: `ran ${message.params.name}` }] } });
  };
  const send: Send = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const text = typeof init.body === "string" ? init.body : init.body instanceof URLSearchParams ? init.body.toString() : "";
    state.requests.push(`${init.method ?? "GET"} ${url.href}`);
    const custom = await state.override?.(url, init, text);
    if (custom) return custom;
    if (url.href === MCP_URL) return mcp(init, text);
    if (url.href === METADATA) return Response.json({ resource: MCP_URL, authorization_servers: [AUTH], scopes_supported: ["design:read"] });
    if (url.href === `${AUTH}/.well-known/oauth-authorization-server`) {
      return Response.json({ issuer: AUTH, authorization_endpoint: `${AUTH}/authorize`, token_endpoint: `${AUTH}/token`,
        registration_endpoint: `${AUTH}/register`, code_challenge_methods_supported: ["S256"], token_endpoint_auth_methods_supported: ["none"] });
    }
    if (url.href === `${AUTH}/register`) return Response.json({ client_id: `client-${++state.registered}` }, { status: 201 });
    if (url.href === `${AUTH}/token`) return token(new URLSearchParams(text));
    return new Response("missing", { status: 404 });
  };
  return { state, send };
}

/** The app with one installation, a seal, and the made-up MCP to add. */
export function mcpFixture() {
  const base = fixture();
  const env = fakeEnv({ ...base.env, WONG_MCP_SEAL: SEAL_VALUE as string | undefined });
  const service = mcpService();
  const run = (identity: AccessIdentity | null, path: string, method = "POST", payload?: unknown, using: typeof env = env) =>
    handleMcp(new Request(`${site.origin}/api/mcp/${path}`, { method, headers: { Origin: site.origin, "Content-Type": "application/json" },
      ...(payload !== undefined && { body: JSON.stringify(payload) }) }), using, identity, service.send);
  const add = (identity: AccessIdentity = owner, url = MCP_URL) => run(identity, "servers", "POST", { url });
  /** Connect as the person, through the service's page and back. */
  const signIn = async (identity: AccessIdentity = owner, id = "canva") => {
    const { authorize } = await body<{ authorize: string }>(await run(identity, `servers/${id}/connect`));
    return run(identity, `callback?code=good-code&state=${new URL(authorize).searchParams.get("state")}`, "GET");
  };
  const caller = (email = site.ownerEmail, manages = email === site.ownerEmail): Caller =>
    ({ db: base.core.db, env, installationId: site.installationId, email, manages, origin: site.origin });
  return { ...base, env, service, run, add, signIn, caller };
}
