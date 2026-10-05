import { expect, it, vi } from "vitest";
import { everyKey, heldLevels, holds, keyIds, keyTitle, levelName, madeBySetup, offered, registered, saved, scopedEnv } from "./key-levels";

vi.mock("../keys.ts", () => ({ keys: {
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
  bank: { title: "Bank", secrets: ["BANK_ID", "BANK_SECRET"] },
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
} }));

it("reads titles, offered levels and who makes a key from the registry", () => {
  expect(keyIds()).toEqual(["stripe", "bank", "cloudflare"]);
  expect([registered("stripe"), registered("unknown"), registered("constructor")]).toEqual([true, false, false]);
  expect(keyTitle("bank")).toBe("Bank");
  expect(offered("stripe")).toEqual(["read", "write"]);
  expect(offered("cloudflare")).toEqual(["read"]);
  expect([madeBySetup("cloudflare"), madeBySetup("stripe")]).toEqual([true, false]);
  expect([levelName("read"), levelName("write")]).toEqual(["Read", "Read & write"]);
});

it("lets Read look up, Read & write also change, and no level do neither", () => {
  expect([holds("read", "read"), holds("write", "read"), holds("write", "write")]).toEqual([true, true, true]);
  expect([holds("read", "write"), holds(undefined, "read"), holds(undefined, "write")]).toEqual([false, false, false]);
});

it("gives the owner every key at its highest level and reads stored levels as they count now", () => {
  expect(everyKey()).toEqual(new Map([["stripe", "write"], ["bank", "write"], ["cloudflare", "read"]]));
  // A key no longer registered is ignored; Read & write on a key that offers only Read reads as Read.
  expect(heldLevels({ stripe: "read", retired: "write", cloudflare: "write", bank: "write" }))
    .toEqual(new Map([["stripe", "read"], ["cloudflare", "read"], ["bank", "write"]]));
  expect(heldLevels({})).toEqual(new Map());
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
