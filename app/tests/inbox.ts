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

export let db: ReturnType<typeof database>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  db = database();
});
afterEach(() => vi.useRealTimers());

export async function call(who: AccessIdentity | null, method: string, route: string, input?: Record<string, unknown>) {
  const query = method === "GET" && input ? `?${new URLSearchParams(input as Record<string, string>)}` : "";
  const sends = method !== "GET" && input !== undefined;
  const response = await handleApp(new Request(`https://business.example.com/apps/inbox/api/${route}${query}`, {
    method, ...(sends && { headers: { "content-type": "application/json" }, body: JSON.stringify(input) }) }), fakeEnv({ DB: db.DB, ...(!who && { WORKSPACE_LOGIN: "off" }) }), who);
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

/** The hex sha256 of `bytes`, as the computer sends it with a page's file. */
export const sha256Of = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
/** Uploads `bytes` as page `id`'s file `name`, as `who`'s computer: the raw body, with no Origin. */
export async function upload(who: AccessIdentity, id: string, name: string, bytes: Uint8Array, query: Record<string, string> = {}, headers: HeadersInit = {}) {
  const response = await handleApp(new Request(`https://business.example.com/apps/inbox/api/page-file?${new URLSearchParams({ id, name,
    sha256: sha256Of(bytes), ...query })}`, { method: "PUT", headers, body: bytes }), fakeEnv({ DB: db.DB }), who);
  return { status: response.status, json: response.headers.get("content-type")?.includes("json") ? await body(response) : null };
}
