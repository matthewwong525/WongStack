// The project, read and saved through the app: Git's read and write calls are passed to where the project is kept,
// with the server's credential added. No copy is stored; no device gets a credential. wiki/stack/employee-project.md
import { boundedBytes } from "../api/body.ts";
import { type Artifacts, type Failed, type Scope, type Upstream, ARTIFACT, FLUSH, HEAD_LIMIT, artifactsSource, artifactsUpstream, bound, gitCall,
  passed, plain, readPush, refUpdates, refused, relay, relayed, setting, whole } from "./git-relay.ts";
import { type Github, GithubError, defaultBranch } from "./github.ts";
import type { CurrentPolicy } from "./policy.ts";

export { codeUnavailable, gitSignIn, pkt } from "./git-relay.ts";

/** Everything under here is Git's smart HTTP protocol for the one project. */
export const CODE_GIT = "/api/access/code/git/";
/** Why a save is refused, in the words the person's assistant repeats. */
export const NOT_SET_UP = "Saving through the app is not set up yet. Ask the owner to finish it in Access.";
const NEVER_PUBLISHES = "The app saves a change and never publishes. Push one branch that is not main.";
const CHECK_FILES = "This change edits the files that define the checks, which can not be saved through the app. Ask the owner to save it.";
const UNFINISHED = (reason: string) => `The app could not finish this save (${reason}). Try again, or ask the owner to look.`;

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
   *  type for it into `Env` on such an install; `artifactsSource()` narrows it to what is called. */
  ARTIFACTS?: unknown;
  /** The binding to that project's check runner, unknown for the same reason. */
  CODE_CHECKS?: unknown;
}
type Source = Github | Artifacts;
/** Where a change is saved: GitHub with the wide key, or a Cloudflare-kept project with its check runner. */
export type SaveSource = Github | Artifacts & { checks: ChecksBinding };

const GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;
const text = (env: object, name: keyof CodeEnv): string => setting(env, name);
const onGithub = (repository: string) => GITHUB.test(repository) && !repository.includes("..");
const checksBinding = (value: unknown): value is ChecksBinding => bound(value);

