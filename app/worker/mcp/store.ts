// Who is asking and what the app holds for them: the MCP rows, read once per call. No row read here holds an
// opened sign-in. wiki/stack/mcp-connections.md
import type { AccessIdentity } from "../access.ts";
import { currentPolicy, humanEmail, isChecker, type CurrentPolicy, type PolicyEnv } from "../employee-access/policy.ts";
import { sealReady, type SealEnv } from "./seal.ts";

export type McpEnv = PolicyEnv & SealEnv;
type Share = "none" | "read" | "all";
/** A signed-in person, or the preview checker, with the installation their rows sit under. */
export type Caller = { db: D1DatabaseSession; env: McpEnv; installationId: string; email: string; manages: boolean; origin: string };
/** One MCP's sign-in details and saved tools, as only app/worker/mcp/ reads them. */
export type Server = { id: string; name: string; url: string; resource: string; authorize_endpoint: string; token_endpoint: string;
  registration_endpoint: string; auth_method: "none" | "client_secret_post"; registration: string | null; scopes: string; tools_json: string | null };
/** One tool as the app saved it from the MCP's own list. */
export type Tool = { name: string; title?: string; description?: string; readOnly: boolean;
  inputSchema: { type: "object"; properties: Record<string, unknown>; [key: string]: unknown } };

const MESSAGES: Record<string, [number, string]> = {
  authentication_required: [401, "Company login required"], forbidden: [403, "Action denied"],
  not_found: [404, "No MCP by that name"], invalid_input: [400, "Invalid input"],
  unavailable: [503, "Connecting MCPs needs one more step from the owner: ask the assistant to run the update."],
};

/** The shared error shape, with plain words; `connect` is the link that fixes it, when one does. */
export function mcpError(code: string, status = MESSAGES[code]?.[0] ?? 400, message = MESSAGES[code]?.[1] ?? code, connect?: string): Response {
  return Response.json({ error: { code, message, requestId: crypto.randomUUID(), ...(connect && { connect }) } },
    { status, headers: { "Cache-Control": "no-store" } });
}
export const fresh = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const now = () => new Date().toISOString();

/** The page that opens on one MCP's Connect, in this copy of the app. */
export const connectLink = (origin: string, id: string) => `${origin}/apps/access/services/${id}`;

/** The email a caller's rows are kept under: a verified person's, or the checker's own name. */
const callerEmail = (identity: AccessIdentity | null): string | null =>
  humanEmail(identity) ?? (isChecker(identity) ? identity!.id.toLowerCase() : null);

/** The caller, or the refusal to answer with. Anyone whom Access lets in counts; no level is asked. A route that
 *  already read the caller's permissions passes them in. */
export async function mcpCaller(request: Request, env: McpEnv, identity: AccessIdentity | null, known?: CurrentPolicy): Promise<Caller | Response> {
  const email = callerEmail(identity);
  if (!email) return mcpError("authentication_required");
  const policy = known ?? await currentPolicy(env, identity);
  if (policy.state === "denied") return mcpError("forbidden");
  if (policy.state === "legacy" || policy.state === "unavailable" || !env.DB) return mcpError("unavailable", 503, "MCPs are not available on this app yet.");
  const db = env.DB.withSession("first-primary");
  const row = await db.prepare("SELECT installation_id FROM wong_access_installation WHERE slot = 1").first<{ installation_id: string }>();
  if (!row) return mcpError("unavailable", 503, "The owner opens Access once before anyone adds an MCP.");
  return { db, env, installationId: row.installation_id, email, manages: policy.manages, origin: new URL(request.url).origin };
}

/** A browser on another site can not press a button here: a write from a foreign page is refused. */
export const foreign = (request: Request): boolean => request.method !== "GET" &&
  ((!!request.headers.get("Origin") && request.headers.get("Origin") !== new URL(request.url).origin) ||
    request.headers.get("Sec-Fetch-Site") === "cross-site");

