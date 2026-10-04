import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fixture, pin, employee, owner, req } from "./connections.test-support";
import { githubFixture } from "./github.test-support";
import { issueToken, revokeTokens } from "./tokens";
import { changeMember } from "./members";
import { seal } from "./seal";
let f: ReturnType<typeof fixture>;
let g: Awaited<ReturnType<typeof githubFixture>>;
const machineId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const receiptId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const nextId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const data = { machineId, receiptId };
const issue = (value: unknown = data, identity = employee, bindings = f.env) => issueToken(req("token"), bindings, identity, value);
beforeEach(async () => { f = fixture(); g = await githubFixture(f); });
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("issues one scoped sealed receipt and reuses exact completed credentials after a lost local response", async () => {
  const first = await issue(), body = await first.json();
  expect(first.headers.get("Cache-Control")).toBe("no-store");
  expect(body).toMatchObject({ token: "employee-private-token", receiptId, repositoryId: 123, publishing: "owner_required" });
  const row = f.sql.prepare("SELECT * FROM wong_access_receipts").get()!;
  expect(row).toMatchObject({ email: employee.id, machine_id: machineId, status: "issued", grant_revision: 1 });
  expect(String(row.sealed_token)).not.toContain("employee-private-token");
  expect(await (await issue()).json()).toEqual(body);
  const writes = g.fetch.mock.calls.filter(([url, init]) => url.endsWith("access_tokens") && JSON.parse(String(init.body)).permissions.contents === "write");
  expect(writes).toHaveLength(1);
  expect(f.sql.prepare("SELECT actor_email FROM wong_access_audit WHERE event = 'repository_token_issued'").get()).toEqual({ actor_email: employee.id });
});

it("rejects foreign receipts, permissions, identity, stale grant, missing connection and staging before issuance", async () => {
  await expect(issue({ ...data, permissions: { secrets: "read" } })).rejects.toMatchObject({ code: "invalid_machine_receipt" });
  await expect(issue({ machineId: "bad", receiptId })).rejects.toThrow();
  for (const identity of [owner, { ...employee, kind: "service" as const }, { ...employee, claims: { ...employee.claims, sub: undefined } }]) {
    await expect(issue(data, identity)).rejects.toMatchObject({ code: "editing_not_allowed" });
  }
  for (const update of [{ WONG_ENVIRONMENT: "staging" }, { WONG_ACCESS_POLICY: undefined }, { WONG_ACCESS_ACTIVATION: undefined }, { WONG_ACCESS_ACTIVATION: "bad" }]) {
    await expect(issue(data, employee, { ...f.env, ...update })).rejects.toMatchObject({ code: "editing_not_allowed" });
  }
  await expect(issueToken(new Request(`${pin.origin}/api/access/token`, { method: "POST" }), f.env, employee, data)).rejects.toThrow();
  f.sql.exec("UPDATE wong_access_installation SET issuance_enabled = 0");
  await expect(issue()).rejects.toMatchObject({ code: "editing_not_allowed" });
  f.sql.exec("UPDATE wong_access_installation SET issuance_enabled = 1");
  await issue();
  await expect(issue({ ...data, machineId: nextId })).rejects.toMatchObject({ code: "receipt_mismatch" });
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, 'other@example.com', 'active', 0, 1, 'now')").run(pin.installationId);
  f.sql.prepare("UPDATE wong_access_receipts SET email = 'other@example.com' WHERE receipt_id = ?").run(receiptId);
  await expect(issue()).rejects.toMatchObject({ code: "receipt_mismatch" });
});

it("withholds and revokes a token when editing or full membership is removed during creation", async () => {
  const original = g.fetch.getMockImplementation()!;
  g.fetch.mockImplementation(async (url, init) => {
    const result = await original(url, init);
    if (url.endsWith("access_tokens") && JSON.parse(String(init.body)).permissions.contents === "write") {
      await changeMember(f.core, { email: employee.id, apps: ["orders"], editing: false, removed: false });
    }
    return result;
  });
  await expect(issue()).rejects.toMatchObject({ code: "editing_not_allowed" });
  expect(f.sql.prepare("SELECT status, sealed_token FROM wong_access_receipts").get()).toEqual({ status: "revoked", sealed_token: null });
  expect(f.sql.prepare("SELECT status FROM wong_access_members").get()).toEqual({ status: "active" });
  const calls = g.fetch.mock.calls.length;
  await expect(issue({ machineId, receiptId: nextId })).rejects.toThrow();
  expect(g.fetch.mock.calls).toHaveLength(calls);
});

