// The person's chat list: each open chat's row, which its computer keeps, and the review page each one waits on.
// Every statement starts with the installation and the caller's email, so no one reads or changes another's row.
import { z } from "zod";
import { agentId, fail, inboxAction, mine, online, type Scope } from "./store.ts";

/** A row no computer told of for this long has gone: its computer is off, and the chat closed with no /close. */
const STALE_MS = 3 * 24 * 3_600_000;
const time = z.number().int().nonnegative();
const computer = z.string().regex(/^[0-9a-f]{32}$/).describe("This computer's id.");
const name = z.string().trim().min(1).max(200).describe("The chat's name, after its step word.");
const folder = z.string().trim().min(1).max(100).describe("The chat's folder name, as its review pages give it.");
const review = z.strictObject({ id: z.string(), title: z.string(), createdAt: time, closesAt: time });
const chat = z.strictObject({ agentId: z.string().nullable(), name: z.string(), step: z.string().nullable(), folder: z.string(),
  source: z.string().nullable(), closeAskedAt: time.nullable(), review: review.nullable() });
type Row = { agent_id: string; name: string; step: string | null; folder: string; source: string | null; close_asked_at: number | null;
  seen_at: number };
type Waiting = { id: string; title: string; workspace: string; chat: string | null; created_at: number; closes_at: number };
type Shown = z.infer<typeof chat> & { order: number };
type Put = { agentId: string; sessionId?: string | null; computer: string; name: string; step?: string | null; folder: string; source?: string | null };
type Synced = { agentId: string; name: string; step?: string | null; folder: string; source?: string | null };
const step = z.string().max(40).nullable().optional().describe("The chat's step word, such as PLAN or APPLY.");
const source = z.string().max(200).nullable().optional().describe("schedule:<key> for a chat a schedule's run opened.");

const shownReview = (item: Waiting) => ({ id: item.id, title: item.title, createdAt: item.created_at, closesAt: item.closes_at });
const shownRow = (row: Row): Shown => ({ agentId: row.agent_id, name: row.name, step: row.step, folder: row.folder, source: row.source,
  closeAskedAt: row.close_asked_at, review: null, order: row.seen_at });
/** A waiting page whose chat the app doesn't know: its own row, named by its title, so it is never hidden. */
const orphan = (item: Waiting): Shown => ({ agentId: null, name: item.title, step: null, folder: item.workspace, source: null,
  closeAskedAt: null, review: shownReview(item), order: item.created_at });

/** Each waiting page, newest first, joins its chat by agent id; one with none joins the newest chat in its folder. */
function joined(rows: Row[], items: Waiting[]) {
  const chats = rows.map(shownRow).sort((a, b) => b.order - a.order);
  const orphans: Shown[] = [];
  for (const item of items) {
    const owner = item.chat ? chats.find(each => each.agentId === item.chat) : chats.find(each => each.folder === item.workspace);
    if (owner && !owner.review) owner.review = shownReview(item);
    else orphans.push(orphan(item));
  }
  const waiting = [...chats.filter(each => each.review), ...orphans].sort((a, b) => b.review!.createdAt - a.review!.createdAt);
  return [...waiting, ...chats.filter(each => !each.review)].map(({ order: _order, ...shown }) => shown);
}

/** The caller's waiting review pages, newest first, from the inbox_items_chats index alone. */
const waitingPages = (at: Scope) => mine(at, `SELECT id, title, workspace, chat, created_at, closes_at FROM inbox_items
  WHERE installation_id = ?1 AND email = ?2 AND kind = 'plan' AND closed_at IS NULL AND closes_at > ?3 AND hidden = 0
  ORDER BY created_at DESC, id DESC LIMIT 100`, at.now).all<Waiting>();

