// /api/mcp/: anyone signed in adds an MCP and connects, shares or disconnects their own sign-in; the adder removes
// one while nobody else is connected, the owner or an Admin any. wiki/stack/mcp-connections.md
import { z } from "zod";
import { boundedText } from "../api/contract.ts";
import type { AccessIdentity } from "../access.ts";
import { accessToken, finishSignIn, SignInEnded, startSignIn, takeSignIn } from "./auth.ts";
import { McpFailure } from "./client.ts";
import { checkedAddress, discover, McpRefusal, type Send } from "./discover.ts";
import { sealReady } from "./seal.ts";
import { callTool } from "./call.ts";
import { readTools, saveTools } from "./tools.ts";
import { connectLink, foreign, fresh, mcpCaller, mcpError, now, serverAuth, serverRows, serverView, type Caller, type McpEnv, type Server } from "./store.ts";

export const MCP_PREFIX = "/api/mcp/";
const MAX_SERVERS = 50;
const addSchema = z.strictObject({ url: z.string().max(2000), name: z.string().trim().min(1).max(60).optional() });
const shareSchema = z.strictObject({ share: z.enum(["none", "read", "all"]), email: z.email().transform(value => value.toLowerCase()).optional() });

/** The JSON body, or null when it is missing, too large or not an object. */
async function json(request: Request, max = 65_536): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return null;
  try { return JSON.parse(await boundedText(request.body, max)); } catch { return null; }
}

