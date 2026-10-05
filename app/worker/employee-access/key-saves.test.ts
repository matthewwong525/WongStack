import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cloudflare, employee, fixture, owner, req, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import { ownerCore } from "./core";
import { management } from "./management";
import { startKeyLevels } from "./start";
import { authorizeRequest, type RouteAccess } from "./policy";

vi.mock("./catalogue.ts", () => ({ catalogue: ["access", "orders", "payroll", "reports"] }));
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
type Status = { keysStarted: boolean; kept: number; imported: number; started: boolean; people: Person[];
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
  for (const app of apps) f.sql.prepare("INSERT INTO wong_access_grants VALUES (?, ?, ?, 1)").run(id, email, app);
};

beforeEach(() => {
  f = fixture();
  const fake = cloudflare(); cf = fake.state; fetch = vi.fn(fake.fetch);
  vi.stubGlobal("fetch", fetch);
  f.sql.exec(`INSERT INTO wong_access_apps VALUES ('${id}', 'payroll'), ('${id}', 'reports')`);
  f.sql.prepare("INSERT INTO wong_access_grants VALUES (?, ?, 'orders', 1)").run(id, employee.id);
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); });

it("starts key levels at the owner's first open: everyone keeps what their apps use, and nothing more", async () => {
  add("reporter@example.com", ["reports"]); add("noapps@example.com"); add("gone@example.com", [], "removed"); add("chosen@example.com", ["orders"]);
  add("held@example.com");
  f.sql.exec(`INSERT INTO wong_access_key_grants VALUES ('${id}', 'chosen@example.com', 'stripe', 'read', 1);
    INSERT INTO wong_access_roles VALUES ('${id}', 'r1', 'Front desk', 1);
    INSERT INTO wong_access_role_apps VALUES ('${id}', 'r1', 'orders');
    INSERT INTO wong_access_member_roles VALUES ('${id}', 'held@example.com', 'r1')`);
  // Until the owner opens Access, the app tick alone decides.
  expect(await may(employee.id, { apps: ["orders"], keys: ["stripe"] }, "write")).toBe(true);
  const first = await status();
  expect(first).toMatchObject({ keysStarted: true, kept: 4 });
  // An app that changes things with a key leaves its people at Read & write; a level the owner already chose stays;
  // a key that offers only Read is given at Read; and a key that only works alone is given to nobody.
  expect(first.people.map(({ email, role, keys }) => ({ email, role, keys }))).toEqual([
    { email: "chosen@example.com", role: null, keys: { stripe: "read" } }, { email: employee.id, role: null, keys: { stripe: "write" } },
    { email: "gone@example.com", role: null, keys: {} }, { email: "held@example.com", role: "r1", keys: {} },
    { email: "noapps@example.com", role: null, keys: {} }, { email: "reporter@example.com", role: null, keys: { cloudflare: "read" } }]);
  expect(count("wong_access_key_grants")).toBe(3);
  expect(await may(employee.id, { apps: ["orders"], keys: ["stripe"] }, "write")).toBe(true);
  expect(await may("noapps@example.com", { keys: ["cloudflare"] }, "read")).toBe(false);
  // Nobody is given a role, the revision does not move, and one audit row records the start.
  expect([count("wong_access_roles"), count("wong_access_member_roles"), revision()]).toEqual([1, 1, 1]);
  expect(events()).toEqual(["key_levels_started:4"]);
  // A repeated read is a no-op, so a level lowered since is never raised again.
  f.sql.exec("UPDATE wong_access_key_grants SET level = 'read'");
  expect(one(await status(), employee.id).keys).toEqual({ stripe: "read" });
  expect(events()).toEqual(["key_levels_started:4"]);
  // The note stays until the owner changes something.
  expect((await status()).kept).toBe(4);
  expect((await save("people", { email: "noapps@example.com", removed: false, apps: [] })).kept).toBe(0);
});

