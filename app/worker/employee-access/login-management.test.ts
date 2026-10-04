import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { connectLogin, reconcileLogin } from "./login-management";
import { accessStatus, changeMember } from "./members";
import { fixture, pin, employee } from "../../tests/employee-access/connections";
import { lease } from "./core";
let f: ReturnType<typeof fixture>;
let policy: Record<string, unknown>;
let app: Record<string, unknown>;
let extras: Record<string, unknown>[];
let writes: Record<string, unknown>[];
let duringWrite: (() => Promise<void>) | undefined;
let failPolicy: boolean;
let failSessions: boolean;
let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  f = fixture(); writes = []; extras = []; failPolicy = false; failSessions = false; duringWrite = undefined;
  policy = { id: pin.accessPolicyId, name: "Business people", decision: "allow", include: [{ email: { email: pin.ownerEmail } }],
    exclude: [], require: [{ email_domain: { domain: "example.com" } }], session_duration: "24h", approval_required: true,
    approval_groups: [{ approvals_needed: 1, email_list: [pin.ownerEmail] }], app_count: 1, reusable: false, created_at: "before" };
  app = { id: pin.accessAppId, aud: pin.audience, domain: "business.example.com", destinations: [{ type: "worker", worker_id: pin.workerId }] };
  f.env.WONG_ACCESS_LOGIN_MANAGEMENT = JSON.stringify({ version: 1, token: "private-access-token", accountId: pin.accountId,
    appId: pin.accessAppId, policyId: pin.accessPolicyId, policyName: policy.name, initialEmails: [pin.ownerEmail],
    permission: "Access: Apps and Policies Write", scope: "selected-account" });
  fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (init.method === "PUT") {
      if (failPolicy) return new Response("private token", { status: 503 });
      const body = JSON.parse(String(init.body)); writes.push(body);
      if (duringWrite) { const callback = duringWrite; duringWrite = undefined; await callback(); }
      policy = { ...policy, ...body };
    }
    if (url.endsWith("/revoke_tokens")) return failSessions ? new Response("secret", { status: 503 }) : Response.json({ success: true, result: {} });
    return Response.json({ success: true, result: url.includes("/policies") ? [policy, ...extras] : app });
  });
  vi.stubGlobal("fetch", fetch);
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const connect = async () => { await connectLogin(f.core); f.core.holder = await lease(f.core); };
const change = (removed = false, apps = ["orders"]) => changeMember(f.core, { email: employee.id, removed, apps });

it("seals account-scoped authority, preserves stricter controls and applies only the exact human policy", async () => {
  await connect();
  expect(f.sql.prepare("SELECT sealed_material FROM wong_access_connections").get()!.sealed_material).not.toContain("private-access-token");
  await change();
  await reconcileLogin(f.core, "policy");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ approval_required: true, approval_groups: policy.approval_groups, require: policy.require,
    include: [{ email: { email: employee.id } }, { email: { email: pin.ownerEmail } }] });
  expect(writes[0]).not.toHaveProperty("created_at");
  expect(writes[0]).not.toHaveProperty("id");
  expect(f.sql.prepare("SELECT status, outcome FROM wong_access_work WHERE kind = 'policy'").get())
    .toEqual({ status: "ready", outcome: "policy_readback_matches" });
  const status = JSON.stringify(await accessStatus(f.core));
  expect(status).not.toContain("private-access-token"); expect(status).toContain("account");
  expect(status).toContain("Downloaded copies");
  expect(fetch.mock.calls.filter(([, init]) => init.method === "PUT").every(([url]) => url.endsWith(`/policies/${pin.accessPolicyId}`))).toBe(true);
  const count = fetch.mock.calls.length;
  await reconcileLogin(f.core, "policy");
  await reconcileLogin(f.core, "sessions");
  expect(fetch.mock.calls).toHaveLength(count);
});

it("preserves existing login before reviewed enforcement and never admits employees under legacy APIs", async () => {
  const before = JSON.stringify(policy);
  await connect();
  for (const latch of [undefined, "off", "on"]) {
    f.env.WONG_ACCESS_POLICY = latch;
    f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
    await expect(reconcileLogin(f.core, "policy")).rejects.toMatchObject({ code: "private_rollout_required" });
  }
  expect(writes).toEqual([]); expect(JSON.stringify(policy)).toBe(before);
});

