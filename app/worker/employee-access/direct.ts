// The owner's choice, for each key whose service is set up, of whether an assistant may use the key directly:
// off, look-ups only, or look-ups and changes. A row is a choice that is on; no row is off, so an update turns
// nothing on. wiki/stack/employee-access.md#key-levels
import { z } from "zod";
import { type Core, AccessError } from "./core.ts";
import { directModes, forwards, offered, registered, type Level } from "./key-levels.ts";
import { save } from "./sets.ts";

const choiceSchema = z.object({ key: z.string(), mode: z.enum(["off", "read", "write"]) }).strict();

/** Set one key's choice. It changes nobody's sign-in, so no provider is called; the revision moves, so the next
 *  request and the next list of actions are judged by it. */
export async function changeDirect(core: Core, value: unknown): Promise<void> {
  const parsed = choiceSchema.safeParse(value);
  if (!parsed.success) throw new AccessError("invalid_direct", 400);
  const { key, mode } = parsed.data;
  if (!registered(key) || !forwards(key)) throw new AccessError("direct_not_set_up", 400);
  if (mode !== "off" && !offered(key).includes(mode)) throw new AccessError("level_not_offered", 400);
  const id = core.installationId;
  await save(core, [`direct_use_changed:${key}:${mode}`], [
    core.db.prepare("DELETE FROM wong_access_key_direct WHERE installation_id = ? AND key_id = ?").bind(id, key),
    ...(mode === "off" ? [] : [core.db.prepare(`INSERT INTO wong_access_key_direct
      VALUES (?1, ?2, ?3, (SELECT revision FROM wong_access_installation WHERE installation_id = ?1))`).bind(id, key, mode)]),
  ]);
}

/** Each key's choice as it counts now, for the screens. */
export async function directChoices(core: Core): Promise<Map<string, Level>> {
  const rows = await core.db.prepare("SELECT key_id, mode FROM wong_access_key_direct WHERE installation_id = ?")
    .bind(core.installationId).all<{ key_id: string; mode: Level }>();
  return directModes(Object.fromEntries(rows.results.map(row => [row.key_id, row.mode])));
}
