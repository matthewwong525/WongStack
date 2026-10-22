import { z } from "zod";
import { fail, findTap, inboxAction, itemId, settleTaps, tap } from "./store.ts";

/** GET tap?id= → where one of the person's taps stands. */
export const tapStatus = inboxAction<{ id: string }>({
  operationId: "inbox.tap-status", summary: "Check a tap", description: "Whether a tap is waiting, sent, failed, changed, cancelled or expired.",
  input: z.strictObject({ id: itemId.describe("The tap's id.") }), output: z.strictObject({ tap }), encoding: "query", effect: "read",
  async run(at, { id }) {
    await settleTaps(at);
    const found = await findTap(at, id);
    return found ? Response.json({ tap: found }) : fail("not_found", 404);
  },
});
