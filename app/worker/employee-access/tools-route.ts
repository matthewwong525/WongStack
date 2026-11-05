// PUT and DELETE /api/access/tools/<id>: the owner or an Admin adds or removes a tool from a chat, on the live app
// alone, with no publish. Its key is the Worker secret the connect helper saves. wiki/stack/connect-your-tools.md
import type { AccessIdentity } from "../access.ts";
import { keys } from "../keys.ts";
import { type ConnectionEnv, type Core, AccessError, now, ownerCore, reply } from "./core.ts";
import { boundedJson } from "./json.ts";
import { audit, catalogueWrites } from "./sets.ts";
import { startKeyLevels, startPermissions } from "./start.ts";
import type { KeyEntry } from "./key-levels.ts";
import { checkedTool, TOOL_ID, toolInput, toolSecret } from "./tools.ts";

export const TOOLS = "/api/access/tools/";

type StoredReads = { forward_json: string; levels_json: string };
/** What a level on a tool lets a person do: its address, its look-ups, its MCP reads and the levels it offers. */
const reads = (forward: NonNullable<KeyEntry["forward"]>, levels: KeyEntry["levels"]) =>
  JSON.stringify([forward.base, forward.lookups ?? [], forward.mcp ?? null, levels]);
/** Every person's and role's level on the tool, so a tool removed or changed is given again on purpose. */
const clearLevels = (core: Core, id: string) => ["wong_access_key_grants", "wong_access_role_keys"].map(table =>
  core.db.prepare(`DELETE FROM ${table} WHERE installation_id = ? AND key_id = ?`).bind(core.installationId, id));

const refuse = (code: string, status: number, message?: string) => reply({ error: { code, ...(message && { message }) } }, status);

export async function toolsRoute(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Response> {
  try {
    const core = await ownerCore(request, env, identity);
    const id = new URL(request.url).pathname.slice(TOOLS.length);
    if (!TOOL_ID.test(id) || !["PUT", "DELETE"].includes(request.method)) return refuse("not_found", 404);
    // A preview runs branch code, so it holds no tool; a code key's name stays the code's.
    if (!core.live) return refuse("live_only", 409);
    if (Object.hasOwn(keys, id)) return refuse("code_key", 409);
    // As Access's first read does, so a fresh install's first look-up right after a save is not refused.
    await core.db.batch(catalogueWrites(core));
    await startPermissions(core);
    await startKeyLevels(core);
    const before = await core.db.prepare("SELECT forward_json, levels_json FROM tools WHERE id = ?").bind(id).first<StoredReads>();
    if (request.method === "DELETE") {
      if (!before) return refuse("not_found", 404);
      await core.db.batch([core.db.prepare("DELETE FROM tools WHERE id = ?").bind(id), ...clearLevels(core, id), audit(core, "tool_removed")]);
      return reply({ removed: true });
    }
    const parsed = toolInput.safeParse(await boundedJson(request, 16_384));
    if (!parsed.success) return refuse("bad_tool", 400, parsed.error.issues.map(issue => `${issue.path.join(".") || "tool"}: ${issue.message}`).join("; "));
    const checked = checkedTool(id, parsed.data);
    if ("problem" in checked) return refuse("bad_tool", 400, checked.problem);
    const { title, purpose, docs, forward, levels } = checked.entry;
    // A level given for what the tool read before does not carry over to what it reads now.
    const changed = before && reads(JSON.parse(before.forward_json), JSON.parse(before.levels_json)) !== reads(forward!, levels);
    await core.db.batch([...(changed ? clearLevels(core, id) : []), core.db.prepare(`INSERT INTO tools VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, purpose = excluded.purpose, docs = excluded.docs, forward_json = excluded.forward_json,
      levels_json = excluded.levels_json, added_by = excluded.added_by, added_at = excluded.added_at`)
      .bind(id, title, purpose, docs, JSON.stringify(forward), JSON.stringify(levels), core.actor, now()), audit(core, "tool_saved")]);
    return reply({ id, secret: toolSecret(id) });
  } catch (error) {
    return error instanceof AccessError ? refuse(error.code, error.status) : refuse("access_unavailable", 503);
  }
}
