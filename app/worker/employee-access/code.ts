// The project, read and saved through the app: Git's read and write calls are passed to where the project is kept,
// with the server's credential added. No copy is stored; no device gets a credential. wiki/stack/employee-project.md
import { boundedBytes, joined } from "../api/body.ts";
import { type Github, defaultBranch } from "./github.ts";
import type { CurrentPolicy } from "./policy.ts";

/** Everything under here is Git's smart HTTP protocol for the one project. */
export const CODE_GIT = "/api/access/code/git/";
/** Why a save is refused, in the words the person's assistant repeats. */
export const NOT_SET_UP = "Saving through the app is not set up yet. Ask the owner to finish it in Access.";
const NEVER_PUBLISHES = "The app saves a change and never publishes. Push one branch that is not main.";
const CHECK_FILES = "This change edits the files that define the checks, which can not be saved through the app. Ask the owner to save it.";

// Only what this file calls on a Cloudflare-kept project's binding: one repository, its address, and a token.
// The handle carries no metadata of its own: its address comes from `info()`.
type CodeBinding = { get(name: string): Promise<{ info(): Promise<{ remote: string }>; createToken(scope: Scope, ttl: number): Promise<{ plaintext: string }> }> };
/** A Cloudflare-kept project's check runs, as the binding to its check runner answers: one run by name. */
export type ChecksBinding = { get(id: string): Promise<{ status(): Promise<{ status: string; error?: { message?: string }; output?: unknown }>; restart(): Promise<unknown> }> };
export interface CodeEnv {
  /** Committed and nonsecret: `owner/name` on GitHub, or the repository's name in this account's Artifacts. */
  WONG_CODE_REPOSITORY?: string;
  /** A GitHub token that reads this one repository's contents and nothing else. The wide key replaces it. */
  WONG_CODE_READ?: string;
  // A GitHub token for this one repository that also saves a change:
  // it reads, pushes a branch, and opens the change.
  WONG_CODE_WRITE?: string;
  /** Cloudflare's binding to a project kept there. Declared as unknown, because `wrangler types` writes its own
   *  type for it into `Env` on such an install; `binding()` narrows it to what this file calls. */
  ARTIFACTS?: unknown;
  /** The binding to that project's check runner, unknown for the same reason. */
  CODE_CHECKS?: unknown;
}
type Scope = "read" | "write";
type Artifacts = { artifacts: CodeBinding; name: string };
type Source = Github | Artifacts;
/** Where a change is saved: GitHub with the wide key, or a Cloudflare-kept project with its check runner. */
export type SaveSource = Github | Artifacts & { checks: ChecksBinding };
type Upstream = { url: string; authorization: string };

const GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;
const ARTIFACT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** Seconds a Cloudflare token lives: one Git call. */
const TOKEN_SECONDS = 300;
const text = (env: object, name: keyof CodeEnv): string => {
  const value: unknown = Reflect.get(env, name);
  return typeof value === "string" ? value.trim() : "";
};
const onGithub = (repository: string) => GITHUB.test(repository) && !repository.includes("..");
const bound = (value: unknown) => typeof value === "object" && value !== null && typeof Reflect.get(value, "get") === "function";
const binding = (value: unknown): value is CodeBinding => bound(value);
const checksBinding = (value: unknown): value is ChecksBinding => bound(value);

// Where the project is kept, or null when this install can not hand it out yet.
// Either GitHub key reads. Calls nothing.
export function codeSource(env: object): Source | null {
  const repository = text(env, "WONG_CODE_REPOSITORY");
  const artifacts: unknown = Reflect.get(env, "ARTIFACTS");
  if (binding(artifacts) && ARTIFACT.test(repository)) return { artifacts, name: repository };
  const token = text(env, "WONG_CODE_READ") || text(env, "WONG_CODE_WRITE");
  return token && onGithub(repository) ? { github: repository, token } : null;
}

/** Where a change is saved, or null when this install can not save one yet: GitHub needs the wide key, and a
 *  Cloudflare-kept project its check runner. Calls nothing. */
export function saveSource(env: object): SaveSource | null {
  const source = codeSource(env);
  if (!source) return null;
  if ("github" in source) {
    const token = text(env, "WONG_CODE_WRITE");
    return token ? { ...source, token } : null;
  }
  const checks: unknown = Reflect.get(env, "CODE_CHECKS");
  return checksBinding(checks) ? { ...source, checks } : null;
}

type Step = "ready" | "key" | "setup" | "live";
function step(env: object, ready: boolean): Step {
  const repository = text(env, "WONG_CODE_REPOSITORY");
  // Branch code runs on previews, so the project's keys and bindings stay on the live app.
  if (Reflect.get(env, "WONG_ENVIRONMENT") === "staging" && (onGithub(repository) || ARTIFACT.test(repository))) return "live";
  return ready ? "ready" : onGithub(repository) ? "key" : "setup";
}
// Why the project can not be handed out yet, for Access to name the step left. `key`: it is kept on GitHub and
// no key is saved. `setup`: no project the app can trust is recorded. `live`: a preview, where none ever is.
export const codeStep = (env: object): Step => step(env, codeSource(env) !== null);
/** The same for saving a change. `key`: GitHub holds no key that can save. `setup`: Access setup has a step left. */
export const saveStep = (env: object): Step => step(env, saveSource(env) !== null);

