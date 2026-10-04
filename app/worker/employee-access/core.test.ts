import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccessError, audit, lease, leaseCurrent, ownerCore, release, reply } from "./core";
import { decode, digest, encode, seal, unseal } from "./seal";
import { boundedJson } from "./json";
import { provider } from "./provider";
import { fixture, owner, employee, pin, req } from "./connections.test-support";
let f: ReturnType<typeof fixture>;
beforeEach(() => { f = fixture(); });
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("requires independently pinned production owner even with legacy routing or disabled policy", async () => {
  f.env.WONG_ACCESS_POLICY = undefined;
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  const core = await ownerCore(req("status", "GET"), f.env, owner);
  expect(core.email).toBe(pin.ownerEmail);
  await audit(core, "reviewed", 1);
  expect(f.sql.prepare("SELECT event FROM wong_access_audit").get()).toEqual({ event: "reviewed" });
  for (const identity of [null, employee, { ...owner, kind: "service" as const },
    { ...owner, claims: { ...owner.claims, sub: "other" } }]) {
    await expect(ownerCore(req("people"), f.env, identity)).rejects.toMatchObject({ code: "owner_required", status: 403 });
  }
  await expect(ownerCore(new Request(`${pin.origin}/api/access/people`, { method: "POST" }), f.env, owner))
    .rejects.toMatchObject({ code: "origin_required" });
  for (const overrides of [{ WONG_ENVIRONMENT: "staging" }, { WONG_ACCESS_ACTIVATION: undefined }, { WONG_ACCESS_ACTIVATION: "bad" },
    { CF_ACCESS_TEAM_DOMAIN: "foreign" }, { CF_ACCESS_AUD: "foreign" }, { CF_ACCESS_WORKER_ID: "foreign" },
    { CF_ACCESS_APP_ID: "foreign" }, { DB: undefined }]) {
    await expect(ownerCore(req("status", "GET"), { ...f.env, ...overrides } as typeof f.env, owner)).rejects.toBeInstanceOf(AccessError);
  }
  await expect(ownerCore(new Request("https://other.example.com/api/access/status"), f.env, owner)).rejects.toBeInstanceOf(AccessError);
  for (const column of ["installation_id", "origin", "owner_subject", "owner_email", "repository_name", "account_id", "access_app_id",
    "access_policy_id", "worker_id", "issuer", "audience"]) {
    const saved = f.sql.prepare(`SELECT ${column} value FROM wong_access_installation`).get()!.value;
    // Installation FK references retain the original IDs for this mismatch check.
    if (column === "installation_id") f.sql.exec("PRAGMA foreign_keys = OFF");
    f.sql.prepare(`UPDATE wong_access_installation SET ${column} = 'foreign'`).run();
    await expect(ownerCore(req("status", "GET"), f.env, owner)).rejects.toMatchObject({ code: "installation_mismatch" });
    f.sql.prepare(`UPDATE wong_access_installation SET ${column} = ?`).run(saved);
  }
  f.sql.exec("UPDATE wong_access_installation SET repository_id = 456");
  await expect(ownerCore(req("status", "GET"), f.env, owner)).rejects.toMatchObject({ code: "installation_mismatch" });
  f.sql.exec("DELETE FROM wong_access_installation");
  await expect(ownerCore(req("status", "GET"), f.env, owner)).rejects.toMatchObject({ code: "installation_mismatch" });
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

it("authenticates sealed material, its purpose, and its installation without diagnostics", async () => {
  const value = await seal("private-token", f.env.WONG_ACCESS_SEAL_KEY, "installation:receipt");
  expect(value).not.toContain("private-token");
  expect(await unseal(value, f.env.WONG_ACCESS_SEAL_KEY, "installation:receipt")).toBe("private-token");
  await expect(unseal(value, f.env.WONG_ACCESS_SEAL_KEY, "other:receipt")).rejects.toThrow();
  await expect(unseal("invalid", f.env.WONG_ACCESS_SEAL_KEY, "x")).rejects.toMatchObject({ code: "private_material_invalid" });
  for (const secret of [undefined, encode(new Uint8Array(3)), "!"]) await expect(seal("s", secret, "x")).rejects.toThrow();
  expect(encode(decode("-_8"))).toBe("-_8");
  expect(await digest("state")).toBe(await digest("state"));
  expect(await digest("state")).not.toBe(await digest("other"));
  expect(reply({ code: "safe" }).headers.get("Cache-Control")).toBe("no-store");
});

it("bounds JSON streams and cancels malformed, empty and oversized reads", async () => {
  expect(await boundedJson(Response.json({ ok: true }), 100)).toEqual({ ok: true });
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"a":')); controller.enqueue(new TextEncoder().encode('1}')); controller.close(); } });
  expect(await boundedJson(new Response(stream), 100)).toEqual({ a: 1 });
  await expect(boundedJson(new Response(null), 100)).rejects.toMatchObject({ code: "json_body_required" });
  await expect(boundedJson(new Response("x"), 100)).rejects.toMatchObject({ code: "json_body_invalid" });
  await expect(boundedJson(new Response(new Uint8Array([255])), 100)).rejects.toMatchObject({ code: "json_body_invalid" });
  await expect(boundedJson(new Response("12345"), 2)).rejects.toMatchObject({ code: "json_body_too_large" });
});

it("limits credentials to fixed provider destinations, refuses redirects and hides provider errors", async () => {
  const fetch = vi.fn(async () => Response.json({ ok: true })); vi.stubGlobal("fetch", fetch);
  expect(await provider("https://api.github.com", "/app", "secret")).toEqual({ ok: true });
  await provider("https://api.github.com", "/app", "secret", "POST", { safe: true });
  expect(fetch.mock.calls[1]).toMatchObject(["https://api.github.com/app", { redirect: "error", body: '{"safe":true}' }]);
  for (const path of ["https://other.example.com", "//other.example.com", "/../secret"]) {
    await expect(provider("https://api.github.com", path, "secret")).rejects.toMatchObject({ code: "provider_destination_invalid" });
  }
  for (const status of [302, 401, 404, 500]) {
    fetch.mockImplementationOnce(async () => new Response("secret diagnostics", { status }));
    await expect(provider("https://api.github.com", "/app", "secret")).rejects.toMatchObject({ code: status === 404 ? "provider_not_found" : "provider_unavailable" });
  }
  fetch.mockImplementationOnce(async () => new Response(null, { status: 204 }));
  expect(await provider("https://api.github.com", "/installation/token", "secret", "DELETE")).toBeNull();
  fetch.mockImplementationOnce(async () => new Response(" ".repeat(1_048_577)));
  await expect(provider("https://api.github.com", "/app", "secret")).rejects.toMatchObject({ code: "json_body_too_large" });
});