/** A name for an MCP given none: its address's main word, `mcp.canva.com` → Canva. */
const named = (url: URL) => {
  const word = url.hostname.split(".").filter(part => !["mcp", "www", "api"].includes(part)).at(-2) ?? url.hostname;
  return word.charAt(0).toUpperCase() + word.slice(1);
};
/** A free id from the name: lowercase words joined by hyphens, numbered when taken. */
async function freeId(caller: Caller, name: string): Promise<string> {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "mcp";
  const { results } = await caller.db.prepare("SELECT id FROM wong_mcp_servers WHERE installation_id = ?").bind(caller.installationId).all<{ id: string }>();
  const taken = new Set(results.map(row => row.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

async function view(caller: Caller, id: string, status = 200): Promise<Response> {
  const [row] = await serverRows(caller, id);
  return fresh({ server: serverView(caller, row) }, status);
}

async function add(caller: Caller, request: Request, send: Send): Promise<Response> {
  const parsed = addSchema.safeParse(await json(request));
  if (!parsed.success) return mcpError("invalid_input");
  let url: URL;
  try { url = checkedAddress(parsed.data.url); } catch (error) { return mcpError("mcp_refused", 422, (error as Error).message); }
  const { results } = await caller.db.prepare("SELECT name, url FROM wong_mcp_servers WHERE installation_id = ?").bind(caller.installationId).all<{ name: string; url: string }>();
  const same = results.find(row => row.url === url.href);
  if (same) return mcpError("mcp_exists", 409, `That MCP is already added, as ${same.name}.`);
  if (results.length >= MAX_SERVERS) return mcpError("mcp_limit", 409, `The app holds at most ${MAX_SERVERS} MCPs. Remove one first.`);
  let found;
  try { found = await discover(send, url); } catch (error) { return mcpError("mcp_refused", 422, (error as Error).message); }
  const name = parsed.data.name ?? named(url);
  const id = await freeId(caller, name);
  await caller.db.prepare(`INSERT INTO wong_mcp_servers (installation_id, id, name, url, resource, authorize_endpoint, token_endpoint,
    registration_endpoint, auth_method, scopes, added_by, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(caller.installationId, id, name, url.href, found.resource, found.authorize, found.token, found.register, found.method, found.scopes, caller.email, now()).run();
  return view(caller, id, 201);
}

async function connect(caller: Caller, server: Server, send: Send): Promise<Response> {
  try { return fresh({ authorize: await startSignIn(caller, server, send) }); }
  catch (error) { return mcpError("mcp_refused", 422, error instanceof McpRefusal ? error.message : `${server.name} did not answer. Try again.`); }
}

/** The service sends the person back here. Every outcome lands on the Services view, which says what happened. */
async function callback(caller: Caller, url: URL, send: Send): Promise<Response> {
  const back = (id: string, outcome: string) => Response.redirect(`${caller.origin}/apps/access/services${id && `/${id}`}?${outcome}`, 302);
  const taken = await takeSignIn(caller, url.searchParams.get("state") ?? "");
  if (typeof taken === "string") return back("", `failed=${taken}`);
  const server = await serverAuth(caller, taken.server);
  const code = url.searchParams.get("code");
  if (!server || !code) return back(taken.server, "failed=refused");
  try {
    const tokens = await finishSignIn(caller, server, send, code, taken.verifier);
    // The first sign-in to an MCP reads its tools; a failure here leaves Refresh to try again.
    if (server.tools_json === null) await readTools(send, server.url, tokens.access, [tokens.access, tokens.refresh ?? tokens.access])
      .then(found => saveTools(caller, server.id, found)).catch(() => undefined);
    return back(server.id, "connected=1");
  } catch { return back(server.id, "failed=refused"); }
}

async function share(caller: Caller, id: string, request: Request): Promise<Response> {
  const parsed = shareSchema.safeParse(await json(request));
  if (!parsed.success) return mcpError("invalid_input");
  const { share: choice, email = caller.email } = parsed.data;
  const update = (to: string, who: string) => caller.db.prepare("UPDATE wong_mcp_connections SET share = ? WHERE installation_id = ? AND server_id = ? AND email = ?")
    .bind(to, caller.installationId, id, who).run();
  if (email !== caller.email) {
    // Only the owner or an Admin stops someone else's share, and nobody turns one on for them.
    if (!caller.manages || choice !== "none") return mcpError("forbidden");
    await update("none", email);
    return view(caller, id);
  }
  const [row] = await serverRows(caller, id);
  if (choice !== "none") {
    if (row.own_state !== "connected") return mcpError("mcp_not_connected", 409, `Connect ${row.name} before you share it.`, connectLink(caller.origin, id));
    if (row.shared_who && row.shared_who !== caller.email) return mcpError("mcp_share_taken", 409, `${row.shared_who} is sharing theirs. One sign-in per MCP can be shared.`);
  }
  try { await update(choice, email); } catch { return mcpError("mcp_share_taken", 409, "Someone else just shared theirs. One sign-in per MCP can be shared."); }
  return view(caller, id);
}

async function refresh(caller: Caller, server: Server, send: Send): Promise<Response> {
  const link = connectLink(caller.origin, server.id);
  try {
    const tokens = await accessToken(caller, server, caller.email, send);
    await saveTools(caller, server.id, await readTools(send, server.url, tokens.access, [tokens.access, tokens.refresh ?? tokens.access]));
  } catch (error) {
    if (error instanceof SignInEnded) return mcpError("mcp_not_connected", 409, `Connect ${server.name} first.`, link);
    return mcpError("bad_answer", 502, error instanceof McpFailure && error.code === "refused" ? error.message : `${server.name} did not send its tool list. Try again.`);
  }
  return view(caller, server.id);
}

async function remove(caller: Caller, id: string): Promise<Response> {
  const [row] = await serverRows(caller, id);
  if (!serverView(caller, row).removable) {
    return mcpError("mcp_remove_denied", 403, row.added_by === caller.email ? `Others are connected to ${row.name}: ask the owner or an Admin to remove it.`
      : `Only whoever added ${row.name}, the owner or an Admin can remove it.`);
  }
  const where = "WHERE installation_id = ? AND server_id = ?";
  await caller.db.batch([
    caller.db.prepare(`DELETE FROM wong_mcp_sign_ins ${where}`).bind(caller.installationId, id),
    caller.db.prepare(`DELETE FROM wong_mcp_connections ${where}`).bind(caller.installationId, id),
    caller.db.prepare("DELETE FROM wong_mcp_servers WHERE installation_id = ? AND id = ?").bind(caller.installationId, id),
  ]);
  return fresh({ removed: true });
}

/** One server's routes, after it is known to exist. */
async function onServer(caller: Caller, request: Request, server: Server, action: string, send: Send): Promise<Response> {
  const route = `${request.method} ${action}`;
  if (route === "POST connect") return connect(caller, server, send);
  if (route === "POST share") return share(caller, server.id, request);
  if (route === "POST refresh") return refresh(caller, server, send);
  if (route === "POST disconnect") {
    await caller.db.prepare("DELETE FROM wong_mcp_connections WHERE installation_id = ? AND server_id = ? AND email = ?")
      .bind(caller.installationId, server.id, caller.email).run();
    return view(caller, server.id);
  }
  if (route === "DELETE ") return remove(caller, server.id);
  return mcpError("not_found", 404, "Not found");
}

export async function handleMcp(request: Request, env: McpEnv, identity: AccessIdentity | null, send: Send = (...call) => fetch(...call)): Promise<Response> {
  const url = new URL(request.url);
  if (foreign(request)) return mcpError("forbidden");
  const caller = await mcpCaller(request, env, identity);
  if (caller instanceof Response) return caller;
  const path = url.pathname.slice(MCP_PREFIX.length);
  if (request.method === "GET" && path === "servers") {
    const rows = await serverRows(caller);
    return fresh({ sealed: sealReady(env), manages: caller.manages, me: caller.email, servers: rows.map(row => serverView(caller, row)) });
  }
  // Everything below opens or seals a sign-in, or leads to one.
  if (!sealReady(env)) return mcpError("unavailable");
  if (request.method === "GET" && path === "callback") return callback(caller, url, send);
  if (request.method === "POST" && path === "servers") return add(caller, request, send);
  const tool = /^([a-z0-9-]+)\/tools\/([^/]+)$/.exec(path);
  if (tool && request.method === "POST") return callTool(caller, request, tool[1], decodeURIComponent(tool[2]), send);
  const [, id, action = ""] = /^servers\/([a-z0-9-]+)(?:\/([a-z]+))?$/.exec(path) ?? [];
  const server = id ? await serverAuth(caller, id) : null;
  return server ? onServer(caller, request, server, action, send) : mcpError("not_found");
}
