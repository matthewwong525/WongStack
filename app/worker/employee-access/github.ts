// GitHub's API for the one project, with the server's own key. Nothing here reaches a device: a caller picks
// the fields it returns, and a refusal or a failure is thrown, never passed on. wiki/stack/employee-project.md
import { z } from "zod";
import { boundedBytes } from "../api/body.ts";

/** A project kept on GitHub: `owner/name`, and the key the call is made with. */
export type Github = { github: string; token: string };

/** GitHub refused or failed. `status` is its answer's, for a caller that tells a missing thing from a failure. */
export class GithubError extends Error {
  readonly status: number;
  constructor(status: number) { super("github"); this.status = status; }
}

/** One call with the key. A redirect comes back unfollowed, so the key is never sent on. */
function call(url: string, token: string, method = "GET", body?: object): Promise<Response> {
  return fetch(url, { method, redirect: "manual", signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "WongStack-project-code", ...(body && { "Content-Type": "application/json" }) },
    ...(body && { body: JSON.stringify(body) }) });
}

/** One call under the repository's own address. */
export function githubFetch(source: Github, path: string, method = "GET", body?: object): Promise<Response> {
  return call(`https://api.github.com/repos/${source.github}${path}`, source.token, method, body);
}

/** A JSON answer, at most 4 MB of it. Anything but a 2xx is thrown. */
async function answer(response: Response): Promise<unknown> {
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new GithubError(response.status);
  }
  return JSON.parse(new TextDecoder().decode(await boundedBytes(response.body, 4_194_304, () => new GithubError(502))));
}

/** The same call's JSON answer. */
export async function github(source: Github, path: string, method = "GET", body?: object): Promise<unknown> {
  return answer(await githubFetch(source, path, method, body));
}

/** One account's public profile: the only call outside the repository's address, with the same key and limits. */
export async function githubUser(token: string, login: string): Promise<unknown> {
  return answer(await call(`https://api.github.com/users/${encodeURIComponent(login)}`, token));
}

// Read once per isolate: a renamed default branch is picked up when the Worker next starts.
const defaults = new Map<string, string>();
/** The branch the project publishes from. */
export async function defaultBranch(source: Github): Promise<string> {
  const known = defaults.get(source.github);
  if (known) return known;
  const { default_branch: branch } = z.object({ default_branch: z.string().min(1) }).parse(await github(source, ""));
  defaults.set(source.github, branch);
  return branch;
}
