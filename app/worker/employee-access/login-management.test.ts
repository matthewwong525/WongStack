import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loginAuthority, reconcileLogin } from "./login-management";
import { accessStatus, changeMember } from "./members";
import { cloudflare, fixture, site, employee, key } from "../../tests/employee-access/connections";
import { lease } from "./core";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtApps(["access", "orders", "payroll"]));
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
const add = (email = "new@example.com", apps: Record<string, boolean> = { orders: true }) => changeMember(f.core, { email, removed: false, apps });
const remove = (email = employee.id) => changeMember(f.core, { email, removed: true, apps: {} });
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
  await expect(changeMember(f.core, { email: site.ownerEmail, removed: true, apps: {} })).rejects.toMatchObject({ code: "owner_cannot_be_changed" });
  for (const app of ["unassigned", "access"]) await expect(add(employee.id, { [app]: true })).rejects.toMatchObject({ code: "unknown_app" });
  await add(employee.id);
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_grants").get()).toEqual({ count: 1 });
  // A save lists every built app, so a new one can be given.
  expect(f.sql.prepare("SELECT app_id FROM wong_access_apps ORDER BY app_id").all()).toEqual([{ app_id: "access" }, { app_id: "orders" }, { app_id: "payroll" }]);
  f.sql.prepare("INSERT INTO wong_access_receipts VALUES ('receipt', ?, ?, 'machine', 2, 123, 'issued', 'sealed', 'later', 'now')")
    .run(site.installationId, employee.id);
  await add(employee.id, { payroll: true });
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
  await changeMember(practice, { email: "practice@example.com", removed: false, apps: { orders: true } });
  await changeMember(practice, { email: employee.id, removed: true, apps: {} });
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

// A split install: the previews app has its own id and people policy, served by a second fake.
const previews = { appId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", policyId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" };
const previewsRoot = `https://api.cloudflare.com/client/v4/accounts/${site.accountId}/access/apps/${previews.appId}`;
function split(version = 3) {
  const fake = cloudflare();
  fake.state.app = { ...fake.state.app, id: previews.appId, aud: "previews-app", destinations: [{ type: "worker", worker_id: "worker-staging" }] };
  fake.state.policy = { ...fake.state.policy, id: previews.policyId };
  f.env.WONG_ACCESS_LOGIN_MANAGEMENT = JSON.stringify({ ...JSON.parse(key), version, ...(version === 3 && { staging: previews }) });
  fetch.mockImplementation(async (url: string, init: RequestInit) => (url.startsWith(previewsRoot) ? fake.fetch : original)(url, init));
  return fake;
}

it("reads a version 3 key only with its previews app, and refuses any other shape", () => {
  split();
  expect(loginAuthority(f.env)).toEqual({ ...JSON.parse(key), version: 3, staging: previews });
  for (const value of [{ version: 3 }, { version: 2, staging: previews }, { version: 3, staging: { ...previews, appId: "../other" } },
    { version: 3, staging: { ...previews, policyId: "a/b" } }, { version: 3, staging: { ...previews, aud: "extra" } }]) {
    expect(loginAuthority({ ...f.env, WONG_ACCESS_LOGIN_MANAGEMENT: JSON.stringify({ ...JSON.parse(key), ...value }) })).toBeNull();
  }
});

it("mirrors the sign-in list to the previews app, reads both back, and revokes both", async () => {
  const { state: staging, fetch: previewsFetch } = split();
  await hold(); await add();
  await reconcileLogin(f.core, "policy");
  expect([cf.writes, staging.writes].map(writes => writes.map(write => write.include)))
    .toEqual([[[{ email: { email: employee.id } }, { email: { email: "new@example.com" } }, ...owners]], [[{ email: { email: employee.id } }, { email: { email: "new@example.com" } }, ...owners]]]);
  expect(staging.writes[0]).not.toHaveProperty("id");
  expect(fetch.mock.calls.filter(([, init]) => init.method === "PUT").map(([url]) => url))
    .toEqual([`${root}/policies/${site.accessPolicyId}`, `${previewsRoot}/policies/${previews.policyId}`]);
  expect(work()).toMatchObject({ status: "ready", outcome: "policy_readback_matches" });
  await remove("new@example.com");
  await reconcileLogin(f.core, "sessions");
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/revoke_tokens")).map(([url]) => url))
    .toEqual([`${root}/revoke_tokens`, `${previewsRoot}/revoke_tokens`]);
  // The live list matching is not enough: the previews list must read back the same.
  fetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (!url.startsWith(previewsRoot)) return original(url, init);
    const response = await previewsFetch(url, init);
    if (init.method === "PUT") staging.policy.include = owners.concat({ email: { email: "new@example.com" } });
    return response;
  });
  await reconcileLogin(f.core, "policy");
  expect(work()).toMatchObject({ status: "failed", error_code: "login_policy_readback_pending" });
});

