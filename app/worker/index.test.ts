import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppHandler } from "./apps/index";
import worker from "./index";

// Hello's routes, plus one that reports which bindings a mini app's handler is handed.
vi.mock("./apps/hello/api.ts", async (original) => {
  const { routes } = await original<{ routes: Map<string, AppHandler> }>();
  return { routes: new Map(routes).set("GET peek", (_request, appEnv) => Response.json({ env: Object.keys(appEnv).sort() })) };
});

const TEAM = "routing-team.cloudflareaccess.com";
const AUD = "routing-workspace";
const ASSET_PATHS = ["/", "/index.html", "/assets/main.js", "/assets/style.css", "/apps/tips/", "/apps/tips/app.js", "/unknown/path"];

describe("private Worker routing", () => {
  let signing: CryptoKeyPair;
  let publicKey: JsonWebKey;
  const assets = { fetch: vi.fn(async () => new Response("asset")) };
  const env = { ASSETS: assets, CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD };
  const call = (path: string, headers: Record<string, string> = {}, bindings = env, method = "GET") => worker.fetch(
    new Request(`https://workspace.example.com${path}`, { headers, method }), bindings as Env & typeof env, {} as ExecutionContext,
  );
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  async function token(claims: Record<string, unknown> = { email: "human@example.com" }) {
    const input = `${encode({ kid: "routing-key", alg: "RS256" })}.${encode({ aud: AUD, iss: `https://${TEAM}`, exp: Math.floor(Date.now() / 1000) + 600, ...claims })}`;
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signing.privateKey, new TextEncoder().encode(input));
    return `${input}.${Buffer.from(signature).toString("base64url")}`;
  }
  beforeAll(async () => {
    signing = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    publicKey = await crypto.subtle.exportKey("jwk", signing.publicKey);
  });
  beforeEach(() => {
    assets.fetch.mockClear();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ keys: [{ ...publicKey, kid: "routing-key" }] })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("denies anonymous and forged identity headers before every protected entry point", async () => {
    for (const path of [...ASSET_PATHS, "/api/health", "/api/nothing", "/apps/hello/api/health"]) {
      expect((await call(path)).status, path).toBe(401);
      expect((await call(path, { "Cf-Access-Authenticated-User-Email": "owner@example.com" })).status, path).toBe(401);
    }
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("keeps missing app configuration unavailable, including its static assets", async () => {
    for (const path of ASSET_PATHS) expect((await call(path, {}, { ASSETS: assets } as typeof env)).status).toBe(503);
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("serves an open workspace without login only while no Access identifier is set", async () => {
    const open = { ASSETS: assets, WORKSPACE_LOGIN: "off" } as unknown as typeof env;
    for (const path of ASSET_PATHS) expect((await call(path, {}, open)).status, path).toBe(200);
    expect(await (await call("/api/health", {}, open)).json()).toEqual({ ok: true });
    expect((await call("/_memory/unknown", {}, { ...open, MEMORY_DB: {} } as typeof env)).status).toBe(404);
    expect(assets.fetch).toHaveBeenCalledTimes(ASSET_PATHS.length);
  });
  it("ignores a stale open switch once Access identifiers are set", async () => {
    const stale = { ...env, WORKSPACE_LOGIN: "off" };
    for (const path of [...ASSET_PATHS, "/api/health"]) expect((await call(path, {}, stale)).status, path).toBe(401);
    const onlyTeam = { ASSETS: assets, WORKSPACE_LOGIN: "off", CF_ACCESS_TEAM_DOMAIN: TEAM } as unknown as typeof env;
    expect((await call("/", {}, onlyTeam)).status).toBe(503);
    for (const value of ["on", "OFF", ""]) {
      expect((await call("/", {}, { ASSETS: assets, WORKSPACE_LOGIN: value } as unknown as typeof env)).status, value).toBe(503);
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
    expect(assets.fetch).not.toHaveBeenCalled();
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
      "/_memory/": [404, {success:false,code:"memory-route-denied"}, 404, {success:false,code:"memory-route-denied"}],
    });
    expect(assets.fetch).toHaveBeenCalledTimes(6);
  });
  it("serves a check's kept pictures only behind the login, from a bucket no mini app is handed", async () => {
    const picture = "/_walk/abc1234/20261003T140000Z/empty-title/03-after.png";
    const get = vi.fn(async () => ({ body: new Blob(["png"]).stream() }));
    const walkEnv = { ...env, MEMORY_BUCKET: { get } };
    expect((await call(picture, {}, walkEnv)).status).toBe(401);
    const open = { ASSETS: assets, WORKSPACE_LOGIN: "off", MEMORY_BUCKET: { get } } as unknown as typeof env;
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
  it("keeps all memory routes outside human Access and unavailable on staging", async () => {
    const read=vi.fn(()=>{throw Error("memory must stay closed");});
    const bindings={...env,WONG_ENVIRONMENT:"staging",MEMORY_DB:{prepare:read,batch:read}};
    for(const path of ["/_memory/unknown","/_memory/accounts/a/d1/database/d/query","/_memory/v2/repositories/"+"r".repeat(32)+"/machines/"+"m".repeat(32)+"/query","/%5fmemory/join"]){
      const response=await call(path,{"Cf-Access-Jwt-Assertion":await token()},bindings as typeof env);
      expect(response.status).toBe(404);
    }
    expect(read).not.toHaveBeenCalled();expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("inspects an encoded memory prefix even when its remaining path is malformed", async () => {
    const read = vi.fn(() => { throw Error("malformed memory cannot read bindings"); });
    const response = await call("/%5fmemory/%ZZ", {}, { ...env, WONG_ENVIRONMENT: "production", MEMORY_DB: { prepare: read, batch: read } } as typeof env);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ success: false, code: "memory-route-denied" });
    expect(read).not.toHaveBeenCalled();
    expect(assets.fetch).not.toHaveBeenCalled();
  });
  it("retains the human Access boundary for malformed and nonhierarchical nonmemory addresses", async () => {
    for (const path of ["/%ZZ/assets/main.js", "/public/%ZZ"]) expect((await call(path)).status, path).toBe(401);
    const response = await worker.fetch(new Request("mailto:human@example.com"), env as Env & typeof env, {} as ExecutionContext);
    expect(response.status).toBe(401);
    expect(assets.fetch).not.toHaveBeenCalled();
    const signed = await call("/%61ssets/main.js", { "Cf-Access-Jwt-Assertion": await token() });
    expect(signed.status).toBe(200);
    expect(await signed.text()).toBe("asset");
    expect(assets.fetch).toHaveBeenCalledTimes(1);
  });
  it("closes nested encoding at the maximum depth without falling through to assets or bindings", async () => {
    const read = vi.fn(() => { throw Error("encoded routes cannot read bindings"); });
    const bindings = { ...env, WORKSPACE_LOGIN: "off", WONG_ENVIRONMENT: "production", MEMORY_DB: { prepare: read, batch: read } };
    for (const depth of [31, 32, 33]) {
      let path = "/%5fmemory/unknown";
      for (let layer = 1; layer < depth; layer++) path = path.replaceAll("%", "%25");
      const response = await call(path, { "Cf-Access-Jwt-Assertion": await token() }, bindings as typeof env);
      expect(response.status, `encoding depth ${depth}`).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      if (depth === 31) expect(await response.json()).toEqual({ success: false, code: "memory-route-denied" });
      else expect(await response.text()).toBe("Not found");
    }
    expect(read).not.toHaveBeenCalled();
    expect(assets.fetch).not.toHaveBeenCalled();
  });

});
