import { z } from "zod";
import { inboxAction, item as listedItem, itemId, type ItemRow, listed, online, openItem } from "./store.ts";

/** GET item?id= → one open item with its body (HTML for a plan, else JSON), and whether the computer is on. */
export const item = inboxAction<{ id: string }>({
  operationId: "inbox.item", summary: "Open one item", description: "One of the signed-in person's open items, with its body.",
  input: z.strictObject({ id: itemId.describe("The item's id.") }),
  output: z.strictObject({ item: z.strictObject({ ...listedItem.shape, body: z.string() }), computerOnline: z.boolean() }), encoding: "query", effect: "read",
  limits: { inputBytes: 65536, outputBytes: 4194304, timeoutMs: 15000 },
  async run(at, { id }) {
    const row = await openItem<ItemRow & { body: string }>(at, id, ", body");
    return row instanceof Response ? row : Response.json({ item: { ...listed(row), body: row.body }, computerOnline: await online(at) });
  },
});
