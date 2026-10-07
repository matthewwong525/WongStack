import { afterEach, beforeEach, expect, it, vi, type MockInstance } from "vitest";
import { fixture, owner, site } from "../../tests/employee-access/connections";
import type { KeyEntry } from "../employee-access/key-levels";
import { dispatch } from "./contract";
import { forwardRoutes } from "./forward";
import { apiActions, apiKeyUse, handleApi, mainRouteInventory } from "./router";
import { body } from "../../tests/body";
import { fakeEnv } from "../../tests/env";

// A made-up registry. Notion offers both levels and names two searches it sends as POST; Ledger offers Read alone,
// sends its key bare in a header of its own and covers two secrets; Stripe is not set up for direct use.
const registry = vi.hoisted(() => ({ keys: {
  notion: { title: "Notion", secrets: ["NOTION_TOKEN"], forward: { base: "https://api.notion.example/v1/", secret: "NOTION_TOKEN",
    header: "Authorization", prefix: "Bearer ", headers: { "Notion-Version": "2022-06-28" }, lookups: ["POST search", "POST databases/*/query"] } },
  ledger: { title: "Ledger", secrets: ["LEDGER_ID", "LEDGER_KEY"], levels: ["read"], forward: { base: "https://ledger.example/", secret: "LEDGER_KEY", header: "X-Api-Key" } },
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
} satisfies Record<string, KeyEntry> }));
vi.mock("../keys.ts", () => registry);