it("leaves levels off when the start can not be saved, and when permissions have not started", async () => {
  f.sql.exec("CREATE TRIGGER fail_levels BEFORE INSERT ON wong_access_key_grants BEGIN SELECT RAISE(ABORT, 'fail'); END");
  const failed = await run("status", "GET");
  expect([failed.status, await failed.json()]).toEqual([503, { code: "access_unavailable" }]);
  expect(f.sql.prepare("SELECT keys_enabled FROM wong_access_installation").get()).toEqual({ keys_enabled: 0 });
  expect([count("wong_access_key_grants"), count("wong_access_grants"), events()]).toEqual([0, 1, []]);
  // With no installation to read, the step changes nothing.
  await startKeyLevels({ ...await ownerCore(req("status", "GET"), practice(), owner), installationId: "unknown" });
  expect(events()).toEqual([]);
  // The live app has no key for its sign-in list yet: permissions wait, and so do key levels.
  f.sql.close(); f = fixture({ started: false });
  expect(await status({ ...f.env, WONG_ACCESS_LOGIN_MANAGEMENT: undefined } as ReturnType<typeof practice>)).toMatchObject({ started: false, keysStarted: false, kept: 0 });
  expect(count("wong_access_key_grants")).toBe(0);
});

it("starts levels right after the first-open import, in the same request, and keeps both notes", async () => {
  f.sql.close(); f = fixture({ started: false });
  cf.policy.include = [site.ownerEmail, "cy@example.com"].map(email => ({ email: { email } }));
  const first = await status(f.env as ReturnType<typeof practice>);
  expect(first).toMatchObject({ started: true, imported: 1, keysStarted: true, kept: 1,
    people: [{ email: "cy@example.com", role: null, apps: ["orders", "payroll", "reports"], keys: { stripe: "write", bank: "write", cloudflare: "read" } }] });
  expect(cf.writes).toEqual([]);
  expect(events()).toEqual([`owner_first_seen:${site.ownerSubject}`, "permissions_started:1", "key_levels_started:1"]);
  // A fresh install has nobody yet: the same step only turns levels on.
  f.sql.close(); f = fixture({ started: false });
  expect(await status()).toMatchObject({ started: true, imported: 0, keysStarted: true, kept: 0, people: [] });
});

it("shows every key the app holds, what uses it and who has which level, and never a value", async () => {
  const env = { ...practice(), STRIPE_SECRET_KEY: "stripe-secret-value", BANK_ID: "bank-id-value" };
  const response = await run("status", "GET", undefined, env);
  const body = await response.text();
  expect(JSON.parse(body)).toMatchObject({
    apps: ["orders", "payroll", "reports"],
    appKeys: { orders: [{ id: "stripe", need: "write" }], payroll: [{ id: "bank", need: "write" }], reports: [{ id: "cloudflare", need: "write" }] },
    keys: [
      { id: "stripe", title: "Stripe", levels: ["read", "write"], saved: true, setup: false, usedBy: [{ app: "orders", need: "write" }], alone: false },
      { id: "bank", title: "Bank", levels: ["read", "write"], saved: false, setup: false, usedBy: [{ app: "payroll", need: "write" }], alone: false },
      { id: "cloudflare", title: "Cloudflare", levels: ["read"], saved: false, setup: true, usedBy: [{ app: "reports", need: "write" }], alone: true }],
    roles: [], people: [{ email: employee.id, role: null, apps: ["orders"], keys: { stripe: "write" } }] });
  for (const secret of ["stripe-secret-value", "bank-id-value", "STRIPE_SECRET_KEY"]) expect(body).not.toContain(secret);
});

