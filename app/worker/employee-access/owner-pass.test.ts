import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccessError } from "../../../.agents/skills/access/server/errors.mjs";
import { accessFor, ADMIN_ROLE, type AccessIdentity, type ConnectionEnv } from "../access-slots";
import { d1Store } from "../access-store/index";
import { handleAccess as management } from "./router";
import { fixture, owner, employee, site, req } from "../../tests/employee-access/connections";
import { body } from "../../tests/body";
let f: ReturnType<typeof fixture>;
beforeEach(() => { f = fixture(); });
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const store = () => d1Store(f.env.DB!);
/** The management pass Access gives this caller, or the refusal it answers with, thrown as `{ code, status }`. */
async function ownerCore(request: Request, env: ConnectionEnv, identity: AccessIdentity | null) {
  const pass = await accessFor(env, identity).manages(request);
  if (pass) return pass;
  const refused = await management(request, env, identity);
  throw Object.assign(new Error("refused"), { status: refused.status, ...await refused.json() as object });
}
const permissionsStarted = async () => (await store().started()).policy;

it("knows the owner by the recorded email and a verified human sign-in, on the live app and on a preview", async () => {
  const core = await ownerCore(req("status", "GET"), f.env, owner);
  expect(core).toMatchObject({ email: site.ownerEmail, actor: site.ownerEmail, owner: true, subject: site.ownerSubject, origin: site.origin,
    live: true });
  expect(await permissionsStarted()).toBe(true);
  // Neither the stored subject nor the stored origin is a pin: only the committed email decides.
  const preview = new Request("https://branch-business-staging.example.com/api/access/status");
  expect(await ownerCore(preview, { ...f.env, WONG_ENVIRONMENT: "staging", WONG_OWNER_EMAIL: " Owner@Example.com " },
    { ...owner, id: "OWNER@example.com", claims: { ...owner.claims, email: "OWNER@example.com", sub: "another-device" } }))
    .toMatchObject({ email: site.ownerEmail, subject: "another-device", live: false, origin: "https://branch-business-staging.example.com" });
  for (const identity of [employee, { ...owner, kind: "service" as const },
    { ...owner, claims: { ...owner.claims, common_name: "machine" } }, { ...owner, claims: { ...owner.claims, sub: "" } },
    { ...owner, claims: { ...owner.claims, exp: 1 } }, { ...owner, claims: { ...owner.claims, email: employee.id } }]) {
    await expect(ownerCore(req("people"), f.env, identity)).rejects.toMatchObject({ code: "owner_required", status: 403 });
  }
  // A request body, a header or a foreign page establishes nothing.
  await expect(ownerCore(new Request(`${site.origin}/api/access/people`, { method: "POST" }), f.env, owner))
    .rejects.toMatchObject({ code: "origin_required", status: 403 });
  await expect(ownerCore(req("people", "POST", { owner: employee.id }, { Origin: "https://other.example.com" }), f.env, owner))
    .rejects.toMatchObject({ code: "origin_required" });
  // No recorded owner, no database, or an open site with no sign-in: Access stays unavailable.
  for (const [overrides, identity] of [[{ WONG_OWNER_EMAIL: undefined }, owner], [{ WONG_OWNER_EMAIL: "" }, owner],
    [{ DB: undefined }, owner], [{}, null]] as const) {
    await expect(ownerCore(req("status", "GET"), { ...f.env, ...overrides }, identity))
      .rejects.toMatchObject({ code: "owner_setup_required", status: 503 });
  }
});

