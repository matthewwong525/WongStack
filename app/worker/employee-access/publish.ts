// Publishing a saved change through the app, for a person who holds Project code's publish level: only the commit
// whose checks all passed, by squash on GitHub or by moving main on Cloudflare. wiki/stack/employee-project.md
import { z } from "zod";
import { joined } from "../api/body.ts";
import { CODE_CHANGE, changeOf, commit, rows, runOf, sent } from "./change.ts";
import { type ChecksBinding, NOT_SET_UP, codeUnavailable, pkt, saveSource, upstream } from "./code.ts";
import { AccessError, reply } from "./core.ts";
import { type Github, GithubError, github } from "./github.ts";
import { boundedJson } from "./json.ts";

export const CODE_PUBLISH = `${CODE_CHANGE}/publish`;

type Asked = z.infer<typeof commit>;
type Target = NonNullable<Awaited<ReturnType<typeof upstream>>>;

/** Nothing was published, in words the person's assistant repeats. */
class Refused extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
const STALE = "This change has a newer commit than the one checked. Save it again and wait for its checks.";
const NO_CHECK = "No check ran for this commit, so nothing was published.";
const failed = (name: string) => new Refused("checks_not_passed", `The check "${name}" did not pass, so nothing was published.`);
const unfinished = (name: string) => new Refused("checks_not_passed", `The check "${name}" has not finished, so nothing was published.`);

/** Every check passed or was skipped, and at least one passed; else the first that did not, by name. */
function judgeRows(checks: { name: string; bucket: string }[]): void {
  const left = checks.find(check => !["pass", "skipping"].includes(check.bucket));
  if (left) throw (left.bucket === "pending" ? unfinished : failed)(left.name);
  if (!checks.some(check => check.bucket === "pass")) throw new Refused("checks_not_passed", NO_CHECK);
}

// GitHub: the open change's newest commit must be this one, and GitHub merges only while it still is.
async function onGithub(source: Github, asked: Asked, by: string) {
  const change = await changeOf(source, asked.branch);
  if (change?.state !== "OPEN") throw new Refused("no_change", "This branch has no open change to publish. Save it first.");
  if (change.head !== asked.sha) throw new Refused("stale", STALE);
  judgeRows((await rows(source, asked.sha)).rows);
  const merged = await github(source, `/pulls/${change.number}/merge`, "PUT",
    { merge_method: "squash", sha: asked.sha, commit_message: `Published through the app by ${by}.` }).catch((error: unknown) => {
    if (error instanceof GithubError && [405, 409].includes(error.status)) throw new Refused("not_published", "GitHub would not publish this change yet. Ask the owner to look at it.");
    throw error;
  });
  return { published: true, commit: z.object({ sha: z.string() }).parse(merged).sha, url: change.url };
}

const ran = z.object({ commit: z.string(), ref: z.string(), result: z.string(), stage: z.string().optional() });
/** A Cloudflare-kept project's one run for this commit and branch must have passed. */
async function judgeRun(checks: ChecksBinding, asked: Asked): Promise<void> {
  const { run } = await runOf(checks, asked);
  const output = ran.safeParse(run.state === "done" ? run.output : null).data;
  if (!output || output.commit !== asked.sha || output.ref !== `refs/heads/${asked.branch}`) throw unfinished("check run");
  if (output.result === "none") throw new Refused("checks_not_passed", NO_CHECK);
  if (output.result !== "success") throw (output.result === "failure" ? failed : unfinished)(output.stage ?? "check run");
}

const encode = (text: string) => new TextEncoder().encode(text);
/** The first `limit` bytes of one Git call's answer; the rest is never read. */
async function gitCall(target: Target, path: string, limit: number, body?: Uint8Array | string, type?: string): Promise<Uint8Array> {
  const response = await fetch(`${target.url}/${path}`, { method: body ? "POST" : "GET", redirect: "manual", body,
    headers: { Authorization: target.authorization, "User-Agent": "git/WongStack-project-code", ...(type && { "Content-Type": type }) } });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new AccessError("code_unavailable");
  }
  const reader = response.body.getReader();
  let bytes = new Uint8Array(0);
  while (bytes.length < limit) {
    const { done, value } = await reader.read();
    if (done) return bytes;
    bytes = joined(bytes, value);
  }
  await reader.cancel();
  return bytes;
}

