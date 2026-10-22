import { z } from "zod";
import { inboxAction, item, ITEM_COLUMNS, type ItemRow, listed, mine, online, settleTaps } from "./store.ts";

/** GET items → the caller's open items, newest first, and whether their computer checked in within a minute. */
export const items = inboxAction({
  operationId: "inbox.items", summary: "List what waits on you", description: "The signed-in person's open plans, approvals, questions, private links, plan cards and agents' status.",
  input: z.strictObject({}), output: z.strictObject({ items: z.array(item), computerOnline: z.boolean() }), encoding: "none", effect: "read",
  // A hundred items at their longest words, each with a short preview of its newest tap.
  limits: { inputBytes: 65536, outputBytes: 4194304, timeoutMs: 15000 },
  async run(at) {
    await settleTaps(at);
    const { results } = await mine(at, `SELECT ${ITEM_COLUMNS} FROM inbox_items i WHERE installation_id = ?1 AND email = ?2
      AND closed_at IS NULL AND closes_at > ?3 ORDER BY created_at DESC LIMIT 100`, at.now).all<ItemRow>();
    return Response.json({ items: results.map(listed), computerOnline: await online(at) });
  },
});
