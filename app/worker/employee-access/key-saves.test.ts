import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cloudflare, employee, fixture, owner, req, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import { ownerCore } from "./core";
import { management } from "./management";
import { startKeyLevels } from "./start";
import { authorizeRequest, type RouteAccess } from "./policy";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtApps(["access", "orders", "payroll", "reports"]));
vi.mock("../keys.ts", () => ({ keys: {
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
  bank: { title: "Bank", secrets: ["BANK_ID", "BANK_SECRET"] },
  cloudflare: { title: "Cloudflare", secrets: ["WONG_CLOUDFLARE_READ"], levels: ["read"], setup: true },
} }));
// Orders looks things up and changes them with Stripe; payroll changes things with the bank key;
// reports asks more of Cloudflare than that key offers; and Cloudflare also works with no app.
vi.mock("./key-use.ts", () => ({ keyUse: [
  { apps: ["orders"], keys: ["stripe"], need: "read" }, { apps: ["orders"], keys: ["stripe"], need: "write" },
  { apps: ["payroll"], keys: ["bank", "retired"], need: "write" }, { apps: ["payroll"], keys: ["bank"], need: "read" },
  { apps: ["reports"], keys: ["cloudflare"], need: "write" }, { apps: [], keys: ["cloudflare"], need: "read" },
] }));

type Person = { email: string; status: string; role: string | null; apps: string[]; keys: Record<string, string> };
type Status = { keysStarted: boolean; imported: number; started: boolean; people: Person[];
  roles: { id: string; name: string; apps: string[]; keys: Record<string, string> }[] };
let f: ReturnType<typeof fixture>;
let cf: ReturnType<typeof cloudflare>["state"];
let fetch: ReturnType<typeof vi.fn>;
const id = site.installationId;
const practice = () => ({ ...f.env, WONG_ENVIRONMENT: "staging", WONG_ACCESS_LOGIN_MANAGEMENT: undefined });
const run = (path: string, method = "POST", body?: unknown, env = practice(), identity: AccessIdentity | null = owner) => management(req(path, method, body), env, identity);
const status = async (env = practice()): Promise<Status> => (await run("status", "GET", undefined, env)).json();
const save = async (path: string, body: unknown): Promise<Status> => {
  const saved = await run(path, "POST", body);
  expect(saved.status, JSON.stringify(body)).toBe(200);
  return saved.json();
};
const refused = async (path: string, body: unknown, code: string, http = 400) => {
  const response = await run(path, "POST", body);
  expect([response.status, await response.json()], JSON.stringify(body)).toEqual([http, { code }]);
};
const one = (state: Status, email: string) => state.people.find(person => person.email === email)!;
const named = (state: Status, name: string) => state.roles.find(role => role.name === name)!;
const person = (email: string): AccessIdentity => ({ ...employee, id: email, claims: { ...employee.claims, email, sub: email } });
const may = async (email: string, access: RouteAccess, need: "read" | "write") => (await authorizeRequest(f.env, person(email), access, need)) === null;
const count = (table: string) => (f.sql.prepare(`SELECT COUNT(*) count FROM ${table}`).get() as { count: number }).count;
const revision = () => (f.sql.prepare("SELECT revision FROM wong_access_installation").get() as { revision: number }).revision;
const events = () => f.sql.prepare("SELECT event FROM wong_access_audit ORDER BY rowid").all().map(row => (row as { event: string }).event);
const add = (email: string, apps: string[] = [], state = "active") => {
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, ?, 0, 1, 'now')").run(id, email, state);
  for (const app of apps) f.sql.prepare("INSERT INTO wong_access_grants VALUES (?, ?, ?, 1, 'write')").run(id, email, app);
};

beforeEach(() => {
  f = fixture();
  const fake = cloudflare(); cf = fake.state; fetch = vi.fn(fake.fetch);
  vi.stubGlobal("fetch", fetch);
  f.sql.exec(`INSERT INTO wong_access_apps VALUES ('${id}', 'payroll'), ('${id}', 'reports')`);
  f.sql.prepare("INSERT INTO wong_access_grants VALUES (?, ?, 'orders', 1, 'write')").run(id, employee.id);
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); });

// Orders uses Stripe, and `stripe` is Stripe used by itself, with no app.
const orders: RouteAccess = { apps: ["orders"], keys: ["stripe"] };
const stripe: RouteAccess = { keys: ["stripe"] };
const enabled = () => f.sql.prepare("SELECT keys_enabled FROM wong_access_installation").get();

