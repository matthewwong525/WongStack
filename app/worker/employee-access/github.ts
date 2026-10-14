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

/** One call under the repository's own address. A redirect comes back unfollowed, so the key is never sent on. */
export function githubFetch(source: Github, path: string, method = "GET", body?: object): Promise<Response> {
  return fetch(`https://api.github.com/repos/${source.github}${path}`, { method, redirect: "manual", signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${source.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "WongStack-project-code", ...(body && { "Content-Type": "application/json" }) },
    ...(body && { body: JSON.stringify(body) }) });
}

/** The same call's JSON answer, at most 4 MB of it. Anything but a 2xx is thrown. */
export async function github(source: Github, path: string, method = "GET", body?: object): Promise<unknown> {
  const response = await githubFetch(source, path, method, body);
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new GithubError(response.status);
  }
  return JSON.parse(new TextDecoder().decode(await boundedBytes(response.body, 4_194_304, () => new GithubError(502))));
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
