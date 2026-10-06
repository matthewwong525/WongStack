import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cloudflare, fixture, owner, req, site } from "../../tests/employee-access/connections";
import { ownerCore, type Core } from "./core";
import { accessStatus, changeMember } from "./members";
import { startPermissions } from "./start";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtAreas(["access", "orders", "payroll"], ["payroll"]));
let f: ReturnType<typeof fixture>;
let cf: ReturnType<typeof cloudflare>["state"];
let fetch: ReturnType<typeof vi.fn>;
let core: Core;
const admit = (...emails: string[]) => { cf.policy.include = [site.ownerEmail, ...emails].map(email => ({ email: { email } })); };
const people = () => f.sql.prepare(`SELECT m.email, m.status, m.revision,
  (SELECT json_group_object(g.app_id, g.level) FROM wong_access_grants g WHERE g.email = m.email) apps
  FROM wong_access_members m ORDER BY m.email`).all();
const installation = () => f.sql.prepare("SELECT policy_enabled, revision FROM wong_access_installation").get();
beforeEach(async () => {
  // The owner opens Access on an app whose sign-in list already admits two teammates.
  f = fixture({ started: false });
  const fake = cloudflare(); cf = fake.state; fetch = vi.fn(fake.fetch);
  vi.stubGlobal("fetch", fetch);
  core = await ownerCore(req("status", "GET"), f.env, owner);
  admit("ana@example.com", "Bo@Example.com");
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); });

it("lists everyone who could already sign in with every built area at Look up & change, then turns permissions on, in one batch", async () => {
  await startPermissions(core);
  expect(people()).toEqual([
    { email: "ana@example.com", status: "active", revision: 1, apps: '{"orders":"write","payroll":"write"}' },
    { email: "bo@example.com", status: "active", revision: 1, apps: '{"orders":"write","payroll":"write"}' },
  ]);
  expect(installation()).toEqual({ policy_enabled: 1, revision: 2 });
  expect(f.sql.prepare("SELECT event, revision FROM wong_access_audit WHERE event LIKE 'permissions_started%'").all())
    .toEqual([{ event: "permissions_started:2", revision: 2 }]);
  // The import only reads the sign-in list; nothing on it changes.
  expect(fetch.mock.calls.every(([, init]) => init.method === "GET")).toBe(true);
  expect(cf.writes).toEqual([]);
  // Every built area is recorded, the one with no screen too, and Access itself is nobody's to give.
  const everything = { orders: "write", payroll: "write" };
  expect(await accessStatus(core)).toMatchObject({ started: true, imported: 2, key: "ready", environment: "live",
    areas: [{ id: "orders", title: "Orders", description: "The orders area.", screen: true }, { id: "payroll", title: "Payroll", description: "The payroll area.", screen: false }],
    people: [{ email: "ana@example.com", status: "active", settled: true, apps: everything },
      { email: "bo@example.com", status: "active", settled: true, apps: everything }], work: [] });
});

it("does nothing on a repeated first read", async () => {
  await startPermissions(core);
  const calls = fetch.mock.calls.length;
  admit("ana@example.com", "bo@example.com", "late@example.com");
  await startPermissions(core);
  expect(fetch.mock.calls).toHaveLength(calls);
  expect(people()).toHaveLength(2);
  expect(installation()).toEqual({ policy_enabled: 1, revision: 2 });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_audit WHERE event LIKE 'permissions_started%'").get()).toEqual({ count: 1 });
  // The first-open note stays until the owner changes someone.
  expect(await accessStatus(core)).toMatchObject({ imported: 2 });
  await changeMember(core, { email: "ana@example.com", removed: false, apps: {} });
  expect(await accessStatus(core)).toMatchObject({ imported: 0 });
});

it("keeps the areas and levels the owner already chose for a person added before the start", async () => {
  await changeMember(core, { email: "ana@example.com", removed: false, apps: { orders: "read" } });
  await startPermissions(core);
  expect(people()).toEqual([
    { email: "ana@example.com", status: "active", revision: 2, apps: '{"orders":"read"}' },
    { email: "bo@example.com", status: "active", revision: 1, apps: '{"orders":"write","payroll":"write"}' },
  ]);
  expect(f.sql.prepare("SELECT event FROM wong_access_audit WHERE event LIKE 'permissions_started%'").get()).toEqual({ event: "permissions_started:1" });
  // Ana's own add is still waiting for the sign-in step; Bo was admitted before Access.
  expect(await accessStatus(core)).toMatchObject({ people: [{ email: "ana@example.com", settled: false }, { email: "bo@example.com", settled: true }],
    work: [{ kind: "policy", status: "pending" }] });
});

it("changes nothing when the key is missing or the sign-in list cannot be read", async () => {
  await startPermissions({ ...core, env: { ...f.env, WONG_ACCESS_LOGIN_MANAGEMENT: undefined } });
  expect(fetch).not.toHaveBeenCalled();
  cf.policy.reusable = true;
  await startPermissions(core);
  cf.policy.reusable = false;
  fetch.mockImplementationOnce(async () => new Response("private", { status: 503 }));
  await startPermissions(core);
  expect(people()).toEqual([]);
  expect(installation()).toEqual({ policy_enabled: 0, revision: 1 });
  expect(await accessStatus({ ...core, env: { ...f.env, WONG_ACCESS_LOGIN_MANAGEMENT: undefined } })).toMatchObject({ started: false, key: "missing", imported: 0 });
  expect(await accessStatus(core)).toMatchObject({ started: false, key: "ready" });
});

it("changes nothing when the import cannot be saved", async () => {
  f.sql.exec("CREATE TRIGGER fail_start BEFORE UPDATE ON wong_access_installation BEGIN SELECT RAISE(ABORT, 'fail'); END");
  await expect(startPermissions(core)).rejects.toThrow();
  expect(people()).toEqual([]);
  expect(installation()).toEqual({ policy_enabled: 0, revision: 1 });
});

it("starts a preview's practice list with no import and no provider call", async () => {
  const practice = { ...core, live: false };
  await startPermissions(practice);
  expect(fetch).not.toHaveBeenCalled();
  expect(people()).toEqual([]);
  expect(installation()).toEqual({ policy_enabled: 1, revision: 2 });
  expect(await accessStatus(practice)).toMatchObject({ started: true, imported: 0, environment: "practice", key: "practice", people: [] });
});
