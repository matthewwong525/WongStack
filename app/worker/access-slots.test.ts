import { expect, it, vi } from "vitest";
import { chatTools, keyIds, keyTitle, reads } from "../../.agents/skills/access/server/levels.mjs";
import { accessFor, registryOf, saved, scopedEnv, withRegistry, type ConnectionEnv } from "./access-slots";
import { database, fixture, owner, req } from "../tests/employee-access/connections";
import { handleAccess } from "./employee-access/router";

vi.mock("./keys.ts", () => ({ keys: {
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
  bank: { title: "Bank", secrets: ["BANK_ID", "BANK_SECRET"] },
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
} }));
/** The registry the owner's request reads: the code's keys, then the live app's tools. */
const registryFor = (env: ConnectionEnv) => accessFor(env, owner).registry(new Request("https://app.example.com/api/access/status"));
const withTools = async <E extends ConnectionEnv>(env: E) => withRegistry(env, await registryFor(env));

it("calls a key saved only when every one of its secrets is a non-empty string", () => {
  const env = { STRIPE_SECRET_KEY: "value", BANK_ID: "id", BANK_SECRET: "" };
  expect(saved(env, "stripe")).toBe(true);
  expect(saved(env, "bank")).toBe(false);
  expect(saved({ ...env, BANK_SECRET: "secret" }, "bank")).toBe(true);
  expect(saved({ WONG_CLOUDFLARE_READ: { not: "text" } }, "cloudflare")).toBe(false);
  expect(saved({}, "cloudflare")).toBe(false);
  expect(saved(env, "unknown")).toBe(false);
});

it("hands a route a copy of the bindings with only the keys it lists", () => {
  const env = { DB: { name: "app-db" }, STRIPE_SECRET_KEY: "value", BANK_ID: "id", BANK_SECRET: "secret", WONG_CLOUDFLARE_READ: "cf", OTHER: "kept" };
  expect(scopedEnv(env, ["bank"])).toEqual({ DB: env.DB, BANK_ID: "id", BANK_SECRET: "secret", OTHER: "kept" });
  expect(scopedEnv(env, [])).toEqual({ DB: env.DB, OTHER: "kept" });
  expect(scopedEnv(env, ["stripe", "bank", "cloudflare", "unknown"])).toEqual(env);
  // The Worker's own bindings are never changed.
  expect(Object.keys(env)).toHaveLength(6);
});

// A tool added from a chat, as the live app's data holds it.
const row = { id: "notion", title: "Notion", purpose: "Team notes", docs: "https://developers.notion.com/reference",
  forward_json: JSON.stringify({ base: "https://api.notion.example/v1/", header: "Authorization", prefix: "Bearer ", lookups: ["POST search"] }), levels_json: '["read"]' };
/** The live app's bindings, its tools table holding `rows`; `change` then runs on that copy. */
const live = (rows: (typeof row)[], change = "") => {
  const { sql, DB } = database();
  const add = sql.prepare("INSERT INTO tools VALUES (?, ?, ?, ?, ?, ?, 'owner@example.com', 'now')");
  for (const tool of rows) add.run(tool.id, tool.title, tool.purpose, tool.docs, tool.forward_json, tool.levels_json);
  sql.exec(change);
  return { WONG_ENVIRONMENT: "production", DB };
};

it("reads a request's registry once: the code's keys, then the live app's tools, the code winning a name", async () => {
  const registry = await registryFor(live([row, { ...row, id: "stripe", title: "Not the code's" }]));
  expect(keyIds(registry)).toEqual(["stripe", "bank", "cloudflare", "notion"]);
  expect([keyTitle(registry, "stripe"), keyTitle(registry, "notion")]).toEqual(["Stripe", "Notion"]);
  expect(registry.notion).toMatchObject({ secrets: ["TOOL_NOTION"], levels: ["read"], liveOnly: true, chat: true,
    forward: { secret: "TOOL_NOTION", lookups: ["POST search"] } });
  expect([Object.keys(chatTools(registry)), reads(registry, "notion"), reads(registry, "stripe")]).toEqual([["notion"], ["POST search"], []]);
  // Bindings carry it, and every copy of them keeps it; bindings with none hold the code's keys.
  const env = await withTools(live([row]));
  expect([keyIds(registryOf(env)), keyIds(registryOf({ ...env })), keyIds(registryOf({}))])
    .toEqual([["stripe", "bank", "cloudflare", "notion"], ["stripe", "bank", "cloudflare", "notion"], ["stripe", "bank", "cloudflare"]]);
  expect(saved({ ...env, TOOL_NOTION: "made-up" }, "notion")).toBe(true);
});

