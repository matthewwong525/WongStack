import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "../../.agents/skills/memory/worker/memory-worker.mjs";
import type { AppHandler } from "./apps/index";
import worker from "./index";
import { body } from "../tests/body";
import { fakeEnv } from "../tests/env";
import { jwk, signingPair } from "../tests/signing";

// Hello's routes, plus one that reports which bindings a mini app's handler is handed.
vi.mock("./apps/hello/api.ts", async (original) => {
  const { routes } = await original<{ routes: Map<string, AppHandler> }>();
  // The registry reads each app's `keys`; the supplied example lists none.
  return { keys: undefined, routes: new Map(routes).set("GET peek", (_request, appEnv) => Response.json({ env: Object.keys(appEnv).sort() })) };
});

const refreshOnSchedule = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("./employee-access/pushers.ts", async (original) => ({ ...await original<object>(), refreshOnSchedule }));

const TEAM = "routing-team.cloudflareaccess.com";
const AUD = "routing-workspace";
/** A refresh the Worker hands off after answering; these routes start none worth awaiting. */
const context = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;
const ASSET_PATHS = ["/", "/index.html", "/assets/main.js", "/assets/index.css", "/apps/hello/", "/apps/hello/app.js", "/unknown/path"];

describe("private Worker routing", () => {
  let signing: CryptoKeyPair;
  let publicKey: JsonWebKey;
  const assets = { fetch: vi.fn(async () => new Response("asset")) };
  const env = { ASSETS: assets, CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD };
  const call = (path: string, headers: Record<string, string> = {}, bindings: object = env, method = "GET") => worker.fetch(
    new Request(`https://workspace.example.com${path}`, { headers, method }), fakeEnv(bindings), context,
  );
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  async function token(claims: Record<string, unknown> = { email: "human@example.com" }) {
    const input = `${encode({ kid: "routing-key", alg: "RS256" })}.${encode({ aud: AUD, iss: `https://${TEAM}`, exp: Math.floor(Date.now() / 1000) + 600, ...claims })}`;
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signing.privateKey, new TextEncoder().encode(input));
    return `${input}.${Buffer.from(signature).toString("base64url")}`;
  }
  beforeAll(async () => {
    signing = await signingPair();
    publicKey = await jwk(signing.publicKey);
  });
  beforeEach(() => {
    assets.fetch.mockClear();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ keys: [{ ...publicKey, kid: "routing-key" }] })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("denies anonymous and forged identity headers before every protected entry point", async () => {
    for (const path of [...ASSET_PATHS, "/api/health", "/api/nothing", "/api/access/apps", "/api/actions", "/api/openapi.json", "/apps/hello/api/health"]) {
      expect((await call(path)).status, path).toBe(401);
      expect((await call(path, { "Cf-Access-Authenticated-User-Email": "owner@example.com" })).status, path).toBe(401);
    }
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("asks an unsigned git call for the sign-in as a password, and passes a signed one on to the project's own checks", async () => {
    const refs = "/api/access/code/git/info/refs?service=git-upload-pack";
    for (const headers of [{}, { Authorization: `Basic ${btoa("x-access:not-a-sign-in")}` }] as Record<string, string>[]) {
      const asked = await call(refs, headers);
      expect([asked.status, asked.headers.get("WWW-Authenticate"), asked.headers.get("Content-Type")]).toEqual([401, 'Basic realm="company app"', "text/plain; charset=utf-8"]);
      expect(await asked.text()).toBe("Sign in to the company app again, then retry: cloudflared access login https://workspace.example.com\n");
    }
    // Every other address keeps its plain refusal, and an app with no Access set up stays unavailable.
    expect((await call("/api/access/apps")).headers.get("WWW-Authenticate")).toBeNull();
    expect((await call(refs, {}, { ASSETS: assets })).status).toBe(503);
    // A signed password gets past the sign-in to Project code's own check, which answers here with no store.
    const signed = await call(refs, { Authorization: `Basic ${btoa(`x-access:${await token()}`)}` });
    expect(signed.status).not.toBe(401);
  });
  it("keeps missing app configuration unavailable, including its static assets", async () => {
    for (const path of ASSET_PATHS) expect((await call(path, {}, { ASSETS: assets })).status).toBe(503);
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("serves an open workspace without login only while no Access identifier is set", async () => {
    const open = { ASSETS: assets, WORKSPACE_LOGIN: "off" };
    for (const path of ASSET_PATHS) expect((await call(path, {}, open)).status, path).toBe(200);
    expect(await (await call("/api/health", {}, open)).json()).toEqual({ ok: true });
    expect((await call("/_memory/unknown", {}, { ...open, MEMORY_DB: {} })).status).toBe(401);
    for (const path of ["/api/actions", "/api/openapi.json"]) expect((await call(path, {}, open)).status).toBe(401);
    expect(assets.fetch).toHaveBeenCalledTimes(ASSET_PATHS.length);
  });
  it("ignores a stale open switch once Access identifiers are set", async () => {
    const stale = { ...env, WORKSPACE_LOGIN: "off" };
    for (const path of [...ASSET_PATHS, "/api/health"]) expect((await call(path, {}, stale)).status, path).toBe(401);
    const onlyTeam = { ASSETS: assets, WORKSPACE_LOGIN: "off", CF_ACCESS_TEAM_DOMAIN: TEAM };
    expect((await call("/", {}, onlyTeam)).status).toBe(503);
    for (const value of ["on", "OFF", ""]) {
      expect((await call("/", {}, { ASSETS: assets, WORKSPACE_LOGIN: value })).status, value).toBe(503);
    }
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("serves pages, scripts, styles, mini-app assets and unknown SPA routes to signed humans and services", async () => {
    for (const claims of [{ email: "human@example.com" }, { common_name: "service-client", sub: "" }]) {
      const assertion = await token(claims);
      for (const path of ASSET_PATHS) {
        const response = await call(path, { "Cf-Access-Jwt-Assertion": assertion });
        expect(response.status, path).toBe(200);
        expect(await response.text()).toBe("asset");
      }
    }
    expect(assets.fetch).toHaveBeenCalledTimes(ASSET_PATHS.length * 2);
  });
  it("dispatches APIs only after a verified assertion", async () => {
    const headers = { "Cf-Access-Jwt-Assertion": await token() };
    const health = await call("/api/health", headers);
    expect(await health.json()).toEqual({ ok: true });
    const unknown = await call("/api/nothing", headers);
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ error: "Not found" });
    expect((await call("/api/access/unknown", headers)).status).toBe(404);
    expect(await (await call("/api/access/apps", headers)).json()).toEqual({ state: "legacy", signIn: true, code: "off" });
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("keeps people management behind a signed owner session, with no private pin", async () => {
    const ownerEmail = "owner@example.com";
    const origin = "https://workspace.example.com";
    const first = vi.fn(async () => { throw new Error("private database detail"); });
    const db = { withSession: vi.fn(() => ({ prepare: () => ({ first, bind: () => ({ first }) }) })) };
    const bindings = { ...env, WONG_ENVIRONMENT: "production", WONG_OWNER_EMAIL: ownerEmail, DB: db };
    for (const [endpoint, method] of [["/api/access/status", "GET"], ["/api/access/people", "POST"], ["/api/access/retry", "POST"]]) {
      expect((await call(endpoint, { Origin: origin }, bindings, method)).status).toBe(401);
      // A machine, and the owner's email with no signed user id, manage nobody, and nothing is read for them.
      for (const claims of [{ common_name: "service-client", sub: "" }, { email: ownerEmail }]) {
        expect((await call(endpoint, { Origin: origin, "Cf-Access-Jwt-Assertion": await token(claims) }, bindings, method)).status).toBe(403);
      }
    }
    const signed = await token({ email: ownerEmail, sub: "any-signed-subject" });
    const [header, , signature] = signed.split(".");
    const forged = `${header}.${encode({ email: ownerEmail, sub: "any-signed-subject" })}.${signature}`;
    expect((await call("/api/access/status", { "Cf-Access-Jwt-Assertion": forged }, bindings)).status).toBe(401);
    expect(db.withSession).not.toHaveBeenCalled();
    // A signed-in visitor could be an Admin, so the database decides: unreadable, they are refused with no detail.
    const visitor = await token({ email: "visitor@example.com", sub: "visitor" });
    for (const [endpoint, method] of [["/api/access/status", "GET"], ["/api/access/people", "POST"], ["/api/access/retry", "POST"]]) {
      const refused = await call(endpoint, { Origin: origin, "Cf-Access-Jwt-Assertion": visitor }, bindings, method);
      expect([refused.status, await refused.json()], endpoint).toEqual([503, { code: "access_unavailable" }]);
    }
    expect(db.withSession).toHaveBeenCalledTimes(3);
    // The recorded owner reaches the database; its failure is reported with no detail.
    const reached = await call("/api/access/status", { "Cf-Access-Jwt-Assertion": signed }, bindings);
    expect(reached.status).toBe(503);
    expect(await reached.json()).toEqual({ code: "access_unavailable" });
    expect(db.withSession).toHaveBeenCalledWith("first-primary");
    for (const path of ["/api/access/activate", "/api/access/identity"]) {
      expect((await call(path, { "Cf-Access-Jwt-Assertion": signed }, bindings)).status).toBe(404);
    }
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("accepts signed employee discovery and rejects forged, expired and wrong-audience assertions", async () => {
    const signed = await token();
    const accepted = await call("/api/actions", { "Cf-Access-Jwt-Assertion": signed });
    expect(accepted.status).toBe(200);
    // The supplied actions are among them: a build may hold other folders too.
    expect((await body(accepted)).actions.map(a => a.operationId)).toEqual(expect.arrayContaining(["hello.greeting", "main.health"]));
    // The services list answers a signed person.
    const person = { "Cf-Access-Jwt-Assertion": await token({ email: "human@example.com", sub: "human" }) };
    expect((await call("/api/services", person)).status).toBe(200);
    const [header, , signature] = signed.split(".");
    const forged = `${header}.${encode({ email: "admin@example.com" })}.${signature}`;
    for (const assertion of [forged, await token({ email: "human@example.com", exp: 1 }), await token({ email: "human@example.com", aud: "wrong" })]) {
      expect((await call("/api/openapi.json", { "Cf-Access-Jwt-Assertion": assertion })).status).toBe(401);
    }
  });
  it("routes each kind of address to its owner, for GET and POST", async () => {
    const headers = { "Cf-Access-Jwt-Assertion": await token() };
    const memoryEnv = { ...env, MEMORY_DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } };
    const answers: Record<string, unknown[]> = {};
    for (const method of ["GET", "POST"]) {
      for (const path of ["/", "/apps/", "/apps/hello/", "/apps/hello/api/greeting", "/apps/hello/api.mjs", "/api/health", "/_memory/"]) {
        const response = await call(path, headers, memoryEnv, method);
        const type = response.headers.get("Content-Type") ?? "";
        const body = type.includes("json") ? await response.json() : await response.text();
        (answers[path] ??= []).push(response.status, response.headers.get("Location") ?? body);
      }
    }
    expect(answers).toEqual({
      "/": [200, "asset", 200, "asset"],
      "/apps/": [302, "https://workspace.example.com/", 302, "https://workspace.example.com/"],
      "/apps/hello/": [200, "asset", 200, "asset"],
      "/apps/hello/api/greeting": [200, { message: "Hello, world!" }, 404, { error: "Not found" }],
      // An old source path gets the single-page app's page, never the file.
      "/apps/hello/api.mjs": [200, "asset", 200, "asset"],
      "/api/health": [200, { ok: true }, 404, { error: "Not found" }],
      "/_memory/": [401, expect.objectContaining({ errors: [expect.objectContaining({ code: 10000 })] }), 401, expect.objectContaining({ errors: [expect.objectContaining({ code: 10000 })] })],
    });
    expect(assets.fetch).toHaveBeenCalledTimes(6);
  });
  it("serves a check's kept pictures only behind the login, from a bucket no mini app is handed", async () => {
    const picture = "/_walk/abc1234/20261003T140000Z/empty-title/03-after.png";
    const get = vi.fn(async () => ({ body: new Blob(["png"]).stream() }));
    const walkEnv = { ...env, MEMORY_BUCKET: { get }, WONG_ACCESS_LOGIN_MANAGEMENT: "private-sign-in-key" };
    expect((await call(picture, {}, walkEnv)).status).toBe(401);
    const open = { ASSETS: assets, WORKSPACE_LOGIN: "off", MEMORY_BUCKET: { get } };
    expect((await call(picture, {}, open)).status).toBe(404);
    expect(get).not.toHaveBeenCalled();

    const headers = { "Cf-Access-Jwt-Assertion": await token() };
    const shown = await call(picture, headers, walkEnv);
    expect(shown.status).toBe(200);
    expect(shown.headers.get("Content-Type")).toBe("image/png");
    expect(await shown.text()).toBe("png");
    expect(get).toHaveBeenCalledWith("walks/abc1234/20261003T140000Z/empty-title/03-after.png");
    expect(await (await call("/_walk/sessions/owner@example.com/chat.jsonl", headers, walkEnv)).text()).toBe("Not found");
    expect(get).toHaveBeenCalledTimes(1);

    const peek = await call("/apps/hello/api/peek", headers, walkEnv);
    expect(await peek.json()).toEqual({ env: ["ASSETS", "CF_ACCESS_AUD", "CF_ACCESS_TEAM_DOMAIN"] });
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("denies wrong-audience and tampered signatures at the origin", async () => {
    const wrong = await token({ email: "human@example.com", aud: "another-workspace" });
    const valid = await token();
    const [header, , signature] = valid.split(".");
    const forged = `${header}.${encode({ email: "admin@example.com" })}.${signature}`;
    for (const assertion of [wrong, forged]) expect((await call("/assets/main.js", { "Cf-Access-Jwt-Assertion": assertion })).status).toBe(401);
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("keeps memory independently key-authenticated and unavailable on staging", async () => {
    const absent = await call("/_memory/accounts/a/d1/database/d/query");
    expect(absent.status).toBe(404);
    expect(await absent.json()).toMatchObject({ errors: [{ code: "no_store" }] });
    const validHash = await hashKey("wongm_test-memory-key");
    const memoryDb = {
      prepare: () => ({ bind: (hash: string) => ({ first: async () => hash === validHash ? { email: "owner@example.com", role: "admin", expires_at: null, machine_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } : null }) }),
    };
    // The open-site key works only while the app has no sign-in; on a private app it is refused like any other.
    const openEnv = { ASSETS: assets, WORKSPACE_LOGIN: "off", MEMORY_DB: memoryDb };
    for (const key of [undefined, "wongm_wrong-key", "wongm_test-memory-key"]) {
      const response = await call("/_memory/unknown", key ? { Authorization: `Bearer ${key}` } : {}, openEnv);
      expect(response.status).toBe(key === "wongm_test-memory-key" ? 404 : 401);
      expect(await response.json()).toMatchObject({ errors: [{ code: key === "wongm_test-memory-key" ? "no_route" : 10000 }] });
    }
    const refused = await call("/_memory/unknown", { Authorization: "Bearer wongm_test-memory-key" }, { ...env, MEMORY_DB: memoryDb });
    expect(refused.status).toBe(401);
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("serves the setup file with no sign-in and no memory store, and leaves every other memory address to memory", async () => {
    const memory = vi.fn();
    // Anonymous, on a private app, one with no Access set up, or an open one: the file, carrying the address asked.
    for (const bindings of [env, { ASSETS: assets }, { ASSETS: assets, WORKSPACE_LOGIN: "off" }, { ...env, MEMORY_DB: { prepare: memory } }]) {
      const served = await call("/_memory/setup.mjs", {}, bindings);
      expect([served.status, served.headers.get("Content-Type"), served.headers.get("Cache-Control")]).toEqual([200, "text/javascript; charset=utf-8", "no-store"]);
      expect(await served.text()).toContain('const SERVED_FROM = "https://workspace.example.com";');
    }
    expect((await call("/_memory/setup.mjs", {}, env, "POST")).status).toBe(405);
    expect(memory).not.toHaveBeenCalled();
    // A neighbouring address is memory's, and still needs a memory key.
    for (const path of ["/_memory/setup.mjs/", "/_memory/setup", "/_memory/setup.mjsx"]) expect((await call(path, {}, { ...env, MEMORY_DB: {} })).status, path).toBe(401);
    expect((await call("/setup.mjs")).status).toBe(401);
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("checks current grants and self-service membership after signed login on every request", async () => {
    const row = { policy_enabled: 1, keys_enabled: 0, revision: 1, status: "active", held: null, apps: '["hello"]', keys: "{}" };
    const first = vi.fn(async () => row);
    const db = { withSession: vi.fn(() => ({ prepare: () => ({ bind: () => ({ first }) }) })) };
    const bindings = { ...env, WONG_ENVIRONMENT: "production", WONG_OWNER_EMAIL: "owner@example.com", DB: db };
    const headers = { "Cf-Access-Jwt-Assertion": await token({ email: "human@example.com", sub: "employee" }) };
    expect((await call("/apps/hello/api/greeting", headers, bindings)).status).toBe(200);
    expect(await (await call("/api/access/apps", headers, bindings)).json())
      .toEqual({ state: "current", role: "employee", manages: false, signIn: true, code: "off", revision: 1, apps: ["access", "hello"], keys: [] });
    for (const path of ["/apps/hello/", "/apps/hello/subpage", "/apps/access/"]) expect((await call(path, headers, bindings)).status).toBe(200);
    row.apps = "[]";
    row.revision = 2;
    for (const path of ["/apps/hello/", "/apps/hello/subpage"]) expect((await call(path, headers, bindings)).status).toBe(403);
    expect((await call("/apps/access/", headers, bindings)).status).toBe(200);
    expect((await call("/apps/hello/api/greeting", headers, bindings)).status).toBe(403);
    // A person with no apps keeps their own setup.
    expect(await (await call("/api/access/setup", headers, bindings)).json()).toMatchObject({ api: "authenticated", apps: [], identity: { email: "human@example.com", subject: "employee" } });
    row.status = "removed";
    expect((await call("/api/access/setup", headers, bindings)).status).toBe(403);
    expect((await call("/api/access/apps", headers, bindings)).status).toBe(403);
    expect((await call("/apps/hello/api/peek", headers, bindings)).status).toBe(403);
    first.mockRejectedValueOnce(new Error("private database error"));
    expect((await call("/apps/hello/api/greeting", headers, bindings)).status).toBe(503);
    expect((await call("/api/health", headers, bindings)).status).toBe(200);
    expect((await call("/_memory/unknown", {}, bindings)).status).toBe(404);
    expect(assets.fetch).toHaveBeenCalledTimes(4);
    expect(db.withSession).toHaveBeenCalledTimes(14);
    expect(db.withSession).toHaveBeenCalledWith("first-primary");
  });

  it("hands the timetable to the pushers' refresh", async () => {
    const bindings = fakeEnv(env);
    await worker.scheduled({} as ScheduledController, bindings);
    expect(refreshOnSchedule).toHaveBeenCalledWith(bindings);
  });
});
