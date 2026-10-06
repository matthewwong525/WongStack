import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { jwk, signingPair } from "../tests/signing";

// The module holds a `keyCache` at module scope. Every test imports it fresh
// through `vi.resetModules()`, so a key stubbed in one case cannot leak into a
// later one and turn a real failure into a pass.
async function loadAccess() {
  vi.resetModules();
  return await import("./access");
}

const TEAM_DOMAIN = "example-team.cloudflareaccess.com";
const AUD = "aud-tag-for-this-app";
const ENV = { CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN, CF_ACCESS_AUD: AUD };

function base64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

/** A three-segment token with the given header and payload, unsigned. */
function makeToken(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  signature = "c2lnbmF0dXJl",
): string {
  return `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}.${signature}`;
}

function requestWith(headers: Record<string, string> = {}): Request {
  return new Request("https://app.example.com/api/thing", { headers });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// These paths need no network and no cryptography: `getAccessIdentity` returns
// before it ever reaches for a signing key. They are the majority of the suite
// on purpose — nothing here is stubbed, so nothing here can pass against a
// path that did not truly run.
describe("getAccessIdentity — rejections that need no key", () => {
  let getAccessIdentity: typeof import("./access").getAccessIdentity;

  beforeEach(async () => {
    ({ getAccessIdentity } = await loadAccess());
    // Any key fetch in this block is a defect, not a setup gap.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("no key fetch should happen on these paths");
      }),
    );
  });

  it("returns the dev identity when SKIP_AUTH is set, reading env and never the request", async () => {
    // The bypass must come from the environment: a caller sending a header of
    // its own must not be able to reach it.
    for (const value of [true, "true"]) {
      const identity = await getAccessIdentity(new Request("http://localhost/api/thing"), {
        SKIP_AUTH: value,
        WONG_ENVIRONMENT: "local",
      });

      expect(identity).toEqual({
        id: "dev@example.com",
        kind: "user",
        claims: { aud: "", iss: "", exp: 0, email: "dev@example.com" },
      });
    }
  });

  it("does not treat a request header as the bypass", async () => {
    expect(await getAccessIdentity(requestWith({ "X-Skip-Auth": "true" }), ENV)).toBeNull();
  });

  it("rejects authentication substitution on deployed hosts and environments", async () => {
    for (const environment of [undefined, "production", "staging", "local"]) {
      expect(await getAccessIdentity(requestWith(), { ...ENV, WONG_ENVIRONMENT: environment, SKIP_AUTH: "true" })).toBeNull();
    }
    expect(await getAccessIdentity(new Request("http://localhost/"), { ...ENV, WONG_ENVIRONMENT: "production", SKIP_AUTH: true })).toBeNull();
    expect(await getAccessIdentity(new Request("http://localhost/"), { ...ENV, WONG_ENVIRONMENT: "local", SKIP_AUTH: "false" })).toBeNull();
  });

  it("denies rather than allows when the team domain or audience is unset", async () => {
    const token = makeToken({ alg: "RS256", kid: "kid-1" }, { email: "a@example.com" });
    const request = requestWith({ "Cf-Access-Jwt-Assertion": token });

    expect(await getAccessIdentity(request, {})).toBeNull();
    expect(await getAccessIdentity(request, { CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN })).toBeNull();
    expect(await getAccessIdentity(request, { CF_ACCESS_AUD: AUD })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns null when there is no assertion header and no cookie", async () => {
    expect(await getAccessIdentity(requestWith(), ENV)).toBeNull();
    expect(await getAccessIdentity(requestWith({ Cookie: "other=value" }), ENV)).toBeNull();
  });

  it("returns null for a token that is not three segments", async () => {
    for (const token of ["", "one", "one.two", "one..three", ".two.three", "one.two.three.four"]) {
      expect(
        await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
        token,
      ).toBeNull();
    }

    // A well-formed header with one segment emptied must still stop before any
    // key fetch: an empty payload or signature is not worth a network call.
    const [header, payload] = makeToken({ alg: "RS256", kid: "kid-1" }, {}).split(".");
    for (const token of [`.${payload}.x`, `${header}..x`, `${header}.${payload}.`]) {
      expect(
        await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
        token,
      ).toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an algorithm other than RS256, or a header with no kid, before fetching a key", async () => {
    const headers = [
      { alg: "none", kid: "kid-1" },
      { alg: "HS256", kid: "kid-1" },
      { alg: "RS256" },
      {},
    ];

    for (const header of headers) {
      const token = makeToken(header, { email: "a@example.com" });
      expect(
        await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
        JSON.stringify(header),
      ).toBeNull();
    }

    // The stubbed fetch throws; reaching it at all would have failed the case
    // above. This states the requirement directly.
    expect(fetch).not.toHaveBeenCalled();
  });
});