/** The first line of what the MCP says it is for, short enough for one row. */
export const purposeOf = (instructions: string | null): string => (instructions ?? "").trim().split("\n")[0].slice(0, 120);

/** The saved tool list, or none. */
export function toolsOf(json: string | null): Tool[] {
  try { const list: unknown = JSON.parse(json ?? "[]"); return Array.isArray(list) ? list as Tool[] : []; } catch { return []; }
}

type Row = { id: string; name: string; url: string; instructions: string | null; tools: number; tools_json: string | null; tools_at: string | null; added_by: string;
  connected: number; others: number; shared_who: string | null; shared_share: Share | null;
  own_state: "connected" | "reconnect" | null; own_account: string | null; own_at: string | null; own_share: Share | null; own_live: number };

/** Every MCP, or one, as the caller sees it: counts, who shares, and the caller's own state. Never a token. */
export async function serverRows(caller: Caller, id?: string): Promise<Row[]> {
  const { results } = await caller.db.prepare(`SELECT s.id, s.name, s.url, s.instructions, s.tools_json, s.tools_at, s.added_by,
      coalesce(json_array_length(s.tools_json), 0) AS tools,
      (SELECT count(*) FROM wong_mcp_connections c WHERE c.installation_id = s.installation_id AND c.server_id = s.id AND c.state = 'connected') AS connected,
      (SELECT count(*) FROM wong_mcp_connections c WHERE c.installation_id = s.installation_id AND c.server_id = s.id AND c.email <> ?1) AS others,
      sh.email AS shared_who, sh.share AS shared_share,
      o.state AS own_state, o.account_label AS own_account, o.connected_at AS own_at, o.share AS own_share,
      (o.state = 'connected' AND o.tokens IS NOT NULL) AS own_live
    FROM wong_mcp_servers s
    LEFT JOIN wong_mcp_connections sh ON sh.installation_id = s.installation_id AND sh.server_id = s.id AND sh.share <> 'none' AND sh.state = 'connected'
    LEFT JOIN wong_mcp_connections o ON o.installation_id = s.installation_id AND o.server_id = s.id AND o.email = ?1
    WHERE s.installation_id = ?2 AND (?3 IS NULL OR s.id = ?3) ORDER BY s.name, s.id`).bind(caller.email, caller.installationId, id ?? null).all<Row>();
  return results;
}

/** One row as the Services view and the helper read it. */
export const serverView = (caller: Caller, row: Row) => ({
  id: row.id, name: row.name, url: row.url, purpose: purposeOf(row.instructions), tools: row.tools, toolsAt: row.tools_at,
  connected: row.connected, shared: row.shared_who ? { who: row.shared_who, share: row.shared_share! } : null,
  own: row.own_state ? { state: row.own_state, account: row.own_account, at: row.own_at!, share: row.own_share! } : null,
  addedBy: row.added_by, removable: caller.manages || (row.added_by === caller.email && row.others === 0),
  connect: connectLink(caller.origin, row.id),
});

/** Whether a call from the caller could run now, and whose sign-in it would use: their own first, else the share. */
export function readiness(caller: Caller, row: Row): { own: boolean; share: { who: string; share: "read" | "all" } | null } {
  const sealed = sealReady(caller.env);
  const own = sealed && row.own_live === 1;
  const share = sealed && !own && row.shared_who && row.shared_who !== caller.email ? { who: row.shared_who, share: row.shared_share as "read" | "all" } : null;
  return { own, share };
}

/** One MCP's sign-in details, or null. */
export const serverAuth = (caller: Caller, id: string) => caller.db.prepare(`SELECT id, name, url, resource, authorize_endpoint, token_endpoint,
  registration_endpoint, auth_method, registration, scopes, tools_json FROM wong_mcp_servers WHERE installation_id = ? AND id = ?`)
  .bind(caller.installationId, id).first<Server>();
