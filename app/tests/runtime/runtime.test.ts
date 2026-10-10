import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { identities, site } from "./identity.ts";
import { resetDatabase, snapshot, startRuntime, type Runtime } from "./setup.ts";

let runtime: Runtime;
let signed: Awaited<ReturnType<typeof identities>>;
const outbound: string[] = [];
const member = { email: site.employee, removed: false, apps: { hello: true } };
const request = (path: string, token = signed.owner, body?: object, origin = true) => runtime.worker.fetch(`${site.origin}${path}`, {
  ...(body && { method: "POST", body: JSON.stringify(body) }),
  headers: { "Cf-Access-Jwt-Assertion": token, ...(origin && { Origin: site.origin }) },
});
const status = () => request("/api/access/status");
const save = (token = signed.owner, origin = true) => request("/api/access/people", token, member, origin);

beforeAll(async () => {
  signed = await identities();
  // Wrangler routes Worker outbound requests through host fetch; any non-JWKS call fails.
  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    outbound.push(url);
    if (url !== `https://${site.domain}/cdn-cgi/access/certs`) throw new Error(`Unexpected runtime outbound request: ${url}`);
    return Response.json({ keys: [signed.publicKey] });
  });
  runtime = await startRuntime({ WONG_ENVIRONMENT: "staging", WONG_OWNER_EMAIL: site.owner,
    CF_ACCESS_TEAM_DOMAIN: site.domain, CF_ACCESS_AUD: site.audience });
});
beforeEach(async () => { await resetDatabase(runtime.env.DB); });
afterAll(async () => {
  try { await runtime?.close(); }
  finally { vi.unstubAllGlobals(); }
  expect(outbound.every(url => url === `https://${site.domain}/cdn-cgi/access/certs`)).toBe(true);
});

it("verifies signed callers and rejects forged email and wrong audiences", async () => {
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
});

it("initializes Access using fresh real migrations and synthetic bindings", async () => {
  expect(await runtime.env.DB.prepare("SELECT * FROM wong_access_installation").all()).toMatchObject({ results: [] });
  const response = await status();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ownerEmail: site.owner, environment: "practice", started: true, keysStarted: true });
  expect(await runtime.env.DB.prepare("SELECT owner_email, policy_enabled, keys_enabled FROM wong_access_installation").first())
    .toEqual({ owner_email: site.owner, policy_enabled: 1, keys_enabled: 1 });
  expect(await runtime.env.DB.prepare("SELECT app_id FROM wong_access_apps WHERE app_id = 'hello'").first()).toEqual({ app_id: "hello" });
  expect(runtime.env).not.toHaveProperty("RUNTIME_POISON_SECRET");
  expect(runtime.env).not.toHaveProperty("SKIP_AUTH");
});

it("commits member, grant, revision and audit and reads them back", async () => {
  await status();
  const before = await runtime.env.DB.prepare("SELECT revision FROM wong_access_installation").first<{ revision: number }>();
  const response = await save();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ people: [expect.objectContaining({ email: site.employee, apps: ["hello"] })] });
  expect(await runtime.env.DB.prepare("SELECT status, revision FROM wong_access_members WHERE email = ?").bind(site.employee).first())
    .toEqual({ status: "active", revision: before!.revision + 1 });
  expect(await runtime.env.DB.prepare("SELECT app_id, level, revision FROM wong_access_grants WHERE email = ?").bind(site.employee).first())
    .toEqual({ app_id: "hello", level: "write", revision: before!.revision + 1 });
  expect(await runtime.env.DB.prepare("SELECT actor_email, event, revision FROM wong_access_audit WHERE event = 'person_changed'").first())
    .toEqual({ actor_email: site.owner, event: "person_changed", revision: before!.revision + 1 });
  expect(await (await status()).json()).toMatchObject({ people: [expect.objectContaining({ email: site.employee, apps: ["hello"] })] });
});

it("refuses employee management and missing Origin without any writes", async () => {
  await status();
  const before = await snapshot(runtime.env.DB);
  for (const response of [await save(signed.employee), await save(signed.owner, false)]) {
    expect(response.status).toBe(403);
    expect(await snapshot(runtime.env.DB)).toEqual(before);
  }
});

it("rolls back the whole D1 batch when its final audit insert fails", async () => {
  await status();
  const before = await snapshot(runtime.env.DB);
  await runtime.env.DB.prepare(`CREATE TRIGGER runtime_abort_save BEFORE INSERT ON wong_access_audit
    WHEN NEW.event = 'person_changed' BEGIN SELECT RAISE(ABORT, 'runtime rollback proof'); END`).run();
  const response = await save();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ code: "access_unavailable" });
  expect(await snapshot(runtime.env.DB)).toEqual(before);
});

it("resets the previous scenario's members and failing trigger", async () => {
  expect((await runtime.env.DB.prepare("SELECT * FROM wong_access_members").all()).results).toEqual([]);
  expect((await runtime.env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'runtime_abort_save'").all()).results).toEqual([]);
  await status();
  expect((await save()).status).toBe(200);
});
