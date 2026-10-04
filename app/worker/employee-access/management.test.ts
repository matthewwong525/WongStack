import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fixture, owner, employee, pin, req } from "../../tests/employee-access/connections";
import { githubFixture } from "../../tests/employee-access/github";
import { management } from "./management";
import { prepare, rollout, enableEditing } from "./rollout";
import { catalogue } from "./apps";
import { mainRouteInventory } from "../api/router";
import { setupStatus } from "./setup";
import { handleAccess } from "./router";
import { lease } from "./core";
import { startGithub } from "./github-registration";
let f: ReturnType<typeof fixture>;
let g: Awaited<ReturnType<typeof githubFixture>>;
const plan = () => ({ version: 1, apps: [...catalogue], mainRoutes: mainRouteInventory(), people: [{ email: employee.id, apps: [], editing: true }] });
beforeEach(async () => { f = fixture(); g = await githubFixture(f); });
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); });
const run = (path: string, method = "POST", body?: unknown) => management(req(path, method, body), f.env, owner);

it("prepares only a privately reviewed catalogue, then requires reviewed grants and routes for rollout", async () => {
  await expect(prepare(f.core)).rejects.toMatchObject({ code: "private_rollout_required" });
  for (const changes of [{ apps: [] }, { mainRoutes: [] }]) {
    f.env.WONG_ACCESS_ROLLOUT = JSON.stringify({ ...plan(), ...changes });
    await expect(prepare(f.core)).rejects.toMatchObject({ code: "route_review_required" });
    await expect(rollout(f.core)).rejects.toMatchObject({ code: "route_review_required" });
  }
  f.env.WONG_ACCESS_ROLLOUT = JSON.stringify(plan());
  await prepare(f.core);
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_apps").get()!.count).toBeGreaterThanOrEqual(catalogue.length);
  f.env.WONG_ACCESS_POLICY = undefined;
  await expect(rollout(f.core)).rejects.toMatchObject({ code: "private_rollout_required" });
  f.env.WONG_ACCESS_POLICY = "on";
  f.env.WONG_ACCESS_ROLLOUT = JSON.stringify({ ...plan(), people: [] });
  await expect(rollout(f.core)).rejects.toMatchObject({ code: "grant_review_required" });
  f.env.WONG_ACCESS_ROLLOUT = JSON.stringify(plan());
  await rollout(f.core);
  expect(f.sql.prepare("SELECT policy_enabled FROM wong_access_installation").get()).toEqual({ policy_enabled: 1 });
  expect(f.sql.prepare("SELECT event FROM wong_access_audit").all()).toContainEqual({ event: "policy_enabled" });
});

it("enables editing only after current provider protection and policy independently pass", async () => {
  f.env.WONG_ACCESS_POLICY = undefined;
  await expect(enableEditing(f.core)).rejects.toMatchObject({ code: "private_rollout_required" });
  f.env.WONG_ACCESS_POLICY = "on";
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  await expect(enableEditing(f.core)).rejects.toMatchObject({ code: "private_rollout_required" });
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 1, issuance_enabled = 0");
  await enableEditing(f.core);
  expect(f.sql.prepare("SELECT issuance_enabled FROM wong_access_installation").get()).toEqual({ issuance_enabled: 1 });
  f.sql.exec("UPDATE wong_access_installation SET issuance_enabled = 0");
  g.responses.set("/repos/business/project/actions/secrets", { total_count: 1, secrets: [{ name: "PRODUCTION" }] });
  await expect(enableEditing(f.core)).rejects.toMatchObject({ code: "editing_connection_unavailable" });
  expect(f.sql.prepare("SELECT issuance_enabled FROM wong_access_installation").get()).toEqual({ issuance_enabled: 0 });
});

it("exposes finite owner operations, hides secrets, and keeps owner isolation before legacy policy activation", async () => {
  expect((await run("unknown", "GET")).status).toBe(404);
  expect((await run("status", "GET")).status).toBe(200);
  expect((await run("status", "PUT")).status).toBe(405);
  expect((await run("people", "GET")).status).toBe(404);
  expect((await run("people", "POST", { email: employee.id, apps: [], editing: false, removed: true })).status).toBe(200);
  f.env.WONG_ACCESS_POLICY = undefined;
  for (const path of ["people", "login/connect", "github/start", "github/check", "prepare", "rollout", "editing/enable", "retry"]) {
    expect((await management(req(path), f.env, employee)).status).toBe(403);
  }
  expect((await management(req("status", "GET"), { ...f.env, WONG_ENVIRONMENT: "staging" }, owner)).status).toBe(503);
  const status = await run("status", "GET");
  expect(await status.text()).not.toContain("PRIVATE KEY");
  expect((await run("login/connect")).status).toBe(503);
  expect((await run("retry")).status).toBe(200);
  expect((await run("github/start")).status).toBe(200);
  expect((await run("github/check")).status).toBe(200);
  f.env.WONG_ACCESS_ROLLOUT = JSON.stringify({ ...plan(), people: [] });
  expect((await run("prepare")).status).toBe(200);
  f.env.WONG_ACCESS_POLICY = "on";
  expect((await run("rollout")).status).toBe(200);
  expect((await run("editing/enable")).status).toBe(200);
  expect((await run("status")).status).toBe(404);
  expect((await management(req("token", "POST", {}), f.env, employee)).status).toBe(400);
  const bodyless = new Request(`${pin.origin}/api/access/people`, { method: "POST", headers: { Origin: pin.origin } });
  expect((await management(bodyless, f.env, owner)).status).toBe(400);
  f.core.holder = await lease(f.core);
  expect((await run("retry")).status).toBe(409);
});

