import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cloudflare, employee, fixture, owner, req, seeded, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import { discovery } from "../api/discovery";
import { handleApi } from "../api/router";
import { body } from "../../tests/body";
import { fakeEnv } from "../../tests/env";
import { management } from "./management";
import { registryOf, withTools, type KeyEntry } from "./key-levels";
import { handleAccess } from "./router";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtApps(["access"]));
// One key in the code: its id stays the code's.
vi.mock("../keys.ts", () => ({ keys: { stripe: { title: "Stripe", purpose: "Stripe work", secrets: ["STRIPE_SECRET_KEY"] } } satisfies Record<string, KeyEntry> }));

const notion = { title: "Notion", purpose: "Read our team wiki", docs: "https://developers.notion.example/reference",
  forward: { base: "https://api.notion.example/v1/", header: "Authorization", prefix: "Bearer ", lookups: ["POST search"] } };
const id = site.installationId;
let f: ReturnType<typeof fixture>;
let fetch: ReturnType<typeof vi.fn>;
const save = (tool: string, value: unknown, identity: AccessIdentity = owner, env = f.env) => handleAccess(req(`tools/${tool}`, "PUT", value), env, identity);
const remove = (tool: string, identity: AccessIdentity = owner) => handleAccess(req(`tools/${tool}`, "DELETE"), f.env, identity);
const error = async (response: Response) => [response.status, (await body(response)).error];
/** The live app's bindings for one request, with the tool's made-up key saved. */
const live = async () => withTools(fakeEnv({ ...f.env, TOOL_NOTION: "made-up-notion-token" }));
const ask = async (kind: "read" | "change", method: string, path: string, identity: AccessIdentity = owner) =>
  handleApi(new Request(`${site.origin}/api/direct/notion/${kind}`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, path }) }), await live(), identity);