/** GET chats → the caller's open chats, those with a review page waiting first, and whether their computer is on. */
export const chats = inboxAction({
  operationId: "inbox.chats", summary: "List your open chats",
  description: "The signed-in person's open chats with each one's step, folder and waiting review page; waiting ones first.",
  input: z.strictObject({}), output: z.strictObject({ chats: z.array(chat), computerOnline: z.boolean() }), encoding: "none", effect: "read",
  agentAvailable: true, limits: { inputBytes: 65536, outputBytes: 1048576, timeoutMs: 15000 },
  async run(at) {
    await mine(at, "DELETE FROM chats WHERE installation_id = ?1 AND owner = ?2 AND seen_at < ?3", at.now - STALE_MS).run();
    const [rows, items] = await Promise.all([mine(at, `SELECT agent_id, name, step, folder, source, close_asked_at, seen_at FROM chats
      WHERE installation_id = ?1 AND owner = ?2 LIMIT 200`).all<Row>(), waitingPages(at)]);
    return Response.json({ chats: joined(rows.results, items.results), computerOnline: await online(at) });
  },
});

/** PUT chat → a chat's computer writes its row: name, step and folder now. A close ask stays. */
export const chatPut = inboxAction<Put>({
  operationId: "inbox.chat-put", summary: "Put a chat in your list",
  description: "Add or update one of your open chats in the Inbox's chat list, with its current name, step and folder. Read the list to confirm.",
  input: z.strictObject({
    agentId: agentId.describe("The chat's Paseo agent id, else its session id."), sessionId: z.string().max(200).nullable().optional()
      .describe("Memory's id for the chat's session, such as claude:<uuid>."),
    computer, name, step, folder, source,
  }),
  output: z.strictObject({ agentId: z.string() }), encoding: "json", effect: "write", agentAvailable: true, confirmWith: "inbox.chats",
  examples: [{ input: { agentId: "sample-agent", computer: "c0ffee00c0ffee00c0ffee00c0ffee00", name: "Fix the store page", step: "PLAN",
    folder: "store-page" }, output: { agentId: "sample-agent" } }],
  async run(at, input) {
    const row = await mine(at, `INSERT INTO chats (installation_id, owner, agent_id, session_id, computer, name, step, folder, source, seen_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) ON CONFLICT (agent_id) DO UPDATE SET session_id = COALESCE(excluded.session_id,
      chats.session_id), computer = excluded.computer, name = excluded.name, step = excluded.step, folder = excluded.folder,
      source = COALESCE(excluded.source, chats.source), seen_at = excluded.seen_at
      WHERE chats.installation_id = excluded.installation_id AND chats.owner = excluded.owner RETURNING agent_id`, input.agentId,
    input.sessionId ?? null, input.computer, input.name, input.step ?? null, input.folder, input.source ?? null, at.now).first();
    if (!row) return fail("not_yours", 409);
    await at.wake(null);
    return Response.json({ agentId: input.agentId });
  },
});

// A row whose agent id is its own session id is from a chat outside Paseo: the worker can't see it, so never drops it.
const OUTSIDE_PASEO = "session_id IS NOT NULL AND substr(session_id, length(session_id) - length(agent_id)) = ':' || agent_id";

/** POST chats-sync → the worker sends every open chat it watches here: a missing one is added, a listed one is seen now
 *  and, with no step yet, takes the sync's name and step, so a put's newer step wins; the rest here go. */