it("returns safe error codes for malformed private configuration and failed storage", async () => {
  f.env.WONG_ACCESS_ROLLOUT = "private invalid record";
  expect(await (await run("prepare")).json()).toEqual({ code: "access_unavailable" });
  f.sql.exec("DROP TABLE wong_access_audit");
  expect((await run("people", "POST", { email: employee.id, apps: [], editing: false, removed: true })).status).toBe(503);
});

it("provides employee-specific authenticated setup without owner material or inventing local/memory readiness", async () => {
  const read = (identity = employee, bindings = f.env) => setupStatus(req("setup", "GET"), bindings, identity);
  expect(await (await read()).json()).toMatchObject({ api: "authenticated", project: { allowed: true, state: "available", localConnection: "not_established_by_this_readback" }, memory: "independent_operator_setup" });
  expect(await (await read(owner)).json()).toMatchObject({ project: { allowed: false, state: "not_assigned" } });
  f.sql.exec("UPDATE wong_access_connections SET status = 'blocked'");
  expect(await (await read()).json()).toMatchObject({ project: { allowed: true, state: "owner_setup_required" } });
  f.sql.exec("UPDATE wong_access_members SET project_editing = 0");
  expect(await (await read()).json()).toMatchObject({ project: { allowed: false, state: "not_assigned" } });
  f.sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await read()).status).toBe(403);
  expect((await read(employee, { ...f.env, WONG_ACCESS_POLICY: undefined })).status).toBe(403);
  expect((await setupStatus(req("setup"), f.env, employee)).status).toBe(405);
  f.sql.exec("UPDATE wong_access_members SET status = 'active'");
  expect((await handleAccess(req("setup", "GET"), f.env, employee)).status).toBe(200);
  // Identity readback keeps the pinned owner setup consumer working when the
  // newly enabled latch still sees the database's disabled employee policy.
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  expect((await handleAccess(req("identity", "GET"), f.env, owner)).status).toBe(200);
  expect((await handleAccess(req("status", "GET"), f.env, employee)).status).toBe(403);
});

it("handles owner callbacks through the finite router and cleans browser callback state", async () => {
  f.sql.exec("DELETE FROM wong_access_connections");
  const started = await startGithub(f.core), start = await started.json();
  const state = new URL(start.url).searchParams.get("state")!;
  const cookie = started.headers.get("Set-Cookie")!.split(";")[0];
  const registered = await management(req(`github/register?code=x&state=${state}`, "GET", undefined, { Cookie: cookie }), f.env, owner);
  expect(registered.status).toBe(303);
  const installState = new URL(registered.headers.get("Location")!).searchParams.get("state")!;
  const installed = await management(req(`github/install?installation_id=789&state=${installState}`, "GET", undefined, { Cookie: cookie }), f.env, owner);
  expect(installed.status).toBe(303);
  expect(installed.headers.get("Location")).toBe(`${pin.origin}/apps/access/?github=checked`);
});

it("reviews every member when rolling out a multi-person installation", async () => {
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, 'zeta@example.com', 'active', 0, 1, 'now')").run(pin.installationId);
  f.env.WONG_ACCESS_ROLLOUT = JSON.stringify({ ...plan(), people: [
    { email: "zeta@example.com", apps: [], editing: false }, ...plan().people,
  ] });
  await rollout(f.core);
  expect(f.sql.prepare("SELECT policy_enabled FROM wong_access_installation").get()).toEqual({ policy_enabled: 1 });
});

it("withholds setup readiness if its second primary read disappears or fails", async () => {
  for (const failed of [false, true]) {
    const session = f.env.DB.withSession("first-primary");
    const missing = { prepare: () => ({ bind: () => ({ first: async () => {
      if (failed) throw new Error("private storage diagnostic");
      return null;
    } }) }) } as unknown as D1DatabaseSession;
    const withSession = vi.spyOn(f.env.DB, "withSession");
    withSession.mockReturnValueOnce(session).mockReturnValueOnce(missing);
    expect(await (await setupStatus(req("setup", "GET"), f.env, employee)).json()).toEqual({ code: "setup_unavailable" });
    withSession.mockRestore();
  }
});