it("saves a person's levels with their apps, and gives Read, never more, on the keys of a newly ticked app", async () => {
  await status();
  const bo = "bo@example.com";
  // A tick with no level gives Read on the app's keys.
  expect(one(await save("people", { email: bo, removed: false, apps: ["orders"] }), bo)).toMatchObject({ role: null, apps: ["orders"], keys: { stripe: "read" } });
  expect([await may(bo, { apps: ["orders"], keys: ["stripe"] }, "read"), await may(bo, { apps: ["orders"], keys: ["stripe"] }, "write")]).toEqual([true, false]);
  // A named level is the owner's own choice, including None on a ticked app's key.
  expect(one(await save("people", { email: bo, removed: false, apps: ["orders", "payroll"], keys: { stripe: "write", bank: null } }), bo).keys).toEqual({ stripe: "write" });
  expect(await may(bo, { apps: ["orders"], keys: ["stripe"] }, "write")).toBe(true);
  // A key the save does not name keeps its level, and an app already ticked gives nothing new.
  expect(one(await save("people", { email: bo, removed: false, apps: ["orders", "payroll"] }), bo).keys).toEqual({ stripe: "write" });
  // Unticking leaves the level, so ticking again keeps it rather than lowering it to Read.
  await save("people", { email: bo, removed: false, apps: [] });
  expect(one(await save("people", { email: bo, removed: false, apps: ["orders", "reports"] }), bo).keys).toEqual({ stripe: "write", cloudflare: "read" });
  // A level can be given with no app at all: a key can work alone.
  expect(one(await save("people", { email: "lee@example.com", removed: false, keys: { cloudflare: "read" } }), "lee@example.com")).toMatchObject({ apps: [], keys: { cloudflare: "read" } });
  expect(await may("lee@example.com", { keys: ["cloudflare"] }, "read")).toBe(true);
  expect(events().slice(-2)).toEqual(["person_changed", "key_level_changed"]);
  const before = revision();
  for (const [body, code] of [[{ keys: { unknown: "read" } }, "unknown_key"], [{ keys: { cloudflare: "write" } }, "level_not_offered"],
    [{ apps: ["retired"] }, "unknown_app"], [{ keys: { stripe: "admin" } }, "invalid_person"], [{ apps: "orders" }, "invalid_person"]] as const) {
    await refused("people", { email: bo, removed: false, ...body }, code);
  }
  expect(revision()).toBe(before);
  // Removing a person takes their apps and levels with them.
  expect(one(await save("people", { email: bo, removed: true }), bo)).toMatchObject({ status: "removed", apps: [], keys: {} });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_key_grants WHERE email = ?").get(bo)).toEqual({ count: 0 });
});

it("gives several people one role, read live, and never a role with a person's own exceptions on top", async () => {
  await status();
  const [bo, cy] = ["bo@example.com", "cy@example.com"];
  for (const email of [bo, cy]) await save("people", { email, removed: false });
  // A new role's ticked apps give Read on their keys, as for a person.
  const sales = named(await save("roles", { name: " Sales ", apps: ["orders"] }), "Sales");
  expect(sales).toMatchObject({ apps: ["orders"], keys: { stripe: "read" } });
  for (const email of [bo, cy]) await save("people", { email, removed: false, role: sales.id });
  const given = await save("people", { email: bo, removed: false });
  for (const email of [bo, cy]) expect(one(given, email)).toMatchObject({ role: sales.id, apps: ["orders"], keys: { stripe: "read" } });
  expect([count("wong_access_grants"), count("wong_access_member_roles")]).toEqual([1, 2]);
  for (const [body, code] of [[{ role: sales.id, apps: ["orders"] }, "role_with_own_set"], [{ role: sales.id, keys: {} }, "role_with_own_set"],
    [{ apps: ["payroll"] }, "role_with_own_set"], [{ role: "missing" }, "unknown_role"]] as const) await refused("people", { email: bo, removed: false, ...body }, code);
  // Changing the role reaches both holders on their next request, and nobody else.
  const changed = await save("roles", { id: sales.id, name: "Sales team", apps: ["orders", "payroll"], keys: { stripe: "write" } });
  expect(named(changed, "Sales team")).toMatchObject({ id: sales.id, apps: ["orders", "payroll"], keys: { stripe: "write", bank: "read" } });
  for (const email of [bo, cy]) {
    expect(await may(email, { apps: ["orders"], keys: ["stripe"] }, "write")).toBe(true);
    expect([await may(email, { apps: ["payroll"], keys: ["bank"] }, "read"), await may(email, { apps: ["payroll"], keys: ["bank"] }, "write")]).toEqual([true, false]);
  }
  expect(await may(employee.id, { apps: ["payroll"] }, "read")).toBe(false);
  // Moving to their own set starts from what the role gave; the role's later changes pass them by.
  expect(one(await save("people", { email: cy, removed: false, role: null }), cy)).toMatchObject({ role: null, apps: ["orders", "payroll"], keys: { stripe: "write", bank: "read" } });
  await save("roles", { id: sales.id, name: "Sales team", apps: [], keys: { stripe: null, bank: null } });
  expect([await may(bo, { apps: ["orders"] }, "read"), await may(cy, { apps: ["orders"], keys: ["stripe"] }, "write")]).toEqual([false, true]);
  // Moving off a role and ticking in the same save applies the ticks on top of the role's set.
  await save("roles", { id: sales.id, name: "Sales team", apps: ["orders"], keys: { stripe: "write" } });
  expect(one(await save("people", { email: bo, removed: false, role: null, apps: ["orders", "reports"] }), bo))
    .toMatchObject({ role: null, apps: ["orders", "reports"], keys: { stripe: "write", cloudflare: "read" } });
  // Removing a person who holds a role frees the role.
  await save("people", { email: bo, removed: false, role: sales.id });
  expect(one(await save("people", { email: bo, removed: true }), bo)).toMatchObject({ status: "removed", role: null, apps: [], keys: {} });
  expect(count("wong_access_member_roles")).toBe(0);
});

