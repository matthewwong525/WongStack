import { z } from "zod";
import { endedAt, fail, findItem, inboxAction, item as listedItem, itemId, type ItemRow, listed, mine, online, type Scope } from "./store.ts";

const time = z.number().int().nonnegative();
/** A closed review page: when it closed, and each answer that reached the chat, oldest first. */
const archived = z.strictObject({ endedAt: time, answers: z.array(z.strictObject({ action: z.string(), text: z.string(), at: time })) });

/** The answers that reached the chat on the caller's item `id`. */
const answers = async (at: Scope, id: string) => (await mine(at, `SELECT action, text, answered_at AS at FROM inbox_taps
  WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3 AND state = 'sent' ORDER BY answered_at, rowid`, id)
  .all<z.infer<typeof archived>["answers"][number]>()).results;

/** GET item?id= → one item with its body (HTML for a plan, else JSON), and whether the computer is on. An open item of
 *  any kind opens; a closed review page opens read-only with its answers; any other closed item is gone. */
export const item = inboxAction<{ id: string }>({
  operationId: "inbox.item", summary: "Open one item", description: "One of the signed-in person's open items, or a closed review page, with its body.",
  input: z.strictObject({ id: itemId.describe("The item's id.") }),
  output: z.strictObject({ item: z.strictObject({ ...listedItem.shape, body: z.string(), archived: archived.optional() }), computerOnline: z.boolean() }),
  encoding: "query", effect: "read",
  limits: { inputBytes: 65536, outputBytes: 4194304, timeoutMs: 15000 },
  async run(at, { id }) {
    const row = await findItem<ItemRow & { body: string }>(at, id, ", body");
    if (row instanceof Response) return row;
    const ended = endedAt(row, at.now);
    if (ended !== null && row.kind !== "plan") return fail("closed", 410);
    const shown = { ...listed(row), body: row.body, ...(ended !== null && { archived: { endedAt: ended, answers: await answers(at, id) } }) };
    return Response.json({ item: shown, computerOnline: await online(at) });
  },
});
