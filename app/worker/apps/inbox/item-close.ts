import { z } from "zod";
import { inboxAction, itemId, mine, settleTaps } from "./store.ts";

/** POST item-close → the computer closes an item: its answer arrived, its chat closed, or its time ran out. */
export const itemClose = inboxAction<{ id: string }>({
  operationId: "inbox.item-close", summary: "Close an item", description: "Close one of the person's items; its waiting taps never go.",
  input: z.strictObject({ id: itemId.describe("The item's id.") }), output: z.strictObject({ closed: z.literal(true) }), encoding: "json", effect: "write",
  async run(at, { id }) {
    await mine(at, `UPDATE inbox_items SET closed_at = ?4, body = '' WHERE installation_id = ?1 AND email = ?2 AND id = ?3
      AND closed_at IS NULL`, id, at.now).run();
    await settleTaps(at);
    return Response.json({ closed: true });
  },
});
