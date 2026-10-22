// People who can push to the project on GitHub: read on the live app every 15 minutes and when Access opens, and
// given the previews' sign-in alone. wiki/stack/preview-access.md#people-who-can-push-on-github
import { z } from "zod";
import type { AccessIdentity } from "../access.ts";
import { codeSource, codeStep } from "./code.ts";
import { type ConnectionEnv, type Core, AccessError, now, ownerCore, permissionsStarted, reply, scheduledCore } from "./core.ts";
import { type Github, GithubError, github, githubUser } from "./github.ts";
import { boundedJson } from "./json.ts";
import { loginAuthority, previewsDrifted } from "./login-management.ts";
import { reconcile } from "./management.ts";
import { audit } from "./sets.ts";

export const PUSHERS = "/api/access/pushers";
type Source = "owner" | "profile" | "commit";
type Row = { github_id: number; login: string; email: string | null; email_source: Source | null; checked_at: string | null };
const LOGIN = /^[A-Za-z0-9-]{1,39}$/;
const PAGES = 10;
const HOUR = 3_600_000;
const collaborators = z.array(z.object({ id: z.number().int().positive(), login: z.string(), type: z.string(),
  permissions: z.object({ push: z.boolean().optional() }).optional() }));
const commits = z.array(z.object({ commit: z.object({ author: z.object({ email: z.string() }).nullable() }),
  author: z.object({ login: z.string() }).nullable() }));
const typed = z.object({ email: z.string().trim().toLowerCase().pipe(z.union([z.literal(""), z.email()])) }).strict();

/** An address that reaches the person: valid, and never GitHub's no-reply stand-in. */
function reachable(value: unknown): string | null {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return z.email().safeParse(email).success && !email.endsWith("@users.noreply.github.com") ? email : null;
}

/** Every person with push rights. Any failed page throws, so a partial list never removes anyone. */
async function readPushers(source: Github): Promise<{ id: number; login: string }[]> {
  const found: { id: number; login: string }[] = [];
  for (let page = 1; page <= PAGES; page++) {
    const items = collaborators.parse(await github(source, `/collaborators?affiliation=all&per_page=100&page=${page}`));
    for (const item of items) if (item.type === "User" && item.permissions?.push && LOGIN.test(item.login)) found.push(item);
    if (items.length < 100) return found.map(({ id, login }) => ({ id, login }));
  }
  throw new GithubError(413);
}

/** Their public profile email, else the newest of their own commits' emails. GitHub links a commit to a login only
 *  through an address verified on that account. A failed look-up finds nothing, and is tried again in an hour. */
async function lookUp(source: Github, login: string): Promise<{ email: string; email_source: Source } | null> {
  try {
    const profile = reachable(z.object({ email: z.unknown() }).parse(await githubUser(source.token, login)).email);
    if (profile) return { email: profile, email_source: "profile" };
    for (const item of commits.parse(await github(source, `/commits?author=${login}&per_page=20`))) {
      const email = item.author?.login.toLowerCase() === login.toLowerCase() ? reachable(item.commit.author?.email) : null;
      if (email) return { email, email_source: "commit" };
    }
  } catch { /* none found this time */ }
  return null;
}

const stored = async (core: Core) => (await core.db.prepare(`SELECT github_id, login, email, email_source, checked_at
  FROM wong_access_pushers WHERE installation_id = ? ORDER BY lower(login)`).bind(core.installationId).all<Row>()).results;
const emailsOf = (rows: Row[]) => new Set(rows.flatMap(row => row.email ? [row.email] : []));
const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(email => b.has(email));
const noted = (core: Core, status: "listed" | "unavailable") => core.db.prepare(`INSERT INTO wong_access_pusher_reads VALUES (?, ?, ?)
  ON CONFLICT(installation_id) DO UPDATE SET status = excluded.status, read_at = excluded.read_at`).bind(core.installationId, status, now());

/** When the set of pusher emails changed, or the previews list `drifted` from it: a new sign-in list generation, and,
 *  when an email left that nobody else holds, the previews app's sessions end. Nothing when all match. */
async function listChange(core: Core, was: Set<string>, will: Set<string>, drifted = false): Promise<D1PreparedStatement[]> {
  if (!drifted && same(was, will)) return [];
  const id = core.installationId;
  const members = await core.db.prepare("SELECT email FROM wong_access_members WHERE installation_id = ? AND status = 'active'")
    .bind(id).all<{ email: string }>();
  const kept = new Set([core.email, ...will, ...members.results.map(row => row.email)]);
  const left = [...was].some(email => !kept.has(email));
  const queue = (kind: string, scope: string) => core.db.prepare(`INSERT INTO wong_access_work (installation_id, kind, generation, status, scope)
    SELECT installation_id, ?, revision, 'pending', ? FROM wong_access_installation WHERE installation_id = ?
    ON CONFLICT(installation_id, kind) DO UPDATE SET generation = excluded.generation, status = 'pending', error_code = NULL,
    outcome = NULL, scope = CASE WHEN wong_access_work.status != 'ready' THEN wong_access_work.scope ELSE excluded.scope END`)
    .bind(kind, scope, id);
  return [core.db.prepare("UPDATE wong_access_installation SET revision = revision + 1 WHERE installation_id = ?").bind(id),
    queue("policy", "both"), ...(left ? [queue("sessions", "previews")] : []), audit(core, "pushers_changed")];
}

/** Bring both sign-in lists to the saved rows. A busy lease leaves the work pending for the next run. */
const settle = (core: Core) => reconcile(core).catch(() => {});