/** The address to reach and the credential to add, or null when the place it is kept does not answer. */
export async function upstream(env: object, scope: Scope = "read"): Promise<Upstream | null> {
  const source = scope === "write" ? saveSource(env) : codeSource(env);
  if (!source) return null;
  if ("github" in source) return { url: `https://github.com/${source.github}.git`, authorization: `Basic ${btoa(`x-access-token:${source.token}`)}` };
  try {
    const repo = await source.artifacts.get(source.name);
    const remote = new URL((await repo.info()).remote);
    if (remote.protocol !== "https:" || remote.username || remote.password || remote.search || remote.hash) return null;
    const { plaintext } = await repo.createToken(scope, TOKEN_SECONDS);
    return plaintext ? { url: remote.href.replace(/\/$/, ""), authorization: `Bearer ${plaintext}` } : null;
  } catch { return null; }
}

/** Who may connect with the project. `off`: the install can not hand it out, or key levels have not started, so all
 *  keep the apps-only connection. `ready`: holds Project code now. `lacked`: anyone else, a machine included. */
export function codeState(env: object, policy: CurrentPolicy, person: boolean): "ready" | "lacked" | "off" {
  if (policy.state !== "current" || !policy.keys || !codeSource(env)) return "off";
  return person && policy.keys.has("code") ? "ready" : "lacked";
}

