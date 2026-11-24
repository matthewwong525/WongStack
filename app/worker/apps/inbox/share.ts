// Team links to the caller's inbox pages: the maker shares, stops and sees their own page sealed; whoever may open
// the Inbox reads a shared one by its token. wiki/development/plain-pages.md#share-with-team
import { z } from "zod";
import { actionError, humanEmail, type Route } from "../../api/contract.ts";
import { sealedPage } from "./sealed.ts";
import { fail, findItem, inboxAction, itemId, type ItemRow, mine, scope, type Scope } from "./store.ts";

/** The item's open link token, as a column of a query over `inbox_items i`; null when it has none. */
export const OPEN_SHARE = `(SELECT s.token FROM inbox_shares s WHERE s.installation_id = i.installation_id AND s.email = i.email
  AND s.item_id = i.id AND s.stopped_at IS NULL)`;

/** 16 random bytes, base64url: a link no one guesses. */
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The caller's page `id`, or the answer that says why it is none: not theirs, or not a page. */
async function page(at: Scope, id: string, extra = "") {
  const row = await findItem<ItemRow & { body: string; plain: number }>(at, id, extra);
  return row instanceof Response || row.kind === "plan" ? row : fail("not_page", 400);
}

const input = z.strictObject({ id: itemId.describe("The page's id.") });
const limits = { inputBytes: 65536, outputBytes: 65536, timeoutMs: 15000 };

type About = { operationId: string; summary: string; description: string; output: z.ZodType };

/** A write to one of the caller's own pages: `work` runs once the page is theirs, else the answer says why not. */
const pageWrite = (about: About, work: (at: Scope, id: string) => Promise<Response>) => inboxAction<{ id: string }>({
  ...about, input, encoding: "json", effect: "write", limits, confirmWith: "inbox.item",
  async run(at, { id }) {
    const found = await page(at, id);
    return found instanceof Response ? found : work(at, id);
  },
});

/** POST share {id} → the page's open link token, made once: a second share gives the same one. */
export const share = pageWrite({
  operationId: "inbox.share", summary: "Share a page with the team", description: "Makes a team link to one of the signed-in person's inbox pages, or gives the one that is on.",
  output: z.strictObject({ token: z.string() }),
}, async (at, id) => {
  await mine(at, `INSERT INTO inbox_shares (token, installation_id, email, item_id, created_at) VALUES (?3, ?1, ?2, ?4, ?5)
    ON CONFLICT DO NOTHING`, newToken(), id, at.now).run();
  const open = await mine(at, `SELECT token FROM inbox_shares WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3
    AND stopped_at IS NULL`, id).first<{ token: string }>();
  return Response.json({ token: open?.token });
});

/** POST share-stop {id} → the page's open link stops for good; the next share makes a new one. */
export const shareStop = pageWrite({
  operationId: "inbox.share-stop", summary: "Stop sharing a page", description: "Turns off the team link to one of the signed-in person's inbox pages, for good.",
  output: z.strictObject({ stopped: z.literal(true) }),
}, async (at, id) => {
  await mine(at, `UPDATE inbox_shares SET stopped_at = ?4 WHERE installation_id = ?1 AND email = ?2 AND item_id = ?3
    AND stopped_at IS NULL`, id, at.now).run();
  return Response.json({ stopped: true });
});

/** GET frame?id= → the caller's own page as a sealed document, for a plain page's frame. */
export const frame: Route = async (_request, env, { url, identity }) => {
  if (!humanEmail(identity)) return actionError("forbidden");
  const id = url.searchParams.get("id") ?? "";
  if (!itemId.safeParse(id).success) return fail("not_found", 404);
  const found = await page(await scope(env, identity), id, ", plain, body");
  return found instanceof Response ? found : sealedPage(found.body, found.plain === 1);
};

type Shared = { email: string; stopped_at: number | null; title: string | null; plain: number; updated_at: number; body?: string };
const token = z.string().regex(/^[\w-]{1,64}$/);

/** The link `token`'s page, by token alone, never by the caller's email: a stopped link answers 410, and a missing one,
 *  or one whose page the inbox removed, 404. */
async function shared(at: Scope, value: string, body: boolean): Promise<Shared | Response> {
  if (!token.safeParse(value).success) return fail("not_found", 404);
  const found = await at.db.prepare(`SELECT s.email, s.stopped_at, i.title, i.plain, i.updated_at${body ? ", i.body" : ""}
    FROM inbox_shares s LEFT JOIN inbox_items i ON i.installation_id = s.installation_id AND i.email = s.email AND i.id = s.item_id
    AND i.kind = 'plan' WHERE s.token = ?1 AND s.installation_id = ?2`).bind(value, at.installation).first<Shared>();
  if (!found || found.title === null) return fail("not_found", 404);
  return found.stopped_at === null ? found : fail("stopped", 410);
}

const time = z.number().int().nonnegative();

/** GET shared?token= → a page someone shared: its title, who shared it, and when its newest version came. */
export const sharedPage = inboxAction<{ token: string }>({
  operationId: "inbox.shared", summary: "Read a shared page's details", description: "The title, maker and update time of a page a teammate shared from their inbox, by its link.",
  input: z.strictObject({ token: token.describe("The team link's token.") }),
  output: z.strictObject({ title: z.string(), sharedBy: z.string(), updatedAt: time }), encoding: "query", effect: "read", limits,
  async run(at, { token: value }) {
    const found = await shared(at, value, false);
    if (found instanceof Response) return found;
    // The access list keeps no names, so the maker shows by their email's name.
    return Response.json({ title: found.title, sharedBy: found.email.split("@")[0], updatedAt: found.updated_at });
  },
});

/** GET shared-frame?token= → the shared page itself, sealed. */
export const sharedFrame: Route = async (_request, env, { url, identity }) => {
  if (!humanEmail(identity)) return actionError("forbidden");
  const found = await shared(await scope(env, identity), url.searchParams.get("token") ?? "", true);
  return found instanceof Response ? found : sealedPage(String(found.body), found.plain === 1);
};
