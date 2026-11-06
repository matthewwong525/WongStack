// Sign-in and Access, from a fresh install's first start: each case clears the Access tables, the seed's included.
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { call, type AppTests } from "../context.ts";
import { site } from "../identity.ts";
import { startRuntime, type Runtime } from "../setup.ts";

const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`;
async function tables(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'wong_access_%' ORDER BY name").all<{ name: string }>();
  return results.map(({ name }) => name);
}

/** Clear only the Access tables, retaining the migration ledger and runtime session. */
async function resetAccess(db: D1Database): Promise<void> {
  const names = await tables(db);
  // One real D1 batch: remove the trigger and defer constraints while deleting the fixture.
  await db.batch([db.prepare("DROP TRIGGER IF EXISTS runtime_abort_save"),
    db.prepare("PRAGMA defer_foreign_keys = ON"), ...names.map(name => db.prepare(`DELETE FROM ${quoted(name)}`))]);
}

/** Snapshot every Access table in one D1 call, so refusal and rollback cannot hide a partial write. */
async function snapshot(db: D1Database) {
  const names = await tables(db);
  const rows = await db.batch(names.map(name => db.prepare(`SELECT * FROM ${quoted(name)} ORDER BY rowid`)));
  return Object.fromEntries(names.map((name, index) => [name, rows[index].results]));
}

export const access: AppTests = context => {
  const db = () => context().runtime.env.DB;
  const member = { email: site.employee, removed: false, apps: { hello: true } };
  const request = (path: string, token = context().signed.owner, origin = true) => call(context(), path, { token, origin });
  const status = () => request("/api/access/status");
  const save = (token = context().signed.owner, origin = true) => call(context(), "/api/access/people", { token, origin, body: member });

  beforeEach(async () => { await resetAccess(db()); });

  it("verifies signed callers and rejects forged email and wrong audiences", async () => {
    const { runtime, signed } = context();
    const unsigned = await runtime.worker.fetch(`${site.origin}/api/health`);
    expect(unsigned.status).toBe(401);
    const forged = await runtime.worker.fetch(`${site.origin}/api/health`, { headers: { "Cf-Access-Authenticated-User-Email": site.owner } });
    expect(forged.status).toBe(401);
    expect((await request("/api/health", signed.wrongAudience)).status).toBe(401);
    // A valid-looking payload with a broken signature is also denied.
    expect((await request("/api/health", `${signed.owner.slice(0, -8)}AAAAAAAA`)).status).toBe(401);
    for (const token of [signed.owner, signed.service]) {
      const response = await request("/api/health", token);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    }
    expect((await request("/api/unknown")).status).toBe(404);
    // The setup file is the one address an unsigned caller is answered, and the real build carries the script.
    const setup = await runtime.worker.fetch(`${site.origin}/_memory/setup.mjs`);
    expect([setup.status, (await setup.text()).includes(`const SERVED_FROM = "${site.origin}";`)]).toEqual([200, true]);
  });

  it("initializes Access using fresh real migrations and synthetic bindings", async () => {
    expect(await db().prepare("SELECT * FROM wong_access_installation").all()).toMatchObject({ results: [] });
    const response = await status();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ownerEmail: site.owner, environment: "practice", started: true, keysStarted: true });
    expect(await db().prepare("SELECT owner_email, policy_enabled, keys_enabled FROM wong_access_installation").first())
      .toEqual({ owner_email: site.owner, policy_enabled: 1, keys_enabled: 1 });
    expect(await db().prepare("SELECT app_id FROM wong_access_apps WHERE app_id = 'hello'").first()).toEqual({ app_id: "hello" });
    expect(context().runtime.env).not.toHaveProperty("RUNTIME_POISON_SECRET");
    expect(context().runtime.env).not.toHaveProperty("SKIP_AUTH");
  });

  it("commits member, grant, revision and audit and reads them back", async () => {
    await status();
    const before = await db().prepare("SELECT revision FROM wong_access_installation").first<{ revision: number }>();
    const response = await save();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ people: [expect.objectContaining({ email: site.employee, apps: ["hello"] })] });
    expect(await db().prepare("SELECT status, revision FROM wong_access_members WHERE email = ?").bind(site.employee).first())
      .toEqual({ status: "active", revision: before!.revision + 1 });
    expect(await db().prepare("SELECT app_id, level, revision FROM wong_access_grants WHERE email = ?").bind(site.employee).first())
      .toEqual({ app_id: "hello", level: "write", revision: before!.revision + 1 });
    expect(await db().prepare("SELECT actor_email, event, revision FROM wong_access_audit WHERE event = 'person_changed'").first())
      .toEqual({ actor_email: site.owner, event: "person_changed", revision: before!.revision + 1 });
    expect(await (await status()).json()).toMatchObject({ people: [expect.objectContaining({ email: site.employee, apps: ["hello"] })] });
  });

  it("refuses employee management and missing Origin without any writes", async () => {
    await status();
    const before = await snapshot(db());
    for (const response of [await save(context().signed.employee), await save(context().signed.owner, false)]) {
      expect(response.status).toBe(403);
      expect(await snapshot(db())).toEqual(before);
    }
  });

  it("rolls back the whole D1 batch when its final audit insert fails", async () => {
    await status();
    const before = await snapshot(db());
    await db().prepare(`CREATE TRIGGER runtime_abort_save BEFORE INSERT ON wong_access_audit
      WHEN NEW.event = 'person_changed' BEGIN SELECT RAISE(ABORT, 'runtime rollback proof'); END`).run();
    const response = await save();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "access_unavailable" });
    expect(await snapshot(db())).toEqual(before);
  });

  it("resets the previous scenario's members and failing trigger", async () => {
    expect((await db().prepare("SELECT * FROM wong_access_members").all()).results).toEqual([]);
    expect((await db().prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'runtime_abort_save'").all()).results).toEqual([]);
    await status();
    expect((await save()).status).toBe(200);
  });

  // A tool added from a chat loads only on the live app, so this starts a second Worker as the live one.
  describe("service examples", () => {
    let live: Runtime;
    const tool = { base: "https://api.example.test/", header: "Authorization", prefix: "Bearer " };
    beforeAll(async () => {
      live = await startRuntime({ WONG_ENVIRONMENT: "production", WONG_OWNER_EMAIL: site.owner, CF_ACCESS_TEAM_DOMAIN: site.domain,
        CF_ACCESS_AUD: site.audience, TOOL_EXAMPLE: "runtime-example-key" });
      await live.env.DB.prepare(`INSERT INTO tools (id, title, purpose, docs, forward_json, levels_json, added_by, added_at)
        VALUES ('example', 'Example', 'A made-up service for the runtime tests', 'https://docs.example.test/', ?, '["read"]', ?, '2026-11-06')`)
        .bind(JSON.stringify(tool), site.owner).run();
      await context().services.serve("example", { db: live.env.DB, dir: fileURLToPath(new URL("../fixtures/services/example", import.meta.url)) });
    });
    afterAll(async () => { await live?.close(); });

    it("answers a direct look-up from the service's saved example, never its live address", async () => {
      const response = await call({ ...context(), runtime: live }, "/api/direct/example/read",
        { token: context().signed.owner, body: { method: "GET", path: "things", query: "limit=1" } });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 200, contentType: "application/json",
        body: { things: [{ id: "thing_00000001", title: "Sample text 1" }] } });
    });

    it("names the closest example when no example matches", async () => {
      await expect(context().services.answer(new Request("https://api.example.test/thing?limit=1")))
        .rejects.toThrow("No example for GET example/thing (closest: example/things)");
    });
  });
};