export const chatsSync = inboxAction<{ computer: string; chats: Synced[] }>({
  operationId: "inbox.chats-sync", summary: "Send this computer's open chats",
  description: "Send every open chat on this computer: missing ones are added, others on this computer leave the list. Returns each listed chat's close ask.",
  input: z.strictObject({ computer, chats: z.array(z.strictObject({ agentId, name, step, folder, source })).max(200)
    .describe("Every open chat on this computer.") }),
  output: z.strictObject({ chats: z.array(z.strictObject({ agentId: z.string(), closeAskedAt: time.nullable() })) }), encoding: "json",
  effect: "write", agentAvailable: true, confirmWith: "inbox.chats",
  examples: [{ input: { computer: "c0ffee00c0ffee00c0ffee00c0ffee00", chats: [{ agentId: "sample-agent", name: "Fix the store page", folder: "store-page" }] },
    output: { chats: [{ agentId: "sample-agent", closeAskedAt: null }] } }],
  async run(at, { computer: id, chats: listed }) {
    const list = JSON.stringify(listed);
    await at.db.batch([
      mine(at, `INSERT INTO chats (installation_id, owner, agent_id, computer, name, step, folder, source, seen_at)
        SELECT ?1, ?2, json_extract(value, '$.agentId'), ?3, json_extract(value, '$.name'), json_extract(value, '$.step'),
        json_extract(value, '$.folder'), json_extract(value, '$.source'), ?5
        FROM json_each(?4) WHERE true ON CONFLICT (agent_id) DO UPDATE SET computer = excluded.computer, seen_at = excluded.seen_at,
        name = CASE WHEN chats.step IS NULL AND excluded.step IS NOT NULL THEN excluded.name ELSE chats.name END,
        step = COALESCE(chats.step, excluded.step),
        source = COALESCE(excluded.source, chats.source)
        WHERE chats.installation_id = excluded.installation_id AND chats.owner = excluded.owner`, id, list, at.now),
      mine(at, `DELETE FROM chats WHERE installation_id = ?1 AND owner = ?2 AND computer = ?3 AND NOT (${OUTSIDE_PASEO})
        AND agent_id NOT IN (SELECT json_extract(value, '$.agentId') FROM json_each(?4))`, id, list),
    ]);
    const found = await mine(at, `SELECT agent_id, close_asked_at FROM chats WHERE installation_id = ?1 AND owner = ?2
      AND agent_id IN (SELECT json_extract(value, '$.agentId') FROM json_each(?3))`, list).all<{ agent_id: string; close_asked_at: number | null }>();
    await at.wake(null);
    return Response.json({ chats: found.results.map(row => ({ agentId: row.agent_id, closeAskedAt: row.close_asked_at })) });
  },
});

/** POST chat-remove → /close drops its chat's row. */
export const chatRemove = inboxAction<{ agentId: string }>({
  operationId: "inbox.chat-remove", summary: "Remove a chat from your list", description: "Remove one of your chats from the Inbox's chat list when it closes.",
  input: z.strictObject({ agentId: agentId.describe("The chat's agent id, as inbox.chat-put got it.") }),
  output: z.strictObject({ agentId: z.string(), removed: z.boolean() }), encoding: "json", effect: "write", agentAvailable: true,
  confirmWith: "inbox.chats", examples: [{ input: { agentId: "sample-agent" }, output: { agentId: "sample-agent", removed: true } }],
  async run(at, input) {
    const gone = await mine(at, "DELETE FROM chats WHERE installation_id = ?1 AND owner = ?2 AND agent_id = ?3 RETURNING agent_id", input.agentId).first();
    if (gone) await at.wake(null);
    return Response.json({ agentId: input.agentId, removed: !!gone });
  },
});

/** POST chat-close → the person asks to close a chat: its worker sends it /close once they are quiet there. */
export const chatClose = inboxAction<{ agentId: string }>({
  operationId: "inbox.chat-close", summary: "Close a chat", description: "Ask your computer to close one of your chats once you are quiet in it.",
  input: z.strictObject({ agentId: agentId.describe("The chat's agent id.") }),
  output: z.strictObject({ agentId: z.string(), closeAskedAt: time }), encoding: "json", effect: "write",
  async run(at, input) {
    const row = await mine(at, `UPDATE chats SET close_asked_at = COALESCE(close_asked_at, ?4) WHERE installation_id = ?1 AND owner = ?2
      AND agent_id = ?3 RETURNING close_asked_at`, input.agentId, at.now).first<{ close_asked_at: number }>();
    if (!row) return fail("not_found", 404);
    await at.wake();
    return Response.json({ agentId: input.agentId, closeAskedAt: row.close_asked_at });
  },
});

/** The week board's routes, gone: an older computer hears `retired`, logs one line and goes on. */
const retired = () => fail("retired", 404);
export const retiredRoutes = ["GET daily-tasks", "POST daily-task-add", "POST daily-task-place", "POST daily-task-status", "POST daily-task-remove",
  "POST daily-task-link", "GET week", "PUT week-goal", "POST sweep", "GET task-search", "POST task", "PATCH task", "DELETE task", "POST group",
  "PATCH group", "POST group-move", "DELETE group"].map(route => [route, retired] as const);
