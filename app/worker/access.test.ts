import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
      const identity = await getAccessIdentity(requestWith({ SKIP_AUTH: "true" }), {
        SKIP_AUTH: value,
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
    for (const token of ["", "one", "one.two", "one..three", ".two.three"]) {
      expect(
        await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
        token,
      ).toBeNull();
    }

    const atobSpy = vi.fn(globalThis.atob);
    vi.stubGlobal("atob", atobSpy);
    const complete = makeToken({ alg: "RS256", kid: "kid-1" }, { email: "a@example.com" });
    for (const token of [`.${complete.split(".").slice(1).join(".")}`, `${complete.split(".")[0]}..x`, `${complete.slice(0, complete.lastIndexOf("."))}.`]) {
      expect(
        await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
      ).toBeNull();
    }
    expect(atobSpy).not.toHaveBeenCalled();
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
describe("getAccessIdentity — the service-token identity", () => {
  const KID = "kid-1";
  const SIGNING_KEY = { fake: "imported-key" } as unknown as CryptoKey;

  let getAccessIdentity: typeof import("./access").getAccessIdentity;
  let verify: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    ({ getAccessIdentity } = await loadAccess());

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ keys: [{ kid: KID, kty: "RSA", n: "x", e: "AQAB" }] }),
      ),
    );
    vi.spyOn(crypto.subtle, "importKey").mockResolvedValue(SIGNING_KEY);
    verify = vi.fn(async () => true);
    vi.spyOn(crypto.subtle, "verify").mockImplementation(
      verify as unknown as typeof crypto.subtle.verify,
    );
  });

  const claims = (extra: Record<string, unknown>) => ({
    aud: AUD,
    iss: `https://${TEAM_DOMAIN}`,
    exp: Math.floor(Date.now() / 1000) + 600,
    ...extra,
  });

  it("resolves a common_name with no email to a service identity", async () => {
    const token = makeToken({ alg: "RS256", kid: KID }, claims({ common_name: "client-id-1", sub: "" }));

    const identity = await getAccessIdentity(
      requestWith({ "Cf-Access-Jwt-Assertion": token }),
      ENV,
    );

    expect(identity?.kind).toBe("service");
    expect(identity?.id).toBe("client-id-1");
    expect(identity?.claims.email).toBeUndefined();

    // Assert what the stub was asked to verify, so a path that never ran cannot
    // hide behind a stub that always says yes: the real key, the token's own
    // signature bytes, and the header.payload signing input.
    const [algorithm, key, signature, data] = verify.mock.calls[0]!;
    expect(algorithm).toBe("RSASSA-PKCS1-v1_5");
    expect(key).toBe(SIGNING_KEY);
    expect(new TextDecoder().decode(signature as Uint8Array)).toBe("signature");
    expect(new TextDecoder().decode(data as Uint8Array)).toBe(
      token.split(".").slice(0, 2).join("."),
    );
  });

  it("resolves an email claim to a user identity", async () => {
    const token = makeToken({ alg: "RS256", kid: KID }, claims({ email: "human@example.com" }));

    const identity = await getAccessIdentity(
      requestWith({ "Cf-Access-Jwt-Assertion": token }),
      ENV,
    );

    expect(identity).toMatchObject({ id: "human@example.com", kind: "user" });
  });

  it("decodes URL-safe signatures with the required padding", async () => {
    const decode = globalThis.atob;
    const atobSpy = vi.fn((value: string) => decode(value));
    vi.stubGlobal("atob", atobSpy);
    const token = makeToken(
      { alg: "RS256", kid: KID },
      claims({ email: "human@example.com" }),
      "-_8",
    );

    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
    ).toMatchObject({ id: "human@example.com" });
    expect(atobSpy).toHaveBeenCalledWith("+/8=");
    expect(verify.mock.calls[0]?.[2]).toEqual(Uint8Array.from([251, 255]));
  });

  it("accepts an audience list but rejects claims with no identity", async () => {
    const token = makeToken(
      { alg: "RS256", kid: KID },
      { ...claims({}), aud: ["another-app", AUD] },
    );

    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
    ).toBeNull();
  });

  it("ignores a cert without a key id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          keys: [
            { kty: "RSA", n: "unused", e: "AQAB" },
            { kid: KID, kty: "RSA", n: "x", e: "AQAB" },
          ],
        }),
      ),
    );
    const token = makeToken({ alg: "RS256", kid: KID }, claims({ email: "human@example.com" }));

    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
    ).toMatchObject({ id: "human@example.com" });
    expect(crypto.subtle.importKey).toHaveBeenCalledOnce();
    expect(crypto.subtle.importKey).toHaveBeenCalledWith(
      "jwk",
      { kid: KID, kty: "RSA", n: "x", e: "AQAB" },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
  });

  it("reuses a fresh key cache for the same team", async () => {
    const token = makeToken({ alg: "RS256", kid: KID }, claims({ email: "human@example.com" }));
    const request = requestWith({ "Cf-Access-Jwt-Assertion": token });

    expect(await getAccessIdentity(request, ENV)).toMatchObject({ id: "human@example.com" });
    expect(await getAccessIdentity(request, ENV)).toMatchObject({ id: "human@example.com" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(`https://${TEAM_DOMAIN}/cdn-cgi/access/certs`);
  });

  it("refreshes the key cache for another team", async () => {
    const otherTeam = "other-team.cloudflareaccess.com";
    const first = makeToken({ alg: "RS256", kid: KID }, claims({ email: "human@example.com" }));
    const second = makeToken(
      { alg: "RS256", kid: KID },
      { ...claims({ email: "human@example.com" }), iss: `https://${otherTeam}` },
    );

    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": first }), ENV),
    ).not.toBeNull();
    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": second }), {
        ...ENV,
        CF_ACCESS_TEAM_DOMAIN: otherTeam,
      }),
    ).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reuses keys before the TTL and refreshes at its boundary", async () => {
    const startedAt = 1_800_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(startedAt);
    const token = makeToken(
      { alg: "RS256", kid: KID },
      claims({ email: "human@example.com", exp: startedAt / 1000 + 7200 }),
    );
    const request = requestWith({ "Cf-Access-Jwt-Assertion": token });

    await getAccessIdentity(request, ENV);
    vi.mocked(Date.now).mockReturnValue(startedAt + 1001);
    await getAccessIdentity(request, ENV);
    expect(fetch).toHaveBeenCalledOnce();

    vi.mocked(Date.now).mockReturnValue(startedAt + 60 * 60 * 1000);
    await getAccessIdentity(request, ENV);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reads the assertion from the browser cookie as well as the header", async () => {
    const token = makeToken({ alg: "RS256", kid: KID }, claims({ common_name: "client-id-1" }));

    for (const cookie of [
      `CF_Authorization=${token}`,
      `other=x;CF_Authorization=${token}`,
      `other=x; CF_Authorization=${token}`,
    ]) {
      const identity = await getAccessIdentity(requestWith({ Cookie: cookie }), ENV);
      expect(identity?.kind).toBe("service");
    }
  });

  it("returns null when the signature does not verify", async () => {
    verify.mockResolvedValue(false);
    const token = makeToken({ alg: "RS256", kid: KID }, claims({ common_name: "client-id-1" }));

    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
    ).toBeNull();
  });

  it("rejects an assertion issued for a different application or organization", async () => {
    const wrongAud = makeToken(
      { alg: "RS256", kid: KID },
      { ...claims({ common_name: "client-id-1" }), aud: "some-other-app" },
    );
    const wrongIss = makeToken(
      { alg: "RS256", kid: KID },
      { ...claims({ common_name: "client-id-1" }), iss: "https://someone-else.cloudflareaccess.com" },
    );

    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": wrongAud }), ENV),
    ).toBeNull();
    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": wrongIss }), ENV),
    ).toBeNull();
  });

  it("rejects an expired or not-yet-valid assertion", async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = makeToken(
      { alg: "RS256", kid: KID },
      { ...claims({ common_name: "client-id-1" }), exp: now - 1 },
    );
    const future = makeToken(
      { alg: "RS256", kid: KID },
      { ...claims({ common_name: "client-id-1" }), nbf: now + 600 },
    );
    const expiresNow = makeToken(
      { alg: "RS256", kid: KID },
      { ...claims({ common_name: "client-id-1" }), exp: now },
    );
    const nonNumericExpiry = makeToken(
      { alg: "RS256", kid: KID },
      { ...claims({ common_name: "client-id-1" }), exp: "later" },
    );
    const validNow = makeToken(
      { alg: "RS256", kid: KID },
      { ...claims({ common_name: "client-id-1" }), nbf: now },
    );
    const nonNumericNotBefore = makeToken(
      { alg: "RS256", kid: KID },
      { ...claims({ common_name: "client-id-1" }), nbf: "9999999999999" },
    );

    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": expired }), ENV),
    ).toBeNull();
    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": future }), ENV),
    ).toBeNull();
    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": expiresNow }), ENV),
    ).toBeNull();
    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": nonNumericExpiry }), ENV),
    ).toBeNull();
    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": validNow }), ENV),
    ).not.toBeNull();
    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": nonNumericNotBefore }), ENV),
    ).not.toBeNull();
  });

  it("refetches once for an unknown kid, then rejects if it is still unknown", async () => {
    const token = makeToken(
      { alg: "RS256", kid: "rotated-kid" },
      claims({ common_name: "client-id-1" }),
    );

    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
    ).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the certs endpoint is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const token = makeToken({ alg: "RS256", kid: KID }, claims({ common_name: "client-id-1" }));

    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
    ).toBeNull();
  });

  it("fails closed when the certs endpoint returns an error", async () => {
    const json = vi.fn(async () => ({ keys: [{ kid: KID, kty: "RSA", n: "x", e: "AQAB" }] }));
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json })));
    const token = makeToken({ alg: "RS256", kid: KID }, claims({ common_name: "client-id-1" }));

    expect(
      await getAccessIdentity(requestWith({ "Cf-Access-Jwt-Assertion": token }), ENV),
    ).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(json).not.toHaveBeenCalled();
  });
});