it("refuses missing authority, mismatched ownership, shared or unreviewed policies without takeover", async () => {
  const saved = f.env.WONG_ACCESS_LOGIN_MANAGEMENT!;
  f.env.WONG_ACCESS_LOGIN_MANAGEMENT = undefined;
  await expect(connectLogin(f.core)).rejects.toMatchObject({ code: "login_owner_setup_required" });
  for (const change of [{ accountId: "other" }, { appId: "other" }, { policyId: "other" }, { initialEmails: [] },
    { initialEmails: [pin.ownerEmail, "other@example.com"] }, { policyName: "other" }]) {
    f.env.WONG_ACCESS_LOGIN_MANAGEMENT = JSON.stringify({ ...JSON.parse(saved), ...change });
    await expect(connectLogin(f.core)).rejects.toThrow();
  }
  f.env.WONG_ACCESS_LOGIN_MANAGEMENT = saved;
  for (const change of [{ id: "other" }, { aud: "other" }, { domain: "other.example.com" }, { destinations: [] },
    { destinations: [{ type: "public", uri: "business.example.com" }] }]) {
    const original = app; app = { ...app, ...change };
    await expect(connectLogin(f.core)).rejects.toMatchObject({ code: "login_resource_mismatch" }); app = original;
  }
  for (const change of [{ reusable: true }, { app_count: 2 }]) {
    const original = policy; policy = { ...policy, ...change };
    await expect(connectLogin(f.core)).rejects.toMatchObject({ code: "login_policy_review_required" }); policy = original;
  }
  for (const item of [{ id: "extra", decision: "allow", include: [] }, { id: "extra", decision: "non_identity", include: [] },
    { id: "extra", decision: "non_identity", include: [{ everyone: {} }] }]) {
    extras = [item]; await expect(connectLogin(f.core)).rejects.toMatchObject({ code: "login_policy_review_required" });
  }
  extras = [{ id: "machine", decision: "non_identity", include: [{ service_token: { token_id: "verification" } }] }];
  await connectLogin(f.core);
  extras.push({ id: "another-machine", decision: "non_identity", include: [] });
  await expect(connectLogin(f.core)).rejects.toMatchObject({ code: "login_policy_review_required" });
  expect(writes).toEqual([]);
});

it("converges stale adds to a newer removal and never acknowledges the old generation", async () => {
  await connect();
  await change(false);
  duringWrite = async () => { await change(true); };
  await reconcileLogin(f.core, "policy");
  expect(writes).toHaveLength(2);
  expect(writes[1].include).toEqual([{ email: { email: pin.ownerEmail } }]);
  expect(f.sql.prepare("SELECT status, project_editing FROM wong_access_members").get()).toEqual({ status: "removed", project_editing: 0 });
  expect(f.sql.prepare("SELECT generation, status FROM wong_access_work WHERE kind = 'policy'").get())
    .toEqual({ generation: 3, status: "ready" });
});

it("retains partial-removal results independently and retries provider failures", async () => {
  await connect(); await change(true);
  failPolicy = true;
  await reconcileLogin(f.core, "policy"); await reconcileLogin(f.core, "sessions");
  expect(f.sql.prepare("SELECT status, error_code FROM wong_access_work WHERE kind = 'policy'").get())
    .toEqual({ status: "failed", error_code: "provider_unavailable" });
  expect(f.sql.prepare("SELECT status, outcome FROM wong_access_work WHERE kind = 'sessions'").get())
    .toEqual({ status: "ready", outcome: "session_revocation_accepted_propagation_unverified" });
  failPolicy = false;
  await reconcileLogin(f.core, "policy");
  expect(writes[0].include).toEqual([{ email: { email: pin.ownerEmail } }]);
  await change(true); failSessions = true;
  await reconcileLogin(f.core, "sessions");
  expect(f.sql.prepare("SELECT status FROM wong_access_work WHERE kind = 'sessions'").get()).toEqual({ status: "failed" });
  failSessions = false; await reconcileLogin(f.core, "sessions");
});

it("cannot acknowledge work after its lease expires or stricter controls change", async () => {
  await connect();
  duringWrite = async () => { f.sql.exec("UPDATE wong_access_leases SET expires_at = '2000-01-01'"); };
  await reconcileLogin(f.core, "policy");
  expect(f.sql.prepare("SELECT status FROM wong_access_work WHERE kind = 'policy'").get()!.status).not.toBe("ready");
  f.core.holder = await lease(f.core);
  policy.approval_required = false;
  await reconcileLogin(f.core, "policy");
  expect(f.sql.prepare("SELECT error_code FROM wong_access_work WHERE kind = 'policy'").get())
    .toEqual({ error_code: "login_policy_review_required" });
  policy.approval_required = true;
  // Generic malformed provider responses are sanitized and remain retryable.
  fetch.mockImplementationOnce(async () => Response.json({ success: false, result: "private" }));
  await reconcileLogin(f.core, "policy");
  expect(f.sql.prepare("SELECT error_code FROM wong_access_work WHERE kind = 'policy'").get())
    .toEqual({ error_code: "login_provider_unavailable" });
});

it("bounds stale-generation retries and rejects readback that did not retain desired emails", async () => {
  await connect();
  const original = fetch.getMockImplementation()!;
  fetch.mockImplementation(async (url, init) => {
    const response = await original(url, init);
    if (init.method === "PUT") { await change(); }
    return response;
  });
  await reconcileLogin(f.core, "policy");
  expect(writes).toHaveLength(3);
  expect(f.sql.prepare("SELECT status FROM wong_access_work WHERE kind = 'policy'").get()).toEqual({ status: "pending" });
  fetch.mockImplementation(async (url, init) => {
    if (init.method === "PUT") return Response.json({ success: true, result: {} });
    policy.include = [{ email: { email: pin.ownerEmail } }];
    return original(url, init);
  });
  await reconcileLogin(f.core, "policy");
  expect(f.sql.prepare("SELECT error_code FROM wong_access_work WHERE kind = 'policy'").get())
    .toEqual({ error_code: "login_policy_readback_pending" });
  f.sql.exec("DELETE FROM wong_access_connections");
  await expect(reconcileLogin(f.core, "policy")).rejects.toMatchObject({ code: "login_owner_setup_required" });
});