/** Read who can push, find each new one's email, and update the previews' sign-in list when it no longer matches.
 *  Only the live app, a project on GitHub, and once permissions started: before, a list write could drop a teammate. */
export async function refreshPushers(core: Core): Promise<void> {
  const source = codeSource(core.env);
  if (!core.live || !source || !("github" in source) || !await permissionsStarted(core)) return;
  let current: { id: number; login: string }[];
  try { current = await readPushers(source); }
  catch (error) { await noted(core, "unavailable").run(); throw error; }
  const before = await stored(core);
  const known = new Map(before.map(row => [row.github_id, row]));
  const after: Row[] = [];
  for (const { id, login } of current) {
    const row = { ...known.get(id) ?? { github_id: id, email: null, email_source: null, checked_at: null }, login };
    const due = !row.email && (!row.checked_at || Date.parse(row.checked_at) < Date.now() - HOUR);
    after.push(due ? { ...row, ...await lookUp(source, login), checked_at: now() } : row);
  }
  const id = core.installationId;
  const [was, will] = [emailsOf(before), emailsOf(after)];
  await core.db.batch([
    core.db.prepare("DELETE FROM wong_access_pushers WHERE installation_id = ? AND github_id NOT IN (SELECT value FROM json_each(?))")
      .bind(id, JSON.stringify(after.map(row => row.github_id))),
    // A stored email is never overwritten here: one the owner typed meanwhile wins.
    ...after.map(row => core.db.prepare(`INSERT INTO wong_access_pushers VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(installation_id, github_id) DO UPDATE SET login = excluded.login, checked_at = excluded.checked_at,
      email_source = CASE WHEN wong_access_pushers.email IS NULL THEN excluded.email_source ELSE wong_access_pushers.email_source END,
      email = COALESCE(wong_access_pushers.email, excluded.email)`)
      .bind(id, row.github_id, row.login, row.email, row.email_source, row.checked_at)),
    noted(core, "listed"),
    ...await listChange(core, was, will, same(was, will) && await previewsDrifted(core)),
  ]);
  await settle(core);
}

/** The timed run: the live app's own pass, the same function Access calls when it opens. */
export async function refreshOnSchedule(env: ConnectionEnv): Promise<void> {
  const core = await scheduledCore(env);
  if (core) await refreshPushers(core);
}

/** The owner or an Admin types a pusher's email, or clears it ("") so the app looks one up again. */
async function typeEmail(core: Core, githubId: number, value: unknown): Promise<void> {
  const parsed = typed.safeParse(value);
  if (!parsed.success) throw new AccessError("invalid_email", 400);
  const email = parsed.data.email || null;
  const before = await stored(core);
  const row = before.find(item => item.github_id === githubId);
  if (!row) throw new AccessError("not_found", 404);
  const after = before.map(item => item === row ? { ...row, email, email_source: email ? "owner" as const : null } : item);
  await core.db.batch([
    core.db.prepare(`UPDATE wong_access_pushers SET email = ?, email_source = ?, checked_at = NULL
      WHERE installation_id = ? AND github_id = ?`).bind(email, email && "owner", core.installationId, githubId),
    ...await listChange(core, emailsOf(before), emailsOf(after)),
  ]);
  await settle(core);
}

/** What Access shows: why none are listed, or each pusher with their email and whether previews admit them. Never the
 *  key, and never GitHub's own words. A preview never reads GitHub. */
async function listing(core: Core): Promise<object> {
  const source = codeSource(core.env);
  const none = (state: string) => ({ state, pushers: [] });
  if (!core.live) return none("live_only");
  if (!source || !("github" in source)) return none(codeStep(core.env) === "key" ? "no_github" : "not_github");
  if (!await permissionsStarted(core)) return none("not_started");
  const read = await core.db.prepare("SELECT status FROM wong_access_pusher_reads WHERE installation_id = ?")
    .bind(core.installationId).first<{ status: string }>();
  // An older single sign-in app has no previews list to widen yet.
  const split = loginAuthority(core.env)?.version === 3;
  return { state: read?.status === "unavailable" ? "unavailable" : "listed", split,
    pushers: (await stored(core)).map(row => ({ githubId: row.github_id, login: row.login, email: row.email,
      emailSource: row.email_source, canOpenPreviews: split && !!row.email })) };
}

/** `GET` lists and starts a fresh read; `PUT /{githubId}` saves a typed email. The owner or an Admin only. */
export async function pushersRoute(request: Request, env: ConnectionEnv, identity: AccessIdentity | null,
  wait: (work: Promise<unknown>) => void): Promise<Response> {
  try {
    const core = await ownerCore(request, env, identity);
    const rest = new URL(request.url).pathname.slice(PUSHERS.length);
    if (request.method === "GET" && rest === "") {
      // The first open waits for GitHub, so the list is not empty; later ones show the last list at once.
      const first = !await core.db.prepare("SELECT 1 FROM wong_access_pusher_reads WHERE installation_id = ?").bind(core.installationId).first();
      const fresh = core.live ? refreshPushers(core).catch(() => {}) : null;
      if (fresh && first) await fresh; else if (fresh) wait(fresh);
      return reply(await listing(core));
    }
    const githubId = /^\/([1-9]\d{0,15})$/.exec(rest)?.[1];
    if (request.method !== "PUT" || !githubId) return reply({ code: "not_found" }, 404);
    await typeEmail(core, Number(githubId), await boundedJson(request, 4096));
    return reply(await listing(core));
  } catch (error) {
    return reply({ code: error instanceof AccessError ? error.code : "access_unavailable" }, error instanceof AccessError ? error.status : 503);
  }
}
