// One saved tool list per MCP, the same for everyone: read from the MCP on a first Connect, a call naming a tool it
// lacks, or Refresh, and never during a search. Each tool is an operation in the company catalogue.
import { refuseExternalReferences } from "../../../.agents/skills/memory/scripts/lib/operations.mjs";
import { mcpSession } from "./client.ts";
import type { Send } from "./discover.ts";
import { now, readiness, serverRows, toolsOf, type Caller, type Tool } from "./store.ts";

const MAX_TOOLS = 200;
const MAX_PAGES = 10;
const NAME = /^[A-Za-z0-9_.-]{1,128}$/;
const EMPTY = (): Tool["inputSchema"] => ({ type: "object", properties: {} });
const text = (value: unknown, max: number): string | undefined => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

/** A tool's input schema as the catalogue may show it: an object with no reference to fetch, and not too large. */
function inputSchema(value: unknown): Tool["inputSchema"] {
  try {
    const schema = refuseExternalReferences(value) as Record<string, unknown> | null;
    return schema?.type === "object" && JSON.stringify(schema).length <= 8_192
      ? { ...schema, type: "object", properties: (schema.properties ?? {}) as Record<string, unknown> } : EMPTY();
  } catch { return EMPTY(); }
}

/** The tools an MCP listed, as the app keeps them. A tool with an odd name is left out. */
export function normalTools(listed: unknown[]): Tool[] {
  return listed.flatMap(item => {
    const tool = (item ?? {}) as Record<string, unknown>;
    const annotations = (tool.annotations ?? {}) as Record<string, unknown>;
    if (typeof tool.name !== "string" || !NAME.test(tool.name)) return [];
    return [{ name: tool.name, title: text(tool.title ?? annotations.title, 200), description: text(tool.description, 2_000),
      inputSchema: inputSchema(tool.inputSchema), readOnly: annotations.readOnlyHint === true }];
  }).slice(0, MAX_TOOLS);
}

/** The MCP's tool list and its own description of itself, read with one live sign-in. */
export async function readTools(send: Send, url: string, token: string, secrets: string[]): Promise<{ tools: Tool[]; instructions: string | null }> {
  const session = mcpSession(send, url, token, secrets);
  const { instructions } = await session.open();
  const listed: unknown[] = [];
  let cursor: unknown;
  for (let page = 0; page < MAX_PAGES && listed.length < MAX_TOOLS; page++) {
    const result = await session.request("tools/list", typeof cursor === "string" ? { cursor } : {});
    listed.push(...(Array.isArray(result.tools) ? result.tools : []));
    cursor = result.nextCursor;
    if (typeof cursor !== "string") break;
  }
  return { tools: normalTools(listed), instructions };
}

export async function saveTools(caller: Caller, id: string, found: { tools: Tool[]; instructions: string | null }): Promise<void> {
  await caller.db.prepare("UPDATE wong_mcp_servers SET tools_json = ?, tools_at = ?, instructions = ? WHERE installation_id = ? AND id = ?")
    .bind(JSON.stringify(found.tools), now(), found.instructions, caller.installationId, id).run();
}

/** Whether a share lets a teammate run this tool: everything, or a tool the saved list marks as a look-up. */
export const shareCovers = (share: "read" | "all", tool: Tool | undefined): boolean => share === "all" || tool?.readOnly === true;

const output = { type: "object", properties: { content: { type: "array" }, structuredContent: {}, isError: { type: "boolean" },
  via: { type: "string", description: "Whose shared sign-in the call used, when it was not the caller's own." } } };
const errors = {
  mcp_not_connected: "Connect this MCP first: open the link in the error.",
  mcp_reconnect: "Your sign-in to this MCP ended. Connect it again: open the link in the error.",
  mcp_share_read_only: "The shared sign-in allows look-ups only. Connect your own: open the link in the error.",
  bad_answer: "The MCP did not return an answer that can be shown.",
};

/** Every saved MCP tool as an operation for this caller, and what moves when their readiness does. No MCP is called. */
export async function mcpOperations(caller: Caller) {
  const rows = await serverRows(caller);
  const operations = rows.flatMap(row => {
    const ready = readiness(caller, row);
    return toolsOf(row.tools_json).map(tool => ({
      operationId: `mcp.${row.id}.${tool.name}`, summary: tool.title ?? tool.description?.split(/(?<=\.)\s/)[0].slice(0, 200) ?? tool.name,
      description: `${row.name}'s ${tool.name} tool. ${tool.description ?? ""}`.trim(), app: `mcp:${row.id}`,
      method: "POST", path: `/api/mcp/${row.id}/tools/${encodeURIComponent(tool.name)}`, encoding: "json" as const,
      effect: tool.readOnly ? "read" as const : "external" as const, source: "mcp", transport: "http", authentication: "cloudflare-access",
      readiness: ready.own || (ready.share && shareCovers(ready.share.share, tool)) ? "available" : "needs_connect",
      inputSchema: tool.inputSchema, outputSchema: output, errors, examples: [],
    }));
  });
  const state = rows.map(row => [row.id, row.tools_at, row.own_state, row.own_live, row.shared_who, row.shared_share]);
  return { operations, state };
}