it("starts key levels at the owner's first open with nobody given one, and keeps a level already held", async () => {
  add("noapps@example.com"); add("chosen@example.com", ["orders"]);
  f.sql.exec(`INSERT INTO wong_access_key_grants VALUES ('${id}', 'chosen@example.com', 'stripe', 'read', 1)`);
  // Before and after the start, an app runs on its tick alone.
  expect(await may(employee.id, orders, "write")).toBe(true);
  const first = await status();
  expect(first.keysStarted).toBe(true);
  expect(first).not.toHaveProperty("kept");
  // An app needs no level, so none is given for an app's sake: only the level the owner already chose is there.
  expect(first.people.map(({ email, apps, keys }) => ({ email, apps, keys }))).toEqual([{ email: "chosen@example.com", apps: ["orders"], keys: { stripe: "read" } },
    { email: employee.id, apps: ["orders"], keys: {} }, { email: "noapps@example.com", apps: [], keys: {} }]);
  expect(count("wong_access_key_grants")).toBe(1);
  expect(await may(employee.id, orders, "write")).toBe(true);
  expect([await may("chosen@example.com", stripe, "read"), await may("chosen@example.com", stripe, "write"), await may(employee.id, stripe, "read")]).toEqual([true, false, false]);
  // The revision does not move and nothing is recorded, and a repeated read is a no-op.
  expect([revision(), events()]).toEqual([1, []]);
  await status();
  expect([revision(), events(), count("wong_access_key_grants"), enabled()]).toEqual([1, [], 1, { keys_enabled: 1 }]);
});

it("leaves levels off when the start can not be saved, and when permissions have not started", async () => {
  f.sql.exec("CREATE TRIGGER fail_levels BEFORE UPDATE OF keys_enabled ON wong_access_installation BEGIN SELECT RAISE(ABORT, 'fail'); END");
  const failed = await run("status", "GET");
  expect([failed.status, await failed.json()]).toEqual([503, { code: "access_unavailable" }]);
  f.sql.exec("DROP TRIGGER fail_levels");
  expect([enabled(), count("wong_access_grants")]).toEqual([{ keys_enabled: 0 }, 1]);
  // With no installation to read, the step changes nothing.
  await startKeyLevels({ ...await ownerCore(req("status", "GET"), practice(), owner), installationId: "unknown" });
  expect(enabled()).toEqual({ keys_enabled: 0 });
  // The live app has no key for its sign-in list yet: permissions wait, and so do key levels.
  f.sql.close(); f = fixture({ started: false });
  expect(await status({ ...f.env, WONG_ACCESS_LOGIN_MANAGEMENT: undefined } as ReturnType<typeof practice>)).toMatchObject({ started: false, keysStarted: false });
  expect(enabled()).toEqual({ keys_enabled: 0 });
});

it("starts levels right after the first-open import, in the same request, and keeps the import's note", async () => {
  f.sql.close(); f = fixture({ started: false });
  cf.policy.include = [site.ownerEmail, "cy@example.com"].map(email => ({ email: { email } }));
  const first = await status(f.env as ReturnType<typeof practice>);
  // Everyone the sign-in list admitted keeps every app, and holds no key level until the owner gives one.
  expect(first).toMatchObject({ started: true, imported: 1, keysStarted: true, people: [{ email: "cy@example.com", role: null, apps: ["orders", "payroll", "reports"] }] });
  expect(first.people[0].keys).toEqual({});
  expect(cf.writes).toEqual([]);
  expect(events()).toEqual([`owner_first_seen:${site.ownerSubject}`, "permissions_started:1"]);
  // A fresh install has nobody yet: the same step only turns levels on.
  f.sql.close(); f = fixture({ started: false });
  expect(await status()).toMatchObject({ started: true, imported: 0, keysStarted: true, people: [] });
});

it("shows every app and every key the app holds, who has which level, and never a value, nor which app uses a key", async () => {
  const env = { ...practice(), STRIPE_SECRET_KEY: "stripe-secret-value", BANK_ID: "bank-id-value" };
  const response = await run("status", "GET", undefined, env);
  const body = await response.text();
  const shown = JSON.parse(body);
  expect(shown).toMatchObject({
    apps: [{ id: "orders", title: "Orders", description: "The orders app." }, { id: "payroll", title: "Payroll" }, { id: "reports", title: "Reports" }],
    keys: [
      { id: "stripe", title: "Stripe", levels: ["read", "write"], saved: true, setup: false, alone: false },
      { id: "bank", title: "Bank", levels: ["read", "write"], saved: false, setup: false, alone: false },
      { id: "cloudflare", title: "Cloudflare", levels: ["read"], saved: false, setup: true, alone: true }],
    unticked: { people: [], roles: [] }, roles: [], people: [{ email: employee.id, role: null, apps: ["orders"], keys: {} }] });
  for (const gone of ["areas", "skills", "kept", "appKeys"]) expect(shown, gone).not.toHaveProperty(gone);
  for (const key of shown.keys) expect(key, key.id).not.toHaveProperty("usedBy");
  for (const secret of ["stripe-secret-value", "bank-id-value", "STRIPE_SECRET_KEY"]) expect(body).not.toContain(secret);
});

