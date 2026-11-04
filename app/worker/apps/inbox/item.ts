import { z } from "zod";
import { heldFiles } from "./files.ts";
import { inboxAction, item as listedItem, itemId, type ItemRow, listed, online, openItem, settleTaps } from "./store.ts";

/** GET item?id= → one open item with its body (HTML for a plan, else JSON), the files the app still holds for it, and
 *  whether the computer is on. */
export const item = inboxAction<{ id: string }>({
  operationId: "inbox.item", summary: "Open one item", description: "One of the signed-in person's open items, with its body.",
  input: z.strictObject({ id: itemId.describe("The item's id.") }),
  output: z.strictObject({ item: z.strictObject({ ...listedItem.shape, body: z.string(), files: z.array(itemId) }), computerOnline: z.boolean() }),
  encoding: "query", effect: "read", limits: { inputBytes: 65536, outputBytes: 4194304, timeoutMs: 15000 },
  async run(at, { id }) {
    await settleTaps(at);
    const row = await openItem<ItemRow & { body: string }>(at, id, ", body");
    return row instanceof Response ? row
      : Response.json({ item: { ...listed(row), body: row.body, files: await heldFiles(at, id) }, computerOnline: await online(at) });
  },
});
