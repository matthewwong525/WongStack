import { z } from "zod";
import { dropFiles } from "./files.ts";
import { fail, findTap, inboxAction, itemId, mine, settleTaps, tap } from "./store.ts";

/** POST tap-result → the computer reports what became of a tap it collected: sent, failed, the plan had changed, or its
 *  item closed first. Only a `delivering` tap takes it; one that timed out stays failed. Its files go either way. */
export const tapResult = inboxAction<{ id: string; state: string }>({
  operationId: "inbox.tap-result", summary: "Report a tap", description: "Say whether a collected tap reached its chat.",
  input: z.strictObject({ id: itemId.describe("The tap's id."), state: z.enum(["sent", "failed", "changed", "expired"]).describe("What became of it.") }),
  output: z.strictObject({ tap }), encoding: "json", effect: "write",
  async run(at, { id, state }) {
    await settleTaps(at);
    await mine(at, `UPDATE inbox_taps SET state = ?4, answered_at = ?5 WHERE installation_id = ?1 AND email = ?2 AND id = ?3
      AND state = 'delivering'`, id, state, at.now).run();
    await dropFiles(at);
    await at.wake(null);
    const found = await findTap(at, id);
    return found ? Response.json({ tap: found }) : fail("not_found", 404);
  },
});
