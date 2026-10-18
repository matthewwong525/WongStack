// POST /api/mcp/<id>/tools/<tool>: one tool call with the caller's own sign-in, else the team's shared one, which
// runs look-ups only unless its owner chose everything. Nothing is sent when neither covers the call.
import { boundedText } from "../api/contract.ts";
import { accessToken, SignInBusy, SignInEnded, type Tokens } from "./auth.ts";
import { mcpSession, McpFailure } from "./client.ts";
import type { Send } from "./discover.ts";
import { readTools, saveTools, shareCovers } from "./tools.ts";
import { connectLink, fresh, mcpError, readiness, serverAuth, serverRows, toolsOf, type Caller, type Server, type Tool } from "./store.ts";

/** One record per call: who asked, whose sign-in it used, the MCP, the tool and its kind. Never its input or answer. */
const record = (line: { caller: string; as: string; key: string; kind: "read" | "change"; path: string; status: number }) =>
  console.log(JSON.stringify({ event: "mcp_request", ...line }));
const secrets = (token: Tokens) => [token.access, token.refresh ?? token.access];

/** The tool's inputs: a JSON object, or null. */
async function inputs(request: Request): Promise<Record<string, unknown> | null> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return null;
  try {
    const value: unknown = JSON.parse(await boundedText(request.body, 1_048_576));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

/** The tool from a list read once more from the MCP, when the saved one lacks it. */
async function reread(caller: Caller, server: Server, name: string, token: Tokens, send: Send): Promise<Tool | undefined> {
  try {
    const found = await readTools(send, server.url, token.access, secrets(token));
    await saveTools(caller, server.id, found);
    return found.tools.find(tool => tool.name === name);
  } catch { return undefined; }
}

/** The tool's answer from one session, renewing the sign-in once if the MCP refuses it. */
async function run(caller: Caller, server: Server, who: string, name: string, args: object, token: Tokens, send: Send) {
  const once = (signedIn: Tokens) => {
    const session = mcpSession(send, server.url, signedIn.access, secrets(signedIn));
    return session.open().then(() => session.request("tools/call", { name, arguments: args }));
  };
  try { return await once(token); } catch (error) {
    // A refused sign-in sent nothing the MCP acted on, so one retry with a renewed one is safe.
    if (!(error instanceof McpFailure) || error.code !== "unauthorized") throw error;
    return once(await accessToken(caller, server, who, send, true));
  }
}

/** Why a sign-in could not be used, in plain words with the link that fixes it. */
function signInError(error: unknown, server: Server, own: boolean, link: string): Response {
  if (error instanceof SignInBusy) return mcpError("unavailable", 503, `${server.name} is renewing this sign-in. Try again in a moment.`);
  if (!(error instanceof SignInEnded)) return mcpError("unavailable", 503, `${server.name} did not renew the sign-in. Try again.`);
  return own ? mcpError("mcp_reconnect", 409, `Your ${server.name} sign-in ended. Connect it again.`, link)
    : mcpError("mcp_not_connected", 409, `The shared ${server.name} sign-in ended. Connect your own.`, link);
}

/** No sign-in covers the call: the caller's own ended, or there is none. */
const notConnected = (ended: boolean, server: Server, link: string) => ended
  ? mcpError("mcp_reconnect", 409, `Your ${server.name} sign-in ended. Connect it again.`, link)
  : mcpError("mcp_not_connected", 409, `Connect ${server.name} first.`, link);

function failed(error: unknown, server: Server, kind: "read" | "change"): Response {
  const failure = error instanceof McpFailure ? error : new McpFailure("bad_answer");
  if (failure.code === "timeout") return mcpError("timeout", 504, kind === "change"
    ? "The call timed out. Whether it changed anything is unknown: check before trying again." : "The call timed out.");
  return mcpError("bad_answer", 502, failure.code === "refused" ? `${server.name} refused the call: ${failure.message}` : `${server.name} did not return an answer that can be shown.`);
}

export async function callTool(caller: Caller, request: Request, id: string, name: string, send: Send): Promise<Response> {
  const server = await serverAuth(caller, id);
  if (!server) return mcpError("not_found");
  const args = await inputs(request);
  if (!args) return mcpError("invalid_input", 400, "Send the tool's inputs as a JSON object.");
  const link = connectLink(caller.origin, id);
  const [row] = await serverRows(caller, id);
  const { own, share } = readiness(caller, row);
  if (!own && !share) return notConnected(row.own_state === "reconnect", server, link);
  const who = own ? caller.email : share!.who;
  const readOnly = () => mcpError("mcp_share_read_only", 403, `${who}'s shared ${server.name} sign-in allows look-ups only. Connect your own.`, link);
  let tool = toolsOf(server.tools_json).find(each => each.name === name);
  // A look-ups-only share runs only what the app's own saved list marks as a look-up: nothing else is sent.
  if (share && tool && !shareCovers(share.share, tool)) return readOnly();
  let token: Tokens;
  try { token = await accessToken(caller, server, who, send); } catch (error) { return signInError(error, server, own, link); }
  tool ??= await reread(caller, server, name, token, send);
  if (share && !shareCovers(share.share, tool)) return readOnly();
  const kind = tool?.readOnly ? "read" : "change";
  let status = 502;
  try {
    const result = await run(caller, server, who, name, args, token, send);
    status = 200;
    return fresh({ ...result, ...(share && { via: share.who }) });
  } catch (error) {
    if (error instanceof SignInEnded || error instanceof SignInBusy) { status = 401; return signInError(error, server, own, link); }
    if (error instanceof McpFailure && error.code === "timeout") status = 504;
    return failed(error, server, kind);
  } finally {
    record({ caller: caller.email, as: who, key: `mcp:${id}`, kind, path: name, status });
  }
}
