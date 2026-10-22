import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { services } from "./services";
import type { KeyEntry } from "../employee-access/key-levels";
import { body } from "../../tests/body";
import { employee, fixture, owner, site } from "../../tests/employee-access/connections";
import { fakeEnv } from "../../tests/env";

// A made-up registry: Stripe is used directly and has a guide, the bank key is not, Docs is a public MCP server with
// no key, and project code never lists.
const registry = vi.hoisted(() => ({ keys: {
  stripe: { title: "Stripe", purpose: "Payments and refunds", docs: "https://docs.stripe.example/api", secrets: ["STRIPE_SECRET_KEY"],
    forward: { base: "https://api.stripe.example/", secret: "STRIPE_SECRET_KEY", header: "Authorization", prefix: "Bearer " } },
  bank: { title: "Bank", purpose: "Balances and transfers", secrets: ["BANK_SECRET"], levels: ["read"] },
  docs: { title: "Docs", purpose: "Public docs", docs: "https://docs.example/mcp", secrets: [], forward: { base: "https://mcp.docs.example/", mcp: { path: "mcp", reads: ["search"] } } },
  code: { title: "Project code", purpose: "This project's own code", secrets: ["WONG_CODE_READ"], alone: true },
} satisfies Record<string, KeyEntry> }));
vi.mock("../keys.ts", () => registry);

const STRIPE = "stripe-secret-value";
let f: ReturnType<typeof fixture>;
beforeEach(() => { f = fixture(); });
afterEach(() => { f.sql.close(); });
const saved = (extra: object = {}) => fakeEnv({ ...f.env, STRIPE_SECRET_KEY: STRIPE, ...extra });
const list = (identity = owner, query = "", env: object = saved(), headers = {}) =>
  services(new Request(`${site.origin}/api/services${query}`, { headers }), env as ReturnType<typeof saved>, identity);
const grant = (id: string, level: string) =>
  f.sql.prepare("INSERT OR REPLACE INTO wong_access_key_grants VALUES (?, ?, ?, ?, 1)").run(site.installationId, employee.id, id, level);

it("lists each key the caller holds a level for, with what it is for and whether it is saved, and counts the rest", async () => {
  const listed = await body(await list());
  expect(listed).toEqual({ revision: expect.stringMatching(/^[0-9a-f]{64}$/), needAccess: 0, services: [
    { id: "bank", name: "Bank", purpose: "Balances and transfers", ready: false, level: "read", direct: false },
    // A key with no secrets is ready as it is, and an MCP server is marked.
    { id: "docs", name: "Docs", purpose: "Public docs", docs: "https://docs.example/mcp", ready: true, level: "write", direct: true, mcp: { path: "mcp" } },
    { id: "stripe", name: "Stripe", purpose: "Payments and refunds", docs: "https://docs.stripe.example/api", ready: true, level: "write", direct: true },
  ] });
  // Project code is the stack's own key, and no key's value is ever in the answer.
  expect(JSON.stringify(listed)).not.toMatch(/Project code|stripe-secret-value/);
  // Before key levels start, a teammate holds none.
  expect(await body(await list(employee))).toMatchObject({ services: [], needAccess: 3 });
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  grant("stripe", "read");
  expect(await body(await list(employee))).toMatchObject({ services: [{ id: "stripe", level: "read" }], needAccess: 2 });
  // `all` lists the rest too, each with no level.
  expect((await body(await list(employee, "?all=1"))).services.map(row => [row.id, row.level])).toEqual([["bank", null], ["docs", null], ["stripe", "read"]]);
});
it("answers only a signed-in person, and holds back a list that would show a secret", async () => {
  expect((await services(new Request(`${site.origin}/api/services`), saved(), null)).status).toBe(401);
  expect((await services(new Request(`${site.origin}/api/services`, { method: "POST" }), saved(), owner)).status).toBe(404);
  f.sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await list(employee)).status).toBe(403);
  // A saved value that matches a purpose would show it, so the list is refused.
  expect((await list(owner, "", saved({ BANK_SECRET: "Balances and transfers" }))).status).toBe(500);
});
it("names a revision, answers 304 while nothing the caller sees has changed, and moves on a level or a saved key", async () => {
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  grant("stripe", "read");
  const first = await list(employee);
  expect(first.headers.get("cache-control")).toBe("private, no-cache");
  const etag = first.headers.get("etag")!;
  expect((await list(employee, "", saved(), { "If-None-Match": etag })).status).toBe(304);
  // A new level, or a key saved, changes what the caller sees.
  grant("stripe", "write");
  expect((await list(employee, "", saved(), { "If-None-Match": etag })).status).toBe(200);
  const now = (await list(employee)).headers.get("etag")!;
  expect((await list(employee, "", saved({ STRIPE_SECRET_KEY: undefined }), { "If-None-Match": now })).status).toBe(200);
  // Each caller has their own revision.
  expect((await list()).headers.get("etag")).not.toBe(now);
});
it("gives only the owner every key before Access starts", async () => {
  const fresh = fixture({ started: false });
  const ask = (identity = owner) => services(new Request(`${site.origin}/api/services`), fakeEnv(fresh.env), identity);
  expect((await body(await ask())).services.map(row => [row.id, row.level])).toEqual([["bank", "read"], ["docs", "write"], ["stripe", "write"]]);
  expect(await body(await ask(employee))).toMatchObject({ services: [], needAccess: 3 });
  fresh.sql.close();
});
