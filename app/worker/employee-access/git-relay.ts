// Git's smart HTTP calls passed on to where a repository is kept, with the server's credential added: shared by the
// project's address (code.ts) and company knowledge's (knowledge.ts). wiki/stack/employee-project.md
import { joined } from "../api/body.ts";

export type Scope = "read" | "write";
export type Upstream = { url: string; authorization: string };
// Only what is called on a Cloudflare-kept repository's binding: one repository, its address, and a token.
// The handle carries no metadata of its own: its address comes from `info()`.
type ArtifactsBinding = { get(name: string): Promise<{ info(): Promise<{ remote: string }>; createToken(scope: Scope, ttl: number): Promise<{ plaintext: string }> }> };
export type Artifacts = { artifacts: ArtifactsBinding; name: string };

export const ARTIFACT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/** Seconds a Cloudflare token lives: one Git call. */
const TOKEN_SECONDS = 300;
/** A committed setting's text, trimmed, or empty when it is no text. */
export const setting = (env: object, name: string): string => {
  const value: unknown = Reflect.get(env, name);
  return typeof value === "string" ? value.trim() : "";
};
export const bound = (value: unknown) => typeof value === "object" && value !== null && typeof Reflect.get(value, "get") === "function";
const binding = (value: unknown): value is ArtifactsBinding => bound(value);

/** The repository named by `name` in this account's Artifacts, or null with no binding or a name it can not trust. */
export function artifactsSource(env: object, name: string): Artifacts | null {
  const repository = setting(env, name);
  const artifacts: unknown = Reflect.get(env, "ARTIFACTS");
  return binding(artifacts) && ARTIFACT.test(repository) ? { artifacts, name: repository } : null;
}

/** A Cloudflare-kept repository's address and a short-lived token, or null for a place the app can not trust. */
export async function artifactsUpstream({ artifacts, name }: Artifacts, scope: Scope): Promise<Upstream | null> {
  const repo = await artifacts.get(name);
  const remote = new URL((await repo.info()).remote);
  if (remote.protocol !== "https:" || remote.username || remote.password || remote.search || remote.hash) return null;
  const { plaintext } = await repo.createToken(scope, TOKEN_SECONDS);
  return plaintext ? { url: remote.href.replace(/\/$/, ""), authorization: `Bearer ${plaintext}` } : null;
}

export const plain = (line: string, status: number) => new Response(`${line}\n`,
  { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
/** Git asks its credential helper only after this challenge, then prints the body as the app's own words. */
export const gitSignIn = (origin: string) => new Response(`Sign in to the company app again, then retry: cloudflared access login ${origin}\n`,
  { status: 401, headers: { "WWW-Authenticate": 'Basic realm="company app"', "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
/** No upstream text ever leaves: a refusal there reads the same as a missing key here. */
export const codeUnavailable = () => Response.json({ error: { code: "code_unavailable", message: "The project is not available from this app right now.", requestId: crypto.randomUUID() } },
  { status: 503, headers: { "Cache-Control": "no-store" } });

// One of Git's four calls, as the path under `prefix` that is passed on, and whether it writes.
// Anything else is refused.
export function gitCall(request: Request, url: URL, prefix: string): { path: string; write: boolean } | null {
  const path = url.pathname.slice(prefix.length);
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

/** Where a save stopped: the published branch's look-up, Cloudflare's key, the Git call, or reading its answer. */
export type Failed = { step: "branch" | "key" | "send" | "report"; status?: number; error?: unknown };

/** One call passed on with the credential `reach` gives, or where it failed when the place it is kept fails. */
export async function passed(reach: () => Promise<Upstream | null>, request: Request, path: string, body: BodyInit | null): Promise<Response | Failed> {
  let target: Upstream | null;
  try { target = await reach(); } catch (error) { return { step: "key", error }; }
  if (!target) return { step: "key" };
  let response: Response;
  try {
    // A redirect comes back unfollowed, so the credential is never sent on. A Worker's fetch rejects the "error" mode.
    response = await fetch(`${target.url}/${path}`, { method: request.method, redirect: "manual", body,
      headers: { ...Object.fromEntries(copied(request.headers, FORWARDED)), Authorization: target.authorization, "User-Agent": "git/WongStack-project-code" } });
  } catch (error) { return { step: "send", error }; }
  if (response.ok) return response;
  await response.body?.cancel();
  return { step: "send", status: response.status };
}
// Only what Git reads comes back: never the upstream's cookies or its sign-in challenge. The body arrives
// decoded, so its encoding header stays behind.
export const relay = (response: Response, body: BodyInit | null = response.body) =>
  new Response(body, { status: response.status, headers: [...copied(response.headers, ["Content-Type"]), ["Cache-Control", "no-store"]] });
/** A read call's answer passed back, or code_unavailable when the place it is kept fails. */
export const relayed = (response: Response | Failed) => response instanceof Response ? relay(response) : codeUnavailable();

// A push's body opens with its ref updates, one pkt-line each (four hex digits of length, then `<old> <new> <ref>`),
// up to a flush packet. The pack follows. The updates are read here and judged before anything is passed on.
export const FLUSH = "0000";
export const HEAD_LIMIT = 65_536;
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

// A push's head, read before anything is passed on, and the reader for the rest. Null, with the rest let go, for a
// body Git would not send: Git sends a push uncompressed, and only Git sends this type, never a page in a browser.
export async function readPush(request: Request): Promise<{ reader: ReadableStreamDefaultReader<Uint8Array>; bytes: Uint8Array; lines: string[] } | null> {
  if (!request.body || request.headers.has("Content-Encoding") || request.headers.get("Content-Type") !== "application/x-git-receive-pack-request") return null;
  const reader = request.body.getReader();
  const head = await pushHead(reader);
  if (head) return { reader, ...head };
  await reader.cancel();
  return null;
}

/** A push's updates: each line's new commit and ref, or null for a line that is no update, and its capabilities. */
export function refUpdates(lines: string[]) {
  const [first, caps = ""] = lines[0].split("\0");
  const updates = [first, ...lines.slice(1)].map(line => UPDATE.exec(line.replace(/\n$/, "")));
  return { caps, updates, refs: updates.flatMap(update => update ? [update[2]] : []) };
}

// A refusal Git prints as its own: every ref turned down with the one line.
// A push that named no ref is a plain 403.
export function refused(refs: string[], caps: string, line: string): Response {
  if (!refs.length) return plain(line, 403);
  const report = `${pkt("unpack ok\n")}${refs.map(ref => pkt(`ng ${ref} ${line}\n`)).join("")}${FLUSH}`;
  return new Response(caps.includes("side-band-64k") ? `${pkt(`\u0001${report}`)}${FLUSH}` : report,
    { headers: { "Content-Type": "application/x-git-receive-pack-result", "Cache-Control": "no-store" } });
}

/** The head already read, then the rest of the body as it arrives: the pack is never held. */
export const whole = (head: Uint8Array, reader: ReadableStreamDefaultReader<Uint8Array>) => new ReadableStream<Uint8Array>({
  start: controller => controller.enqueue(head),
  async pull(controller) {
    const { done, value } = await reader.read();
    if (done) controller.close(); else controller.enqueue(value);
  },
  cancel: reason => reader.cancel(reason),
});
