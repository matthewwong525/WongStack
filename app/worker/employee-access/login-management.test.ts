import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loginAuthority, reconcileLogin } from "./login-management";
import { accessStatus, changeMember } from "./members";
import { cloudflare, fixture, site, employee, key } from "../../tests/employee-access/connections";
import { lease } from "./core";

vi.mock("./catalogue.ts", () => ({ catalogue: ["access", "orders", "payroll"] }));
let f: ReturnType<typeof fixture>;
let cf: ReturnType<typeof cloudflare>["state"];
let fetch: ReturnType<typeof vi.fn>;
/** The fake provider itself, for a test that wraps it. */
let original: ReturnType<typeof cloudflare>["fetch"];
beforeEach(() => {
  f = fixture();
  const fake = cloudflare(); cf = fake.state; original = fake.fetch; fetch = vi.fn(fake.fetch);
  vi.stubGlobal("fetch", fetch);
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const hold = async () => { f.core.holder = await lease(f.core); };
const add = (email = "new@example.com", apps = ["orders"]) => changeMember(f.core, { email, removed: false, apps });
const remove = (email = employee.id) => changeMember(f.core, { email, removed: true, apps: [] });
const work = (kind = "policy") => f.sql.prepare("SELECT generation, status, outcome, error_code FROM wong_access_work WHERE kind = ?").get(kind);
const owners = [{ email: { email: site.ownerEmail } }];
const root = `https://api.cloudflare.com/client/v4/accounts/${site.accountId}/access/apps/${site.accessAppId}`;

it("sends the live policy back with only its email list changed, to the recorded human policy alone", async () => {
  await hold(); await add();
  await reconcileLogin(f.core, "policy");
  expect(cf.writes).toHaveLength(1);
  expect(cf.writes[0]).toMatchObject({ name: "Business people", approval_required: true, approval_groups: cf.policy.approval_groups,
    require: cf.policy.require, session_duration: "24h", reusable: false,
    include: [{ email: { email: employee.id } }, { email: { email: "new@example.com" } }, ...owners] });
  for (const field of ["id", "created_at", "app_count"]) expect(cf.writes[0]).not.toHaveProperty(field);
  expect(work()).toEqual({ generation: 2, status: "ready", outcome: "policy_readback_matches", error_code: null });
  expect(f.sql.prepare("SELECT provider, status, generation, sealed_material FROM wong_access_connections").get())
    .toEqual({ provider: "access", status: "ready", generation: 2, sealed_material: null });
  const status = JSON.stringify(await accessStatus(f.core));
  expect(status).not.toContain("private-access-token");
  // Every call carries the key to the recorded application or its human policy, nothing else.
  expect(fetch.mock.calls.map(([url]) => url).every(url => url === root || url === `${root}/policies?per_page=1000` ||
    url === `${root}/policies/${site.accessPolicyId}`)).toBe(true);
  expect(fetch.mock.calls.filter(([, init]) => init.method === "PUT")).toHaveLength(1);
  expect(fetch.mock.calls.every(([, init]) => init.headers.Authorization === "Bearer private-access-token" && init.redirect === "manual")).toBe(true);
  const count = fetch.mock.calls.length;
  await reconcileLogin(f.core, "policy");
  await reconcileLogin(f.core, "sessions");
  expect(fetch.mock.calls).toHaveLength(count);
  // A later, lower generation never moves the confirmed mark backwards.
  f.sql.exec("UPDATE wong_access_connections SET generation = 9; UPDATE wong_access_work SET status = 'pending' WHERE kind = 'policy'");
  await reconcileLogin(f.core, "policy");
  expect(f.sql.prepare("SELECT generation FROM wong_access_connections").get()).toEqual({ generation: 9 });
});

it("makes no provider call on a preview, without the key, or before permissions start", async () => {
  await hold(); await add();
  expect(loginAuthority(f.env)).toEqual(JSON.parse(key));
  await reconcileLogin({ ...f.core, live: false }, "policy");
  for (const value of [undefined, "", "not json", JSON.stringify({ ...JSON.parse(key), version: 1 }),
    JSON.stringify({ ...JSON.parse(key), accountId: "../other" }), JSON.stringify({ ...JSON.parse(key), policyId: "a/b" }),
    JSON.stringify({ ...JSON.parse(key), appId: "extra" }), JSON.stringify({ ...JSON.parse(key), token: "" })]) {
    const env = { ...f.env, WONG_ACCESS_LOGIN_MANAGEMENT: value };
    expect(loginAuthority(env)).toBeNull();
    await reconcileLogin({ ...f.core, env }, "policy");
  }
  // Until the first open lists everyone already admitted, a write could drop a teammate.
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  await reconcileLogin(f.core, "policy"); await reconcileLogin(f.core, "sessions");
  expect(fetch).not.toHaveBeenCalled();
  expect(work()).toMatchObject({ status: "pending", error_code: null });
});

it("refuses mismatched ownership, shared or unreviewed policies without writing", async () => {
  await hold(); await add();
  const failure = async (core = f.core) => { await reconcileLogin(core, "policy"); return work(); };
  for (const name of ["CF_ACCESS_APP_ID", "CF_ACCESS_AUD", "CF_ACCESS_WORKER_ID"]) {
    expect(await failure({ ...f.core, env: { ...f.env, [name]: undefined } })).toMatchObject({ status: "failed", error_code: "login_resource_mismatch" });
  }
  expect(fetch).not.toHaveBeenCalled();
  for (const change of [{ id: "other" }, { aud: "other" }, { destinations: [] }, { destinations: [{ type: "worker", worker_id: "other" }] },
    { destinations: [{ type: "public", uri: "business.example.com" }] }]) {
    const original = cf.app; cf.app = { ...cf.app, ...change };
    expect(await failure()).toMatchObject({ status: "failed", error_code: "login_resource_mismatch" }); cf.app = original;
  }
  for (const change of [{ reusable: true }, { app_count: 2 }]) {
    const original = cf.policy; cf.policy = { ...cf.policy, ...change };
    expect(await failure()).toMatchObject({ error_code: "login_policy_review_required" }); cf.policy = original;
  }
  for (const item of [{ id: "extra", decision: "allow", include: [] }, { id: "extra", decision: "non_identity", include: [] },
    { id: "extra", decision: "non_identity", include: [{ everyone: {} }] }]) {
    cf.extras = [item]; expect(await failure()).toMatchObject({ error_code: "login_policy_review_required" });
  }
  // A human policy with any rule but an exact email is not this core's to rewrite.
  cf.extras = [];
  const original = cf.policy; cf.policy = { ...cf.policy, include: [{ email_domain: { domain: "example.com" } }] };
  expect(await failure()).toMatchObject({ status: "failed", error_code: "login_provider_unavailable" }); cf.policy = original;
  cf.extras = [{ id: "another", decision: "non_identity", include: [{ service_token: { token_id: "one" } }] },
    { id: "third", decision: "non_identity", include: [{ service_token: { token_id: "two" } }] }];
  expect(await failure()).toMatchObject({ error_code: "login_policy_review_required" });
  expect(cf.writes).toEqual([]);
  // The verification machine's own policy is preserved beside the human one.
  cf.extras = [{ id: "machine", decision: "non_identity", include: [{ service_token: { token_id: "verification" } }] }];
  expect(await failure()).toMatchObject({ status: "ready" });
  expect(cf.writes).toHaveLength(1);
});

it("converges stale adds to a newer removal and never acknowledges the old generation", async () => {
  await hold(); await add();
  cf.duringWrite = async () => { await remove("new@example.com"); };
  await reconcileLogin(f.core, "policy");
  expect(cf.writes).toHaveLength(2);
  expect(cf.writes[1].include).toEqual([{ email: { email: employee.id } }, ...owners]);
  expect(f.sql.prepare("SELECT status, project_editing FROM wong_access_members WHERE email = 'new@example.com'").get()).toEqual({ status: "removed", project_editing: 0 });
  expect(work()).toMatchObject({ generation: 3, status: "ready" });
});

it("retains partial-removal results independently and retries provider failures", async () => {
  await hold(); await remove();
  cf.failPolicy = true;
  await reconcileLogin(f.core, "policy"); await reconcileLogin(f.core, "sessions");
  expect(work()).toMatchObject({ status: "failed", error_code: "provider_unavailable" });
  expect(work("sessions")).toMatchObject({ status: "ready", outcome: "session_revocation_accepted_propagation_unverified" });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_connections").get()).toEqual({ count: 0 });
  cf.failPolicy = false;
  await reconcileLogin(f.core, "policy");
  expect(cf.writes[0].include).toEqual(owners);
  // The failed write's outcome is unknown, so a matching readback is not yet called done.
  expect(work()).toMatchObject({ status: "pending", outcome: "previous_policy_write_unresolved" });
  f.sql.exec("UPDATE wong_access_policy_writes SET started_at = '2000-01-01T00:00:00.000Z'");
  await reconcileLogin(f.core, "policy");
  expect(work()).toMatchObject({ status: "ready", outcome: "policy_readback_matches" });
  await remove("gone@example.com"); cf.failSessions = true;
  await reconcileLogin(f.core, "sessions");
  expect(work("sessions")).toMatchObject({ status: "failed", error_code: "provider_unavailable" });
  cf.failSessions = false; await reconcileLogin(f.core, "sessions");
  expect(work("sessions")).toMatchObject({ status: "ready" });
});

it("cannot acknowledge work without a current lease, or after it expires mid-write", async () => {
  await add();
  await reconcileLogin(f.core, "policy");
  expect(work()).toMatchObject({ status: "failed", error_code: "provider_lease_expired" });
  expect(fetch).not.toHaveBeenCalled();
  await hold();
  cf.duringWrite = async () => { f.sql.exec("UPDATE wong_access_leases SET expires_at = '2000-01-01'"); };
  await reconcileLogin(f.core, "policy");
  expect(work()).toMatchObject({ status: "failed", error_code: "provider_lease_expired" });
  await hold();
  // Generic malformed provider responses are sanitized and remain retryable.
  fetch.mockImplementationOnce(async () => Response.json({ success: false, result: "private" }));
  await reconcileLogin(f.core, "policy");
  expect(work()).toMatchObject({ status: "failed", error_code: "login_provider_unavailable" });
});

it("bounds stale-generation retries and rejects readback that did not retain desired emails", async () => {
  await hold(); await add();
  let extra = 0;
  fetch.mockImplementation(async (url, init) => {
    const response = await original(url, init);
    if (init.method === "PUT") { await add(`later-${extra++}@example.com`); }
    return response;
  });
  await reconcileLogin(f.core, "policy");
  expect(cf.writes).toHaveLength(3);
  expect(work()).toMatchObject({ status: "pending" });
  fetch.mockImplementation(async (url, init) => {
    if (init.method === "PUT") return Response.json({ success: true, result: {} });
    cf.policy.include = owners;
    return original(url, init);
  });
  await reconcileLogin(f.core, "policy");
  expect(work()).toMatchObject({ status: "failed", error_code: "login_policy_readback_pending" });
});

it("commits explicit apps and tombstones atomically while preserving inert legacy data", async () => {
  await expect(changeMember(f.core, {})).rejects.toMatchObject({ code: "invalid_person", status: 400 });
  await expect(changeMember(f.core, { email: site.ownerEmail, removed: true, apps: [] })).rejects.toMatchObject({ code: "owner_cannot_be_changed" });
  for (const app of ["unassigned", "access"]) await expect(add(employee.id, [app])).rejects.toMatchObject({ code: "unknown_app" });
  await add(employee.id, ["orders", "orders"]);
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_grants").get()).toEqual({ count: 1 });
  // A save lists every built app, so a new one can be ticked.
  expect(f.sql.prepare("SELECT app_id FROM wong_access_apps ORDER BY app_id").all()).toEqual([{ app_id: "access" }, { app_id: "orders" }, { app_id: "payroll" }]);
  f.sql.prepare("INSERT INTO wong_access_receipts VALUES ('receipt', ?, ?, 'machine', 2, 123, 'issued', 'sealed', 'later', 'now')")
    .run(site.installationId, employee.id);
  await add(employee.id, ["payroll"]);
  expect(f.sql.prepare("SELECT status FROM wong_access_receipts").get()).toEqual({ status: "issued" });
  // An app choice alone changes nobody's sign-in: no provider work, and the person's revision stays.
  expect(f.sql.prepare("SELECT status, revision FROM wong_access_members").get()).toEqual({ status: "active", revision: 1 });
  expect(f.sql.prepare("SELECT revision FROM wong_access_installation").get()).toEqual({ revision: 3 });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_work").get()).toEqual({ count: 0 });
  await remove();
  expect(f.sql.prepare("SELECT status, project_editing, revision FROM wong_access_members").get()).toEqual({ status: "removed", project_editing: 0, revision: 4 });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_grants").get()).toEqual({ count: 0 });
  expect(f.sql.prepare("SELECT kind, generation, status FROM wong_access_work ORDER BY kind").all())
    .toEqual([{ kind: "policy", generation: 4, status: "pending" }, { kind: "sessions", generation: 4, status: "pending" }]);
  await remove();
  expect(f.sql.prepare("SELECT generation FROM wong_access_work WHERE kind = 'policy'").get()).toEqual({ generation: 4 });
  f.sql.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON wong_access_audit BEGIN SELECT RAISE(ABORT, 'fail'); END");
  await expect(add(employee.id)).rejects.toThrow();
  expect(f.sql.prepare("SELECT status FROM wong_access_members").get()).toEqual({ status: "removed" });
});

it("saves a preview's practice people with no provider work", async () => {
  const practice = { ...f.core, live: false };
  await changeMember(practice, { email: "practice@example.com", removed: false, apps: ["orders"] });
  await changeMember(practice, { email: employee.id, removed: true, apps: [] });
  expect(f.sql.prepare("SELECT email, status FROM wong_access_members ORDER BY email").all())
    .toEqual([{ email: employee.id, status: "removed" }, { email: "practice@example.com", status: "active" }]);
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_work").get()).toEqual({ count: 0 });
  expect(await accessStatus(practice)).toMatchObject({ environment: "practice", key: "practice" });
  expect(fetch).not.toHaveBeenCalled();
});

it("does not start an external policy write after lease or generation changes during admission", async () => {
  await hold(); await add();
  const batch = f.core.db.batch.bind(f.core.db);
  const raced = vi.spyOn(f.core.db, "batch").mockImplementation(async statements => {
    const result = await batch(statements);
    f.sql.exec("UPDATE wong_access_work SET generation = generation + 1 WHERE kind = 'policy'");
    return result;
  });
  await reconcileLogin(f.core, "policy");
  expect(cf.writes).toEqual([]);
  expect(f.sql.prepare("SELECT status FROM wong_access_policy_writes").get()).toEqual({ status: "completed" });
  raced.mockRestore();
  fetch.mockImplementation(async (url, init) => {
    const result = await original(url, init);
    if (url.includes("/policies") && init.method === "GET") f.sql.exec("UPDATE wong_access_leases SET expires_at = '2000-01-01'");
    return result;
  });
  await reconcileLogin(f.core, "policy");
  expect(cf.writes).toEqual([]);
  expect(work()).toMatchObject({ error_code: "provider_lease_expired" });
});

it("keeps a crashed or lost old provider write pending until it can no longer land", async () => {
  await hold(); await remove();
  f.sql.prepare("INSERT INTO wong_access_policy_writes VALUES ('old-process', ?, 1, 'in_flight', ?)").run(site.installationId, new Date().toISOString());
  await reconcileLogin(f.core, "policy");
  expect(cf.writes.at(-1)!.include).toEqual(owners);
  expect(work()).toMatchObject({ status: "pending", outcome: "previous_policy_write_unresolved" });
  // A late old write can still add the removed email at the edge. Local
  // tombstones remain denied and retry cannot call this propagation complete.
  cf.policy.include = [{ email: { email: employee.id } }, ...owners];
  await reconcileLogin(f.core, "policy");
  expect(f.sql.prepare("SELECT status FROM wong_access_members").get()).toEqual({ status: "removed" });
  expect(work()).toMatchObject({ status: "pending" });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_connections").get()).toEqual({ count: 0 });
  // Past the lease and the provider timeout the old write cannot land: this readback settles it.
  f.sql.exec("UPDATE wong_access_policy_writes SET started_at = '2000-01-01T00:00:00.000Z' WHERE intent_id = 'old-process'");
  cf.policy.include = [{ email: { email: employee.id } }, ...owners];
  await reconcileLogin(f.core, "policy");
  expect(work()).toMatchObject({ status: "ready", outcome: "policy_readback_matches" });
  expect(cf.policy.include).toEqual(owners);
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_policy_writes WHERE status != 'completed'").get()).toEqual({ count: 0 });
});

it("does not accept email-only readback when the provider drops an approval control", async () => {
  await hold(); await add();
  fetch.mockImplementation(async (url, init) => {
    const response = await original(url, init);
    if (init.method === "PUT") cf.policy.approval_required = false;
    return response;
  });
  await reconcileLogin(f.core, "policy");
  expect(work()).toMatchObject({ status: "failed", error_code: "login_policy_readback_pending" });
});
