// One short MCP session over Streamable HTTP: initialize, then one request. JSON or event-stream answers, only to
// the MCP's own address, no redirect followed, bounded in time and size.
import { boundedText } from "../api/contract.ts";
import type { Send } from "./discover.ts";

const VERSION = "2025-06-18";
const LIMIT = 4_194_304;
const TIMEOUT = 60_000;

/** Why a session ended without an answer. `unauthorized`: the sign-in was refused; `refused`: the MCP's own error. */
export class McpFailure extends Error {
  readonly code: "unauthorized" | "timeout" | "bad_answer" | "refused";
  constructor(code: McpFailure["code"], message: string = code) { super(message); this.code = code; }
}

type Message = { id?: unknown; result?: unknown; error?: { message?: unknown } };
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};

/** Every JSON-RPC message in an answer: one object, a batch, or an event stream's `data:` lines. */
function messages(text: string, type: string): Message[] {
  const parse = (part: string): unknown => { try { return JSON.parse(part); } catch { return null; } };
  const values = /text\/event-stream/i.test(type)
    ? text.split(/\r?\n\r?\n/).map(event => event.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n")).map(parse)
    : [parse(text)];
  return values.flatMap(value => Array.isArray(value) ? value : [value]).map(record);
}

/** A session with the MCP at `url`, signed in with `token`. `secrets` must never come back in an answer. */
export function mcpSession(send: Send, url: string, token: string, secrets: string[] = [token]) {
  const signal = AbortSignal.timeout(TIMEOUT);
  let session: string | null = null;
  let id = 0;
  const post = async (body: object): Promise<{ status: number; list: Message[] }> => {
    let response: Response;
    try {
      response = await send(url, { method: "POST", redirect: "manual", signal, body: JSON.stringify(body), headers: {
        Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": VERSION, ...(session && { "Mcp-Session-Id": session }) } });
    } catch { throw new McpFailure(signal.aborted ? "timeout" : "bad_answer"); }
    if (response.status === 401 || response.status === 403) { await response.body?.cancel(); throw new McpFailure("unauthorized"); }
    // A redirect is never followed, so a sign-in can't be sent on; a client error may still carry the MCP's reason.
    if ((response.status >= 300 && response.status < 400) || response.status >= 500) { await response.body?.cancel(); throw new McpFailure("bad_answer"); }
    session = response.headers.get("mcp-session-id") ?? session;
    let text: string;
    try { text = await boundedText(response.body, LIMIT); } catch { throw new McpFailure(signal.aborted ? "timeout" : "bad_answer"); }
    // An answer that hands back the sign-in it was sent could leak it into the chat.
    if (secrets.some(secret => text.includes(secret))) throw new McpFailure("bad_answer");
    return { status: response.status, list: messages(text, response.headers.get("content-type") ?? "") };
  };
  const request = async (method: string, params: object = {}): Promise<Record<string, unknown>> => {
    const asked = ++id;
    const { list } = await post({ jsonrpc: "2.0", id: asked, method, params });
    const found = list.find(message => message.id === asked);
    if (found?.error) throw new McpFailure("refused", String(found.error.message ?? "The MCP refused the call.").slice(0, 300));
    if (!found || !found.result || typeof found.result !== "object") throw new McpFailure("bad_answer");
    return record(found.result);
  };
  return {
    /** Opens the session; the MCP's own description of itself comes back. */
    async open(): Promise<{ instructions: string | null }> {
      const result = await request("initialize", { protocolVersion: VERSION, capabilities: {}, clientInfo: { name: "WongStack", version: "1" } });
      await post({ jsonrpc: "2.0", method: "notifications/initialized" });
      return { instructions: typeof result.instructions === "string" ? result.instructions : null };
    },
    request,
  };
}
