import { z } from "zod";
import { actionName, agent, detail, fail, inboxAction, itemId, KINDS, LIMITS, link, mine, settleTaps, start, START_ACTIONS } from "./store.ts";

type Input = { id: string; kind: (typeof KINDS)[number]; title: string; workspace: string; body: string; actions: string[]; version: string; closesAt: number };

const parsed = <T>(schema: z.ZodType<T>, body: string): T | null => {
  try { return schema.safeParse(JSON.parse(body)).data ?? null; } catch { return null; }
};
/** Whether a plan card holds its plan exactly when ready, and offers just go and skip. */
const startSound = (body: string, actions: string[]) => {
  const card = parsed(start, body);
  return !!card && (card.state === "ready") === (card.plan !== undefined) && actions.length === START_ACTIONS.length &&
    START_ACTIONS.every(action => actions.includes(action));
};
/** Why the item's body can't be kept, or null: an approval or question needs its words; a link its address alone; a
 *  plan card its state and plan; an agent's status its state, taking no taps. */
const fault = ({ kind, body, actions }: Input) => {
  if (kind === "link") return actions.length === 0 && parsed(link, body) ? null : fail("bad_link", 400);
  if (kind === "start") return startSound(body, actions) ? null : fail("bad_start", 400);
  if (kind === "agent") return actions.length === 0 && parsed(agent, body) ? null : fail("bad_agent", 400);
  return kind === "plan" || parsed(detail, body) ? null : fail("bad_detail", 400);
};

/** PUT item → the computer adds an item or replaces one by id: a new version replaces its body; a closed one opens. */
export const itemPut = inboxAction<Input>({
  operationId: "inbox.item-put", summary: "Add or replace an item", description: "The person's computer puts a plan, approval, question, private link, morning plan card or agent's status in their inbox.",
  input: z.strictObject({
    id: itemId.describe("The item's id, chosen by the computer."), kind: z.enum(KINDS).describe("What the item is."),
    title: z.string().trim().min(1).max(LIMITS.title).describe("The item's title."), workspace: z.string().max(LIMITS.workspace).describe("The workspace that sent it."),
    body: z.string().describe("A plan's HTML, or JSON: an approval's or question's words, a link's {what, url}, a plan card's {state, plan?}, or an agent's {state, step?, action?, proof?}."),
    actions: z.array(actionName).max(LIMITS.actions).describe("The actions a tap may name besides send."),
    version: z.string().min(1).max(100).describe("The body's version."), closesAt: z.number().int().positive().describe("When the item closes, in ms."),
  }),
  output: z.strictObject({ id: itemId, version: z.string() }), encoding: "json", effect: "write",
  limits: { inputBytes: 1048576, outputBytes: 65536, timeoutMs: 15000 },
  async run(at, input) {
    if (new TextEncoder().encode(input.body).byteLength > LIMITS.bodyBytes) return fail("too_large", 413);
    const refused = fault(input);
    if (refused) return refused;
    // A waiting tap on an item that had closed stays expired: reopening never sends it.
    await settleTaps(at);
    await mine(at, `INSERT INTO inbox_items (installation_id, email, id, kind, title, workspace, body, actions, version, created_at, closes_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) ON CONFLICT (installation_id, email, id) DO UPDATE SET kind = excluded.kind,
      title = excluded.title, workspace = excluded.workspace, body = excluded.body, actions = excluded.actions, version = excluded.version,
      closes_at = excluded.closes_at, closed_at = NULL`, input.id, input.kind, input.title, input.workspace, input.body,
    JSON.stringify(input.actions), input.version, at.now, input.closesAt).run();
    return Response.json({ id: input.id, version: input.version });
  },
});