it("saves a person's apps and key levels in one save, and giving an app changes no key level", async () => {
  await status();
  const bo = "bo@example.com";
  // An app given is the whole app, and gives no level for the key it uses.
  expect(one(await save("people", { email: bo, removed: false, apps: { orders: true } }), bo)).toEqual(expect.objectContaining({ role: null, apps: ["orders"], keys: {} }));
  expect([await may(bo, orders, "read"), await may(bo, orders, "write"), await may(bo, stripe, "read")]).toEqual([true, true, false]);
  // A level is the owner's own choice, set beside the apps in the same save: it governs the key by itself.
  const both = await save("people", { email: bo, removed: false, apps: { payroll: true }, keys: { stripe: "read", bank: null } });
  expect([one(both, bo).apps, one(both, bo).keys]).toEqual([["orders", "payroll"], { stripe: "read" }]);
  expect([await may(bo, stripe, "read"), await may(bo, stripe, "write"), await may(bo, orders, "write")]).toEqual([true, false, true]);
  // An app and a key the save does not name stay as they are.
  const kept = await save("people", { email: bo, removed: false, keys: { bank: "write" } });
  expect([one(kept, bo).apps, one(kept, bo).keys]).toEqual([["orders", "payroll"], { stripe: "read", bank: "write" }]);
  // Taking an app away leaves every key level, and giving it again changes none.
  const none = one(await save("people", { email: bo, removed: false, apps: { orders: false, payroll: false } }), bo);
  expect([none.apps, none.keys]).toEqual([[], { stripe: "read", bank: "write" }]);
  const again = await save("people", { email: bo, removed: false, apps: { orders: true, reports: true } });
  expect([one(again, bo).apps, one(again, bo).keys]).toEqual([["orders", "reports"], { stripe: "read", bank: "write" }]);
  // A level can be given with no app at all: a key can work alone.
  const lee = one(await save("people", { email: "lee@example.com", removed: false, keys: { cloudflare: "read" } }), "lee@example.com");
  expect([lee.apps, lee.keys]).toEqual([[], { cloudflare: "read" }]);
  expect(await may("lee@example.com", { keys: ["cloudflare"] }, "read")).toBe(true);
  expect(events().slice(-2)).toEqual(["person_changed", "key_level_changed"]);
  const before = revision();
  // A level where a tick belongs is refused whole, as is a level nobody defined.
  for (const [body, code] of [[{ keys: { unknown: "read" } }, "unknown_key"], [{ keys: { cloudflare: "write" } }, "level_not_offered"],
    [{ apps: { retired: true } }, "unknown_app"], [{ apps: { access: true } }, "unknown_app"], [{ keys: { stripe: "admin" } }, "invalid_person"],
    [{ apps: "orders" }, "invalid_person"], [{ apps: ["orders"] }, "invalid_person"], [{ apps: { orders: "write" } }, "invalid_person"], [{ apps: { orders: null } }, "invalid_person"],
    [{ apps: { "Not A Folder": true } }, "invalid_person"]] as const) {
    await refused("people", { email: bo, removed: false, ...body }, code);
  }
  expect(revision()).toBe(before);
  // Removing a person takes their apps and levels with them.
  const gone = one(await save("people", { email: bo, removed: true }), bo);
  expect([gone.status, gone.apps, gone.keys]).toEqual(["removed", [], {}]);
  for (const table of ["wong_access_grants", "wong_access_key_grants"]) expect(f.sql.prepare(`SELECT COUNT(*) count FROM ${table} WHERE email = ?`).get(bo)).toEqual({ count: 0 });
});

