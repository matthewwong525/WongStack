// What the inbox's routes share: whose rows a call reads, the limits, the row shapes. Each statement starts with the
// person's installation and email, so one person's item never reaches another. wiki/development/reply-links.md
import { z } from "zod";
import { defineAction, humanEmail, type Action } from "../../api/contract.ts";

type Env = Parameters<Action["handler"]>[1];
type Identity = Parameters<NonNullable<Action["allowed"]>>[0];

export const LIMITS = { bodyBytes: 512 * 1024, text: 20_000, title: 200, workspace: 100, actions: 6, detail: 2000, option: 300, options: 6,
  urlBytes: 2048, step: 200 };
/** A computer that checked in this recently is online: six missed check-ins means it is gone, not slow. */
const ONLINE_MS = 60_000;
/** A closed item and its taps are kept a day, then removed at a check-in. */
const KEEP_MS = 24 * 3_600_000;
/** A collected tap whose result hasn't come this long after is failed, never handed out again: nothing fires twice. */
const DELIVER_MS = 120_000;
/** The list carries this many characters of a tap's text; `GET tap` has all of it. */
const PREVIEW = 200;

export const itemId = z.string().regex(/^[0-9a-f]{32}$/);
export const actionName = z.string().regex(/^[a-z][a-z0-9-]{0,30}$/);
const time = z.number().int().nonnegative();
const tapState = z.enum(["waiting", "delivering", "sent", "failed", "changed", "cancelled", "expired"]);
/** An approval's or a question's words: what it asks, a question's options, and whether it takes several of them. */
export const detail = z.strictObject({
  text: z.string().min(1).max(LIMITS.detail),
  options: z.array(z.string().min(1).max(LIMITS.option)).max(LIMITS.options).optional(),
  multi: z.boolean().optional(),
});
export const KINDS = ["plan", "approval", "question", "link", "start", "agent"] as const;
const lines = z.array(z.string().min(1).max(LIMITS.option)).max(LIMITS.options);
/** A morning plan: what the agent will do, needs, asks before it acts outside its work, and its questions now. */
const plan = z.strictObject({
  willDo: lines, needs: lines, askFirst: lines,
  questions: z.array(z.strictObject({ text: z.string().min(1).max(LIMITS.detail), options: lines.optional(), several: z.boolean().optional() }))
    .max(LIMITS.options),
});
/** A morning plan card: `ready` with its plan, or still `planning`, or `no-plan`. It takes `go` or `skip`. */
export const start = z.strictObject({ state: z.enum(["ready", "planning", "no-plan"]), plan: plan.optional() });
export const START_ACTIONS = ["go", "skip"];
/** Where an agent stands: its latest step in one line, the chief's last action, and a done agent's checked proof. */
export const agent = z.strictObject({
  state: z.enum(["planning", "working", "done"]), step: z.string().max(LIMITS.step).optional(), action: z.string().max(LIMITS.option).optional(),
  proof: z.string().max(LIMITS.detail).optional(),
});
/** What a private link is for. */
const LINK_KINDS = ["key", "login", "card", "form", "view"] as const;

/** True for an `https` address on a Cloudflare quick tunnel, with no login in it and within the limit: the only
 *  address a link item may hold, so the inbox never sends the person anywhere else. */
function tunnelAddress(text: string) {
  if (new TextEncoder().encode(text).byteLength > LIMITS.urlBytes || !URL.canParse(text)) return false;
  const url = new URL(text);
  return url.protocol === "https:" && url.hostname.endsWith(".trycloudflare.com") && !url.username && !url.password && !url.port;
}
/** A private link item's body: what it is for and its address. */
export const link = z.strictObject({ what: z.enum(LINK_KINDS), url: z.string().refine(tunnelAddress) });
export const tap = z.strictObject({ id: itemId, item: itemId, action: z.string(), text: z.string(), state: tapState });
export const item = z.strictObject({
  id: itemId, kind: z.enum(KINDS), title: z.string(), workspace: z.string(), actions: z.array(z.string()),
  version: z.string(), createdAt: time, closesAt: time, detail: z.union([detail, start, agent]).nullable(), link: link.nullable(), tap: tap.nullable(),
});
type Item = z.infer<typeof item>;

export type Scope = { db: D1DatabaseSession; installation: string; email: string; now: number };

/** `sql` bound to the caller's installation as ?1 and email as ?2, then `values` from ?3. */
export const mine = (at: Scope, sql: string, ...values: (string | number | null)[]) =>
  at.db.prepare(sql).bind(at.installation, at.email, ...values);

async function scope(env: Env, identity: Identity): Promise<Scope> {
  const db = env.DB.withSession("first-primary");
  const found = await db.prepare("SELECT installation_id FROM wong_access_installation WHERE slot = 1").first<{ installation_id: string }>();
  return { db, installation: found?.installation_id ?? "", email: humanEmail(identity)!, now: Date.now() };
}

