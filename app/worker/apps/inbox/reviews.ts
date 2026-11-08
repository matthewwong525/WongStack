import { z } from "zod";
import { endedAt, inboxAction, itemId, type ItemRow, mine, type Scope, settleTaps } from "./store.ts";

/** A search reads this many words, each cut to this many characters. */
const WORDS = 8;
const WORD_CHARS = 100;

/** The query's distinct words, in any case, within the limits. */
function searchWords(query: string) {
  const words = new Map<string, string>();
  for (const raw of query.split(/\s+/)) {
    const word = raw.slice(0, WORD_CHARS);
    if (word && !words.has(word.toLowerCase()) && words.size < WORDS) words.set(word.toLowerCase(), word);
  }
  return [...words.values()];
}

/** Each search word as a `LIKE … ESCAPE '\\'` pattern found anywhere: `100%` finds only itself, `a_b` never `axb`. */
const titlePatterns = (query: string) => searchWords(query).map(word => `%${word.replace(/[\\%_]/g, character => `\\${character}`)}%`);

/** The Archive reads this many pages at a time; *Show more* reads the next. */
const PAGE = 50;
const time = z.number().int().nonnegative();
const review = z.strictObject({ id: itemId, title: z.string(), workspace: z.string(), createdAt: time, closesAt: time,
  endedAt: time.nullable(), answered: z.boolean() });
type Found = Pick<ItemRow, "id" | "title" | "workspace" | "created_at" | "closes_at" | "closed_at"> & { answered: number };

// Every column here sits in the inbox_items_reviews index, so the list never reads a kept page.
const COLUMNS = `id, title, workspace, created_at, closes_at, closed_at, EXISTS (SELECT 1 FROM inbox_taps t
  WHERE t.installation_id = i.installation_id AND t.email = i.email AND t.item_id = i.id AND t.state = 'sent') AS answered`;
const MINE = "FROM inbox_items i WHERE installation_id = ?1 AND email = ?2 AND kind = 'plan' AND hidden = 0";
const NEWEST = "ORDER BY created_at DESC, id DESC";

/** The SQL terms after ?3 (now) and their values: each search word in the title, then the page to read before. */
function narrowing(q: string, before: string | undefined) {
  const values: (string | number)[] = [];
  const at = (value: string | number) => `?${values.push(value) + 3}`;
  const terms = titlePatterns(q).map(pattern => `AND title LIKE ${at(pattern)} ESCAPE '\\'`);
  if (before) {
    const [created, id] = before.split(":");
    const when = at(Number(created));
    terms.push(`AND (created_at < ${when} OR (created_at = ${when} AND id < ${at(id)}))`);
  }
  return { sql: terms.join(" "), values };
}

const shown = (now: number) => (row: Found): z.infer<typeof review> => ({ id: row.id, title: row.title, workspace: row.workspace,
  createdAt: row.created_at, closesAt: row.closes_at, endedAt: endedAt(row, now), answered: row.answered === 1 });

/** The caller's archived review pages, newest first, one page past `before`, and whether more follow. */
async function archive(at: Scope, q: string, before?: string) {
  const { sql, values } = narrowing(q, before);
  const { results } = await mine(at, `SELECT ${COLUMNS} ${MINE} AND (closed_at IS NOT NULL OR closes_at <= ?3) ${sql}
    ${NEWEST} LIMIT ${PAGE + 1}`, at.now, ...values).all<Found>();
  return { archived: results.slice(0, PAGE).map(shown(at.now)), more: results.length > PAGE };
}

/** The caller's review pages still waiting on them, newest first. */
async function waiting(at: Scope, q: string) {
  const { sql, values } = narrowing(q, undefined);
  const { results } = await mine(at, `SELECT ${COLUMNS} ${MINE} AND closed_at IS NULL AND closes_at > ?3 ${sql} ${NEWEST} LIMIT 100`,
    at.now, ...values).all<Found>();
  return results.map(shown(at.now));
}

/** GET reviews → the caller's review pages: those waiting on them, then the Archive of every closed one. `q` finds
 *  pages by the words of their title; `before` reads the Archive's next page, and no waiting pages. */
export const reviews = inboxAction<{ q?: string; before?: string }>({
  operationId: "inbox.reviews", summary: "List your review pages", description: "The signed-in person's review pages: waiting ones, then archived ones, newest first.",
  input: z.strictObject({
    q: z.string().max(200).optional().describe("Words the title holds."),
    before: z.string().regex(/^\d{1,16}:[0-9a-f]{32}$/).optional().describe("`<createdAt>:<id>` of the last archived page shown."),
  }),
  output: z.strictObject({ waiting: z.array(review), archived: z.array(review), more: z.boolean() }), encoding: "query", effect: "read",
  limits: { inputBytes: 65536, outputBytes: 1048576, timeoutMs: 15000 },
  async run(at, { q = "", before }) {
    await settleTaps(at);
    return Response.json({ waiting: before ? [] : await waiting(at, q), ...await archive(at, q, before) });
  },
});
