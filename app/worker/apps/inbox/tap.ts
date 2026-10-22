import { z } from "zod";
import { actionName, fail, findTap, inboxAction, itemId, type ItemRow, LIMITS, mine, openItem, type Scope, settleTaps, tap as tapShape } from "./store.ts";

type Input = { item: string; action: string; version: string; text?: string };

/** One tap per item per gap, as a reply link allows one send per page: a flood of taps never reaches the chat. */
const TAP_GAP_MS = 5000;

/** Whether the item took a tap within the gap. */
async function tooSoon(at: Scope, item: string) {
  const last = await mine(at, `SELECT MAX(created_at) AS at FROM inbox_taps WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3`,
    item).first<{ at: number | null }>();
  return last?.at != null && at.now - last.at < TAP_GAP_MS;
}

/** The answer that refuses this tap, or null: a link or an agent's status, which take none, an action the item lacks,
 *  empty notes, an old version, or an action already waiting or sent for this version. `send` may go more than once. */
async function refused(at: Scope, row: ItemRow, { action, version, text = "" }: Input) {
  if (row.kind === "link" || row.kind === "agent" || (action === "send" ? !text.trim() : !JSON.parse(row.actions).includes(action))) return fail("bad_action", 400);
  if (version !== row.version) return fail("changed", 409);
  if (action === "send") return null;
  const before = await mine(at, `SELECT 1 FROM inbox_taps WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3 AND action = ?4
    AND version = ?5 AND state IN ('waiting', 'sent')`, row.id, action, version).first();
  return before ? fail("done", 409) : null;
}

/** POST tap → queues the person's tap for their computer, carrying the version of the page they saw. */
export const tap = inboxAction<Input>({
  operationId: "inbox.tap", summary: "Answer an item", description: "Queue a tap on one of the person's items for their computer to deliver.",
  input: z.strictObject({
    item: itemId.describe("The item's id."), action: z.union([z.literal("send"), actionName]).describe("`send` for notes or an answer, else one of the item's actions."),
    version: z.string().max(100).describe("The item's version the person saw."), text: z.string().max(LIMITS.text).optional().describe("Notes or a typed answer."),
  }),
  output: z.strictObject({ tap: tapShape }), encoding: "json", effect: "write",
  async run(at, input) {
    await settleTaps(at);
    const row = await openItem(at, input.item);
    if (row instanceof Response) return row;
    const refusal = await refused(at, row, input);
    if (refusal) return refusal;
    if (await tooSoon(at, row.id)) return fail("too_soon", 429);
    const id = crypto.randomUUID().replaceAll("-", "");
    await mine(at, `INSERT INTO inbox_taps (installation_id, email, id, item_id, action, text, version, created_at, state)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'waiting')`, id, row.id, input.action, input.text?.trim() ?? "", input.version, at.now).run();
    return Response.json({ tap: await findTap(at, id) });
  },
});