const token = "notion-token-value";
const ledgerKey = "ledger-key-value";
type Kind = "read" | "change";
let f: ReturnType<typeof fixture>;
let answer: () => Response;
let send: ReturnType<typeof vi.fn<typeof fetch>>;
let log: MockInstance<typeof console.log>;
const env = (changes: object = {}) => fakeEnv({ ...f.env, NOTION_TOKEN: token, LEDGER_ID: "ledger-id", LEDGER_KEY: ledgerKey, STRIPE_SECRET_KEY: "stripe-secret-value", ...changes });
const post = (key: string, kind: Kind, input: unknown) => new Request(`${site.origin}/api/direct/${key}/${kind}`,
  { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
/** One direct request as the owner, through dispatch, with the service stubbed. */
const ask = (key: string, kind: Kind, input: unknown) => {
  const { routes, access } = forwardRoutes(registry.keys, send);
  const route = `POST /api/direct/${key}/${kind}`;
  const request = post(key, kind, input);
  return dispatch(routes.get(route)!, request, env(), { url: new URL(request.url), route: new URL(request.url).pathname, identity: owner }, access.get(route));
};
const code = async (response: Response) => [response.status, (await body(response)).error.code];
const sent = (at = -1) => { const [address, init] = send.mock.calls.at(at)!; return { address: String(address), init: init! }; };
const lines = () => log.mock.calls.map(([line]) => JSON.parse(String(line)));

beforeEach(() => {
  f = fixture();
  // Key levels have started and the owner has chosen: look-ups and changes for Notion, look-ups only for Ledger.
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  f.sql.prepare("INSERT INTO wong_access_key_direct VALUES (?, 'notion', 'write', 1), (?, 'ledger', 'read', 1)").run(site.installationId, site.installationId);
  answer = () => Response.json({ results: [{ id: "page-one" }] });
  send = vi.fn<typeof fetch>(async () => answer());
  log = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("passes a GET look-up on to the service's own address with the key added, and returns the status and the answer", async () => {
  const looked = await ask("notion", "read", { method: "GET", path: "pages/abc", query: "page_size=5&filter=a b" });
  expect(looked.status).toBe(200);
  expect(await looked.json()).toEqual({ status: 200, contentType: "application/json", body: { results: [{ id: "page-one" }] } });
  expect(sent().address).toBe("https://api.notion.example/v1/pages/abc?page_size=5&filter=a%20b");
  // The fixed headers and the key's own header are sent, and no other: the caller's sign-in goes nowhere.
  expect(sent().init.headers).toEqual({ "Notion-Version": "2022-06-28", Accept: "application/json", Authorization: `Bearer ${token}` });
  expect(sent().init).toMatchObject({ method: "GET", redirect: "manual" });
  expect(sent().init.signal).toBeInstanceOf(AbortSignal);
  expect(sent().init.body).toBeUndefined();
  // A GET sends no body even when one is given, and a HEAD is a look-up too.
  expect((await ask("notion", "read", { method: "GET", path: "pages", body: { ignored: true } })).status).toBe(200);
  expect([sent().address, sent().init.body, Object.keys(sent().init.headers!)]).toEqual(["https://api.notion.example/v1/pages", undefined, ["Notion-Version", "Accept", "Authorization"]]);
  expect((await ask("notion", "read", { method: "HEAD", path: "pages/" })).status).toBe(200);
  expect(sent().address).toBe("https://api.notion.example/v1/pages/");
  // A key with no prefix and no fixed header sends its secret bare, and only the one its setup names.
  expect((await ask("ledger", "read", { method: "GET", path: "accounts" })).status).toBe(200);
  expect([sent().address, sent().init.headers]).toEqual(["https://ledger.example/accounts", { Accept: "application/json", "X-Api-Key": ledgerKey }]);
});

it("runs a request the key's setup names as a look-up, and sends any other request only as a change", async () => {
  for (const path of ["search", "databases/db-1/query"]) {
    expect((await ask("notion", "read", { method: "POST", path, body: { query: "invoices" } })).status, path).toBe(200);
    expect([sent().address, sent().init.method, sent().init.body]).toEqual([`https://api.notion.example/v1/${path}`, "POST", '{"query":"invoices"}']);
    expect(sent().init.headers).toMatchObject({ "Content-Type": "application/json" });
  }
  const before = send.mock.calls.length;
  // The same kind of request to a path the setup does not name is a change, and `*` stands for one path part only.
  for (const [method, path] of [["POST", "pages"], ["POST", "databases/a/b/query"], ["POST", "search/more"], ["PATCH", "search"], ["DELETE", "pages/abc"], ["PUT", "pages/abc"]]) {
    const refused = await ask("notion", "read", { method, path });
    expect([refused.status, (await body(refused)).error], `${method} ${path}`).toMatchObject([400, { code: "not_a_lookup", message: expect.stringContaining("notion.change") }]);
  }
  // A key with no look-up list reads by the web's own rules alone.
  const only = await ask("ledger", "read", { method: "POST", path: "search" });
  expect([only.status, (await body(only)).error]).toMatchObject([400, { code: "not_a_lookup", message: "Only look-ups run here. This key passes on nothing else." }]);
  // Nothing left for any of them, so nothing more was recorded.
  expect([send.mock.calls.length, log.mock.calls.length]).toEqual([before, before]);
  // The change action sends every method: a JSON body as JSON, and a string as it is with the content type given.
  expect((await ask("notion", "change", { method: "POST", path: "pages", body: { title: "New page" } })).status).toBe(200);
  expect([sent().init.method, sent().init.body, sent().init.headers]).toEqual(["POST", '{"title":"New page"}',
    { "Notion-Version": "2022-06-28", Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }]);
  expect((await ask("notion", "change", { method: "PATCH", path: "pages/abc", body: "title=Renamed", contentType: "application/x-www-form-urlencoded; charset=utf-8" })).status).toBe(200);
  expect([sent().init.body, sent().init.headers]).toMatchObject(["title=Renamed", { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" }]);
  expect((await ask("notion", "change", { method: "DELETE", path: "blocks/abc" })).status).toBe(200);
  expect([sent().init.method, sent().init.body]).toEqual(["DELETE", undefined]);
});

it("refuses a path that leaves the service's address, or names another host, before any request leaves", async () => {
  for (const path of ["/pages", "//evil.example/x", "https://evil.example/x", "http:evil.example", "http:[x", "https:/v2/pages", "..", "../v2", "pages/../../v2",
    "pages/./x", "pages/.", "pages//x", "pages\\x", "\\\\evil.example\\x", "%2e%2e/v2", "pages%2Fx", "pages%2fx", "pages%5Cx", "pages?x=1", "pages#x", "pages x", "pages\nx", "\tpages", "pages\u0000"]) {
    for (const kind of ["read", "change"] as const) expect(await code(await ask("notion", kind, { method: "GET", path })), JSON.stringify(path)).toEqual([400, "not_allowed"]);
  }
  // An input that is not a request this action takes is refused as any action's input is.
  for (const input of [{ method: "GET", path: "" }, { method: "GET", path: "x".repeat(2001) }, { method: "TRACE", path: "pages" }, { method: "GET" }, { method: "GET", path: "pages", query: "x".repeat(4001) },
    { method: "POST", path: "pages", contentType: "text/plain\r\nX-Other: 1" }, { method: "GET", path: "pages", headers: { Authorization: "Bearer mine" } }]) {
    expect(await code(await ask("notion", "change", input)), JSON.stringify(input).slice(0, 80)).toEqual([400, "invalid_input"]);
  }
  expect(send).not.toHaveBeenCalled();
  expect(log).not.toHaveBeenCalled();
});

it("follows no redirect, bounds the answer, and returns none that carries the key", async () => {
  answer = () => new Response(JSON.stringify({ results: [] }), { status: 302, headers: { Location: "https://elsewhere.example/" } });
  expect(await code(await ask("notion", "read", { method: "GET", path: "pages" }))).toEqual([502, "bad_answer"]);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls.every(([address]) => String(address).startsWith("https://api.notion.example/v1/"))).toBe(true);
  answer = () => new Response("x".repeat(1_000_001));
  const large = await ask("notion", "read", { method: "GET", path: "pages" });
  expect([large.status, (await body(large)).error]).toMatchObject([413, { code: "too_large", message: expect.stringContaining("Narrow the request") }]);
  // The key echoed back, in the body or in the content type, is never returned.
  for (const echoed of [new Response(JSON.stringify({ debug: `Bearer ${token}` })), new Response("ok", { headers: { "content-type": `text/plain; note=${token}` } })]) {
    answer = () => echoed;
    const refused = await ask("notion", "read", { method: "GET", path: "pages" });
    expect(refused.status).toBe(502);
    expect(await refused.text()).not.toContain(token);
  }
  // A request that fails on its way leaves no detail, and no key, in what the caller is told.
  send.mockImplementationOnce(async () => { throw new Error(`could not reach the service with ${token}`); });
  const failed = await ask("notion", "change", { method: "POST", path: "pages", body: {} });
  expect(failed.status).toBe(500); expect(await failed.text()).not.toContain(token);
});

it("returns the service's own refusal with its status, and an answer that is not JSON as text", async () => {
  answer = () => Response.json({ object: "error", message: "Could not find page" }, { status: 404 });
  const missing = await ask("notion", "read", { method: "GET", path: "pages/none" });
  expect([missing.status, await missing.json()]).toEqual([200, { status: 404, contentType: "application/json", body: { object: "error", message: "Could not find page" } }]);
  answer = () => new Response("plain words", { status: 500, headers: { "content-type": "text/plain" } });
  expect(await (await ask("notion", "read", { method: "GET", path: "pages" })).json()).toEqual({ status: 500, contentType: "text/plain", body: "plain words" });
  // An answer that says JSON and is not stays the text it is; one with no body and no type is empty.
  answer = () => new Response("<html>", { headers: { "content-type": "application/problem+json" } });
  expect(await (await ask("notion", "read", { method: "GET", path: "pages" })).json()).toEqual({ status: 200, contentType: "application/problem+json", body: "<html>" });
  answer = () => new Response(null, { status: 204 });
  expect(await (await ask("notion", "change", { method: "DELETE", path: "pages/abc" })).json()).toEqual({ status: 204, contentType: "", body: "" });
});

it("records each request sent with who, which key, what kind and where, and never its query, its body or the key", async () => {
  answer = () => Response.json({ id: "page-two" }, { status: 201 });
  await ask("notion", "change", { method: "POST", path: "pages", query: "private_query=1", body: { title: "Private title" } });
  await ask("ledger", "read", { method: "GET", path: "accounts", query: "private_query=2" });
  expect(lines()).toEqual([
    { event: "direct_request", caller: owner.id, key: "notion", kind: "change", method: "POST", path: "pages", status: 201 },
    { event: "direct_request", caller: owner.id, key: "ledger", kind: "read", method: "GET", path: "accounts", status: 201 },
  ]);
  for (const hidden of ["private_query", "Private title", token, ledgerKey]) expect(JSON.stringify(log.mock.calls)).not.toContain(hidden);
  // A request that never got an answer is recorded too, with no status.
  send.mockImplementationOnce(async () => { throw new Error("unreachable"); });
  await ask("notion", "read", { method: "GET", path: "pages" });
  expect(lines().at(-1)).toEqual({ event: "direct_request", caller: owner.id, key: "notion", kind: "read", method: "GET", path: "pages", status: 0 });
});

it("registers a look-up action for each key set up, a change action where the key offers Read & write, each mapped to its key alone", async () => {
  const mapped = mainRouteInventory().filter(({ route }) => route.includes("/api/direct/"));
  expect(mapped).toEqual([
    { route: "POST /api/direct/notion/read", access: { keys: ["notion"], direct: "read" } },
    { route: "POST /api/direct/notion/change", access: { keys: ["notion"], direct: "write" } },
    { route: "POST /api/direct/ledger/read", access: { keys: ["ledger"], direct: "read" } },
  ]);
  const direct = apiActions.filter(({ path }) => path.startsWith("/api/direct/"));
  expect(direct.map(({ method, path, action, access }) => [method, path, action.operationId, action.effect, access])).toEqual([
    ["POST", "/api/direct/notion/read", "notion.read", "read", { keys: ["notion"], direct: "read" }],
    ["POST", "/api/direct/notion/change", "notion.change", "external", { keys: ["notion"], direct: "write" }],
    ["POST", "/api/direct/ledger/read", "ledger.read", "read", { keys: ["ledger"], direct: "read" }],
  ]);
  // Each says what it takes, with an example, its limits and its own safe errors, and names its look-ups.
  for (const { action } of direct) {
    expect([action.agentAvailable, action.encoding, action.limits, action.confirmWith, Object.keys(action.errors).sort()], action.operationId)
      .toEqual([true, "json", { inputBytes: 262_144, outputBytes: 4_194_304, timeoutMs: 30_000 }, undefined, ["bad_answer", "not_a_lookup", "not_allowed", "too_large"]]);
    expect(action.examples).toHaveLength(1);
    expect(action.description).toContain(action.operationId.startsWith("notion") ? "https://api.notion.example/v1/" : "https://ledger.example/");
  }
  expect(direct[0].action.description).toContain("GET, HEAD, and POST search, POST databases/*/query. Anything else needs notion.change, which needs Read & write.");
  expect(direct[2].action.description).toContain("GET, HEAD. This key passes on nothing else.");
  expect(apiKeyUse.filter(use => use.direct)).toEqual([{ apps: [], keys: ["notion"], need: "read", direct: "read" },
    { apps: [], keys: ["notion"], need: "write", direct: "write" }, { apps: [], keys: ["ledger"], need: "read", direct: "read" }]);
  // Through the app's own router the request goes out by the Worker's fetch, and a key that is not saved stops the call first.
  vi.stubGlobal("fetch", send);
  const routed = await handleApi(post("notion", "read", { method: "GET", path: "pages" }), env(), owner);
  expect([routed.status, (await body(routed)).status, sent().address]).toEqual([200, 200, "https://api.notion.example/v1/pages"]);
  expect(await code(await handleApi(post("ledger", "read", { method: "GET", path: "accounts" }), env({ LEDGER_ID: "" }), owner))).toEqual([503, "unavailable"]);
  for (const path of ["/api/direct/stripe/read", "/api/direct/ledger/change", "/api/direct/notion"]) {
    expect((await handleApi(new Request(`${site.origin}${path}`, { method: "POST" }), env(), owner)).status, path).toBe(404);
  }
  expect(send).toHaveBeenCalledTimes(1);
});