const plain = (line: string, status: number) => new Response(`${line}\n`,
  { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
/** Git asks its credential helper only after this challenge, then prints the body as the app's own words. */
export const gitSignIn = (origin: string) => new Response(`Sign in to the company app again, then retry: cloudflared access login ${origin}\n`,
  { status: 401, headers: { "WWW-Authenticate": 'Basic realm="company app"', "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
/** No upstream text ever leaves: a refusal there reads the same as a missing key here. */
export const codeUnavailable = () => Response.json({ error: { code: "code_unavailable", message: "The project is not available from this app right now.", requestId: crypto.randomUUID() } },
  { status: 503, headers: { "Cache-Control": "no-store" } });

// One of Git's four calls, as the path under CODE_GIT that is passed on, and whether it writes.
// Anything else is refused.
function gitCall(request: Request, url: URL): { path: string; write: boolean } | null {
  const path = url.pathname.slice(CODE_GIT.length);
  for (const [service, write] of [["git-upload-pack", false], ["git-receive-pack", true]] as const) {
    if (request.method === "GET" && path === "info/refs" && url.search === `?service=${service}`) return { path: `${path}${url.search}`, write };
    if (request.method === "POST" && path === service) return { path, write };
  }
  return null;
}

const FORWARDED = ["Git-Protocol", "Content-Type", "Accept", "Content-Encoding"];
const copied = (from: Headers, names: string[]): [string, string][] => names.flatMap(name => {
  const value = from.get(name);
  return value === null ? [] : [[name, value]];
});

/** One call passed on with the server's credential, or null when the place the project is kept refuses or fails. */
async function passed(env: object, scope: Scope, request: Request, path: string, body: BodyInit | null): Promise<Response | null> {
  const target = await upstream(env, scope);
  if (!target) return null;
  let response: Response;
  try {
    // A redirect comes back unfollowed, so the credential is never sent on. A Worker's fetch rejects the "error" mode.
    response = await fetch(`${target.url}/${path}`, { method: request.method, redirect: "manual", body,
      headers: { ...Object.fromEntries(copied(request.headers, FORWARDED)), Authorization: target.authorization, "User-Agent": "git/WongStack-project-code" } });
  } catch { return null; }
  if (response.ok) return response;
  await response.body?.cancel();
  return null;
}
// Only what Git reads comes back: never the upstream's cookies or its sign-in challenge. The body arrives
// decoded, so its encoding header stays behind.
const relay = (response: Response, body: BodyInit | null = response.body) =>
  new Response(body, { status: response.status, headers: [...copied(response.headers, ["Content-Type"]), ["Cache-Control", "no-store"]] });

/** A branch a change may be saved on: a plain name that is not where the project publishes from. */
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;
export const savedBranch = (name: string) => name.length <= 200 && BRANCH.test(name) && !name.includes("..") && !["main", "master"].includes(name);
/** The branch the project publishes from: a change is never saved on it, and is opened against it. */
export const publishedBranch = (source: SaveSource) => "github" in source ? defaultBranch(source) : Promise.resolve("main");

// A push's body opens with its ref updates, one pkt-line each (four hex digits of length, then `<old> <new> <ref>`),
// up to a flush packet. The pack follows. The updates are read here and judged before anything is passed on.
const FLUSH = "0000";
const HEAD_LIMIT = 65_536;
const UPDATE = /^[0-9a-f]{40,64} ([0-9a-f]{40,64}) ([\x21-\x7e]+)$/;
export const pkt = (line: string) => `${(line.length + 4).toString(16).padStart(4, "0")}${line}`;

// The bytes read so far and the lines before the first flush packet.
// Null for a head that is no pkt-lines or runs past the limit.
async function pushHead(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<{ bytes: Uint8Array; lines: string[] } | null> {
  const decoder = new TextDecoder();
  const lines: string[] = [];
  let bytes = new Uint8Array(0);
  for (let at = 0; ;) {
    while (bytes.length >= at + 4) {
      const length = decoder.decode(bytes.subarray(at, at + 4));
      const size = /^[0-9a-f]{4}$/.test(length) ? parseInt(length, 16) : 1;
      if (size === 0) return { bytes, lines };
      if (size < 5) return null;
      if (bytes.length < at + size) break;
      lines.push(decoder.decode(bytes.subarray(at + 4, at + size)));
      at += size;
    }
    const read = bytes.length < HEAD_LIMIT ? await reader.read() : null;
    if (!read || read.done) return null;
    bytes = joined(bytes, read.value);
  }
}

/** What a push asks for: each ref it names, the capabilities sent with the first, and the branch when it is one
 *  new commit on one branch a change may be saved on. A delete, a tag, a second ref or any other line has none. */
function asked(lines: string[]) {
  const [first, caps = ""] = lines[0].split("\0");
  const updates = [first, ...lines.slice(1)].map(line => UPDATE.exec(line.replace(/\n$/, "")));
  const [only] = updates;
  const name = updates.length === 1 && only && !/^0+$/.test(only[1]) && only[2].startsWith("refs/heads/") ? only[2].slice("refs/heads/".length) : "";
  return { refs: updates.flatMap(update => update ? [update[2]] : []), caps, branch: savedBranch(name) ? name : null };
}

// A refusal Git prints as its own: every ref turned down with the one line.
// A push that named no ref is a plain 403.
function refused(refs: string[], caps: string, line: string): Response {
  if (!refs.length) return plain(line, 403);
  const report = `${pkt("unpack ok\n")}${refs.map(ref => pkt(`ng ${ref} ${line}\n`)).join("")}${FLUSH}`;
  return new Response(caps.includes("side-band-64k") ? `${pkt(`\u0001${report}`)}${FLUSH}` : report,
    { headers: { "Content-Type": "application/x-git-receive-pack-result", "Cache-Control": "no-store" } });
}

/** The head already read, then the rest of the body as it arrives: the pack is never held. */
const whole = (head: Uint8Array, reader: ReadableStreamDefaultReader<Uint8Array>) => new ReadableStream<Uint8Array>({
  start: controller => controller.enqueue(head),
  async pull(controller) {
    const { done, value } = await reader.read();
    if (done) controller.close(); else controller.enqueue(value);
  },
  cancel: reason => reader.cancel(reason),
});

/** One push: passed on only as one new commit on one branch that is not published from, and nothing is asked of
 *  where the project is kept before that is known. */
async function push(request: Request, env: object, source: SaveSource): Promise<Response> {
  // Git sends a push uncompressed, and only Git sends this type: a page in a browser can not.
  if (!request.body || request.headers.has("Content-Encoding") || request.headers.get("Content-Type") !== "application/x-git-receive-pack-request") return plain(NEVER_PUBLISHES, 403);
  const reader = request.body.getReader();
  const stop = async (answer: Response) => { await reader.cancel(); return answer; };
  const head = await pushHead(reader);
  if (!head) return stop(plain(NEVER_PUBLISHES, 403));
  // Before a large push Git first sends a flush packet alone, to see that it may:
  // it updates nothing, and only it goes on.
  if (!head.lines.length) return stop(relayed(await passed(env, "write", request, "git-receive-pack", FLUSH)));
  const { refs, caps, branch } = asked(head.lines);
  if (!branch) return stop(refused(refs, caps, NEVER_PUBLISHES));
  let published: string;
  try { published = await publishedBranch(source); } catch { return stop(codeUnavailable()); }
  if (branch === published) return stop(refused(refs, caps, NEVER_PUBLISHES));
  const response = await passed(env, "write", request, "git-receive-pack", whole(head.bytes, reader));
  // The answer is a short report. GitHub turns down a change to a workflow file there, since the key may not write one.
  const report = response?.body ? await boundedBytes(response.body, HEAD_LIMIT, () => new Error("report")).catch(() => null) : null;
  if (!response || !report) return codeUnavailable();
  return /ng \S+ [^\n]*workflow/i.test(new TextDecoder().decode(report)) ? refused(refs, caps, CHECK_FILES) : relay(response, report);
}
const relayed = (response: Response | null) => response ? relay(response) : codeUnavailable();

/** Called only after the caller was judged: forwards one read call, or one save, and streams the answer back. */
export async function codeGit(request: Request, env: object): Promise<Response> {
  const call = gitCall(request, new URL(request.url));
  if (!call) return plain(NEVER_PUBLISHES, 403);
  if (!call.write) return relayed(await passed(env, "read", request, call.path, request.body));
  const source = saveSource(env);
  if (!source) return plain(NOT_SET_UP, 403);
  return request.method === "GET" ? relayed(await passed(env, "write", request, call.path, null)) : push(request, env, source);
}
