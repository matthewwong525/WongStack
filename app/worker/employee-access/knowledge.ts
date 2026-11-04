// Company knowledge, read and saved through the app: Git's calls go to its repository in this account's Artifacts
// with a short-lived token, and a save moves main forward at once. wiki/stack/company-knowledge.md
import { boundedBytes } from "../api/body.ts";
import { type Upstream, FLUSH, HEAD_LIMIT, artifactsSource, artifactsUpstream, codeUnavailable, gitCall, passed, plain, readPush, refUpdates,
  refused, relay, relayed, whole } from "./git-relay.ts";

/** Everything under here is Git's smart HTTP protocol for the one knowledge repository. */
export const KNOWLEDGE_GIT = "/api/access/knowledge/git/";
export interface KnowledgeEnv {
  /** Committed and nonsecret: the knowledge repository's name in this account's Artifacts. */
  WONG_KNOWLEDGE_REPOSITORY?: string;
}
const ONLY_MAIN = "Company knowledge takes one new commit on main, and no delete, tag or other branch.";
const UNFINISHED = "The app could not finish this save. Try again, or ask the owner to look.";

/** The knowledge repository, or null with no binding or no name it can trust, and on a preview. Calls nothing. */
export const knowledgeSource = (env: object) =>
  Reflect.get(env, "WONG_ENVIRONMENT") === "staging" ? null : artifactsSource(env, "WONG_KNOWLEDGE_REPOSITORY");

/** The caller's email: only a person gets here, since a preview never holds knowledge. */
type Who = string | null;
const note = (line: object) => console.log(JSON.stringify(line));
/** One log line per refused save, found in the app's logs by `event`, then the answer Git prints. */
function refusal(who: Who, reason: string, answer: Response, refs: string[]): Response {
  note({ event: "knowledge_refused", who, reason, ref: refs.length === 1 ? refs[0] : undefined });
  return answer;
}

/** Why a push's updates are refused, or the new commit of the one it takes: one ref, `refs/heads/main`, not deleted. */
function judged(updates: (RegExpExecArray | null)[]): { reason: string } | { commit: string } {
  const [only] = updates;
  if (updates.length !== 1 || !only) return { reason: "refs" };
  if (/^0+$/.test(only[1])) return { reason: "delete" };
  if (only[2].startsWith("refs/tags/")) return { reason: "tag" };
  return only[2] === "refs/heads/main" ? { commit: only[1] } : { reason: "branch" };
}

/** One push, passed on only once its updates are judged; the report says whether main moved. */
async function push(request: Request, reach: () => Promise<Upstream | null>, who: Who): Promise<Response> {
  const head = await readPush(request);
  if (!head) return refusal(who, "unreadable", plain(ONLY_MAIN, 403), []);
  const stop = async (answer: Response) => { await head.reader.cancel(); return answer; };
  // Before a large push Git first sends a flush packet alone, to see that it may:
  // it updates nothing, and only it goes on.
  if (!head.lines.length) return stop(relayed(await passed(reach, request, "git-receive-pack", FLUSH)));
  const { caps, updates, refs } = refUpdates(head.lines);
  const judgement = judged(updates);
  if ("reason" in judgement) return stop(refusal(who, judgement.reason, refused(refs, caps, ONLY_MAIN), refs));
  const response = await passed(reach, request, "git-receive-pack", whole(head.bytes, head.reader));
  const report = response instanceof Response && response.body
    ? await boundedBytes(response.body, HEAD_LIMIT, () => new Error("report past the limit")).catch(() => null) : null;
  if (!(response instanceof Response) || !report) return refusal(who, "unfinished", refused(refs, caps, UNFINISHED), refs);
  // Artifacts turns down a push whose old commit is no longer main's tip: a race the save script retries.
  if (/ok refs\/heads\/main\n/.test(new TextDecoder().decode(report))) note({ event: "knowledge_saved", who, commit: judgement.commit });
  else note({ event: "knowledge_refused", who, reason: "upstream", ref: refs[0] });
  return relay(response, report);
}

/** Called only after the caller was judged: forwards one read call, or one save to main, and streams the answer. */
export async function knowledgeGit(request: Request, env: object, who: Who): Promise<Response> {
  const source = knowledgeSource(env);
  if (!source) return codeUnavailable();
  const call = gitCall(request, new URL(request.url), KNOWLEDGE_GIT);
  if (!call) return plain(ONLY_MAIN, 403);
  const reach = () => artifactsUpstream(source, call.write ? "write" : "read");
  return call.write && request.method === "POST" ? push(request, reach, who) : relayed(await passed(reach, request, call.path, request.body));
}
