import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { services } from "./services";
import type { KeyEntry } from "../employee-access/key-levels";
import { body } from "../../tests/body";
import { employee, fixture, owner, site } from "../../tests/employee-access/connections";
import { mcpFixture, SEAL_VALUE } from "../../tests/mcp";
import { fakeEnv } from "../../tests/env";

// A made-up registry: Stripe is used directly and has a guide, the bank key is not, and project code never lists.
const registry = vi.hoisted(() => ({ keys: {
  stripe: { title: "Stripe", purpose: "Payments and refunds", docs: "https://docs.stripe.example/api", secrets: ["STRIPE_SECRET_KEY"],
    forward: { base: "https://api.stripe.example/", secret: "STRIPE_SECRET_KEY", header: "Authorization", prefix: "Bearer " } },
  bank: { title: "Bank", purpose: "Balances and transfers", secrets: ["BANK_SECRET"], levels: ["read"] },
  code: { title: "Project code", purpose: "This project's own code", secrets: ["WONG_CODE_READ"], alone: true },
} satisfies Record<string, KeyEntry> }));
vi.mock("../keys.ts", () => registry);

let f: ReturnType<typeof mcpFixture>;
beforeEach(() => { f = mcpFixture(); });
afterEach(() => { f.sql.close(); });
const list = (identity = owner, query = "", env: object = { ...f.env, STRIPE_SECRET_KEY: "stripe-secret-value" }, headers = {}) =>
  services(new Request(`${site.origin}/api/services${query}`, { headers }), env as typeof f.env, identity);

it("lists each saved key the caller holds a level for, with what it is for, and counts the rest", async () => {
  expect(await body(await list())).toMatchObject({ needAccess: 0, services: [
    { id: "bank", kind: "key", name: "Bank", purpose: "Balances and transfers", ready: false, level: "read", direct: false },
    { id: "stripe", kind: "key", name: "Stripe", purpose: "Payments and refunds", docs: "https://docs.stripe.example/api", ready: true, level: "write", direct: true },
  ] });
  // Before key levels start, a teammate holds none.
  expect(await body(await list(employee))).toMatchObject({ services: [], needAccess: 2 });
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  f.sql.prepare("INSERT INTO wong_access_key_grants VALUES (?, ?, 'stripe', 'read', 1)").run(site.installationId, employee.id);
  expect(await body(await list(employee))).toMatchObject({ services: [{ id: "stripe", level: "read" }], needAccess: 1 });
  expect((await body(await list(employee, "?all=1"))).services.map(row => [row.id, row.level])).toEqual([["bank", null], ["stripe", "read"]]);
});
it("lists every MCP, ready with the caller's own sign-in or a teammate's share", async () => {
  await f.add(); await f.signIn(owner);
  await f.run(owner, "servers/canva/share", "POST", { share: "read" });
  const mcp = async (identity = owner) => (await body<{ services: Record<string, unknown>[] }>(await list(identity))).services.find(row => row.kind === "mcp");
  expect(await mcp()).toEqual({ id: "mcp:canva", kind: "mcp", name: "Canva", purpose: "Canva designs and folders.", ready: true, own: "connected", tools: 2 });
  expect(await mcp(employee)).toEqual({ id: "mcp:canva", kind: "mcp", name: "Canva", purpose: "Canva designs and folders.", ready: true, own: null,
    using: { who: owner.id, share: "read" }, tools: 2, connect: `${site.origin}/apps/access/services/canva` });
  await f.run(owner, "servers/canva/share", "POST", { share: "none" });
  expect(await mcp(employee)).toMatchObject({ ready: false, own: null });
  // An app that can't seal sign-ins yet lists its MCPs as not ready.
  expect((await body(await list(owner, "", { ...f.env, WONG_MCP_SEAL: undefined }))).services.at(-1)).toMatchObject({ ready: false });
});
it("answers only a signed-in person, and holds back a list that would show a secret", async () => {
  expect((await services(new Request(`${site.origin}/api/services`), f.env, null)).status).toBe(401);
  expect((await services(new Request(`${site.origin}/api/services`, { method: "POST" }), f.env, owner)).status).toBe(404);
  f.sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await list(employee)).status).toBe(403);
  await f.add(); await f.signIn(owner);
  f.sql.prepare("UPDATE wong_mcp_servers SET instructions = ?").run(SEAL_VALUE);
  expect((await list()).status).toBe(500);
});
it("names a revision, and answers 304 while nothing the caller sees has changed", async () => {
  const first = await list();
  expect([first.headers.get("cache-control"), (await body(first)).revision]).toEqual(["private, no-cache", expect.stringMatching(/^[0-9a-f]{64}$/)]);
  const etag = first.headers.get("etag")!;
  expect((await list(owner, "", undefined, { "If-None-Match": etag })).status).toBe(304);
  await f.add();
  expect((await list(owner, "", undefined, { "If-None-Match": etag })).status).toBe(200);
  expect((await list(employee)).headers.get("etag")).not.toBe(etag);
});
it("gives only the owner every key before Access starts, and lists no MCP until it has", async () => {
  const fresh = fixture({ started: false });
  const ask = (identity = owner) => services(new Request(`${site.origin}/api/services`), fakeEnv({ ...fresh.env, WONG_MCP_SEAL: SEAL_VALUE }), identity);
  expect((await body(await ask())).services.map(row => [row.id, row.level])).toEqual([["bank", "read"], ["stripe", "write"]]);
  expect(await body(await ask(employee))).toMatchObject({ services: [], needAccess: 2 });
  fresh.sql.close();
});
it("still lists the keys when the MCP tables can not be read", async () => {
  f.sql.exec("DROP TABLE wong_mcp_sign_ins; DROP TABLE wong_mcp_connections; DROP TABLE wong_mcp_servers");
  expect((await body(await list())).services.map(row => row.id)).toEqual(["bank", "stripe"]);
});
