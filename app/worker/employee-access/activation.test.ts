import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { activateAccess, type ActivationEnv } from "./activation";
import type { AccessIdentity } from "../access";

const pin = {
  version: 1,
  installationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  origin: "https://business.example.com",
  accountId: "a".repeat(32),
  workerId: "b".repeat(32),
  accessAppId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  accessPolicyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  issuer: "https://business.cloudflareaccess.com",
  audience: "business-app",
  ownerSubject: "verified-owner",
  ownerEmail: "owner@example.com",
  repositoryId: 123,
  repositoryName: "business/project",
};
const owner: AccessIdentity = { kind: "user", id: pin.ownerEmail, claims: {
  email: pin.ownerEmail, sub: pin.ownerSubject, iss: pin.issuer, aud: pin.audience,
  exp: Math.floor(Date.now() / 1000) + 600,
} };

let sql: DatabaseSync;
let env: ActivationEnv;
let session: { prepare: ReturnType<typeof vi.fn>; batch: ReturnType<typeof vi.fn> };

beforeEach(() => {
  sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys = ON; CREATE TABLE orders (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO orders VALUES (1, 'existing customer');");
  sql.exec(readFileSync(new URL("../../../schema/migrations/0001_employee_access.sql", import.meta.url), "utf8"));
  session = {
    prepare: vi.fn((query: string) => {
      const statement = (values: (string | number)[] = []) => ({
        bind: (...bound: (string | number)[]) => statement(bound),
        first: async () => sql.prepare(query).get(...values) ?? null,
        run: async () => sql.prepare(query).run(...values),
      });
      return statement();
    }),
    batch: vi.fn(async (statements: { run: () => Promise<unknown> }[]) => {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sql.exec("COMMIT");
        return results;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    }),
  };
  env = {
    DB: { withSession: vi.fn(() => session) } as unknown as D1Database,
    WONG_ENVIRONMENT: "production", CF_ACCESS_TEAM_DOMAIN: "business.cloudflareaccess.com",
    CF_ACCESS_AUD: pin.audience, CF_ACCESS_APP_ID: pin.accessAppId, CF_ACCESS_WORKER_ID: pin.workerId,
    WONG_ACCESS_ACTIVATION: JSON.stringify(pin),
  };
});
afterEach(() => sql.close());

const call = (identity: AccessIdentity | null = owner, overrides: Partial<ActivationEnv> = {},
  init: RequestInit = { method: "POST", headers: { Origin: pin.origin } }, origin = pin.origin) =>
  activateAccess(new Request(`${origin}/api/access/activate`, init), { ...env, ...overrides }, identity);

it("adds isolated policy tables without changing business data or assigning access", async () => {
  const result = await call();
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ code: "owner_activated" });
  expect(result.headers.get("Cache-Control")).toBe("no-store");
  expect(env.DB.withSession).toHaveBeenCalledWith("first-primary");
  expect(sql.prepare("SELECT * FROM orders").all()).toEqual([{ id: 1, name: "existing customer" }]);
  expect(sql.prepare("SELECT * FROM wong_access_installation").get()).toMatchObject({
    installation_id: pin.installationId, owner_subject: pin.ownerSubject, owner_email: pin.ownerEmail,
    repository_id: pin.repositoryId, policy_enabled: 0, issuance_enabled: 0, revision: 1,
  });
  expect(sql.prepare("SELECT event, actor_email FROM wong_access_audit").all()).toEqual([
    { event: "owner_activated", actor_email: pin.ownerEmail },
  ]);
  for (const table of ["members", "apps", "grants", "connections", "work", "receipts"]) {
    expect(sql.prepare(`SELECT COUNT(*) AS count FROM wong_access_${table}`).get()).toEqual({ count: 0 });
  }
});

