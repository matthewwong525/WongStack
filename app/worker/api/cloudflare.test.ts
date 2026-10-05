import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { employee, fixture, owner, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import type { PolicyEnv } from "../employee-access/policy";
import { discovery } from "./discovery";
import { handleApi } from "./router";

const token = "cloudflare-read-token-value";
const saved = JSON.stringify({ version: 1, token, accountId: site.accountId });
const account = `accounts/${site.accountId}`;
let f: ReturnType<typeof fixture>;
let fetch: ReturnType<typeof vi.fn>;
let answer: () => Response;
const env = (key: string | null = saved) => ({ ...f.env, ...(key !== null && { WONG_CLOUDFLARE_READ: key }) }) as unknown as Env & PolicyEnv;
const look = (path: string, query?: string, identity: AccessIdentity | null = owner, bindings = env()) => {
  const address = new URL(`${site.origin}/api/cloudflare/read`);
  address.searchParams.set("path", path);
  if (query !== undefined) address.searchParams.set("query", query);
  return handleApi(new Request(address), bindings, identity);
};
const code = async (response: Response) => [response.status, (await response.json()).error.code];

beforeEach(() => {
  f = fixture();
  answer = () => Response.json({ success: true, result: [{ id: "zone-one" }], result_info: { page: 1, count: 1 }, errors: [], messages: [] });
  fetch = vi.fn(async () => answer());
  vi.stubGlobal("fetch", fetch);
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); });

it("sends one GET to this account's own Cloudflare paths and returns the answer with no key in it", async () => {
  const listed = await look("zones", "per_page=5&name=example.com");
  expect(listed.status).toBe(200);
  expect(await listed.json()).toEqual({ success: true, result: [{ id: "zone-one" }], result_info: { page: 1, count: 1 }, errors: [] });
  const [address, init] = fetch.mock.calls[0];
  expect(String(address)).toBe("https://api.cloudflare.com/client/v4/zones?per_page=5&name=example.com");
  expect(init).toMatchObject({ method: "GET", redirect: "error", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  expect(init.body).toBeUndefined();
  for (const path of ["accounts", account, `${account}/workers/scripts`, `${account}/access/logs/access_requests`, `${account}/billing/profile`,
    "zones/0123456789abcdef/dns_records", `${account}/workers/scripts/My-App_1/settings`]) expect((await look(path)).status, path).toBe(200);
  expect(String(fetch.mock.calls.at(-1)![0])).toBe(`https://api.cloudflare.com/client/v4/${account}/workers/scripts/My-App_1/settings`);
  // Cloudflare's own refusal comes back as it is, with nothing invented around it.
  answer = () => Response.json({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }, { status: 403 });
  expect(await (await look("zones")).json()).toEqual({ success: false, result: null, result_info: null, errors: [{ code: 10000, message: "Authentication error" }] });
  // An account is often named for its owner: a committed setting in the answer is no secret.
  answer = () => Response.json({ success: true, result: { name: `${site.ownerEmail}'s Account` } });
  expect(await (await look(account)).json()).toEqual({ success: true, result: { name: `${site.ownerEmail}'s Account` }, result_info: null, errors: [] });
});

it("refuses another account, stored data and any path that could turn into one, before any request leaves", async () => {
  for (const path of [`accounts/${"b".repeat(32)}/workers/scripts`, "accounts/other", "user/tokens", "memberships", "zonesx", "/zones", "",
    `${account}/d1/database`, `${account}/d1/database/abc/query`, `${account}/D1/database`, `${account}/storage/kv/namespaces`, `${account}/r2/buckets`,
    `${account}/queues`, `${account}/vectorize/v2/indexes`, `${account}/hyperdrive/configs`, `${account}/secrets_store/stores`, `${account}/stream`,
    `${account}/images/v1`, `${account}/workers/durable_objects/namespaces`,
    `${account}/workers/../d1/database`, `${account}/./d1/database`, `${account}//d1/database`, "zones/../user/tokens", `${account}/workers/scripts/.`,
    `${account}/workers?x=1`, `${account}/workers#d1`, `${account}/%64%31/database`, `${account}/workers scripts`, "zones\\..\\user", "x".repeat(501)]) {
    expect((await look(path)).status, path).toBe(400);
  }
  expect(await code(await look(`${account}/d1/database`))).toEqual([400, "not_allowed"]);
  expect(await code(await look("zones", "x".repeat(1001)))).toEqual([400, "invalid_input"]);
  expect(fetch).not.toHaveBeenCalled();
});

it("bounds the answer, and returns nothing it can not show or that carries the key", async () => {
  answer = () => Response.json({ success: true, result: "x".repeat(1_000_001) });
  expect(await code(await look("zones"))).toEqual([413, "too_large"]);
  for (const body of ["not json", JSON.stringify({ result: [] }), JSON.stringify({ success: true, result: { echoed: token } })]) {
    answer = () => new Response(body);
    expect(await code(await look("zones")), body).toEqual([502, "bad_answer"]);
  }
  answer = () => new Response(null, { status: 204 });
  expect(await code(await look("zones"))).toEqual([502, "bad_answer"]);
  fetch.mockImplementationOnce(async () => { throw new Error(`redirected with ${token}`); });
  const failed = await look("zones");
  expect(failed.status).toBe(500); expect(await failed.text()).not.toContain(token);
});

it("answers unavailable until setup has stored the key, and never runs with a key it can not read", async () => {
  for (const missing of [null, ""]) expect(await code(await look("zones", undefined, owner, env(missing)))).toEqual([503, "unavailable"]);
  for (const broken of ["not json", JSON.stringify({ version: 2, token, accountId: site.accountId }), JSON.stringify({ version: 1, token, accountId: "short" }),
    JSON.stringify({ version: 1, token: "", accountId: site.accountId })]) {
    expect(await code(await look("zones", undefined, owner, env(broken))), broken).toEqual([503, "not_ready"]);
  }
  expect(fetch).not.toHaveBeenCalled();
});

it("belongs to the Cloudflare key alone: a level decides, no app is needed, and no level is refused", async () => {
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  const refused = await look("zones", undefined, employee);
  expect([refused.status, (await refused.json()).error.message]).toEqual([403, "Cloudflare: Read needed"]);
  expect((await look("zones", undefined, null)).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
  const listing = async (identity: AccessIdentity) => (await (await discovery(new Request(`${site.origin}/api/actions?app=main`), env(), identity)).json()).actions;
  expect((await listing(employee)).map((item: { operationId: string }) => item.operationId)).toEqual(["main.health"]);
  f.sql.prepare("INSERT INTO wong_access_key_grants VALUES (?, ?, 'cloudflare', 'read', 1)").run(site.installationId, employee.id);
  expect((await look("zones", undefined, employee)).status).toBe(200);
  expect(await listing(employee)).toMatchObject([{ operationId: "cloudflare.read", effect: "read", keys: [{ id: "cloudflare", level: "read" }] }, { operationId: "main.health", keys: [] }]);
  // The person still has no app, and the saved key itself is never in what they are told.
  expect(JSON.stringify(await listing(employee))).not.toContain(token);
});