it("holds no tool on a preview, before the table exists, or for a row that breaks a rule", async () => {
  const preview = { ...live([row]), WONG_ENVIRONMENT: "staging" };
  const broken = [{ ...row, forward_json: "{" }, { ...row, id: "Bad_Id" }, { ...row, id: "notes", levels_json: '["write"]' },
    { ...row, id: "wiki", forward_json: JSON.stringify({ base: "https://api.notion.example/v1/", header: "Authorization", lookups: ["POST ../admin"] }) }];
  for (const env of [preview, live([], "DROP TABLE tools"), live(broken), {}]) expect(keyIds(await registryFor(env))).toEqual(["stripe", "bank", "cloudflare"]);
});

it("hands a route no tool secret it does not list, a tool's whose row is gone included", async () => {
  const env = { ...await withTools(live([row])), TOOL_NOTION: "made-up", TOOL_GONE: "left-over", OTHER: "kept" };
  expect(Object.keys(scopedEnv(env, ["notion"])).sort()).toEqual(["DB", "OTHER", "TOOL_NOTION", "WONG_ENVIRONMENT"]);
  expect(Object.keys(scopedEnv(env, ["stripe"])).sort()).toEqual(["DB", "OTHER", "WONG_ENVIRONMENT"]);
});

it("saves, saves again and removes a chat tool through the live app's keyed bindings", async () => {
  const { env } = fixture();
  const keyed = async () => withRegistry(env, await accessFor(env, owner).registry(req("status", "GET")));
  const tool = { title: "Notion", purpose: "Team notes", docs: "https://developers.notion.com/reference",
    forward: { base: "https://api.notion.example/v1/", header: "Authorization", prefix: "Bearer ", lookups: ["POST search"] } };
  const call = async (method: string, body?: unknown) => {
    const answer = await handleAccess(req("tools/notion", method, body), await keyed(), owner);
    return [answer.status, await answer.json()];
  };
  expect(await call("PUT", tool)).toEqual([200, { id: "notion", secret: "TOOL_NOTION" }]);
  expect(keyIds(registryOf(await keyed()))).toContain("notion");
  expect(await call("PUT", { ...tool, purpose: "Team notes and docs" })).toEqual([200, { id: "notion", secret: "TOOL_NOTION" }]);
  expect(await call("DELETE")).toEqual([200, { removed: true }]);
  expect(keyIds(registryOf(await keyed()))).not.toContain("notion");
  // A key the code lists stays the project's.
  const stripe = await handleAccess(req("tools/stripe", "PUT", tool), await keyed(), owner);
  expect([stripe.status, await stripe.json()]).toEqual([409, { error: { code: "code_key" } }]);
});

it("lets a request with no caller through only on the open starter", async () => {
  const asked = new Request("https://app.example.com/");
  const { DB } = database();
  const shut = await accessFor({ DB, WONG_OWNER_EMAIL: owner.id }, null).gate(asked, { apps: ["orders"] });
  expect(shut?.status).toBe(401);
  // The owner has not opened Access yet, so the open starter lets everyone in, as before.
  expect(await accessFor({ DB, WONG_OWNER_EMAIL: owner.id, WORKSPACE_LOGIN: "off" }, null).gate(asked, { apps: ["orders"] })).toBeNull();
  // A leftover switch on a private app opens nothing.
  const stale = { DB, WONG_OWNER_EMAIL: owner.id, WORKSPACE_LOGIN: "off", CF_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", CF_ACCESS_AUD: "aud" };
  expect((await accessFor(stale, null).gate(asked, { apps: ["orders"] }))?.status).toBe(401);
});