/** Each branch's newest commit, from the project's Git address. */
async function heads(target: Target): Promise<Map<string, string>> {
  const text = new TextDecoder().decode(await gitCall(target, "info/refs?service=git-receive-pack", 1_048_576));
  const found = new Map<string, string>();
  for (let at = 0; at + 4 <= text.length;) {
    const size = parseInt(text.slice(at, at + 4), 16);
    const named = /^([0-9a-f]{40}) refs\/heads\/([^\0\n]+)/.exec(text.slice(at + 4, at + size));
    if (named) found.set(named[2], named[1]);
    at += size >= 4 ? size : 4;
  }
  return found;
}

// Whether `main` is in this commit's history: asked for main while holding the commit, Git sends an empty pack.
async function descends(target: Target, main: string, sha: string): Promise<boolean> {
  const answer = await gitCall(target, "git-upload-pack", 4096, `${pkt(`want ${main}\n`)}0000${pkt(`have ${sha}\n`)}${pkt("done\n")}`,
    "application/x-git-upload-pack-request");
  const at = new TextDecoder("latin1").decode(answer).indexOf("PACK");
  if (at < 0) throw new AccessError("code_unavailable");
  return new DataView(answer.buffer, answer.byteOffset, answer.length).getUint32(at + 8) === 0;
}

const sha1 = async (bytes: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-1", bytes));
const hex = (bytes: Uint8Array) => [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
/** A tag naming who published the commit, and the one-object pack that carries it: a move of main has no message. */
async function publisherTag(sha: string, by: string) {
  const body = encode(`object ${sha}\ntype commit\ntag published/${sha}\ntagger WongStack app <app@wongstack.invalid> ${Math.floor(Date.now() / 1000)} +0000\n\nPublished through the app by ${by}.\n`);
  const id = hex(await sha1(joined(encode(`tag ${body.length}\0`), body)));
  // Type 4, a tag, then the size four bits and seven bits at a time.
  const size = [0x40 | (body.length & 15)];
  for (let left = body.length >> 4; left; left >>= 7) { size[size.length - 1] |= 0x80; size.push(left & 0x7f); }
  const deflated = new Uint8Array(await new Response(new Response(body).body!.pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
  const pack = joined(joined(encode("PACK"), new Uint8Array([0, 0, 0, 2, 0, 0, 0, 1, ...size])), deflated);
  return { id, pack: joined(pack, await sha1(pack)) };
}

// Cloudflare: main moves forward to this exact commit, only when it is the branch's newest and builds on main.
async function onArtifacts(env: object, checks: ChecksBinding, asked: Asked, by: string) {
  const target = await upstream(env, "write");
  if (!target) throw new AccessError("code_unavailable");
  const found = await heads(target);
  const main = found.get("main");
  if (found.get(asked.branch) !== asked.sha) throw new Refused("stale", STALE);
  if (!main) throw new AccessError("code_unavailable");
  if (main === asked.sha) throw new Refused("published", "This change is already published.");
  await judgeRun(checks, asked);
  if (!(await descends(target, main, asked.sha))) {
    throw new Refused("behind", "Published work landed after this change was saved. Bring it in, save again, and publish once the checks pass.");
  }
  const tag = await publisherTag(asked.sha, by);
  const commands = `${pkt(`${main} ${asked.sha} refs/heads/main\0report-status\n`)}${pkt(`${"0".repeat(40)} ${tag.id} refs/tags/published/${asked.sha}\n`)}0000`;
  const report = await gitCall(target, "git-receive-pack", 65_536, joined(encode(commands), tag.pack), "application/x-git-receive-pack-request");
  if (!new TextDecoder().decode(report).includes("ok refs/heads/main\n")) throw new Refused("not_published", "The project did not move to this change, so nothing was published. Try again.");
  return { published: true, commit: asked.sha, url: null };
}

/** Called only after the caller was judged to hold Project code's publish level now. `by` names them. */
export async function codePublish(request: Request, env: object, by: string): Promise<Response> {
  const source = saveSource(env);
  if (!source) return reply({ error: { code: "save_not_ready", message: NOT_SET_UP } }, 409);
  try {
    // A page in a browser can not send this type across sites, so only the person's own assistant publishes.
    if (request.method !== "POST" || request.headers.get("Content-Type") !== "application/json") throw new AccessError("invalid_request", 400);
    const asked = sent(commit, await boundedJson(request, 4096));
    return reply("github" in source ? await onGithub(source, asked, by) : await onArtifacts(env, source.checks, asked, by));
  } catch (error) {
    if (error instanceof Refused) return reply({ error: { code: error.code, message: error.message } }, 409);
    return error instanceof AccessError && error.status !== 503 ? reply({ error: { code: error.code } }, error.status) : codeUnavailable();
  }
}
