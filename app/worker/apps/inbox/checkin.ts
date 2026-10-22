import { z } from "zod";
import { inboxAction, itemId, mine, prune, settleTaps } from "./store.ts";

const waiting = z.strictObject({ id: itemId, item: itemId, action: z.string(), text: z.string(), version: z.string() });
type Waiting = z.infer<typeof waiting>;
/** The most tap JSON one check-in hands out; the rest waits for the next. One tap at its longest is under a fifth. */
const BATCH_BYTES = 512 * 1024;

/** The oldest taps whose JSON fits in the batch together. */
function fitting(taps: Waiting[]) {
  let size = 0;
  return taps.filter(tap => (size += new TextEncoder().encode(JSON.stringify(tap)).byteLength + 1) <= BATCH_BYTES);
}

/** POST checkin → the computer says it is here and collects the taps waiting on its own items, oldest first. Each it
 *  collects is `delivering` from then on: it can't be cancelled, and no other check-in gets it again. */
export const checkin = inboxAction<{ items: string[] }>({
  operationId: "inbox.checkin", summary: "Collect waiting taps", description: "The person's computer checks in and collects their waiting taps.",
  input: z.strictObject({ items: z.array(itemId).max(500).describe("The items this computer delivers for.") }),
  output: z.strictObject({ taps: z.array(waiting) }), encoding: "json", effect: "write",
  limits: { inputBytes: 65536, outputBytes: 1048576, timeoutMs: 15000 },
  async run(at, { items }) {
    await mine(at, `INSERT INTO inbox_seen (installation_id, email, last_checkin_at) VALUES (?1, ?2, ?3)
      ON CONFLICT (installation_id, email) DO UPDATE SET last_checkin_at = excluded.last_checkin_at`, at.now).run();
    await settleTaps(at);
    await prune(at);
    const { results } = await mine(at, `SELECT id, item_id AS item, action, text, version FROM inbox_taps
      WHERE installation_id = ?1 AND email = ?2 AND state = 'waiting' AND item_id IN (SELECT value FROM json_each(?3))
      ORDER BY created_at, rowid LIMIT 50`, JSON.stringify(items)).all<Waiting>();
    const batch = fitting(results);
    // Only what this call moved from waiting is handed out: a tap cancelled meanwhile stays cancelled.
    const { results: claimed } = await mine(at, `UPDATE inbox_taps SET state = 'delivering', claimed_at = ?3
      WHERE installation_id = ?1 AND email = ?2 AND state = 'waiting' AND id IN (SELECT value FROM json_each(?4)) RETURNING id`,
    at.now, JSON.stringify(batch.map(tap => tap.id))).all<{ id: string }>();
    const ids = new Set(claimed.map(row => row.id));
    return Response.json({ taps: batch.filter(tap => ids.has(tap.id)) });
  },
});
