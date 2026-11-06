// Tools added from a chat: kept in D1 beside the code's keys, used directly, live only, and held to the code's own
// key rules when saved and when read. wiki/stack/connect-your-tools.md
import { z } from "zod";
import { forwardProblem, undescribed } from "../key-rules.ts";
import type { KeyEntry } from "./key-levels.ts";

const forward = z.strictObject({
  base: z.string().max(500), secret: z.string().max(100).optional(), header: z.string().max(100), prefix: z.string().max(100).optional(),
  headers: z.record(z.string().regex(/^[A-Za-z0-9-]{1,100}$/), z.string().max(500)).optional(),
  lookups: z.array(z.string().max(300)).max(50).optional(),
  mcp: z.strictObject({ path: z.string().max(300), reads: z.array(z.string()).max(100) }).optional(),
  exchange: z.strictObject({ url: z.string().max(500) }).optional(),
});
const levels = z.union([z.tuple([z.literal("read")]), z.tuple([z.literal("read"), z.literal("write")])]);
/** What a chat saves: name, purpose, API guide, how to reach it and what only reads. Read is the one level unless
 *  the person asked for a key that changes things. */
export const toolInput = z.strictObject({ title: z.string().trim().min(1).max(60), purpose: z.string(), docs: z.string().max(500),
  forward, levels: levels.default(["read"]) });
type ToolInput = z.infer<typeof toolInput>;

/** A tool's id: the same shape as a key used directly, short enough for a secret name. */
export const TOOL_ID = /^[a-z][a-z0-9-]{0,39}$/;
/** The one secret a tool sends, derived from its id and never stored free-form. */
export const toolSecret = (id: string) => `TOOL_${id.toUpperCase().replaceAll("-", "_")}`;

/** A tool as the registry holds it: its own secret, and its ID's when it trades them for a token; live only, marked
 *  as added in a chat. */
const entry = (id: string, tool: ToolInput): KeyEntry => ({ title: tool.title, purpose: tool.purpose, docs: tool.docs,
  secrets: [toolSecret(id), ...(tool.forward.exchange ? [`${toolSecret(id)}_ID`] : [])], levels: tool.levels, liveOnly: true, chat: true,
  forward: { ...tool.forward, secret: tool.forward.secret ?? toolSecret(id) } });

/** The tool as stored, or the first rule it breaks, named: the same rules the checks hold a key in the code to. */
export function checkedTool(id: string, tool: ToolInput): { entry: KeyEntry } | { problem: string } {
  if (!TOOL_ID.test(id)) return { problem: "a tool's id is lowercase letters, digits and hyphens, at most 40" };
  // TOOL_<ID>_ID is the ID of a tool that trades it for a token, so no tool's own key may take that name.
  if (id.endsWith("-id")) return { problem: "a tool's id never ends in -id" };
  const made = entry(id, tool);
  if (made.forward!.secret !== toolSecret(id)) return { problem: `secret must be the tool's own, ${toolSecret(id)}` };
  const problem = undescribed({ [id]: { ...made, docs: made.docs || undefined } })[0] ?? forwardProblem(id, made, made.forward!);
  return problem ? { problem: problem.replace(new RegExp(`^${id}: `), "") } : { entry: made };
}

type Row = { id: string; title: string; purpose: string; docs: string; forward_json: string; levels_json: string };

/** The live app's tools, each read back through the same rules: a row that breaks one is left out. Anywhere else,
 *  or before the table exists, none. */
export async function storedTools(env: { DB?: D1Database; WONG_ENVIRONMENT?: string }): Promise<Record<string, KeyEntry>> {
  if (env.WONG_ENVIRONMENT !== "production" || !env.DB) return {};
  let rows: Row[];
  try {
    rows = (await env.DB.withSession("first-primary").prepare("SELECT id, title, purpose, docs, forward_json, levels_json FROM tools ORDER BY id").all<Row>()).results;
  } catch { return {}; }
  return Object.fromEntries(rows.flatMap(row => {
    let parsed;
    try { parsed = toolInput.safeParse({ title: row.title, purpose: row.purpose, docs: row.docs, forward: JSON.parse(row.forward_json), levels: JSON.parse(row.levels_json) }); }
    catch { return []; }
    const checked = parsed.success ? checkedTool(row.id, parsed.data) : null;
    return checked && "entry" in checked ? [[row.id, checked.entry]] : [];
  }));
}
