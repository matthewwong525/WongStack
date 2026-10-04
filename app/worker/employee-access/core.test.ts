import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccessError, lease, leaseCurrent, ownerCore, permissionsStarted, release, reply } from "./core";
import { boundedJson } from "./json";
import { provider } from "./provider";
import { fixture, owner, employee, site, req } from "../../tests/employee-access/connections";
let f: ReturnType<typeof fixture>;
beforeEach(() => { f = fixture(); });
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("knows the owner by the recorded email and a verified human sign-in, on the live app and on a preview", async () => {
  const core = await ownerCore(req("status", "GET"), f.env, owner);
  expect(core).toMatchObject({ email: site.ownerEmail, subject: site.ownerSubject, origin: site.origin,
    installationId: site.installationId, live: true });
  expect(await permissionsStarted(core)).toBe(true);
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
  expect(new AccessError("unavailable").status).toBe(503);
});

it("creates the installation row on the first owner request and logs the first-seen subject once", async () => {
  f.sql.close(); f = fixture({ started: false });
  // Nobody but the owner can make the row exist.
  await expect(ownerCore(req("status", "GET"), f.env, employee)).rejects.toMatchObject({ code: "owner_required" });
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_installation").get()).toEqual({ count: 0 });
  const core = await ownerCore(req("status", "GET"), f.env, owner);
  expect(f.sql.prepare("SELECT * FROM wong_access_installation").get()).toMatchObject({ slot: 1, installation_id: core.installationId,
    origin: site.origin, account_id: "", worker_id: site.workerId, access_app_id: site.accessAppId, access_policy_id: "",
    issuer: site.issuer, audience: site.audience, owner_subject: site.ownerSubject, owner_email: site.ownerEmail,
    policy_enabled: 0, revision: 1 });
  expect(await permissionsStarted(core)).toBe(false);
  expect(await permissionsStarted({ ...core, installationId: "unknown" })).toBe(false);
  const again = await ownerCore(req("status", "GET"), f.env, { ...owner, claims: { ...owner.claims, sub: "another-device" } });
  expect(again.installationId).toBe(core.installationId);
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
  const core = await ownerCore(req("status", "GET"), f.env, owner);
  expect(f.sql.prepare("SELECT installation_id FROM wong_access_installation").all()).toEqual([{ installation_id: core.installationId }]);
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_audit").get()).toEqual({ count: 1 });
});

it("uses durable bounded leases and a previous holder cannot release or acknowledge a successor", async () => {
  expect(await leaseCurrent(f.core)).toBe(false);
  const first = await lease(f.core); f.core.holder = first;
  expect(await leaseCurrent(f.core)).toBe(true);
  await expect(lease(f.core)).rejects.toMatchObject({ code: "retry_pending" });
  f.sql.exec("UPDATE wong_access_leases SET expires_at = '2000-01-01'");
  expect(await leaseCurrent(f.core)).toBe(false);
  const second = await lease(f.core);
  expect(second).not.toBe(first);
  await release(f.core, first);
  expect(await leaseCurrent(f.core)).toBe(false);
  f.core.holder = second;
  expect(await leaseCurrent(f.core)).toBe(true);
  await release(f.core, second);
  expect(await leaseCurrent(f.core)).toBe(false);
});

it("bounds JSON streams and cancels malformed, empty and oversized reads", async () => {
  expect(await boundedJson(Response.json({ ok: true }), 100)).toEqual({ ok: true });
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"a":')); controller.enqueue(new TextEncoder().encode('1}')); controller.close(); } });
  expect(await boundedJson(new Response(stream), 100)).toEqual({ a: 1 });
  await expect(boundedJson(new Response(null), 100)).rejects.toMatchObject({ code: "json_body_required" });
  await expect(boundedJson(new Response("x"), 100)).rejects.toMatchObject({ code: "json_body_invalid" });
  await expect(boundedJson(new Response(new Uint8Array([255])), 100)).rejects.toMatchObject({ code: "json_body_invalid" });
  await expect(boundedJson(new Response("12345"), 2)).rejects.toMatchObject({ code: "json_body_too_large" });
  expect(reply({ code: "safe" }).headers.get("Cache-Control")).toBe("no-store");
  expect(reply({ code: "safe" }, 409).status).toBe(409);
});

it("limits credentials to fixed provider destinations, refuses redirects and hides provider errors", async () => {
  const fetch = vi.fn(async () => Response.json({ ok: true })); vi.stubGlobal("fetch", fetch);
  expect(await provider("https://api.cloudflare.com/client/v4", "/app", "secret")).toEqual({ ok: true });
  await provider("https://api.cloudflare.com/client/v4", "/app", "secret", "POST", { safe: true });
  expect(fetch.mock.calls[1]).toMatchObject(["https://api.cloudflare.com/client/v4/app", { redirect: "error", body: '{"safe":true}' }]);
  for (const path of ["https://other.example.com", "//other.example.com", "/../secret"]) {
    await expect(provider("https://api.cloudflare.com/client/v4", path, "secret")).rejects.toMatchObject({ code: "provider_destination_invalid" });
  }
  for (const status of [302, 401, 404, 500]) {
    fetch.mockImplementationOnce(async () => new Response("secret diagnostics", { status }));
    await expect(provider("https://api.cloudflare.com/client/v4", "/app", "secret")).rejects.toMatchObject({ code: status === 404 ? "provider_not_found" : "provider_unavailable" });
  }
  fetch.mockImplementationOnce(async () => new Response(null, { status: 204 }));
  expect(await provider("https://api.cloudflare.com/client/v4", "/installation/token", "secret", "DELETE")).toBeNull();
  fetch.mockImplementationOnce(async () => new Response(" ".repeat(1_048_577)));
  await expect(provider("https://api.cloudflare.com/client/v4", "/app", "secret")).rejects.toMatchObject({ code: "json_body_too_large" });
});