it("lets the verification machine read and save as the owner on a preview, and nowhere else", async () => {
  const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access", sub: "",
    iss: site.issuer, aud: site.audience, exp: 9999999999 } };
  const preview = { ...f.env, WONG_ENVIRONMENT: "staging", WONG_ACCESS_LOGIN_MANAGEMENT: undefined };
  const save = () => req("people", "POST", { email: "practice@example.com", apps: {}, removed: false });
  // Its subject is the token's own name, and the list is the practice list. Its changes go under the owner's email.
  expect(await ownerCore(req("status", "GET"), preview, machine))
    .toMatchObject({ email: site.ownerEmail, actor: site.ownerEmail, owner: true, subject: "checker.access", live: false });
  expect((await management(req("status", "GET"), preview, machine)).status).toBe(200);
  const saved = await management(save(), preview, machine);
  expect(saved.status).toBe(200);
  expect((await body(saved)).people.map(person => person.email)).toContain("practice@example.com");
  // A save still needs this site's own origin.
  await expect(ownerCore(new Request(`${site.origin}/api/access/people`, { method: "POST" }), preview, machine))
    .rejects.toMatchObject({ code: "origin_required", status: 403 });
  // The live app and a local run refuse both the read and the save, and nobody's access changes.
  for (const environment of ["production", "local", undefined]) {
    const env = { ...preview, WONG_ENVIRONMENT: environment };
    for (const request of [req("status", "GET"), save()]) {
      const refused = await management(request, env, machine);
      expect([refused.status, await refused.json()], String(environment)).toEqual([403, { code: "owner_required" }]);
    }
  }
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_members WHERE email = 'practice@example.com'").get()).toEqual({ count: 1 });
  // A machine that is not the checker gains nothing on a preview.
  for (const forged of [{ ...machine, id: "another.access" }, { ...machine, claims: { ...machine.claims, email: site.ownerEmail } }]) {
    await expect(ownerCore(req("status", "GET"), preview, forged)).rejects.toMatchObject({ code: "owner_required", status: 403 });
  }
});

it("admits an Admin the owner picked under their own email, and nobody the owner did not", async () => {
  const asks = (identity: AccessIdentity, request = req("status", "GET")) => ownerCore(request, f.env, identity);
  await expect(asks(employee)).rejects.toMatchObject({ code: "owner_required", status: 403 });
  // Another role gives no way in: only the built-in one does.
  f.sql.prepare("INSERT INTO wong_access_roles VALUES (?, 'sales', 'Sales', 1)").run(site.installationId);
  f.sql.prepare("INSERT INTO wong_access_member_roles VALUES (?, ?, 'sales')").run(site.installationId, employee.id);
  await expect(asks(employee)).rejects.toMatchObject({ code: "owner_required", status: 403 });
  f.sql.exec("UPDATE wong_access_member_roles SET role_id = 'admin'");
  // The owner's email stays the owner's; the actor is the Admin, who is never the owner.
  expect(await asks(employee, req("people"))).toMatchObject({ email: site.ownerEmail, actor: employee.id, owner: false,
    subject: "employee-subject", origin: site.origin, live: true });
  // Nothing is created or logged for an Admin: the row was already the owner's.
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_installation").get()).toEqual({ count: 1 });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_audit").get()).toEqual({ count: 0 });
  // An Admin's save needs this site's own origin too.
  await expect(asks(employee, new Request(`${site.origin}/api/access/people`, { method: "POST" })))
    .rejects.toMatchObject({ code: "origin_required", status: 403 });
  // A machine, or a stale sign-in, carrying an Admin's email is nobody.
  for (const identity of [{ ...employee, kind: "service" as const }, { ...employee, claims: { ...employee.claims, common_name: "machine" } },
    { ...employee, claims: { ...employee.claims, exp: 1 } }, { ...employee, claims: { ...employee.claims, sub: "" } }]) {
    await expect(asks(identity)).rejects.toMatchObject({ code: "owner_required", status: 403 });
  }
  // A former Admin is refused on the next request: removed with the row left behind, or moved off the role.
  f.sql.exec("UPDATE wong_access_members SET status = 'removed'");
  await expect(asks(employee)).rejects.toMatchObject({ code: "owner_required", status: 403 });
  f.sql.exec("UPDATE wong_access_members SET status = 'active'");
  expect(await asks(employee)).toMatchObject({ actor: employee.id, owner: false });
  f.sql.exec("DELETE FROM wong_access_member_roles");
  await expect(asks(employee)).rejects.toMatchObject({ code: "owner_required", status: 403 });
  // The old manager switch is read by nothing: a row left there admits nobody.
  f.sql.prepare("INSERT INTO wong_access_managers VALUES (?, ?)").run(site.installationId, employee.id);
  await expect(asks(employee)).rejects.toMatchObject({ code: "owner_required", status: 403 });
});

