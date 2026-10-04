import { createPrivateKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { appJwt, appPermissions, checkGithubConnection, createRepositoryToken, editorPermissions, githubMaterial, saveGithub, verifyGithub } from "./github";
import { fixture, pin, req, privateKey } from "../../tests/employee-access/connections";
import { githubFixture } from "../../tests/employee-access/github";
import { startGithub, registerGithub, installGithub } from "./github-registration";
import { management } from "./management";
import { owner, employee } from "../../tests/employee-access/connections";
let f: ReturnType<typeof fixture>;
let g: Awaited<ReturnType<typeof githubFixture>>;
beforeEach(async () => { f = fixture(); g = await githubFixture(f); });
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); });

it("inspects a WongStack-shaped read-only test and owner-approved preview/publication boundary", async () => {
  await verifyGithub(f.core, g.app);
  expect(await githubMaterial(f.core)).toEqual(g.app);
  await checkGithubConnection(f.core);
  expect(f.sql.prepare("SELECT status, detail FROM wong_access_connections").get()).toMatchObject({ status: "ready" });
  const created = await createRepositoryToken(f.core, g.app, editorPermissions);
  expect(created.token).toBe("employee-private-token");
  const calls = g.fetch.mock.calls.filter(([url]) => url.endsWith("/access_tokens"));
  expect(JSON.parse(String(calls.at(-1)![1].body))).toEqual({ repository_ids: [123], permissions: editorPermissions });
  expect(editorPermissions).not.toHaveProperty("secrets"); expect(editorPermissions).not.toHaveProperty("environments");
  expect(editorPermissions).not.toHaveProperty("administration");
  expect(appPermissions).toMatchObject({ secrets: "read", environments: "read", administration: "read" });
  expect(g.fetch.mock.calls.some(([url, init]) => url.endsWith("/installation/token") && init.method === "DELETE")).toBe(true);
});

it("blocks foreign, suspended, excessive-permission and unapproved installations", async () => {
  const path = "/app/installations/789", original = g.responses.get(path) as object;
  for (const changes of [{ id: 900 }, { app_id: 900 }, { suspended_at: "now" }, { repository_selection: "all" },
    { permissions: { ...appPermissions, workflows: "write" } }, { permissions: {} }]) {
    g.responses.set(path, { ...original, ...changes });
    await expect(verifyGithub(f.core, g.app)).rejects.toThrow();
  }
  g.responses.set(path, original);
  g.responses.set("/app", { id: 900, owner: { id: 77, type: "Organization" } });
  await expect(verifyGithub(f.core, g.app)).rejects.toMatchObject({ code: "github_installation_mismatch" });
  for (const action of [() => verifyGithub(f.core, { ...g.app, installationId: undefined }),
    () => createRepositoryToken(f.core, { ...g.app, installationId: undefined }, editorPermissions)]) {
    await expect(action()).rejects.toMatchObject({ code: "github_approval_pending" });
  }
  f.sql.exec("DELETE FROM wong_access_connections");
  await expect(githubMaterial(f.core)).rejects.toMatchObject({ code: "github_owner_setup_required" });
});

it("refuses unsafe default branch, inherited rules, repository identity and real current deployment configuration", async () => {
  const repo = g.responses.get("/repos/business/project") as object;
  for (const changes of [{ id: 900 }, { full_name: "other/repo" }, { has_pages: true }]) {
    g.responses.set("/repos/business/project", { ...repo, ...changes });
    await expect(verifyGithub(f.core, g.app)).rejects.toThrow();
  }
  g.responses.set("/repos/business/project", repo);
  const protection = g.responses.get("/repos/business/project/branches/main/protection") as object;
  g.responses.set("/repos/business/project/branches/main/protection", { ...protection, restrictions: { apps: [{ id: g.app.appId }], users: [], teams: [] } });
  await expect(verifyGithub(f.core, g.app)).rejects.toMatchObject({ code: "publication_boundary_unverified" });
  g.responses.set("/repos/business/project/branches/main/protection", protection);
  g.responses.set("/repos/business/project/rules/branches/main", [{ type: "update" }]);
  await expect(verifyGithub(f.core, g.app)).rejects.toMatchObject({ code: "publication_rules_review_required" });
  g.responses.set("/repos/business/project/rules/branches/main", []);
  const file = g.responses.get("/repos/business/project/contents/.github/workflows/deploy.yml") as object;
  g.responses.set("/repos/business/project/contents/.github/workflows/deploy.yml", { ...file,
    content: Buffer.from(readFileSync(new URL("../../../.github/workflows/deploy.yml", import.meta.url), "utf8")).toString("base64") });
  await expect(verifyGithub(f.core, g.app)).rejects.toMatchObject({ code: "publication_job_unguarded" });
  await checkGithubConnection(f.core);
  expect(f.sql.prepare("SELECT status FROM wong_access_connections").get()).toEqual({ status: "blocked" });
  g.fetch.mockImplementationOnce(async () => Response.json({ malformed: true }));
  await checkGithubConnection(f.core);
  expect(f.sql.prepare("SELECT detail FROM wong_access_connections").get()).toEqual({ detail: "github_inspection_unavailable" });
});