beforeEach(() => {
  f = fixture();
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  fetch = vi.fn(async () => Response.json({ results: [] }));
  vi.stubGlobal("fetch", fetch);
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("adds a tool from a chat with no publish: its look-ups answer on the next request, with its own key", async () => {
  const saved = await save("notion", notion);
  expect([saved.status, await body(saved)]).toEqual([200, { id: "notion", secret: "TOOL_NOTION" }]);
  expect(f.sql.prepare("SELECT title, added_by, levels_json FROM tools").all()).toEqual([{ title: "Notion", added_by: owner.id, levels_json: '["read"]' }]);
  expect((await ask("read", "POST", "search")).status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0] as [URL, RequestInit];
  expect(String(url)).toBe("https://api.notion.example/v1/search");
  expect(new Headers(init.headers).get("Authorization")).toBe("Bearer made-up-notion-token");
  // Discovery lists its look-up for the owner, and the audit names the save.
  const listed = await body(await discovery(new Request(`${site.origin}/api/actions?app=main&limit=50`), await live(), owner));
  expect(listed.actions.map(action => String(action.operationId))).toContain("notion.read");
  expect(f.sql.prepare("SELECT event FROM wong_access_audit WHERE installation_id = ?").all(id)).toEqual([{ event: "tool_saved" }]);
});

it("keeps a tool at Read unless it was saved with Read & write: a change is never run at Read", async () => {
  await save("notion", notion);
  expect((await ask("change", "PATCH", "pages/abc")).status).toBe(404);
  // A look-up it did not list is a change, and Read runs none.
  expect((await ask("read", "POST", "pages")).status).toBe(400);
  await save("notion", { ...notion, levels: ["read", "write"] });
  expect((await ask("change", "PATCH", "pages/abc")).status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("refuses a teammate, a bad tool by its rule, a code key's id, and a save off the live app", async () => {
  expect(await error(await save("notion", notion, employee))).toEqual([403, { code: "owner_required" }]);
  expect(await error(await save("notion", { ...notion, forward: { ...notion.forward, lookups: ["POST ../admin"] } }))).toEqual([400,
    { code: "bad_tool", message: 'the look-up "POST ../admin" must be METHOD path, with a path that stays under base' }]);
  expect(await error(await save("notion", { ...notion, forward: { ...notion.forward, base: "http://api.notion.example/" } }))).toEqual([400,
    { code: "bad_tool", message: "base must be an HTTPS address ending in /" }]);
  expect(await error(await save("notion", { ...notion, forward: { ...notion.forward, secret: "STRIPE_SECRET_KEY" } }))).toEqual([400,
    { code: "bad_tool", message: "secret must be the tool's own, TOOL_NOTION" }]);
  expect((await error(await save("notion", { ...notion, extra: true })))[0]).toBe(400);
  expect(await error(await save("notion", { ...notion, docs: "" }))).toEqual([400, { code: "bad_tool", message: "a key used directly needs docs, the service's API guide" }]);
  expect(await error(await save("stripe", notion))).toEqual([409, { code: "code_key" }]);
  expect(await error(await save("Bad_Id", notion))).toEqual([404, { code: "not_found" }]);
  const preview = seeded();
  expect(await error(await save("notion", notion, owner, preview.env))).toEqual([409, { code: "live_only" }]);
  preview.sql.close();
  expect(f.sql.prepare("SELECT COUNT(*) AS count FROM tools").get()).toEqual({ count: 0 });
});

it("holds no tool on a preview, and none from a row that breaks a rule", async () => {
  await save("notion", notion);
  expect(Object.keys(registryOf(await withTools({ ...f.env, WONG_ENVIRONMENT: "staging" })))).toEqual(["stripe"]);
  f.sql.exec(`UPDATE tools SET forward_json = '{"base":"https://evil.example/","header":"Authorization","secret":"STRIPE_SECRET_KEY"}'`);
  expect(Object.keys(registryOf(await live()))).toEqual(["stripe"]);
  expect((await ask("read", "GET", "pages")).status).toBe(404);
});

it("removes a tool: Access lists it as added in a chat, and its routes go on the next request", async () => {
  await save("notion", notion);
  const status = await body(await management(req("status", "GET"), await live(), owner));
  expect(status.keys).toContainEqual(expect.objectContaining({ id: "notion", chat: true, reads: ["POST search"] }));
  expect([(await remove("notion")).status, await error(await remove("notion"))]).toEqual([200, [404, { code: "not_found" }]]);
  expect((await ask("read", "GET", "pages")).status).toBe(404);
  expect(await error(await remove("stripe"))).toEqual([409, { code: "code_key" }]);
  expect(fetch).not.toHaveBeenCalled();
  // A database that can not be read refuses with no detail.
  f.sql.exec("DROP TABLE tools");
  expect(await error(await save("notion", notion))).toEqual([503, { code: "access_unavailable" }]);
});

it("starts permissions and key levels on a fresh install's first save, so the look-up just after it answers", async () => {
  f.sql.close();
  f = fixture({ started: false });
  const cf = cloudflare();
  fetch.mockImplementation(async (url: string, init: RequestInit) =>
    String(url).startsWith("https://api.cloudflare.com/") ? cf.fetch(String(url), init) : Response.json({ results: [] }));
  expect((await save("notion", notion)).status).toBe(200);
  expect(f.sql.prepare("SELECT policy_enabled, keys_enabled FROM wong_access_installation").get()).toEqual({ policy_enabled: 1, keys_enabled: 1 });
  expect((await ask("read", "POST", "search")).status).toBe(200);
});

it("drops every level on a tool when it is removed, or when a save changes what it reads", async () => {
  const levels = () => ["wong_access_key_grants", "wong_access_role_keys"].map(table =>
    (f.sql.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE key_id = 'notion'`).get() as { count: number }).count);
  const give = () => {
    f.sql.prepare("INSERT OR REPLACE INTO wong_access_key_grants VALUES (?, ?, 'notion', 'read', 1)").run(id, employee.id);
    f.sql.prepare("INSERT OR REPLACE INTO wong_access_role_keys VALUES (?, 'admin', 'notion', 'read')").run(id);
  };
  await save("notion", notion);
  give();
  // A new name or purpose keeps them; a new look-up, MCP read or level does not.
  await save("notion", { ...notion, title: "Notion wiki" });
  expect(levels()).toEqual([1, 1]);
  for (const changed of [{ ...notion, forward: { ...notion.forward, lookups: ["POST search", "POST databases/*/query"] } },
    { ...notion, forward: { ...notion.forward, lookups: undefined, mcp: { path: "mcp", reads: ["search"] } } }, { ...notion, levels: ["read", "write"] }]) {
    give();
    expect((await save("notion", changed)).status).toBe(200);
    expect(levels()).toEqual([0, 0]);
  }
  // Removed and added again, the tool comes back with nobody holding it.
  give();
  await remove("notion");
  expect(levels()).toEqual([0, 0]);
  await save("notion", notion);
  expect(levels()).toEqual([0, 0]);
});
