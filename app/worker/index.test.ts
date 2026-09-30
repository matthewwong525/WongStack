import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "../../.agents/skills/memory/worker/memory-worker.mjs";
import worker from "./index";

const TEAM = "routing-team.cloudflareaccess.com";
const AUD = "routing-workspace";
const ASSET_PATHS = ["/", "/index.html", "/assets/main.js", "/assets/style.css", "/apps/tips/", "/apps/tips/app.js", "/unknown/path"];

describe("private Worker routing", () => {
  let signing: CryptoKeyPair;
  let publicKey: JsonWebKey;
  const assets = { fetch: vi.fn(async () => new Response("asset")) };
  const env = { ASSETS: assets, CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD };
  const call = (path: string, headers: Record<string, string> = {}, bindings = env) => worker.fetch(
    new Request(`https://workspace.example.com${path}`, { headers }), bindings as Env & typeof env, {} as ExecutionContext,
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
    const validHash = await hashKey("test-memory-key");
    const memoryDb = {
      prepare: () => ({ bind: (hash: string) => ({ first: async () => hash === validHash ? { email: "owner@example.com", role: "admin", expires_at: null, team: false } : null }) }),
    };
    const memoryEnv = { ...env, MEMORY_DB: memoryDb };
    for (const key of [undefined, "wrong-key", "test-memory-key"]) {
      const response = await call("/_memory/unknown", key ? { Authorization: `Bearer ${key}` } : {}, memoryEnv);
      expect(response.status).toBe(key === "test-memory-key" ? 404 : 401);
      expect(await response.json()).toMatchObject({ errors: [{ code: key === "test-memory-key" ? "no_route" : 10000 }] });
    }
    expect(assets.fetch).not.toHaveBeenCalled();
  });
});
