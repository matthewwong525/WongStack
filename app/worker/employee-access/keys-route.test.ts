import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { employee, fixture, owner, req, seeded, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import { body } from "../../tests/body";
import { management } from "./management";
import { withTools, type KeyEntry } from "./key-levels";
import { handleAccess } from "./router";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtApps(["access"]));
// Stripe is a key in the code; setup makes the look-up key and Maps; the project's code is the Worker's own.
vi.mock("../keys.ts", () => ({ keys: {
  stripe: { title: "Stripe", purpose: "Payments", secrets: ["STRIPE_SECRET_KEY"] },
  ledger: { title: "Ledger", purpose: "Books", secrets: ["LEDGER_ID", "LEDGER_KEY"] },
  cloudflare: { title: "Cloudflare", purpose: "Look-ups", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
  maps: { title: "Maps", purpose: "Maps", secrets: ["MAPS_KEY"], setup: true },
  code: { title: "Project code", purpose: "Code", secrets: ["WONG_CODE_READ"], alone: true },
} satisfies Record<string, KeyEntry> }));

const PUBLIC = "made-up-public-key";
const sealed = { v: 1, wrapped: "d3JhcHBlZA==", iv: "aXY=", data: "ZGF0YQ==" };
const shop = { title: "Shop", purpose: "Store orders", docs: "https://shop.example/docs",
  forward: { base: "https://shop.example/admin/", header: "X-Shop-Token", prefix: "", exchange: { url: "https://shop.example/admin/oauth/access_token" } } };
const admin: AccessIdentity = { ...employee, id: "admin@example.com", claims: { ...employee.claims, email: "admin@example.com", sub: "admin" } };
let f: ReturnType<typeof fixture>;
const env = (changes: object = {}) => ({ ...f.env, WONG_KEY_SEAL_PUBLIC: PUBLIC, ...changes });
const send = (path: string, value: unknown = { sealed, ends: "9f2c" }, identity: AccessIdentity = owner, bindings: object = env()) =>
  handleAccess(req(`keys/${path}`, "PUT", value), bindings, identity);
const refusal = async (response: Response) => [response.status, (await body(response)).error.code];
const rows = () => f.sql.prepare("SELECT name, sealed, ends, sent_by, typeof(sent_at) AS at FROM sealed_keys ORDER BY name").all();

beforeEach(() => {
  f = fixture();
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { f.sql.close(); vi.restoreAllMocks(); });

it("serves the publish's public key to the owner and an Admin, or says the app has no pair yet", async () => {
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, 'now')").run(site.installationId, admin.id);
  f.sql.prepare("INSERT INTO wong_access_member_roles VALUES (?, ?, 'admin')").run(site.installationId, admin.id);
  for (const identity of [owner, admin]) expect(await body(await handleAccess(req("keys/seal", "GET"), env(), identity))).toEqual({ publicKey: PUBLIC });
  expect(await refusal(await handleAccess(req("keys/seal", "GET"), env(), employee))).toEqual([403, "owner_required"]);
  expect(await refusal(await handleAccess(req("keys/seal", "GET"), f.env, owner))).toEqual([409, "no_seal"]);
  // No route reads a sent key back.
  await send("STRIPE_SECRET_KEY");
  for (const path of ["keys/STRIPE_SECRET_KEY", "keys/stripe/0"]) expect(await refusal(await handleAccess(req(path, "GET"), env(), owner))).toEqual([404, "not_found"]);
  expect(await refusal(await handleAccess(req("keys/STRIPE_SECRET_KEY", "DELETE"), env(), owner))).toEqual([404, "not_found"]);
  // An Admin sends a key as the owner does, and the row names who sent it.
  expect((await send("LEDGER_KEY", undefined, admin)).status).toBe(200);
  expect(rows()).toContainEqual(expect.objectContaining({ name: "LEDGER_KEY", sent_by: admin.id }));
});

it("keeps only the sealed key, its last four, who sent it and when; a newer key replaces a waiting one", async () => {
  expect(await body(await send("STRIPE_SECRET_KEY"))).toEqual({ name: "STRIPE_SECRET_KEY", ends: "9f2c", waiting: true });
  expect(rows()).toEqual([{ name: "STRIPE_SECRET_KEY", sealed: JSON.stringify(sealed), ends: "9f2c", sent_by: owner.id, at: "integer" }]);
  expect(f.sql.prepare("SELECT event FROM wong_access_audit").all()).toEqual([{ event: "key_sent:STRIPE_SECRET_KEY" }]);
  // Access names the secret by its key and its place; the second of Ledger's is its key.
  expect(await body(await send("stripe/0", { sealed: { ...sealed, data: "bmV3ZXI=" }, ends: "ab12" }))).toEqual({ name: "STRIPE_SECRET_KEY", ends: "ab12", waiting: true });
  expect((await send("ledger/1")).status).toBe(200);
  expect(rows().map(row => [row.name, row.ends])).toEqual([["LEDGER_KEY", "9f2c"], ["STRIPE_SECRET_KEY", "ab12"]]);
});

it("refuses a teammate, a preview, an app with no pair, and any name but a key's or a tool's own", async () => {
  expect(await refusal(await send("STRIPE_SECRET_KEY", undefined, employee))).toEqual([403, "owner_required"]);
  const preview = seeded();
  expect(await refusal(await send("STRIPE_SECRET_KEY", undefined, owner, { ...preview.env, WONG_KEY_SEAL_PUBLIC: PUBLIC }))).toEqual([409, "live_only"]);
  preview.sql.close();
  expect(await refusal(await send("STRIPE_SECRET_KEY", undefined, owner, f.env))).toEqual([409, "no_seal"]);
  for (const path of ["WONG_CLOUDFLARE_READ", "WONG_CODE_READ", "CLOUDFLARE_API_TOKEN", "MAPS_KEY", "OTHER_KEY", "stripe_secret_key", "TOOL_SHOP",
    "maps/0", "cloudflare/0", "stripe/1", "nobody/0", "constructor/0", "stripe/x"]) {
    expect(await refusal(await send(path)), path).toEqual([400, "bad_name"]);
  }
  expect(rows()).toEqual([]);
});

it("takes a saved tool's secret and its ID, and Access shows each key as waiting, with no value, until the publish", async () => {
  expect((await handleAccess(req("tools/shop", "PUT", shop), env(), owner)).status).toBe(200);
  expect((await send("TOOL_SHOP_ID", { sealed, ends: "c1d2" })).status).toBe(200);
  expect((await send("shop/0", { sealed, ends: "s3e4" })).status).toBe(200);
  const response = await management(req("status", "GET"), await withTools(env({ STRIPE_SECRET_KEY: "sk_made_up" })), owner);
  const text = await response.text();
  const keys = Object.fromEntries(JSON.parse(text).keys.map((key: { id: string }) => [key.id, key]));
  // Saved comes from the secret alone; a waiting key shows its own last four before its ID's.
  expect([keys.stripe, keys.shop]).toMatchObject([{ saved: true, parts: ["Key"] }, { saved: false, parts: ["Secret", "ID"], waiting: { ends: "s3e4" } }]);
  expect([keys.ledger.parts, keys.cloudflare.parts, keys.code.parts, keys.stripe.waiting]).toEqual([["Part 1", "Part 2"], [], [], undefined]);
  for (const hidden of ["d3JhcHBlZA", "TOOL_SHOP", "sk_made_up"]) expect(text).not.toContain(hidden);
});

it("refuses a body that is not one sealed key with its last four", async () => {
  for (const value of [{ sealed: "plain-key-value", ends: "alue" }, { sealed: { ...sealed, v: 2 }, ends: "9f2c" }, { sealed: { ...sealed, extra: "x" }, ends: "9f2c" },
    { sealed: { ...sealed, data: "not base64!" }, ends: "9f2c" }, { sealed, ends: "12345" }, { sealed, ends: "" }, { sealed, ends: "9f2c", value: "x" }]) {
    expect(await refusal(await send("STRIPE_SECRET_KEY", value))).toEqual([400, "bad_key"]);
  }
  expect(await refusal(await send("STRIPE_SECRET_KEY", { sealed: { ...sealed, data: "A".repeat(17_000) }, ends: "9f2c" }))).toEqual([413, "json_body_too_large"]);
  f.sql.exec("DROP TABLE sealed_keys");
  expect(await refusal(await send("STRIPE_SECRET_KEY"))).toEqual([503, "access_unavailable"]);
});
