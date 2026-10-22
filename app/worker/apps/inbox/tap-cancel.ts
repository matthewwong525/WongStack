import { z } from "zod";
import { fail, findTap, inboxAction, itemId, mine, settleTaps, tap } from "./store.ts";

/** POST tap-cancel → takes back a tap still waiting for the computer. One it has collected stays as it is. */
export const tapCancel = inboxAction<{ id: string }>({
  operationId: "inbox.tap-cancel", summary: "Take back a tap", description: "Cancel a tap that is still waiting for the computer.",
  input: z.strictObject({ id: itemId.describe("The tap's id.") }), output: z.strictObject({ tap }), encoding: "json", effect: "write",
  async run(at, { id }) {
    await settleTaps(at);
    const cancelled = await mine(at, `UPDATE inbox_taps SET state = 'cancelled', answered_at = ?4
      WHERE installation_id = ?1 AND email = ?2 AND id = ?3 AND state = 'waiting' RETURNING id`, id, at.now).first();
    const found = await findTap(at, id);
    if (!found) return fail("not_found", 404);
    return cancelled ? Response.json({ tap: found }) : fail("not_waiting", 409);
  },
});
