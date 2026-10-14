// A saved change, through the app: its checks, its preview and its page, read where the project is kept with
// the server's own credential, for a person whose computer holds none. wiki/stack/employee-project.md
import { z } from "zod";
import { runId } from "../../../scripts/check-runner/run-id.mjs";
import { joined } from "../api/body.ts";
import { type ChecksBinding, type SaveSource, NOT_SET_UP, codeUnavailable, publishedBranch, saveSource, savedBranch } from "./code.ts";
import { AccessError, reply } from "./core.ts";
import { type Github, GithubError, github, githubFetch } from "./github.ts";
import { boundedJson } from "./json.ts";

/** The saved change's own calls: read it, open it, read one check's log, start a cut-off check run again. */
export const CODE_CHANGE = "/api/access/code/change";

const invalid = () => new AccessError("invalid_request", 400);
const missing = () => new AccessError("not_found", 404);
// What the caller sent, held to a shape. An answer from where the project is kept is parsed plainly:
// a surprise there is a failure, not the caller's mistake.
export function sent<T>(shape: z.ZodType<T>, value: unknown): T {
  const read = shape.safeParse(value);
  if (!read.success) throw invalid();
  return read.data;
}
const branch = z.string().refine(savedBranch);
export const commit = z.object({ branch, sha: z.string().regex(/^[0-9a-f]{40}$/) });
const opening = z.object({ branch, title: z.string().trim().min(1).max(200), body: z.string().max(60_000) });
const logOf = z.object({ job: z.string().regex(/^\d{1,20}$/) });

// GitHub: the change is a pull request, and its checks are the jobs and statuses on its commit.
const text = z.string().nullable();
const pulls = z.array(z.object({ number: z.number().int(), html_url: z.string(), state: z.string(), merged_at: text, head: z.object({ sha: z.string() }) }));
const checked = { id: z.number().int(), name: text, status: text, conclusion: text, html_url: text };
const runs = z.object({ workflow_runs: z.array(z.object(checked)) });
const jobs = z.object({ jobs: z.array(z.object(checked)) });
const statuses = z.array(z.object({ context: z.string(), state: z.string(), target_url: text }));
const deployments = z.array(z.object({ id: z.number().int() }));
const deployed = z.array(z.object({ environment_url: z.string().nullish() }));
const workflows = z.object({ total_count: z.number() });

/** The change opened for a branch: the open one, else the newest. */
export async function changeOf(source: Github, name: string) {
  const all = pulls.parse(await github(source, `/pulls?head=${source.github.split("/")[0]}:${encodeURIComponent(name)}&state=all&per_page=20`));
  const found = all.find(pull => pull.state === "open") ?? all.at(0);
  return found ? { state: found.merged_at ? "MERGED" : found.state === "open" ? "OPEN" : "CLOSED", url: found.html_url, number: found.number, head: found.head.sha } : null;
}

const ENDED: Record<string, string> = { success: "pass", neutral: "pass", skipped: "skipping", cancelled: "cancel" };
const SAID: Record<string, string> = { success: "pass", pending: "pending" };
const row = (check: z.infer<typeof jobs>["jobs"][number], job: number | null) =>
  ({ name: check.name ?? "check", bucket: check.status === "completed" ? ENDED[check.conclusion ?? ""] ?? "fail" : "pending", link: check.html_url, job });

// Every check on one commit: each workflow run's jobs, or the run itself before it has any,
// then each status's newest word.
export async function rows(source: Github, sha: string) {
  const { workflow_runs: found } = runs.parse(await github(source, `/actions/runs?head_sha=${sha}&per_page=20`));
  const ran = await Promise.all(found.map(async run => {
    const { jobs: list } = jobs.parse(await github(source, `/actions/runs/${run.id}/jobs?per_page=100`));
    return list.length ? list.map(job => row(job, job.id)) : [row(run, null)];
  }));
  const newest = new Map<string, z.infer<typeof statuses>[number]>();
  const reported = statuses.parse(await github(source, `/commits/${sha}/statuses?per_page=100`));
  for (const status of reported) if (!newest.has(status.context)) newest.set(status.context, status);
  const said = [...newest.values()].map(status => ({ name: status.context, bucket: SAID[status.state] ?? "fail", link: status.target_url, job: null }));
  return { rows: [...ran.flat(), ...said], links: reported.flatMap(status => status.target_url ?? []) };
}

// A deploy sits on a subdomain of one of these; the name alone is the provider's own site.
const HOSTS = "vercel\\.app|netlify\\.app|netlify\\.com|pages\\.dev|workers\\.dev|onrender\\.com|render\\.com|github\\.io|surge\\.sh|fly\\.dev|herokuapp\\.com|amplifyapp\\.com";
const PREVIEW = new RegExp(`preview|deploy|ngrok|${HOSTS}`, "i");
const BARE = new RegExp(`^https://(${HOSTS})([/?#]|$)`, "i");
const previewLink = (link: string) => link.startsWith("https://") && PREVIEW.test(link) && !/github\.com/i.test(link) && !BARE.test(link);

/** Where the commit can be looked at: the address its deploy reported, else a status's link that reads as a preview. */
async function preview(source: Github, sha: string, links: string[]): Promise<string | null> {
  for (const { id } of deployments.parse(await github(source, `/deployments?sha=${sha}&per_page=5`))) {
    const address = deployed.parse(await github(source, `/deployments/${id}/statuses`)).find(status => status.environment_url?.startsWith("https://"));
    if (address?.environment_url) return address.environment_url;
  }
  return links.find(previewLink) ?? null;
}