it("starts a role from a person, refuses a taken name, and removes a held role without taking anything away", async () => {
  await status();
  const [bo, cy] = ["bo@example.com", "cy@example.com"];
  await save("people", { email: bo, removed: false, apps: ["orders", "payroll"], keys: { stripe: "write" } });
  const office = named(await save("roles", { name: "Office", from: bo }), "Office");
  expect(office).toMatchObject({ apps: ["orders", "payroll"], keys: { stripe: "write", bank: "read" } });
  // Starting from a person copies: the person keeps their own set.
  expect(one(await status(), bo).role).toBeNull();
  for (const email of [bo, cy]) await save("people", { email, removed: false, role: office.id });
  // A role can also start from someone who holds one.
  expect(named(await save("roles", { name: "Office two", from: cy, keys: { bank: null } }), "Office two").keys).toEqual({ stripe: "write" });
  for (const [body, code, http] of [[{ name: "office" }, "role_name_taken", 409], [{ id: office.id, name: "OFFICE TWO" }, "role_name_taken", 409],
    [{}, "invalid_role", 400], [{ name: "  " }, "invalid_role", 400], [{ id: office.id }, "invalid_role", 400], [{ removed: true }, "invalid_role", 400],
    [{ id: office.id, name: "Office", from: bo }, "invalid_role", 400], [{ id: "missing", name: "Other" }, "unknown_role", 400],
    [{ id: "missing", removed: true }, "unknown_role", 400], [{ name: "Other", from: "nobody@example.com" }, "unknown_person", 400],
    [{ name: "Other", apps: ["retired"] }, "unknown_app", 400], [{ name: "Other", keys: { cloudflare: "write" } }, "level_not_offered", 400],
    [{ name: "Other", extra: true }, "invalid_role", 400]] as const) await refused("roles", body, code, http);
  // A role keeps its own name when saved again, and its set when a save names no change.
  expect(named(await save("roles", { id: office.id, name: "Office" }), "Office")).toMatchObject({ apps: ["orders", "payroll"], keys: { stripe: "write", bank: "read" } });
  const before = revision();
  const removed = await save("roles", { id: office.id, removed: true });
  expect(removed.roles.map(role => role.name)).toEqual(["Office two"]);
  for (const email of [bo, cy]) {
    expect(one(removed, email)).toMatchObject({ role: null, apps: ["orders", "payroll"], keys: { stripe: "write", bank: "read" } });
    expect(await may(email, { apps: ["orders"], keys: ["stripe"] }, "write")).toBe(true);
  }
  expect([revision(), count("wong_access_member_roles"), count("wong_access_role_apps"), count("wong_access_role_keys")]).toEqual([before + 1, 0, 2, 1]);
  expect(events().slice(-2)).toEqual(["role_changed", "role_removed"]);
});