it("gives several people one role, read live, and never a role with a person's own exceptions on top", async () => {
  await status();
  const [bo, cy] = ["bo@example.com", "cy@example.com"];
  for (const email of [bo, cy]) await save("people", { email, removed: false });
  // A new role's apps give no key level, as for a person.
  const sales = named(await save("roles", { name: " Sales ", apps: { orders: true } }), "Sales");
  expect([sales.apps, sales.keys]).toEqual([["orders"], {}]);
  for (const email of [bo, cy]) await save("people", { email, removed: false, role: sales.id });
  const given = await save("people", { email: bo, removed: false });
  for (const email of [bo, cy]) expect(one(given, email)).toMatchObject({ role: sales.id, apps: ["orders"] });
  expect([count("wong_access_grants"), count("wong_access_member_roles")]).toEqual([1, 2]);
  for (const [body, code] of [[{ role: sales.id, apps: { orders: true } }, "role_with_own_set"], [{ role: sales.id, keys: {} }, "role_with_own_set"],
    [{ apps: { payroll: true } }, "role_with_own_set"], [{ role: "missing" }, "unknown_role"]] as const) await refused("people", { email: bo, removed: false, ...body }, code);
  // Changing the role reaches both holders on their next request, and nobody else: they read the role's apps and levels.
  const changed = named(await save("roles", { id: sales.id, name: "Sales team", apps: { payroll: true }, keys: { stripe: "read" } }), "Sales team");
  expect([changed.id, changed.apps, changed.keys]).toEqual([sales.id, ["orders", "payroll"], { stripe: "read" }]);
  for (const email of [bo, cy]) {
    // Payroll uses the bank key, and the role holds no bank level: the app still does everything.
    expect(await may(email, { apps: ["payroll"], keys: ["bank"] }, "write")).toBe(true);
    expect([await may(email, stripe, "read"), await may(email, stripe, "write"), await may(email, { keys: ["bank"] }, "read")]).toEqual([true, false, false]);
  }
  expect(await may(employee.id, { apps: ["payroll"] }, "read")).toBe(false);
  // Moving to their own set starts from what the role gave; the role's later changes pass them by.
  const own = one(await save("people", { email: cy, removed: false, role: null }), cy);
  expect([own.role, own.apps, own.keys]).toEqual([null, ["orders", "payroll"], { stripe: "read" }]);
  expect(named(await save("roles", { id: sales.id, name: "Sales team", apps: { orders: false, payroll: false }, keys: { stripe: null } }), "Sales team").apps).toEqual([]);
  expect([await may(bo, { apps: ["orders"] }, "read"), await may(cy, orders, "write"), await may(cy, stripe, "read")]).toEqual([false, true, true]);
  // Moving off a role and naming an app in the same save applies it on top of the role's set.
  await save("roles", { id: sales.id, name: "Sales team", apps: { orders: true }, keys: { stripe: "write" } });
  const moved = one(await save("people", { email: bo, removed: false, role: null, apps: { reports: true } }), bo);
  expect([moved.role, moved.apps, moved.keys]).toEqual([null, ["orders", "reports"], { stripe: "write" }]);
  // Removing a person who holds a role frees the role.
  await save("people", { email: bo, removed: false, role: sales.id });
  const gone = one(await save("people", { email: bo, removed: true }), bo);
  expect([gone.status, gone.role, gone.apps, gone.keys]).toEqual(["removed", null, [], {}]);
  expect(count("wong_access_member_roles")).toBe(0);
});