async function githubChange(source: Github, name: string, sha: string) {
  const [change, checks, { total_count: count }] = await Promise.all([changeOf(source, name), rows(source, sha),
    github(source, "/actions/workflows?per_page=1").then(found => workflows.parse(found))]);
  return { head: null, state: null, url: null, number: null, ...change, rows: checks.rows, workflows: count > 0, preview: await preview(source, sha, checks.links) };
}

// Opens the change against the branch the project publishes from, or renews an open one's description.
// A closed or published one is left as it is.
async function open(source: Github, by: string, { branch: name, title, body }: z.infer<typeof opening>) {
  const described = `${body.trim()}\n\nSaved through the app by ${by}`.trim();
  const found = await changeOf(source, name);
  if (found?.state === "OPEN") await github(source, `/pulls/${found.number}`, "PATCH", { body: described });
  if (found) return { state: found.state, url: found.url, number: found.number };
  const made = pulls.element.parse(await github(source, "/pulls", "POST", { title, head: name, base: await publishedBranch(source), body: described }));
  return { state: "OPEN", url: made.html_url, number: made.number };
}

const LOG_BYTES = 262_144;
const LOG_LINES = 60;
// The end of one job's log: the lines up to its last error, else its last lines.
// GitHub answers with a short-lived address, read without the key.
async function log(source: Github, job: string) {
  const pointer = await githubFetch(source, `/actions/jobs/${job}/logs`);
  await pointer.body?.cancel();
  const address = pointer.headers.get("Location") ?? "";
  if (pointer.status === 404) throw missing();
  if (pointer.status !== 302 || !address.startsWith("https://")) throw new GithubError(pointer.status);
  const response = await fetch(address, { redirect: "manual", signal: AbortSignal.timeout(20_000) });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new GithubError(response.status);
  }
  let kept = new Uint8Array(0);
  for (const reader = response.body.getReader(); ;) {
    const { done, value } = await reader.read();
    if (done) break;
    kept = joined(kept, value).slice(-LOG_BYTES);
  }
  const lines = new TextDecoder().decode(kept).split(/\r?\n/).map(line => line.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z /, ""));
  const end = lines.findLastIndex(line => line.includes("##[error]")) + 1 || lines.length;
  return { lines: lines.slice(Math.max(0, end - LOG_LINES), end) };
}

// A Cloudflare-kept project: the change is its branch, and its check is one run, named for the commit and branch
// as the runner names it.
const RUNNING = new Set(["queued", "running", "paused", "waiting", "waitingForPause", "rollingBack"]);
type Run = { state: "missing" | "pending" } | { state: "done"; output: unknown } | { state: "errored" | "unreadable"; why: string };
type Instance = Awaited<ReturnType<ChecksBinding["get"]>>;

/** One commit's run, in the shape the save scripts already judge, and the run itself for starting it again. */
export async function runOf(checks: ChecksBinding, { branch: name, sha }: z.infer<typeof commit>): Promise<{ run: Run; instance?: Instance }> {
  try {
    const instance = await checks.get(await runId(sha, `refs/heads/${name}`));
    const { status, output, error } = await instance.status();
    if (status === "complete") return { run: { state: "done", output }, instance };
    if (status === "errored" || status === "terminated") return { run: { state: "errored", why: error?.message ?? status }, instance };
    return { run: RUNNING.has(status) ? { state: "pending" } : { state: "unreadable", why: `the run is in an unknown state: ${status}` } };
  } catch (error) {
    return { run: /not.?found|does not exist/i.test(String(error)) ? { state: "missing" } : { state: "unreadable", why: "the check run could not be read" } };
  }
}

const interrupted = z.object({ commit: z.string(), ref: z.string(), result: z.literal("interrupted") });
// Starts a run again only when it was cut off: its Workflow stopped, or it reported its own commit and
// branch unfinished.
async function restart(checks: ChecksBinding, asked: z.infer<typeof commit>) {
  const { run, instance } = await runOf(checks, asked);
  const output = interrupted.safeParse(run.state === "done" ? run.output : null).data;
  const cutOff = run.state === "errored" || (output?.commit === asked.sha && output.ref === `refs/heads/${asked.branch}`);
  if (!instance || !cutOff) return { restart: "refused" };
  return { restart: await instance.restart().then(() => "started", () => "failed") };
}

async function answer(request: Request, source: SaveSource, by: string): Promise<object> {
  const url = new URL(request.url);
  const call = `${request.method} ${url.pathname.slice(CODE_CHANGE.length)}`;
  const query = Object.fromEntries(url.searchParams);
  // A page in a browser can not send this type across sites, so only the person's own assistant opens a change.
  const posted = () => request.headers.get("Content-Type") === "application/json" ? boundedJson(request, 131_072) : Promise.reject(invalid());
  if ("github" in source) {
    if (call === "GET ") { const { branch: name, sha } = sent(commit, query); return githubChange(source, name, sha); }
    if (call === "POST ") return open(source, by, sent(opening, await posted()));
    if (call === "GET /log") return log(source, sent(logOf, query).job);
  } else {
    if (call === "GET ") return { run: (await runOf(source.checks, sent(commit, query))).run };
    if (call === "POST ") { sent(opening, await posted()); return { change: null }; }
    if (call === "POST /restart") return restart(source.checks, sent(commit, await posted()));
  }
  throw missing();
}

/** Called only after the caller was judged to hold Project code. `by` names them on the change they open. */
export async function codeChange(request: Request, env: object, by: string): Promise<Response> {
  const source = saveSource(env);
  if (!source) return reply({ error: { code: "save_not_ready", message: NOT_SET_UP } }, 409);
  try { return reply(await answer(request, source, by)); }
  catch (error) {
    if (error instanceof AccessError) return reply({ error: { code: error.code } }, error.status);
    return error instanceof GithubError && error.status === 404 ? reply({ error: { code: "not_found" } }, 404) : codeUnavailable();
  }
}