// The headline behaviour, and the one the header-trust reimplementation breaks:
// Access sends no email header for a service token, so the identity has to come
// out of the verified assertion.
//
// Every accepted token here carries a real RS256 signature. The test generates
// a key pair, serves the public half as the team's certificate set, and signs
// with the private half; the platform's key import and signature check run for
// real, so a wrong algorithm, a malformed key, or a decoding fault fails a case.
describe("getAccessIdentity — verified assertions", () => {
  const KID = "kid-1";
  const RS256 = {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  };

  let getAccessIdentity: typeof import("./access").getAccessIdentity;
  let signingKey: CryptoKeyPair;
  let otherKey: CryptoKeyPair;
  let publicJwk: JsonWebKey & { kid: string };

  const serveCerts = (keys: unknown[]) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ keys })),
    );

  /**
   * A token signed with `privateKey`. A `jti` nonce is bumped until the
   * signature holds both `-` and `_`, so every case exercises the URL-safe
   * decoding rather than passing on a lucky signature.
   */
  async function signToken(
    header: Record<string, unknown>,
    payload: Record<string, unknown>,
    privateKey = signingKey.privateKey,
  ): Promise<string> {
    for (let jti = 0; ; jti++) {
      const input = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify({ ...payload, jti }))}`;
      const bytes = await crypto.subtle.sign(RS256.name, privateKey, new TextEncoder().encode(input));
      const signature = Buffer.from(bytes).toString("base64url");
      if (signature.includes("-") && signature.includes("_")) return `${input}.${signature}`;
    }
  }

  const bearer = (token: string) => requestWith({ "Cf-Access-Jwt-Assertion": token });

  beforeAll(async () => {
    signingKey = await signingPair();
    otherKey = await signingPair();
    publicJwk = { ...(await jwk(signingKey.publicKey)), kid: KID };
  });

  beforeEach(async () => {
    ({ getAccessIdentity } = await loadAccess());
    serveCerts([publicJwk]);
  });

  const claims = (extra: Record<string, unknown>) => ({
    aud: AUD,
    iss: `https://${TEAM_DOMAIN}`,
    exp: Math.floor(Date.now() / 1000) + 600,
    ...extra,
  });

  it("resolves a common_name with no email to a service identity", async () => {
    const token = await signToken({ alg: "RS256", kid: KID }, claims({ common_name: "client-id-1", sub: "" }));

    const identity = await getAccessIdentity(bearer(token), ENV);

    expect(identity?.kind).toBe("service");
    expect(identity?.id).toBe("client-id-1");
    expect(identity?.claims.email).toBeUndefined();
  });

  it("resolves an email claim to a user identity", async () => {
    const token = await signToken({ alg: "RS256", kid: KID }, claims({ email: "human@example.com" }));

    expect(await getAccessIdentity(bearer(token), ENV)).toMatchObject({
      id: "human@example.com",
      kind: "user",
    });
  });

  it("refuses a token signed by a key outside the served set", async () => {
    // The forger knows the served kid; only the signature gives it away.
    const token = await signToken(
      { alg: "RS256", kid: KID },
      claims({ email: "human@example.com" }),
      otherKey.privateKey,
    );

    expect(await getAccessIdentity(bearer(token), ENV)).toBeNull();
  });

  it("refuses a token whose payload changed after signing", async () => {
    const [header, , signature] = (
      await signToken({ alg: "RS256", kid: KID }, claims({ email: "human@example.com" }))
    ).split(".");
    const forged = base64Url(JSON.stringify(claims({ email: "admin@example.com" })));

    expect(await getAccessIdentity(bearer(`${header}.${forged}.${signature}`), ENV)).toBeNull();
  });

  it("accepts an audience list but rejects claims with no identity", async () => {
    const token = await signToken({ alg: "RS256", kid: KID }, { ...claims({}), aud: ["another-app", AUD] });

    expect(await getAccessIdentity(bearer(token), ENV)).toBeNull();
  });

  it("ignores a cert without a key id, even one that could never be imported", async () => {
    serveCerts([{ kty: "oct", k: "AAAA" }, publicJwk]);
    const token = await signToken({ alg: "RS256", kid: KID }, claims({ email: "human@example.com" }));

    expect(await getAccessIdentity(bearer(token), ENV)).toMatchObject({ id: "human@example.com" });
  });

  it("reuses a fresh key cache for the same team", async () => {
    const request = bearer(await signToken({ alg: "RS256", kid: KID }, claims({ email: "human@example.com" })));

    expect(await getAccessIdentity(request, ENV)).toMatchObject({ id: "human@example.com" });
    expect(await getAccessIdentity(request, ENV)).toMatchObject({ id: "human@example.com" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(`https://${TEAM_DOMAIN}/cdn-cgi/access/certs`);
  });

  it("refreshes the key cache for another team", async () => {
    const otherTeam = "other-team.cloudflareaccess.com";
    const first = await signToken({ alg: "RS256", kid: KID }, claims({ email: "human@example.com" }));
    const second = await signToken(
      { alg: "RS256", kid: KID },
      { ...claims({ email: "human@example.com" }), iss: `https://${otherTeam}` },
    );

    expect(await getAccessIdentity(bearer(first), ENV)).not.toBeNull();
    expect(
      await getAccessIdentity(bearer(second), { ...ENV, CF_ACCESS_TEAM_DOMAIN: otherTeam }),
    ).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reuses keys before the TTL and refreshes at its boundary", async () => {
    const startedAt = 1_800_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(startedAt);
    const request = bearer(
      await signToken(
        { alg: "RS256", kid: KID },
        claims({ email: "human@example.com", exp: startedAt / 1000 + 7200 }),
      ),
    );

    await getAccessIdentity(request, ENV);
    vi.mocked(Date.now).mockReturnValue(startedAt + 1001);
    await getAccessIdentity(request, ENV);
    expect(fetch).toHaveBeenCalledOnce();

    vi.mocked(Date.now).mockReturnValue(startedAt + 60 * 60 * 1000);
    await getAccessIdentity(request, ENV);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reads the assertion from the browser cookie as well as the header", async () => {
    const token = await signToken({ alg: "RS256", kid: KID }, claims({ common_name: "client-id-1" }));

    for (const cookie of [
      `CF_Authorization=${token}`,
      `other=x;CF_Authorization=${token}`,
      `other=x; CF_Authorization=${token}`,
    ]) {
      const identity = await getAccessIdentity(requestWith({ Cookie: cookie }), ENV);
      expect(identity?.kind, cookie).toBe("service");
    }
  });

  it("rejects an assertion issued for a different application or organization", async () => {
    const wrongAud = await signToken(
      { alg: "RS256", kid: KID },
      { ...claims({ common_name: "client-id-1" }), aud: "some-other-app" },
    );
    const wrongIss = await signToken(
      { alg: "RS256", kid: KID },
      { ...claims({ common_name: "client-id-1" }), iss: "https://someone-else.cloudflareaccess.com" },
    );

    expect(await getAccessIdentity(bearer(wrongAud), ENV)).toBeNull();
    expect(await getAccessIdentity(bearer(wrongIss), ENV)).toBeNull();
  });

  it("rejects an expired or not-yet-valid assertion", async () => {
    const now = 1_800_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now * 1000);
    const withTimes = (times: Record<string, unknown>) =>
      signToken({ alg: "RS256", kid: KID }, { ...claims({ common_name: "client-id-1" }), ...times });

    for (const times of [{ exp: now - 1 }, { nbf: now + 600 }, { exp: now }, { exp: "later" }]) {
      expect(await getAccessIdentity(bearer(await withTimes(times)), ENV), JSON.stringify(times)).toBeNull();
    }
    for (const times of [{ nbf: now }, { nbf: "9999999999999" }]) {
      expect(await getAccessIdentity(bearer(await withTimes(times)), ENV), JSON.stringify(times)).not.toBeNull();
    }
  });

  it("requires human reauthentication exactly at the thirty-day login expiry", async () => {
    const issued = 1_800_000_000;
    const expires = issued + 30 * 24 * 60 * 60;
    vi.spyOn(Date, "now").mockReturnValue((expires - 1) * 1000);
    const token = await signToken({ alg: "RS256", kid: KID }, claims({ email: "human@example.com", iat: issued, exp: expires }));
    expect(await getAccessIdentity(bearer(token), ENV)).toMatchObject({ kind: "user" });
    vi.mocked(Date.now).mockReturnValue(expires * 1000);
    expect(await getAccessIdentity(bearer(token), ENV)).toBeNull();
    vi.mocked(Date.now).mockReturnValue((expires + 1) * 1000);
    expect(await getAccessIdentity(bearer(token), ENV)).toBeNull();
  });

  it("refetches once for an unknown kid, then rejects if it is still unknown", async () => {
    const token = await signToken({ alg: "RS256", kid: "rotated-kid" }, claims({ common_name: "client-id-1" }));

    expect(await getAccessIdentity(bearer(token), ENV)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the certs endpoint is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const token = await signToken({ alg: "RS256", kid: KID }, claims({ common_name: "client-id-1" }));

    expect(await getAccessIdentity(bearer(token), ENV)).toBeNull();
  });

  it("fails closed when the certs endpoint returns an error", async () => {
    const json = vi.fn(async () => ({ keys: [publicJwk] }));
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json })));
    const token = await signToken({ alg: "RS256", kid: KID }, claims({ common_name: "client-id-1" }));

    expect(await getAccessIdentity(bearer(token), ENV)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(json).not.toHaveBeenCalled();
  });
});
