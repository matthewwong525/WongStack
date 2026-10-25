import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AccessIdentity } from "../../access";
import { handleApp } from "../index";
import { fakeEnv } from "../../../tests/env";
import { database } from "../../../tests/employee-access/connections";
import { wake } from "./wake";

const START = Date.UTC(2026, 9, 22, 9, 0);
const ORIGIN = "https://business.example.com";
const person = (email: string): AccessIdentity => ({ kind: "user", id: email, claims: { email, sub: `${email}-subject`,
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 1_800_000_000 } });
const sam = person("sam@example.com");
const jo = person("jo@example.com");
const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access",
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } };
const DESK = "1".repeat(32);

let db: ReturnType<typeof database>;
let reached: { line: string; url: string; headers: Record<string, string>; body?: { computer?: unknown } }[];
const LIVE_LINE = { idFromName: (name: string) => name, get: (line: string) => ({ fetch: async (url: string, init: RequestInit) => {
  reached.push({ line, url, headers: Object.fromEntries(new Headers(init.headers)), body: init.body ? JSON.parse(init.body as string) : undefined });
  return new Response("from the line");
} }) };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  db = database();
  reached = [];
});
afterEach(() => vi.useRealTimers());

const open = (who: AccessIdentity, { query = "", headers = {}, line = true }: { query?: string; headers?: Record<string, string>; line?: boolean } = {}) =>
  handleApp(new Request(`${ORIGIN}/apps/inbox/api/line${query}`, { headers: { upgrade: "websocket", ...headers } }),
    fakeEnv(line ? { DB: db.DB, LIVE_LINE } : { DB: db.DB }), who);

it("opens a page's line only from this app, and a computer's from no page or this app", async () => {
  const page = await open(sam, { headers: { origin: ORIGIN } });
  expect(await page.text()).toBe("from the line");
  expect(reached).toEqual([{ line: ":sam@example.com", url: "https://line/connect", body: undefined, headers: { upgrade: "websocket", "x-line-tag": "page",
    "x-line-exp": "1800000000000", "x-line-installation": "", "x-line-email": "sam@example.com" } }]);

  reached = [];
  expect((await open(sam, { query: `?computer=${DESK}` })).status).toBe(200);
  expect((await open(sam, { query: `?computer=${DESK}`, headers: { origin: ORIGIN, upgrade: "WebSocket" } })).status).toBe(200);
  expect(reached.map(call => call.headers["x-line-tag"])).toEqual([`computer:${DESK}`, `computer:${DESK}`]);

  reached = [];
  expect((await open(sam)).status).toBe(403);
  expect((await open(sam, { headers: { origin: "https://evil.example" } })).status).toBe(403);
  expect((await open(sam, { query: `?computer=${DESK}`, headers: { origin: "https://evil.example" } })).status).toBe(403);
  expect(reached).toEqual([]);
});

it("refuses a service token, a request that is no WebSocket, and an unknown computer", async () => {
  expect((await open(machine, { headers: { origin: ORIGIN } })).status).toBe(403);
  const plain = await handleApp(new Request(`${ORIGIN}/apps/inbox/api/line`, { headers: { origin: ORIGIN } }), fakeEnv({ DB: db.DB, LIVE_LINE }), sam);
  expect(plain.status).toBe(426);
  expect((await open(sam, { query: "?computer=desk", headers: { origin: ORIGIN } })).status).toBe(400);
  expect(reached).toEqual([]);
});

it("says so when the app has no line bound, so the inbox keeps checking", async () => {
  const answer = await open(sam, { headers: { origin: ORIGIN }, line: false });
  expect(answer.status).toBe(503);
});

it("wakes only the person's own line, naming the computer, and a failed wake leaves the write as it was", async () => {
  await wake(fakeEnv({ LIVE_LINE }), "install", "sam@example.com");
  await wake(fakeEnv({ LIVE_LINE }), "install", "sam@example.com", DESK);
  await wake(fakeEnv({ LIVE_LINE }), "install", "sam@example.com", null);
  expect(reached.map(call => [call.line, call.body])).toEqual([
    ["install:sam@example.com", { installation: "install", email: "sam@example.com", computer: "*" }],
    ["install:sam@example.com", { installation: "install", email: "sam@example.com", computer: DESK }],
    ["install:sam@example.com", { installation: "install", email: "sam@example.com", computer: null }],
  ]);
  await expect(wake(fakeEnv({}), "install", "sam@example.com")).resolves.toBeUndefined();
  const broken = { idFromName: (name: string) => name, get: () => ({ fetch: async () => { throw new Error("line down"); } }) };
  await expect(wake(fakeEnv({ LIVE_LINE: broken }), "install", "sam@example.com")).resolves.toBeUndefined();
  const quiet = { idFromName: (name: string) => name, get: () => ({ fetch: async () => new Response(null, { status: 204 }) }) };
  await expect(wake(fakeEnv({ LIVE_LINE: quiet }), "install", "sam@example.com")).resolves.toBeUndefined();

  // A tap wakes its person's line and every computer; Jo's tap never reaches Sam's.
  reached = [];
  const plan = { id: "a".repeat(32), kind: "plan", title: "One inbox", workspace: "desk", body: "<p>Plan</p>", actions: ["build"], version: "v1",
    closesAt: START + 3_600_000 };
  const send = (who: AccessIdentity, method: string, route: string, input: unknown, env: object = { DB: db.DB, LIVE_LINE }) => handleApp(new Request(
    `${ORIGIN}/apps/inbox/api/${route}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(input) }), fakeEnv(env), who);
  await send(jo, "PUT", "item", plan);
  await send(jo, "POST", "tap", { item: plan.id, action: "build", version: "v1" });
  expect(reached.map(call => [call.line, call.body?.computer])).toEqual([[":jo@example.com", null], [":jo@example.com", "*"]]);

  await send(sam, "PUT", "item", plan);
  const failed = await send(sam, "POST", "tap", { item: plan.id, action: "build", version: "v1" }, { DB: db.DB, LIVE_LINE: broken });
  expect(failed.status).toBe(200);
});