it("starts a role from a person, refuses a taken name, and removes a held role without taking anything away", async () => {
  await status();
  const [bo, cy] = ["bo@example.com", "cy@example.com"];
  const set = { apps: ["orders", "payroll"], keys: { stripe: "write" } };
  await save("people", { email: bo, removed: false, apps: { orders: true, payroll: true }, keys: set.keys });
  const office = named(await save("roles", { name: "Office", from: bo }), "Office");
  expect(office).toMatchObject(set);
  // Starting from a person copies: the person keeps their own set.
  expect(one(await status(), bo).role).toBeNull();
  for (const email of [bo, cy]) await save("people", { email, removed: false, role: office.id });
  // A role can also start from someone who holds one.
  expect(named(await save("roles", { name: "Office two", from: cy, keys: { bank: "read", stripe: null } }), "Office two")).toMatchObject({ apps: set.apps, keys: { bank: "read" } });
  for (const [body, code, http] of [[{ name: "office" }, "role_name_taken", 409], [{ id: office.id, name: "OFFICE TWO" }, "role_name_taken", 409],
    [{}, "invalid_role", 400], [{ name: "  " }, "invalid_role", 400], [{ id: office.id }, "invalid_role", 400], [{ removed: true }, "invalid_role", 400],
    [{ id: office.id, name: "Office", from: bo }, "invalid_role", 400], [{ id: "missing", name: "Other" }, "unknown_role", 400],
    [{ id: "missing", removed: true }, "unknown_role", 400], [{ name: "Other", from: "nobody@example.com" }, "unknown_person", 400],
    [{ name: "Other", apps: { retired: true } }, "unknown_app", 400], [{ name: "Other", apps: ["orders"] }, "invalid_role", 400], [{ name: "Other", apps: { orders: "write" } }, "invalid_role", 400],
    [{ name: "Other", keys: { cloudflare: "write" } }, "level_not_offered", 400], [{ name: "Other", extra: true }, "invalid_role", 400]] as const) await refused("roles", body, code, http);
  // A role keeps its own name when saved again, and its set when a save names no change.
  expect(named(await save("roles", { id: office.id, name: "Office" }), "Office")).toMatchObject(set);
  const before = revision();
  const removed = await save("roles", { id: office.id, removed: true });
  expect(removed.roles.map(role => role.name)).toEqual(["Office two"]);
  for (const email of [bo, cy]) {
    // Each holder keeps the role's apps and levels, as their own.
    expect(one(removed, email)).toMatchObject({ role: null, ...set });
    expect([await may(email, { apps: ["payroll"] }, "write"), await may(email, orders, "write"), await may(email, stripe, "write")]).toEqual([true, true, true]);
  }
  expect([revision(), count("wong_access_member_roles"), count("wong_access_role_apps"), count("wong_access_role_keys")]).toEqual([before + 1, 0, 2, 1]);
  expect(events().slice(-2)).toEqual(["role_changed", "role_removed"]);
});

it("has no save that sets one app or one key for several at once: a role does that", async () => {
  await status();
  const before = [revision(), count("wong_access_key_grants"), count("wong_access_grants")];
  for (const body of [{ key: "stripe", people: { [employee.id]: "read" } }, { app: "payroll", people: { [employee.id]: true } }]) {
    const response = await run("grants", "POST", body);
    expect([response.status, await response.json()]).toEqual([404, { error: "Not found" }]);
  }
  expect([revision(), count("wong_access_key_grants"), count("wong_access_grants")]).toEqual(before);
  // A role gives one app and one key level to everyone who holds it, in one save.
  const [bo, cy] = ["bo@example.com", "cy@example.com"];
  const sales = named(await save("roles", { name: "Sales", apps: { payroll: true }, keys: { stripe: "read" } }), "Sales");
  for (const email of [bo, cy]) await save("people", { email, removed: false, role: sales.id });
  for (const email of [bo, cy]) {
    // Payroll uses the bank key, and neither holds a bank level: every call of Payroll runs, and the bank key alone stays shut.
    expect([await may(email, { apps: ["payroll"], keys: ["bank"] }, "write"), await may(email, { keys: ["stripe"] }, "read"), await may(email, { keys: ["bank"] }, "read")], email).toEqual([true, true, false]);
  }
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps roles and levels for the owner alone, and touches the sign-in list for neither", async () => {
  await run("status", "GET", undefined, f.env as ReturnType<typeof practice>);
  const calls = fetch.mock.calls.length;
  const sales = named(await (await run("roles", "POST", { name: "Sales", apps: { orders: true } }, f.env as ReturnType<typeof practice>)).json(), "Sales");
  expect((await run("roles", "POST", { id: sales.id, name: "Sales", keys: { stripe: "write" } }, f.env as ReturnType<typeof practice>)).status).toBe(200);
  expect((await run("roles", "POST", { id: sales.id, removed: true }, f.env as ReturnType<typeof practice>)).status).toBe(200);
  // The live app made no provider call for any of them, and queued no sign-in work.
  expect(fetch.mock.calls).toHaveLength(calls);
  expect([cf.writes, count("wong_access_work"), count("wong_access_leases")]).toEqual([[], 0, 0]);
  const before = [revision(), count("wong_access_roles"), count("wong_access_key_grants")];
  for (const identity of [employee, { ...owner, kind: "service" as const }]) {
    const denied = await run("roles", "POST", { name: "Mine" }, practice(), identity);
    expect([denied.status, await denied.json()]).toEqual([403, { code: "owner_required" }]);
  }
  expect((await run("roles", "GET")).status).toBe(404);
  expect((await run("roles", "PUT")).status).toBe(405);
  // The save that set a key's direct-use choice is gone: its address is no route at all.
  expect((await run("direct", "POST", { key: "stripe", mode: "read" })).status).toBe(404);
  expect([revision(), count("wong_access_roles"), count("wong_access_key_grants")]).toEqual(before);
});