it("sets one key's levels, or one app's ticks with that app's key levels, for roles and people in one save", async () => {
  await status();
  const [bo, cy] = ["bo@example.com", "cy@example.com"];
  for (const email of [bo, cy]) await save("people", { email, removed: false });
  const sales = named(await save("roles", { name: "Sales" }), "Sales");
  const before = [revision(), count("wong_access_members")];
  // From the key's page: every role's and person's level for one key.
  const leveled = await save("grants", { key: "stripe", roles: { [sales.id]: "write" }, people: { [bo]: "read", [employee.id]: null } });
  expect(named(leveled, "Sales").keys).toEqual({ stripe: "write" });
  expect([one(leveled, bo).keys, one(leveled, employee.id).keys, one(leveled, cy).keys]).toEqual([{ stripe: "read" }, {}, {}]);
  expect([revision(), count("wong_access_members"), events().at(-1)]).toEqual([before[0] + 1, before[1], "key_level_changed"]);
  // From the app's page: ticks, with the levels of that app's keys beside them. A tick alone gives Read.
  const ticked = await save("grants", { app: "payroll", roles: { [sales.id]: true }, people: { [bo]: true, [cy]: true, [employee.id]: false },
    keys: { people: { [bo]: { bank: "write" } } } });
  expect(named(ticked, "Sales")).toMatchObject({ apps: ["payroll"], keys: { stripe: "write", bank: "read" } });
  expect([one(ticked, bo), one(ticked, cy)]).toMatchObject([{ apps: ["payroll"], keys: { stripe: "read", bank: "write" } }, { apps: ["payroll"], keys: { bank: "read" } }]);
  expect(events().at(-1)).toBe("app_access_changed");
  // A level holds in every app: unticking an app leaves its key's level, and a level can change with no tick.
  const unticked = await save("grants", { app: "payroll", people: { [bo]: false }, keys: { people: { [cy]: { bank: null } }, roles: { [sales.id]: { bank: "write" } } } });
  expect([one(unticked, bo), one(unticked, cy)]).toMatchObject([{ apps: [], keys: { stripe: "read", bank: "write" } }, { apps: ["payroll"], keys: {} }]);
  expect(named(unticked, "Sales").keys).toEqual({ stripe: "write", bank: "write" });
  expect(named(await save("grants", { app: "payroll", roles: { [sales.id]: false } }), "Sales").apps).toEqual([]);
  // It changes levels and ticks only: nobody is added or removed, and no provider is called.
  await save("people", { email: cy, removed: false, role: sales.id });
  await save("people", { email: "gone@example.com", removed: true });
  const settled = [revision(), count("wong_access_members")];
  for (const [body, code] of [[{ key: "stripe", people: { [cy]: "read" } }, "person_has_role"], [{ key: "stripe", people: { "nobody@example.com": "read" } }, "unknown_person"],
    [{ key: "stripe", people: { "gone@example.com": "read" } }, "unknown_person"], [{ key: "stripe", roles: { missing: "read" } }, "unknown_role"],
    [{ key: "unknown", people: { [bo]: "read" } }, "unknown_key"], [{ key: "cloudflare", people: { [bo]: "write" } }, "level_not_offered"],
    [{ app: "retired", people: { [bo]: true } }, "unknown_app"], [{ app: "payroll", keys: { people: { [bo]: { stripe: "write" } } } }, "unknown_key"],
    [{ app: "payroll", people: { [bo]: "yes" } }, "invalid_grant"], [{ key: "stripe", app: "payroll" }, "invalid_grant"], [{}, "invalid_grant"]] as const) {
    await refused("grants", body, code);
  }
  expect([revision(), count("wong_access_members")]).toEqual(settled);
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps roles and levels for the owner alone, and touches the sign-in list for neither", async () => {
  await run("status", "GET", undefined, f.env as ReturnType<typeof practice>);
  const calls = fetch.mock.calls.length;
  const sales = named(await (await run("roles", "POST", { name: "Sales", apps: ["orders"] }, f.env as ReturnType<typeof practice>)).json(), "Sales");
  expect((await run("grants", "POST", { key: "stripe", roles: { [sales.id]: "write" }, people: { [employee.id]: "read" } }, f.env as ReturnType<typeof practice>)).status).toBe(200);
  expect((await run("roles", "POST", { id: sales.id, removed: true }, f.env as ReturnType<typeof practice>)).status).toBe(200);
  // The live app made no provider call for any of them, and queued no sign-in work.
  expect(fetch.mock.calls).toHaveLength(calls);
  expect([cf.writes, count("wong_access_work"), count("wong_access_leases")]).toEqual([[], 0, 0]);
  const before = [revision(), count("wong_access_roles"), count("wong_access_key_grants")];
  for (const path of ["roles", "grants"]) {
    for (const identity of [employee, { ...owner, kind: "service" as const }]) {
      const denied = await run(path, "POST", path === "roles" ? { name: "Mine" } : { key: "stripe", people: { [employee.id]: "write" } }, practice(), identity);
      expect([denied.status, await denied.json()]).toEqual([403, { code: "owner_required" }]);
    }
    expect((await run(path, "GET")).status).toBe(404);
    expect((await run(path, "PUT")).status).toBe(405);
  }
  expect([revision(), count("wong_access_roles"), count("wong_access_key_grants")]).toEqual(before);
});