it("keeps repeated activation idempotent and cannot transfer or repoint ownership", async () => {
  await call();
  expect((await call()).status).toBe(200);
  expect(session.batch).toHaveBeenCalledTimes(1);
  for (const update of [
    { ownerSubject: "another-owner" }, { ownerEmail: "another@example.com" }, { repositoryId: 456 },
    { installationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" }, { repositoryName: "another/project" },
  ]) {
    const changed = { ...pin, ...update };
    const identity = { ...owner, id: changed.ownerEmail, claims: { ...owner.claims, sub: changed.ownerSubject, email: changed.ownerEmail } };
    const result = await call(identity, { WONG_ACCESS_ACTIVATION: JSON.stringify(changed) });
    expect(result.status).toBe(409);
    expect(await result.json()).toEqual({ code: "installation_already_pinned" });
  }
  expect(sql.prepare("SELECT owner_subject, repository_id FROM wong_access_installation").get())
    .toEqual({ owner_subject: pin.ownerSubject, repository_id: pin.repositoryId });
});

it("requires private production configuration before any database use", async () => {
  for (const overrides of [
    { WONG_ACCESS_ACTIVATION: undefined }, { WONG_ACCESS_ACTIVATION: "" },
    { WONG_ENVIRONMENT: "staging" }, { WONG_ENVIRONMENT: "local" }, { WONG_ENVIRONMENT: undefined },
  ]) {
    const result = await call(owner, overrides);
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ code: "owner_setup_required" });
  }
  expect(env.DB.withSession).not.toHaveBeenCalled();
});

it("rejects malformed, incomplete and foreign private installation pins", async () => {
  const bad = ["not json", "null", JSON.stringify({ ownerEmail: pin.ownerEmail })];
  for (const update of [
    { version: 2 }, { origin: "http://business.example.com" }, { origin: `${pin.origin}/path` },
    { origin: "https://another.example.com" }, { issuer: "https://another.cloudflareaccess.com" },
    { audience: "another-app" }, { accessAppId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
    { workerId: "c".repeat(32) }, { repositoryId: 0 }, { repositoryName: "https://github.com/business/project" },
    { ownerSubject: "" }, { ownerEmail: "invalid" }, { unexpected: true },
  ]) bad.push(JSON.stringify({ ...pin, ...update }));
  for (const value of bad) {
    const result = await call(owner, { WONG_ACCESS_ACTIVATION: value });
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ code: "installation_mismatch" });
  }
  expect((await call(owner, {}, undefined, "https://preview.example.com")).status).toBe(503);
  expect(env.DB.withSession).not.toHaveBeenCalled();
});

it("cannot nominate a first visitor, service, missing subject or foreign-session owner", async () => {
  const identities: (AccessIdentity | null)[] = [null, { ...owner, kind: "service" }, { ...owner, id: "visitor@example.com" }];
  for (const claims of [
    { email: "visitor@example.com" }, { email: undefined }, { sub: undefined }, { sub: "" }, { sub: "foreign-subject" },
    { iss: "https://another.cloudflareaccess.com" }, { aud: "another-app" }, { aud: ["another-app"] },
    { exp: 1 }, { nbf: Math.floor(Date.now() / 1000) + 600 }, { common_name: "service-client" },
  ]) identities.push({ ...owner, claims: { ...owner.claims, ...claims } });
  for (const identity of identities) {
    const result = await call(identity);
    expect(result.status).toBe(403);
    expect(await result.json()).toEqual({ code: "owner_required" });
  }
  expect(env.DB.withSession).not.toHaveBeenCalled();
});

it("accepts the verified owner with normalized email and a matching audience array", async () => {
  const identity = { ...owner, id: " OWNER@EXAMPLE.COM ", claims: {
    ...owner.claims, email: " OWNER@EXAMPLE.COM ", aud: ["other", pin.audience], nbf: 1,
  } };
  const result = await call(identity, { WONG_ACCESS_ACTIVATION: JSON.stringify({ ...pin, ownerEmail: "OWNER@EXAMPLE.COM" }) });
  expect(result.status).toBe(200);
  expect(sql.prepare("SELECT owner_email FROM wong_access_installation").get()).toEqual({ owner_email: pin.ownerEmail });
});