const ERRORS = {
  not_found: "No such item or tap.", closed: "This item has closed.", changed: "The plan changed since you loaded it.",
  done: "That was already sent.", not_waiting: "That tap is no longer waiting.", too_large: "The body is larger than 512 KB.",
  bad_detail: "An approval or question needs its words as JSON.", bad_link: "A link needs its kind and an https tunnel address, and no actions.",
  bad_start: "A plan card needs its state, a plan within the limits once ready, and go and skip.", bad_agent: "An agent's status needs its state and short lines, and no actions.",
  bad_action: "The item offers no such action, or the notes are empty.",
  too_soon: "Wait a few seconds, then try again.",
};
export const fail = (code: keyof typeof ERRORS, status: number) => Response.json({ error: { code } }, { status });

type Spec = Pick<Action, "operationId" | "summary" | "description" | "input" | "output" | "encoding" | "effect" | "limits">;

/** An inbox route: the signed-in person alone, never a service token or an open workspace, and no assistant's tool. */
export function inboxAction<Input>({ run, ...spec }: Spec & { run: (at: Scope, input: Input) => Promise<Response> }): Action {
  return defineAction({
    ...spec, agentAvailable: false, requiresIdentity: false, allowed: identity => humanEmail(identity) !== null, errors: ERRORS, examples: [],
    handler: async (_request, env, { identity, input }) => run(await scope(env, identity), input as Input),
  });
}

/** Marks every waiting tap on a closed or timed-out item `expired`, so it is never delivered, and a collected tap
 *  whose result never came `failed`. */
export const settleTaps = (at: Scope) => at.db.batch([
  mine(at, `UPDATE inbox_taps SET state = 'expired', answered_at = ?3
    WHERE installation_id = ?1 AND email = ?2 AND state = 'waiting' AND item_id IN (SELECT id FROM inbox_items
      WHERE installation_id = ?1 AND email = ?2 AND (closed_at IS NOT NULL OR closes_at <= ?3))`, at.now),
  mine(at, `UPDATE inbox_taps SET state = 'failed', answered_at = ?3
    WHERE installation_id = ?1 AND email = ?2 AND state = 'delivering' AND claimed_at <= ?4`, at.now, at.now - DELIVER_MS),
]);

/** Removes items closed over a day ago, with their taps. */
export const prune = (at: Scope) => at.db.batch([
  mine(at, `DELETE FROM inbox_taps WHERE installation_id = ?1 AND email = ?2 AND item_id IN (SELECT id FROM inbox_items
    WHERE installation_id = ?1 AND email = ?2 AND closed_at < ?3)`, at.now - KEEP_MS),
  mine(at, "DELETE FROM inbox_items WHERE installation_id = ?1 AND email = ?2 AND closed_at < ?3", at.now - KEEP_MS),
]);

// An item's columns as the list shows them: a plan's HTML is left out; its newest tap on the version shown rides along,
// its text cut short. A rebuild starts clean: an answer to the old version never shows above the new one.
export const ITEM_COLUMNS = `id, kind, title, workspace, actions, version, created_at, closes_at, closed_at,
  CASE WHEN kind = 'plan' THEN NULL ELSE body END AS detail,
  (SELECT json_object('id', t.id, 'item', t.item_id, 'action', t.action, 'text', substr(t.text, 1, ${PREVIEW}), 'state', t.state) FROM inbox_taps t
    WHERE t.installation_id = i.installation_id AND t.email = i.email AND t.item_id = i.id AND t.version = i.version
    ORDER BY t.created_at DESC, t.rowid DESC LIMIT 1) AS tap`;
export type ItemRow = { id: string; kind: Item["kind"]; title: string; workspace: string; actions: string; version: string;
  created_at: number; closes_at: number; closed_at: number | null; detail: string | null; tap: string | null };

export const listed = (row: ItemRow): Item => {
  const body = row.detail === null ? null : JSON.parse(row.detail);
  return { id: row.id, kind: row.kind, title: row.title, workspace: row.workspace, actions: JSON.parse(row.actions), version: row.version,
    createdAt: row.created_at, closesAt: row.closes_at, detail: row.kind === "link" ? null : body, link: row.kind === "link" ? body : null,
    tap: row.tap === null ? null : JSON.parse(row.tap) };
};

/** The caller's open item `id` with `extra` columns, or the answer that says why there is none: unknown or closed. */
export async function openItem<Row extends ItemRow>(at: Scope, id: string, extra = ""): Promise<Row | Response> {
  const row = await mine(at, `SELECT ${ITEM_COLUMNS}${extra} FROM inbox_items i WHERE installation_id = ?1 AND email = ?2 AND id = ?3`, id).first<Row>();
  if (!row) return fail("not_found", 404);
  return row.closed_at !== null || row.closes_at <= at.now ? fail("closed", 410) : row;
}

/** Whether the caller's computer checked in within the last minute. */
export async function online(at: Scope) {
  const seen = await mine(at, "SELECT last_checkin_at FROM inbox_seen WHERE installation_id = ?1 AND email = ?2").first<{ last_checkin_at: number }>();
  return !!seen && at.now - seen.last_checkin_at < ONLINE_MS;
}

/** The caller's tap `id`, or null. */
export const findTap = (at: Scope, id: string) => mine(at, `SELECT id, item_id AS item, action, text, state FROM inbox_taps
  WHERE installation_id = ?1 AND email = ?2 AND id = ?3`, id).first<z.infer<typeof tap>>();