it("refuses a previews app with another id or an extra admission, before writing either list", async () => {
  const staging = split().state;
  await hold(); await add();
  staging.app = { ...staging.app, id: "ffffffff-ffff-4fff-8fff-ffffffffffff" };
  await reconcileLogin(f.core, "policy");
  expect(work()).toMatchObject({ status: "failed", error_code: "login_resource_mismatch" });
  staging.app = { ...staging.app, id: previews.appId };
  for (const extra of [{ id: "extra", decision: "allow", include: [{ everyone: {} }] }, { id: "extra", decision: "bypass", include: [] }]) {
    staging.extras = [extra];
    await reconcileLogin(f.core, "policy");
    expect(work()).toMatchObject({ status: "failed", error_code: "login_policy_review_required" });
  }
  staging.extras = []; staging.policy = { ...staging.policy, reusable: true };
  await reconcileLogin(f.core, "policy");
  expect(work()).toMatchObject({ status: "failed", error_code: "login_policy_review_required" });
  expect([cf.writes, staging.writes]).toEqual([[], []]);
});

it("touches only the live app's sign-in list with a version 2 key", async () => {
  const staging = split(2).state;
  await hold(); await add(); await remove("new@example.com");
  await reconcileLogin(f.core, "policy"); await reconcileLogin(f.core, "sessions");
  expect([work(), work("sessions")]).toMatchObject([{ status: "ready" }, { status: "ready" }]);
  expect([cf.writes.length, staging.writes]).toEqual([1, []]);
  expect(fetch.mock.calls.every(([url]) => url.startsWith(root))).toBe(true);
});

// GitHub pushers, as pushers.ts saves them: their emails join the previews app's list alone.
const pusher = (id: number, email: string | null) => f.sql.prepare("INSERT INTO wong_access_pushers VALUES (?, ?, ?, ?, ?, NULL)")
  .run(site.installationId, id, `pusher-${id}`, email, email && "commit");
const queue = (kind: string, scope: string) => f.sql.prepare(`INSERT INTO wong_access_work (installation_id, kind, generation, status, scope)
  VALUES (?, ?, 9, 'pending', ?) ON CONFLICT(installation_id, kind) DO UPDATE SET status = 'pending', scope = excluded.scope`).run(site.installationId, kind, scope);

it("gives the previews app its own list, the live list plus pushers, once each, and reads each back against its own", async () => {
  const staging = split().state;
  pusher(1, "kim@example.com"); pusher(2, employee.id); pusher(3, null);
  await hold(); queue("policy", "both");
  await reconcileLogin(f.core, "policy");
  expect(cf.writes.map(write => write.include)).toEqual([[{ email: { email: employee.id } }, ...owners]]);
  expect(staging.writes.map(write => write.include)).toEqual([[{ email: { email: employee.id } }, { email: { email: "kim@example.com" } }, ...owners]]);
  expect(work()).toMatchObject({ status: "ready", outcome: "policy_readback_matches" });
  // A pusher who is also a person stays on both lists when they leave GitHub.
  f.sql.exec("DELETE FROM wong_access_pushers WHERE github_id = 2");
  queue("policy", "both");
  await reconcileLogin(f.core, "policy");
  expect([cf.writes.at(-1)!.include, staging.writes.at(-1)!.include]).toEqual([[{ email: { email: employee.id } }, ...owners],
    [{ email: { email: employee.id } }, { email: { email: "kim@example.com" } }, ...owners]]);
});

it("ends previews sessions alone for a pusher who left, and both apps' for a person removed", async () => {
  split();
  await hold(); queue("sessions", "previews");
  await reconcileLogin(f.core, "sessions");
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/revoke_tokens")).map(([url]) => url)).toEqual([`${previewsRoot}/revoke_tokens`]);
  expect(work("sessions")).toMatchObject({ status: "ready" });
  await remove();
  expect(f.sql.prepare("SELECT scope FROM wong_access_work WHERE kind = 'sessions'").get()).toEqual({ scope: "both" });
  await reconcileLogin(f.core, "sessions");
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/revoke_tokens")).map(([url]) => url))
    .toEqual([`${previewsRoot}/revoke_tokens`, `${root}/revoke_tokens`, `${previewsRoot}/revoke_tokens`]);
});

it("writes one list with no pusher emails, and ends no sessions for a pusher, with a version 2 key", async () => {
  const staging = split(2).state;
  pusher(1, "kim@example.com");
  await hold(); queue("policy", "both"); queue("sessions", "previews");
  await reconcileLogin(f.core, "policy"); await reconcileLogin(f.core, "sessions");
  expect([cf.writes.map(write => write.include), staging.writes]).toEqual([[[{ email: { email: employee.id } }, ...owners]], []]);
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/revoke_tokens"))).toEqual([]);
  expect([work(), work("sessions")]).toMatchObject([{ status: "ready" }, { status: "ready" }]);
});