// Where the project is kept, or null when this install can not hand it out yet.
// Either GitHub key reads. Calls nothing.
export function codeSource(env: object): Source | null {
  const kept = artifactsSource(env, "WONG_CODE_REPOSITORY");
  if (kept) return kept;
  const repository = text(env, "WONG_CODE_REPOSITORY");
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

/** The address to reach and the credential to add, or null for a place the app can not trust. Throws when it fails. */
async function reach(env: object, scope: Scope): Promise<Upstream | null> {
  const source = scope === "write" ? saveSource(env) : codeSource(env);
  if (!source) return null;
  if ("github" in source) return { url: `https://github.com/${source.github}.git`, authorization: `Basic ${btoa(`x-access-token:${source.token}`)}` };
  return artifactsUpstream(source, scope);
}
/** The same, or null when the place it is kept does not answer. */
export const upstream = (env: object, scope: Scope = "read"): Promise<Upstream | null> => reach(env, scope).catch(() => null);

/** Who may connect with the project, or with what `available` names. `off`: none can be handed out, or key levels have
 *  not started. `ready`: holds Project code now. `lacked`: anyone else, a machine included. */
export function codeState(env: object, policy: CurrentPolicy, person: boolean, available = codeSource(env) !== null): "ready" | "lacked" | "off" {
  if (policy.state !== "current" || !policy.keys || !available) return "off";
  return person && policy.keys.has("code") ? "ready" : "lacked";
}

/** One call passed on with the server's credential, or where it failed. */
const sent = (env: object, scope: Scope, request: Request, path: string, body: BodyInit | null) => passed(() => reach(env, scope), request, path, body);

/** A branch a change may be saved on: a plain name that is not where the project publishes from. */
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;
export const savedBranch = (name: string) => name.length <= 200 && BRANCH.test(name) && !name.includes("..") && !["main", "master"].includes(name);
/** The branch the project publishes from: a change is never saved on it, and is opened against it. */
export const publishedBranch = (source: SaveSource) => "github" in source ? defaultBranch(source) : Promise.resolve("main");

/** What a push asks for: each ref it names, the capabilities sent with the first, and the branch when it is one
 *  new commit on one branch a change may be saved on. A delete, a tag, a second ref or any other line has none. */
function asked(lines: string[]) {
  const { caps, updates, refs } = refUpdates(lines);
  const [only] = updates;
  const name = updates.length === 1 && only && !/^0+$/.test(only[1]) && only[2].startsWith("refs/heads/") ? only[2].slice("refs/heads/".length) : "";
  return { refs, caps, branch: savedBranch(name) ? name : null };
}

const unreadable = (error: unknown) => error instanceof SyntaxError || (error instanceof Error && error.name === "ZodError");
/** The reason Git prints: a place, and its status number or a fixed phrase. Never its words, a sha or a key. */
function reason(source: SaveSource, { step, status, error }: Failed): string {
  const place = "github" in source ? "GitHub" : "Cloudflare";
  if (status) return `${place} answered ${status}`;
  if (step === "key") return `${place} gave no key to save with`;
  return step === "report" || unreadable(error) ? `${place}'s answer could not be read` : `${place} could not be reached`;
}

/** One log line per failed save, found in the app's logs by `event`. A `SyntaxError` quotes the answer it read,
 *  so only its name is kept; every other error here is our own, `fetch`'s or zod's, and holds no key or body. */
function noteFailed({ step, status, error }: Failed, who: string, branch: string | null): void {
  const cause = error instanceof SyntaxError ? error.name : error instanceof Error ? `${error.name}: ${error.message}` : null;
  console.log(JSON.stringify({ event: "code_save_failed", who, branch, step, status: status ?? null, error: cause?.slice(0, 120) ?? null }));
}

/** A save that failed upstream: every ref turned down with the reason, or a plain answer when no ref was read. */
function unfinished(source: SaveSource, failed: Failed, who: string, asked: { refs: string[]; caps: string; branch: string | null }): Response {
  noteFailed(failed, who, asked.branch);
  const line = UNFINISHED(reason(source, failed));
  return asked.refs.length ? refused(asked.refs, asked.caps, line) : plain(line, 503);
}

/** One push: passed on only as one new commit on one branch that is not published from, and nothing is asked of
 *  where the project is kept before that is known. */
async function push(request: Request, env: object, source: SaveSource, who: string): Promise<Response> {
  const head = await readPush(request);
  if (!head) return plain(NEVER_PUBLISHES, 403);
  const { reader } = head;
  const stop = async (answer: Response) => { await reader.cancel(); return answer; };
  // Before a large push Git first sends a flush packet alone, to see that it may:
  // it updates nothing, and only it goes on.
  if (!head.lines.length) return stop(saved(source, await sent(env, "write", request, "git-receive-pack", FLUSH), who));
  const ask = asked(head.lines);
  const { refs, caps, branch } = ask;
  if (!branch) return stop(refused(refs, caps, NEVER_PUBLISHES));
  let published: string;
  try { published = await publishedBranch(source); } catch (error) {
    return stop(unfinished(source, { step: "branch", status: error instanceof GithubError ? error.status : undefined, error }, who, ask));
  }
  if (branch === published) return stop(refused(refs, caps, NEVER_PUBLISHES));
  const response = await sent(env, "write", request, "git-receive-pack", whole(head.bytes, reader));
  if (!(response instanceof Response)) return unfinished(source, response, who, ask);
  // The answer is a short report. GitHub turns down a change to a workflow file there, since the key may not write one.
  const report = response.body ? await boundedBytes(response.body, HEAD_LIMIT, () => new Error("report past the limit"))
    .catch((error: unknown): Failed => ({ step: "report", error })) : { step: "report" } as const;
  if (!(report instanceof Uint8Array)) return unfinished(source, report, who, ask);
  return /ng \S+ [^\n]*workflow/i.test(new TextDecoder().decode(report)) ? refused(refs, caps, CHECK_FILES) : relay(response, report);
}
/** A save call's answer passed back, or the reason it failed, as Git prints it. */
const saved = (source: SaveSource, response: Response | Failed, who: string) =>
  response instanceof Response ? relay(response) : unfinished(source, response, who, { refs: [], caps: "", branch: null });

/** Called only after the caller was judged: forwards one read call, or one save, and streams the answer back. */
export async function codeGit(request: Request, env: object, who = "unknown"): Promise<Response> {
  const call = gitCall(request, new URL(request.url), CODE_GIT);
  if (!call) return plain(NEVER_PUBLISHES, 403);
  if (!call.write) return relayed(await sent(env, "read", request, call.path, request.body));
  const source = saveSource(env);
  if (!source) return plain(NOT_SET_UP, 403);
  return request.method === "GET" ? saved(source, await sent(env, "write", request, call.path, null), who) : push(request, env, source, who);
}