it("validates scope and expiry readback and revokes refused employee tokens", async () => {
  for (const update of [{ repositories: [] }, { repositories: [{ id: 900 }] }, { repositories: [{ id: 123 }, { id: 900 }] },
    { permissions: { ...editorPermissions, secrets: "read" } }, { permissions: {} },
    { expires_at: "2000-01-01T00:00:00Z" }, { expires_at: new Date(Date.now() + 4_000_000).toISOString() }]) {
    g.fetch.mockImplementationOnce(async () => Response.json({ token: "refused-token", expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      repositories: [{ id: 123 }], permissions: editorPermissions, ...update }));
    await expect(createRepositoryToken(f.core, g.app, editorPermissions)).rejects.toMatchObject({ code: "github_token_scope_invalid" });
  }
  g.fetch.mockImplementationOnce(async () => Response.json({ token: "ok", expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    repositories: [{ id: 123 }], permissions: { ...editorPermissions, metadata: "read" } }));
  expect((await createRepositoryToken(f.core, g.app, editorPermissions)).token).toBe("ok");
});

it("supports GitHub PKCS1/PKCS8 private keys and JWT expiry without exposing a private key", async () => {
  const pkcs1 = createPrivateKey(await privateKey()).export({ type: "pkcs1", format: "pem" }).toString();
  const jwt = await appJwt({ ...g.app, privateKey: pkcs1 });
  const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
  expect(claims.iss).toBe(String(g.app.appId)); expect(claims.exp - claims.iat).toBe(600);
  for (const count of [3, 150]) {
    await expect(appJwt({ ...g.app, privateKey: `-----BEGIN RSA PRIVATE KEY-----\n${btoa("x".repeat(count))}\n-----END RSA PRIVATE KEY-----` })).rejects.toThrow();
  }
});

async function attempt() {
  f.sql.exec("DELETE FROM wong_access_connections");
  const result = await startGithub(f.core), value = await result.json();
  const state = new URL(value.url).searchParams.get("state")!;
  const cookie = result.headers.get("Set-Cookie")!.split(";")[0];
  return { state, cookie, result, value };
}
it("binds manifest and install callbacks to current owner, one-use state and HttpOnly browser nonce", async () => {
  const a = await attempt();
  expect(a.result.headers.get("Set-Cookie")).toContain("Secure; HttpOnly; SameSite=Lax");
  expect(a.value.kind).toBe("register");
  expect(a.value.url).toContain("https://github.com/organizations/business/settings/apps/new");
  expect(a.value.manifest).toMatchObject({ setup_url: `${pin.origin}/api/access/github/install`,
    redirect_url: `${pin.origin}/api/access/github/register`, hook_attributes: { active: false } });
  const registered = await registerGithub(f.core, req(`github/register?code=registration&state=${a.state}`, "GET", undefined, { Cookie: a.cookie }));
  const value = { url: registered.headers.get("Location")! };
  expect(JSON.stringify(value)).not.toContain("PRIVATE KEY");
  expect(value.url).toMatch(/^https:\/\/github.com\/apps\/business-assistant\/installations\/new\?state=/);
  const state = new URL(value.url).searchParams.get("state")!;
  await expect(registerGithub(f.core, req(`github/register?code=registration&state=${a.state}`, "GET", undefined, { Cookie: a.cookie }))).rejects.toThrow();
  const installed = await installGithub(f.core, req(`github/install?installation_id=789&state=${state}`, "GET", undefined, { Cookie: a.cookie }));
  expect(installed.headers.get("Set-Cookie")).toContain("Max-Age=0");
  expect(f.sql.prepare("SELECT status FROM wong_access_connections").get()).toEqual({ status: "ready" });
  await expect(installGithub(f.core, req(`github/install?installation_id=789&state=${state}`, "GET", undefined, { Cookie: a.cookie }))).rejects.toThrow();
});

