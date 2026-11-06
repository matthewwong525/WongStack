import { expect, it, vi } from "vitest";
import { keys } from "../keys";
import { chatTools, everyKey, heldLevels, holds, keyIds, keyTitle, levelName, madeBySetup, offered, reads, registered, registryFor, registryOf, saved, scopedEnv, withTools } from "./key-levels";
import { database } from "../../tests/employee-access/connections";

vi.mock("../keys.ts", () => ({ keys: {
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
  bank: { title: "Bank", secrets: ["BANK_ID", "BANK_SECRET"] },
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
} }));

it("reads titles, offered levels and who makes a key from the registry", () => {
  expect(keyIds(keys)).toEqual(["stripe", "bank", "cloudflare"]);
  expect([registered(keys, "stripe"), registered(keys, "unknown"), registered(keys, "constructor")]).toEqual([true, false, false]);
  expect(keyTitle(keys, "bank")).toBe("Bank");
  expect(offered(keys, "stripe")).toEqual(["read", "write"]);
  expect(offered(keys, "cloudflare")).toEqual(["read"]);
  expect([madeBySetup(keys, "cloudflare"), madeBySetup(keys, "stripe")]).toEqual([true, false]);
  expect([levelName("read"), levelName("write")]).toEqual(["Read", "Read & write"]);
});

it("lets Read look up, Read & write also change, and no level do neither", () => {
  expect([holds("read", "read"), holds("write", "read"), holds("write", "write")]).toEqual([true, true, true]);
  expect([holds("read", "write"), holds(undefined, "read"), holds(undefined, "write")]).toEqual([false, false, false]);
});

it("gives the owner every key at its highest level and reads stored levels as they count now", () => {
  expect(everyKey(keys)).toEqual(new Map([["stripe", "write"], ["bank", "write"], ["cloudflare", "read"]]));
  // A key no longer registered is ignored; Read & write on a key that offers only Read reads as Read.
  expect(heldLevels(keys, { stripe: "read", retired: "write", cloudflare: "write", bank: "write" }))
    .toEqual(new Map([["stripe", "read"], ["cloudflare", "read"], ["bank", "write"]]));
  expect(heldLevels(keys, {})).toEqual(new Map());
});

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