it("accepts the provider's opaque Worker identifier without inventing a fixed length", async () => {
  const workerId = "37236d316a9d49028048b9217deae927";
  expect((await call(owner, { CF_ACCESS_WORKER_ID: workerId,
    WONG_ACCESS_ACTIVATION: JSON.stringify({ ...pin, workerId }) })).status).toBe(200);
  expect(sql.prepare("SELECT worker_id FROM wong_access_installation").get()).toEqual({ worker_id: workerId });
});

it("requires a deliberate same-origin POST and ignores untrusted body owner claims", async () => {
  expect((await call(owner, {}, { method: "GET" })).status).toBe(405);
  for (const headers of [{}, { Origin: "https://attacker.example.com" }]) {
    const result = await call(owner, {}, { method: "POST", headers });
    expect(result.status).toBe(403);
    expect(await result.json()).toEqual({ code: "origin_required" });
  }
  expect(env.DB.withSession).not.toHaveBeenCalled();
  expect((await call(owner, {}, { method: "POST", headers: { Origin: pin.origin }, body: '{"ownerEmail":"attacker@example.com"}' })).status).toBe(200);
  expect(sql.prepare("SELECT owner_email FROM wong_access_installation").get()).toEqual({ owner_email: pin.ownerEmail });
});

it("uses authoritative readback to reject a competing activation", async () => {
  await call();
  const first = session.prepare;
  let reads = 0;
  first.mockImplementation((query: string) => ({
    bind: () => ({ run: async () => ({}) }),
    first: async () => ++reads === 1 ? null : sql.prepare(query).get(),
  }));
  const changed = { ...pin, repositoryId: 999 };
  expect((await call(owner, { WONG_ACCESS_ACTIVATION: JSON.stringify(changed) })).status).toBe(409);
});

it("reports unavailable without provider or database errors when migration or readback fails", async () => {
  const failed = () => { throw new Error("private provider detail"); };
  for (const db of [
    { withSession: failed },
    { withSession: () => ({ prepare: failed }) },
    { withSession: () => ({ prepare: () => ({ first: async () => null, bind: () => ({}) }), batch: failed }) },
    { withSession: () => ({ prepare: () => ({ first: async () => null, bind: () => ({}) }), batch: async () => [] }) },
  ]) {
    const result = await call(owner, { DB: db as unknown as D1Database });
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ code: "activation_unavailable" });
  }
});

it("enforces normalized roster, grant references and durable removed-member receipts", async () => {
  await call();
  const member = sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, ?, ?, ?, ?)");
  expect(() => member.run(pin.installationId, "Employee@EXAMPLE.com", "active", 0, 1, "now")).toThrow();
  member.run(pin.installationId, "employee@example.com", "active", 0, 1, "now");
  const grant = sql.prepare("INSERT INTO wong_access_grants VALUES (?, ?, ?, ?)");
  expect(() => grant.run(pin.installationId, "employee@example.com", "unassigned", 1)).toThrow();
  sql.prepare("INSERT INTO wong_access_apps VALUES (?, ?)").run(pin.installationId, "orders");
  grant.run(pin.installationId, "employee@example.com", "orders", 1);
  sql.prepare("INSERT INTO wong_access_receipts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("receipt", pin.installationId, "employee@example.com", "private-machine", 1, pin.repositoryId, "unknown", null, "later", "now");
  sql.prepare("UPDATE wong_access_members SET status = 'removed', revision = 2 WHERE email = ?").run("employee@example.com");
  expect(sql.prepare("SELECT status, expires_at FROM wong_access_receipts").get()).toEqual({ status: "unknown", expires_at: "later" });
  expect(() => sql.prepare("DELETE FROM wong_access_members WHERE email = ?").run("employee@example.com")).toThrow();
});

it("rolls back a partial activation batch without altering existing customer data", async () => {
  sql.exec("CREATE TRIGGER fail_access_audit BEFORE INSERT ON wong_access_audit BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END");
  expect((await call()).status).toBe(503);
  expect(sql.prepare("SELECT COUNT(*) AS count FROM wong_access_installation").get()).toEqual({ count: 0 });
  expect(sql.prepare("SELECT name FROM orders").get()).toEqual({ name: "existing customer" });
});