it("commits explicit apps and tombstones atomically while preserving inert legacy data", async () => {
  await expect(changeMember(f.core, {})).rejects.toMatchObject({ code: "invalid_person" });
  await expect(changeMember(f.core, { email: pin.ownerEmail, removed: true, apps: [] })).rejects.toMatchObject({ code: "owner_cannot_be_changed" });
  await expect(change(false, ["unassigned"])).rejects.toMatchObject({ code: "unknown_app" });
  await change(false, ["orders", "orders"]);
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_grants").get()).toEqual({ count: 1 });
  f.sql.prepare("INSERT INTO wong_access_receipts VALUES ('receipt', ?, ?, 'machine', 2, 123, 'issued', 'sealed', 'later', 'now')")
    .run(pin.installationId, employee.id);
  await change(false);
  expect(f.sql.prepare("SELECT status FROM wong_access_receipts").get()).toEqual({ status: "issued" });
  expect(f.sql.prepare("SELECT status FROM wong_access_members").get()).toEqual({ status: "active" });
  await change(true);
  expect(f.sql.prepare("SELECT status, project_editing FROM wong_access_members").get()).toEqual({ status: "removed", project_editing: 0 });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_grants").get()).toEqual({ count: 0 });
  f.sql.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON wong_access_audit BEGIN SELECT RAISE(ABORT, 'fail'); END");
  await expect(change(false)).rejects.toThrow();
  expect(f.sql.prepare("SELECT status FROM wong_access_members").get()).toEqual({ status: "removed" });
});

it("does not start an external policy write after lease or generation changes during admission", async () => {
  await connect();
  const batch = f.core.db.batch.bind(f.core.db);
  const raced = vi.spyOn(f.core.db, "batch").mockImplementation(async statements => {
    const result = await batch(statements);
    f.sql.exec("UPDATE wong_access_work SET generation = generation + 1 WHERE kind = 'policy'");
    return result;
  });
  await reconcileLogin(f.core, "policy");
  expect(writes).toEqual([]);
  expect(f.sql.prepare("SELECT status FROM wong_access_policy_writes").get()).toEqual({ status: "completed" });
  raced.mockRestore();
  const original = fetch.getMockImplementation()!;
  fetch.mockImplementation(async (url, init) => {
    const result = await original(url, init);
    if (url.includes("/policies") && init.method === "GET") f.sql.exec("UPDATE wong_access_leases SET expires_at = '2000-01-01'");
    return result;
  });
  await reconcileLogin(f.core, "policy");
  expect(writes).toEqual([]);
  expect(f.sql.prepare("SELECT error_code FROM wong_access_work WHERE kind = 'policy'").get()).toEqual({ error_code: "provider_lease_expired" });
});

it("reports a crashed or lost old provider write pending even after a newer removal readback matches", async () => {
  await connect(); await change(true);
  f.sql.prepare("INSERT INTO wong_access_policy_writes VALUES ('old-process', ?, 1, 'in_flight', 'before')").run(pin.installationId);
  await reconcileLogin(f.core, "policy");
  expect(writes.at(-1)!.include).toEqual([{ email: { email: pin.ownerEmail } }]);
  expect(f.sql.prepare("SELECT status, outcome FROM wong_access_work WHERE kind = 'policy'").get())
    .toEqual({ status: "pending", outcome: "previous_policy_write_unresolved" });
  // A late old write can still add the removed email at the edge. Local
  // tombstones remain denied and retry cannot call this propagation complete.
  policy.include = [{ email: { email: employee.id } }, { email: { email: pin.ownerEmail } }];
  await reconcileLogin(f.core, "policy");
  expect(f.sql.prepare("SELECT status FROM wong_access_members").get()).toEqual({ status: "removed" });
  expect(f.sql.prepare("SELECT status FROM wong_access_work WHERE kind = 'policy'").get()).toEqual({ status: "pending" });
});

it("does not accept email-only readback when the provider drops an approval control", async () => {
  await connect();
  duringWrite = async () => { /* Provider acknowledges the mutation but loses a stricter field. */ };
  const original = fetch.getMockImplementation()!;
  fetch.mockImplementation(async (url, init) => {
    const response = await original(url, init);
    if (init.method === "PUT") policy.approval_required = false;
    return response;
  });
  await reconcileLogin(f.core, "policy");
  expect(f.sql.prepare("SELECT status, error_code FROM wong_access_work WHERE kind = 'policy'").get())
    .toEqual({ status: "failed", error_code: "login_policy_readback_pending" });
});