it("creates the installation row and its Admin role on the first owner request and logs the first-seen subject once", async () => {
  f.sql.close(); f = fixture({ started: false });
  // Nobody but the owner can make the row exist.
  await expect(ownerCore(req("status", "GET"), f.env, employee)).rejects.toMatchObject({ code: "owner_required" });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_installation").get()).toEqual({ count: 0 });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_roles").get()).toEqual({ count: 0 });
  await ownerCore(req("status", "GET"), f.env, owner);
  const core = { installationId: await store().installation() };
  // The built-in role comes with the row: one role, with the reserved id, named Admin, that nobody holds yet.
  const roles = () => f.sql.prepare("SELECT installation_id, role_id, name FROM wong_access_roles").all();
  expect(roles()).toEqual([{ installation_id: core.installationId, role_id: ADMIN_ROLE, name: "Admin" }]);
  expect(ADMIN_ROLE).toBe("admin");
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_member_roles").get()).toEqual({ count: 0 });
  expect(f.sql.prepare("SELECT * FROM wong_access_installation").get()).toMatchObject({ slot: 1, installation_id: core.installationId,
    origin: site.origin, account_id: "", worker_id: site.workerId, access_app_id: site.accessAppId, access_policy_id: "",
    issuer: site.issuer, audience: site.audience, owner_subject: site.ownerSubject, owner_email: site.ownerEmail,
    policy_enabled: 0, revision: 1 });
  expect(await permissionsStarted()).toBe(false);
  await ownerCore(req("status", "GET"), f.env, { ...owner, claims: { ...owner.claims, sub: "another-device" } });
  expect(await store().installation()).toBe(core.installationId);
  expect(roles()).toHaveLength(1);
  expect(f.sql.prepare("SELECT actor_email, event, revision FROM wong_access_audit").all())
    .toEqual([{ actor_email: site.ownerEmail, event: `owner_first_seen:${site.ownerSubject}`, revision: 1 }]);
  // A config with no Access identifiers still gets its one row.
  f.sql.close(); f = fixture({ started: false });
  await ownerCore(req("status", "GET"), { ...f.env, CF_ACCESS_WORKER_ID: undefined, CF_ACCESS_APP_ID: undefined,
    CF_ACCESS_TEAM_DOMAIN: undefined, CF_ACCESS_AUD: undefined }, owner);
  expect(f.sql.prepare("SELECT worker_id, access_app_id, issuer, audience FROM wong_access_installation").get())
    .toEqual({ worker_id: "", access_app_id: "", issuer: "https://", audience: "" });
});

it("keeps the winner's row when two first owner requests race", async () => {
  f.sql.close(); f = fixture({ started: false });
  const session = f.env.DB!.withSession("first-primary");
  const batch = session.batch.bind(session);
  vi.spyOn(session, "batch").mockImplementationOnce(async statements => {
    // The other request commits its row between this one's read and write.
    await ownerCore(req("status", "GET"), f.env, owner);
    return batch(statements);
  });
  await ownerCore(req("status", "GET"), f.env, owner);
  const core = { installationId: await store().installation() };
  expect(f.sql.prepare("SELECT installation_id FROM wong_access_installation").all()).toEqual([{ installation_id: core.installationId }]);
  // The role is on the row that won, once.
  expect(f.sql.prepare("SELECT installation_id, role_id FROM wong_access_roles").all()).toEqual([{ installation_id: core.installationId, role_id: "admin" }]);
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_audit").get()).toEqual({ count: 1 });
});

it("uses durable bounded leases and a previous holder cannot release or acknowledge a successor", async () => {
  expect(await store().leaseCurrent(undefined)).toBe(false);
  const first = (await store().lease())!;
  expect(await store().leaseCurrent(first)).toBe(true);
  expect(await store().lease()).toBeNull();
  f.sql.exec("UPDATE wong_access_leases SET expires_at = '2000-01-01'");
  expect(await store().leaseCurrent(first)).toBe(false);
  const second = (await store().lease())!;
  expect(second).not.toBe(first);
  await store().release(first);
  expect(await store().leaseCurrent(first)).toBe(false);
  expect(await store().leaseCurrent(second)).toBe(true);
  await store().release(second);
  expect(await store().leaseCurrent(second)).toBe(false);
  expect(new AccessError("unavailable").status).toBe(503);
});
