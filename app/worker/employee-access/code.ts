// The project, read through the app: Git's two read calls are passed to where the project is kept, with the
// server's own credential added. The Worker stores no copy and hands no credential to a device.
// wiki/stack/employee-project.md
import type { CurrentPolicy } from "./policy.ts";

/** Everything under here is Git's smart HTTP protocol for the one project. */
export const CODE_GIT = "/api/access/code/git/";

/** Only what this file calls on a Cloudflare-kept project's binding: one repository, its address, and a read token for it. */
// The handle carries no metadata of its own: its address comes from `info()`.
type CodeBinding = { get(name: string): Promise<{ info(): Promise<{ remote: string }>; createToken(scope: "read", ttl: number): Promise<{ plaintext: string }> }> };
export interface CodeEnv {
  /** Committed and nonsecret: `owner/name` on GitHub, or the repository's name in this account's Artifacts. */
  WONG_CODE_REPOSITORY?: string;
  /** A GitHub token that reads this one repository's contents and nothing else. */
  WONG_CODE_READ?: string;
  ARTIFACTS?: CodeBinding;
}
type Source = { github: string; token: string } | { artifacts: CodeBinding; name: string };
type Upstream = { url: string; authorization: string };

const GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;
const ARTIFACT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** Seconds a Cloudflare read token lives: one Git call. */
const TOKEN_SECONDS = 300;
const text = (env: object, name: keyof CodeEnv): string => {
  const value: unknown = Reflect.get(env, name);
  return typeof value === "string" ? value.trim() : "";
};
const binding = (value: unknown): value is CodeBinding =>
  typeof value === "object" && value !== null && typeof Reflect.get(value, "get") === "function";

/** Where the project is kept, or null when this install can not hand it out yet. Calls nothing. */
export function codeSource(env: object): Source | null {
  const repository = text(env, "WONG_CODE_REPOSITORY");
  const artifacts: unknown = Reflect.get(env, "ARTIFACTS");
  if (binding(artifacts) && ARTIFACT.test(repository)) return { artifacts, name: repository };
  const token = text(env, "WONG_CODE_READ");
  return token && GITHUB.test(repository) && !repository.includes("..") ? { github: repository, token } : null;
}

/** The address to read from and the credential to add, or null when the place it is kept does not answer. */
export async function upstream(env: object): Promise<Upstream | null> {
  const source = codeSource(env);
  if (!source) return null;
  if ("github" in source) return { url: `https://github.com/${source.github}.git`, authorization: `Basic ${btoa(`x-access-token:${source.token}`)}` };
  try {
    const repo = await source.artifacts.get(source.name);
    const remote = new URL((await repo.info()).remote);
    if (remote.protocol !== "https:" || remote.username || remote.password || remote.search || remote.hash) return null;
    const { plaintext } = await repo.createToken("read", TOKEN_SECONDS);
    return plaintext ? { url: remote.href.replace(/\/$/, ""), authorization: `Bearer ${plaintext}` } : null;
  } catch { return null; }
}

/**
 * Who may connect with the project. `off`: the install can not hand it out, or permissions or key levels have
 * not started, so everyone keeps the apps-only connection. `ready`: a person who holds Project code now.
 * `lacked`: anyone else, a machine included.
 */
export function codeState(env: object, policy: CurrentPolicy, person: boolean): "ready" | "lacked" | "off" {
  if (policy.state !== "current" || !policy.keys || !codeSource(env)) return "off";
  return person && policy.keys.has("code") ? "ready" : "lacked";
}

const plain = (line: string, status: number) => new Response(`${line}\n`,
  { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
/** No upstream text ever leaves: a refusal there reads the same as a missing key here. */
export const codeUnavailable = () => Response.json({ error: { code: "code_unavailable", message: "The project is not available from this app right now.", requestId: crypto.randomUUID() } },
  { status: 503, headers: { "Cache-Control": "no-store" } });

/** Git's two read calls, as the path under CODE_GIT and what is forwarded with each. Anything else is a write. */
function readCall(request: Request, url: URL): string | null {
  const path = url.pathname.slice(CODE_GIT.length);
  if (request.method === "GET" && path === "info/refs" && url.search === "?service=git-upload-pack") return `${path}${url.search}`;
  return request.method === "POST" && path === "git-upload-pack" ? path : null;
}

const FORWARDED = ["Git-Protocol", "Content-Type", "Accept", "Content-Encoding"];
const copied = (from: Headers, names: string[]): [string, string][] => names.flatMap(name => {
  const value = from.get(name);
  return value === null ? [] : [[name, value]];
});

/** Called only after the caller was judged: forwards one read call and streams the answer back. */
export async function codeGit(request: Request, env: object): Promise<Response> {
  const call = readCall(request, new URL(request.url));
  if (!call) return plain("This copy is for reading. Your employer grants publishing where the project is kept.", 403);
  const target = await upstream(env);
  if (!target) return codeUnavailable();
  let response: Response;
  try {
    // A redirect comes back unfollowed, so the credential is never sent on. A Worker's fetch rejects the "error" mode.
    response = await fetch(`${target.url}/${call}`, { method: request.method, redirect: "manual", body: request.body,
      headers: { ...Object.fromEntries(copied(request.headers, FORWARDED)), Authorization: target.authorization, "User-Agent": "git/WongStack-project-code" } });
  } catch { return codeUnavailable(); }
  if (!response.ok) {
    await response.body?.cancel();
    return codeUnavailable();
  }
  // Only what Git reads comes back: never the upstream's cookies or its sign-in challenge. The body arrives
  // decoded, so its encoding header stays behind.
  return new Response(response.body, { status: response.status, headers: [...copied(response.headers, ["Content-Type"]), ["Cache-Control", "no-store"]] });
}
