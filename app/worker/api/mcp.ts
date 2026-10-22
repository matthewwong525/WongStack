// Sorts one JSON-RPC message to a key's MCP server into a look-up or a change, by its method and tool.
// wiki/stack/company-api.md#use-an-mcp-server-through-the-app

/** The protocol version the door names to the server, as the client's `initialize` does. */
export const MCP_VERSION = "2025-06-18";
const LOOKUPS = ["initialize", "notifications/initialized", "tools/list"];
/** A tool or method name as MCP allows one: 1 to 128 ASCII letters, digits, `_`, `.`, `/` or `-`. */
export const TOOL_NAME = /^[\w./-]{1,128}$/;
type Sorted = { effect: "read" | "write"; operation?: string };
const change: Sorted = { effect: "write" };

/** One JSON-RPC message, sorted. Only opening the session, listing tools, and a tool in `reads` look up: any other
 *  method, any other tool, a batch, a malformed name and a body that does not parse are changes. */
export function rpcEffect(body: string | null, reads: readonly string[]): Sorted {
  let message: unknown;
  try { message = JSON.parse(body ?? ""); } catch { return change; }
  if (!message || typeof message !== "object" || Array.isArray(message)) return change;
  const { method, params } = message as { method?: unknown; params?: unknown };
  if (typeof method !== "string") return change;
  if (LOOKUPS.includes(method)) return { effect: "read", operation: method };
  if (method !== "tools/call") return TOOL_NAME.test(method) ? { effect: "write", operation: method } : change;
  const tool = params && typeof params === "object" ? (params as { name?: unknown }).name : undefined;
  if (typeof tool !== "string" || !TOOL_NAME.test(tool)) return change;
  return { effect: reads.includes(tool) ? "read" : "write", operation: tool };
}
