// What the inbox's API tests share: two people and a machine, a fresh database each test, the clock, and the calls.
import { createHash } from "node:crypto";
import { afterEach, beforeEach, vi } from "vitest";
import type { AccessIdentity } from "../worker/access-slots";
import { handleApp } from "../worker/apps/index";
import { body } from "./body";
import { fakeEnv } from "./env";
import { database } from "./employee-access/connections";

export const START = Date.UTC(2026, 9, 22, 9, 0);
export const person = (email: string): AccessIdentity => ({ kind: "user", id: email, claims: { email, sub: `${email}-subject`,
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } });
export const sam = person("sam@example.com");
export const jo = person("jo@example.com");
export const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access",
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } };

// Workers hash a stream with crypto.DigestStream; Node has none, so the tests stand one in.
class NodeDigestStream extends WritableStream<Uint8Array> {
  readonly digest: Promise<ArrayBuffer>;
  constructor(algorithm: string) {
    const hash = createHash(algorithm.replace("-", "").toLowerCase());
    let done = (_bytes: ArrayBuffer) => {};
    const digest = new Promise<ArrayBuffer>(resolve => { done = resolve; });
    super({ write: chunk => { hash.update(chunk); }, close: () => done(Uint8Array.from(hash.digest()).buffer) });
    this.digest = digest;
  }
}
Object.assign(crypto, { DigestStream: crypto.DigestStream ?? NodeDigestStream });

// Workers stream a known length to R2 through FixedLengthStream; this one also fails on a wrong length.
class NodeFixedLengthStream extends TransformStream<Uint8Array, Uint8Array> {
  constructor(length: number) {
    let seen = 0;
    super({ transform: (chunk, controller) => { seen += chunk.byteLength; controller.enqueue(chunk); },
      flush: () => { if (seen !== length) throw new Error("wrong length"); } });
  }
}
Object.assign(globalThis, { FixedLengthStream: (globalThis as { FixedLengthStream?: unknown }).FixedLengthStream ?? NodeFixedLengthStream });

/** The INBOX_PAGES bucket, as much as the inbox asks of it; `pageSize` keys a list call gives at most. */
export class FakeBucket {
  objects = new Map<string, Uint8Array>();
  pageSize = 1000;
  async put(key: string, stream: ReadableStream<Uint8Array>, options: { sha256: string }) {
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    if (sha256Of(bytes) !== options.sha256) throw new Error("The bytes are not their hash.");
    this.objects.set(key, bytes);
  }
  async head(key: string) {
    const bytes = this.objects.get(key);
    return bytes ? { size: bytes.byteLength } : null;
  }
  async get(key: string, options?: { range: { offset: number; length: number } }) {
    const all = this.objects.get(key);
    if (!all) return null;
    const bytes = options ? all.subarray(options.range.offset, options.range.offset + options.range.length) : all;
    return { body: new Response(bytes).body!, arrayBuffer: async () => bytes.slice().buffer };
  }
  async delete(keys: string | string[]) {
    for (const key of [keys].flat()) this.objects.delete(key);
  }
  async list({ prefix, cursor }: { prefix: string; cursor?: string }) {
    const keys = [...this.objects.keys()].filter(key => key.startsWith(prefix)).sort();
    const after = keys.filter(key => !cursor || key > cursor), page = after.slice(0, this.pageSize);
    const truncated = after.length > page.length;
    return { objects: page.map(key => ({ key })), truncated, cursor: truncated ? page.at(-1) : undefined };
  }
}

export let db: ReturnType<typeof database>;
/** The inbox's bucket in this test, or null: an app with no file store. */
export let pages: FakeBucket | null = null;
export const addBucket = () => (pages = new FakeBucket());
/** The app's bindings in this test: the database, and the bucket once `addBucket` ran. */
export const inboxEnv = (more: object = {}) => fakeEnv({ DB: db.DB, ...(pages && { INBOX_PAGES: pages as unknown as R2Bucket }), ...more });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  db = database();
  pages = null;
});
afterEach(() => vi.useRealTimers());

export async function call(who: AccessIdentity | null, method: string, route: string, input?: Record<string, unknown>) {
  const query = method === "GET" && input ? `?${new URLSearchParams(input as Record<string, string>)}` : "";
  const sends = method !== "GET" && input !== undefined;
  const response = await handleApp(new Request(`https://business.example.com/apps/inbox/api/${route}${query}`, {
    method, ...(sends && { headers: { "content-type": "application/json" }, body: JSON.stringify(input) }) }), inboxEnv(who ? {} : { WORKSPACE_LOGIN: "off" }), who);
  return { status: response.status, json: await body(response) };
}

export const PLAN = "a".repeat(32);
export const APPROVAL = "b".repeat(32);
export const plan = { id: PLAN, kind: "plan", title: "One inbox", workspace: "lousy-dingo", body: "<p>The plan</p>", actions: ["build", "publish"],
  version: "v1", closesAt: START + 24 * 3_600_000 };
export const approval = { ...plan, id: APPROVAL, kind: "approval", title: "Send the kit quote to Kim", workspace: "email",
  body: JSON.stringify({ text: "It wants to send one message." }), actions: ["approve", "decline"], version: "q1" };
export const put = (who: AccessIdentity, item: Record<string, unknown>) => call(who, "PUT", "item", item);
export const tap = (who: AccessIdentity, input: Record<string, unknown>) => call(who, "POST", "tap", { item: PLAN, version: "v1", ...input });
export const checkin = async (who = sam, items = [PLAN, APPROVAL]) => (await call(who, "POST", "checkin", { items })).json.taps;
export const later = (ms: number) => vi.setSystemTime(Date.now() + ms);
/** The HTML `who`'s own page `id` shows in its sealed frame. */
export const frameOf = async (who: AccessIdentity, id: string) => (await handleApp(new Request(
  `https://business.example.com/apps/inbox/api/frame?id=${id}`), inboxEnv(), who)).text();

/** The hex sha256 of `bytes`, as the computer sends it with a page's file. */
export const sha256Of = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
/** Uploads `bytes` as page `id`'s file `name`, as `who`'s computer: the raw body, with no Origin. */
export async function upload(who: AccessIdentity, id: string, name: string, bytes: Uint8Array, query: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const response = await handleApp(new Request(`https://business.example.com/apps/inbox/api/page-file?${new URLSearchParams({ id, name,
    sha256: sha256Of(bytes), ...query })}`, { method: "PUT", headers: { "content-length": String(bytes.byteLength), ...headers }, body: bytes }), inboxEnv(), who);
  return { status: response.status, json: response.headers.get("content-type")?.includes("json") ? await body(response) : null };
}