it("bounds lost provider outcomes and refuses blind second issuance on the same machine", async () => {
  const original = g.fetch.getMockImplementation()!;
  g.fetch.mockImplementation(async (url, init) => {
    if (url.endsWith("access_tokens") && JSON.parse(String(init.body)).permissions.contents === "write") throw new Error("private provider diagnostics");
    return original(url, init);
  });
  const started = Date.now();
  await expect(issue()).rejects.toThrow();
  const row = f.sql.prepare("SELECT status, expires_at FROM wong_access_receipts").get()!;
  expect(row.status).toBe("unknown");
  expect(Date.parse(String(row.expires_at)) - started).toBeGreaterThanOrEqual(4_800_000);
  await expect(issue()).rejects.toMatchObject({ code: "receipt_not_ready" });
  await expect(issue({ machineId, receiptId: nextId })).rejects.toMatchObject({ code: "receipt_retry_pending" });
  await changeMember(f.core, { email: employee.id, apps: [], editing: false, removed: true });
  await revokeTokens(f.core);
  expect(f.sql.prepare("SELECT status, outcome FROM wong_access_work WHERE kind = 'github_tokens'").get())
    .toEqual({ status: "pending", outcome: "revocation_or_unknown_expiry_pending" });
  f.sql.exec("UPDATE wong_access_receipts SET expires_at = '2000-01-01'");
  await revokeTokens(f.core);
  expect(f.sql.prepare("SELECT status FROM wong_access_receipts").get()).toEqual({ status: "expired" });
  expect(f.sql.prepare("SELECT status FROM wong_access_work WHERE kind = 'github_tokens'").get()).toEqual({ status: "ready" });
});

it("keeps known revocation failures sealed and retryable while other people keep access", async () => {
  await issue();
  await changeMember(f.core, { email: employee.id, apps: ["orders"], editing: false, removed: false });
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, 'other@example.com', 'active', 1, 1, 'now')").run(pin.installationId);
  f.sql.prepare("INSERT INTO wong_access_receipts VALUES ('other', ?, 'other@example.com', 'other-machine', 1, 123, 'issued', 'other-token', '9999-01-01', 'now')").run(pin.installationId);
  const original = g.fetch.getMockImplementation()!;
  g.fetch.mockImplementation(async (url, init) => init.method === "DELETE" ? new Response("private", { status: 503 }) : original(url, init));
  await revokeTokens(f.core);
  expect(f.sql.prepare("SELECT status FROM wong_access_receipts WHERE receipt_id = ?").get(receiptId)).toEqual({ status: "revoke_pending" });
  expect(f.sql.prepare("SELECT status FROM wong_access_receipts WHERE receipt_id = 'other'").get()).toEqual({ status: "issued" });
  g.fetch.mockImplementation(original); await revokeTokens(f.core);
  expect(f.sql.prepare("SELECT status FROM wong_access_receipts WHERE receipt_id = ?").get(receiptId)).toEqual({ status: "revoked" });
});

it("retains a raced token if immediate revocation fails and never returns it", async () => {
  const original = g.fetch.getMockImplementation()!;
  g.fetch.mockImplementation(async (url, init) => {
    const result = await original(url, init);
    if (url.endsWith("access_tokens") && JSON.parse(String(init.body)).permissions.contents === "write") {
      await changeMember(f.core, { email: employee.id, apps: [], editing: false, removed: true });
    }
    if (init.method === "DELETE" && String((init.headers as Record<string, string>).Authorization).includes("employee-private-token")) return new Response("private", { status: 503 });
    return result;
  });
  await expect(issue()).rejects.toThrow();
  const row = f.sql.prepare("SELECT status, sealed_token FROM wong_access_receipts").get()!;
  expect(row.status).toBe("revoke_pending"); expect(row.sealed_token).toBeTruthy();
  g.fetch.mockImplementation(original); await revokeTokens(f.core);
  expect(f.sql.prepare("SELECT status FROM wong_access_receipts").get()).toEqual({ status: "revoked" });
});

it("requires fresh grant revision, receipt state, repository and expiry on renewal/retry", async () => {
  await issue();
  for (const [field, value] of [["grant_revision", 99], ["status", "unknown"], ["sealed_token", null], ["repository_id", 900], ["expires_at", "2000-01-01"]] as const) {
    const saved = f.sql.prepare(`SELECT ${field} saved FROM wong_access_receipts`).get()!.saved;
    f.sql.prepare(`UPDATE wong_access_receipts SET ${field} = ?`).run(value);
    await expect(issue()).rejects.toMatchObject({ code: "receipt_not_ready" });
    f.sql.prepare(`UPDATE wong_access_receipts SET ${field} = ?`).run(saved);
  }
  await issue({ machineId, receiptId: nextId });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_receipts").get()).toEqual({ count: 2 });
});

it("preserves unknown in-flight issuance and expires only its conservative deadline", async () => {
  const sealed = await seal("private", f.env.WONG_ACCESS_SEAL_KEY, `${pin.installationId}:receipt:${receiptId}`);
  f.sql.prepare("INSERT INTO wong_access_receipts VALUES (?, ?, ?, ?, 1, 123, 'issuing', NULL, '9999-01-01', 'now')").run(receiptId, pin.installationId, employee.id, machineId);
  await revokeTokens(f.core);
  expect(f.sql.prepare("SELECT status FROM wong_access_receipts").get()).toEqual({ status: "issuing" });
  f.sql.prepare("UPDATE wong_access_receipts SET status = 'revoke_pending', sealed_token = ?").run(sealed);
  await revokeTokens(f.core);
  expect(f.sql.prepare("SELECT status FROM wong_access_receipts").get()).toEqual({ status: "revoked" });
});