it("rejects missing, stale, wrong-owner and cross-site registration without converting a manifest", async () => {
  for (const code of [undefined, "../foreign", ""]) {
    await expect(registerGithub(f.core, req(`github/register${code === undefined ? "" : `?code=${code}`}`, "GET"))).rejects.toThrow();
  }
  const a = await attempt();
  for (const [state, cookie] of [[a.state, ""], ["wrong", a.cookie], [a.state, "__Host-wong-github=foreign"]]) {
    await expect(registerGithub(f.core, req(`github/register?code=x&state=${state}`, "GET", undefined, { Cookie: cookie }))).rejects.toThrow();
  }
  expect((await management(req(`github/register?code=x&state=${a.state}`, "GET", undefined, { Cookie: a.cookie }), f.env, employee)).status).toBe(403);
  expect((await management(req(`github/register?code=x&state=${a.state}`, "GET", undefined, { Cookie: a.cookie }), { ...f.env, WONG_ENVIRONMENT: "staging" }, owner)).status).toBe(503);
  f.sql.exec("UPDATE wong_access_attempts SET expires_at = '2000-01-01'");
  await expect(registerGithub(f.core, req(`github/register?code=x&state=${a.state}`, "GET", undefined, { Cookie: a.cookie }))).rejects.toMatchObject({ code: "github_attempt_expired" });
});

it("reports organization approval pending and rejects invalid installation/manifest permission replies", async () => {
  for (const action of ["request", "invalid", "bad-permission", "missing-permission"]) {
    const a = await attempt();
    if (action.endsWith("permission")) {
      g.fetch.mockImplementationOnce(async () => Response.json({ id: 456, slug: "business-assistant", pem: g.app.privateKey,
        permissions: action === "bad-permission" ? { ...appPermissions, workflows: "write" } : {} }));
      await expect(registerGithub(f.core, req(`github/register?code=x&state=${a.state}`, "GET", undefined, { Cookie: a.cookie })))
        .rejects.toMatchObject({ code: "github_permissions_invalid" });
      continue;
    }
    const result = await registerGithub(f.core, req(`github/register?code=x&state=${a.state}`, "GET", undefined, { Cookie: a.cookie }));
    const state = new URL(result.headers.get("Location")!).searchParams.get("state")!;
    const request = req(`github/install?setup_action=${action}&installation_id=invalid&state=${state}`, "GET", undefined, { Cookie: a.cookie });
    if (action === "request") expect((await installGithub(f.core, request)).headers.get("Location")).toContain("github=pending");
    else await expect(installGithub(f.core, request)).rejects.toMatchObject({ code: "github_installation_invalid" });
  }
  await saveGithub(f.core, { ...g.app, installationId: undefined }, "pending", "pending");
});

it("resumes a sealed organization App with a fresh install attempt after pending approval", async () => {
  const a = await attempt();
  const registered = await registerGithub(f.core, req(`github/register?code=x&state=${a.state}`, "GET", undefined, { Cookie: a.cookie }));
  const state = new URL(registered.headers.get("Location")!).searchParams.get("state")!;
  expect((await installGithub(f.core, req(`github/install?setup_action=request&state=${state}`, "GET", undefined, { Cookie: a.cookie }))).status).toBe(303);
  const calls = g.fetch.mock.calls.length;
  const resumed = await startGithub(f.core), value = await resumed.json();
  expect(value.kind).toBe("install"); expect(value).not.toHaveProperty("manifest");
  expect(g.fetch.mock.calls).toHaveLength(calls);
  const cookie = resumed.headers.get("Set-Cookie")!.split(";")[0];
  const resumedState = new URL(value.url).searchParams.get("state")!;
  const result = await installGithub(f.core, req(`github/install?installation_id=789&state=${resumedState}`, "GET", undefined, { Cookie: cookie }));
  expect(result.headers.get("Location")).toContain("github=checked");
  expect(result.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(f.sql.prepare("SELECT status FROM wong_access_connections").get()).toEqual({ status: "ready" });
});

it("keeps account registration and unpublished protection review independent", async () => {
  const review = JSON.parse(f.env.WONG_GITHUB_PUBLICATION!);
  f.env.WONG_GITHUB_PUBLICATION = JSON.stringify({ ...review, repositoryOwnerType: "User", repositoryOwnerId: 99 });
  const personal = await attempt();
  const value = personal.value;
  expect(new URL(value.url).pathname).toBe("/settings/apps/new");
  expect(value.manifest).toMatchObject({ setup_url: `${pin.origin}/api/access/github/install`, hook_attributes: { active: false } });
  f.env.WONG_GITHUB_PUBLICATION = undefined;
  await expect(startGithub(f.core)).rejects.toMatchObject({ code: "publication_review_required" });
});

it("refuses an App owned by a different account and unexpected metadata write authority", async () => {
  g.responses.set("/app", { id: g.app.appId, owner: { id: 900, type: "Organization" } });
  await expect(verifyGithub(f.core, g.app)).rejects.toMatchObject({ code: "github_owner_mismatch" });
  const a = await attempt();
  g.fetch.mockImplementationOnce(async () => Response.json({ id: 456, slug: "business-assistant", pem: g.app.privateKey,
    permissions: { ...appPermissions, metadata: "write" } }));
  await expect(registerGithub(f.core, req(`github/register?code=x&state=${a.state}`, "GET", undefined, { Cookie: a.cookie })))
    .rejects.toMatchObject({ code: "github_permissions_invalid" });
});
