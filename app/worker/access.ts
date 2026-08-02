// Cloudflare Access identity — verify the signed assertion, don't trust a header.
//
// SHIPS INERT. Nothing imports this module until you adopt Access. The Worker is
// public by default, and enforcing identity on a public Worker is worse than not
// enforcing it: see wiki/stack/cloudflare-access.md for why the code change and
// the login wall are adopted in the same step, in that order.
//
// WHY VERIFY RATHER THAN READ A HEADER
//
//   1. Access sets NO email header for a service token. A machine caller — CI,
//      /walk, any non-interactive client — arrives carrying only
//      `cf-access-jwt-assertion` plus the ordinary cf-* headers; the
//      CF-Access-Client-Id/Secret it sent are stripped at the edge. A Worker
//      reading `Cf-Access-Authenticated-User-Email` therefore 401s every machine.
//      The JWT is the one signal that covers humans and machines both.
//
//   2. Trusting a header is sound only if the proxy provably covers every
//      hostname that reaches this Worker — and a policy can silently fail to
//      cover one. Verifying the signature checks the claim against THIS
//      application, so it does not depend on a fact you can be wrong about.
//
// The verified claims differ by exactly one field, which is what lets one path
// serve both callers:
//
//   human, via your IdP   → { email: "someone@example.com", sub: "<user id>" }
//   service token         → { common_name: "<client id>",   sub: "" }
//
// Setup, and the browser verification that must pass first:
// wiki/stack/cloudflare-access.md#turning-it-on

/** A caller Access has authenticated, and whose assertion we verified. */
export interface AccessIdentity {
  /** Email for a human, the service token's Client ID for a machine. */
  id: string;
  kind: "user" | "service";
  claims: AccessClaims;
}

interface AccessClaims {
  aud: string | string[];
  iss: string;
  exp: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  email?: string;
  common_name?: string;
  [key: string]: unknown;
}

interface AccessEnv {
  /** "<your-team-name>.cloudflareaccess.com" — public identifier, not a secret. */
  CF_ACCESS_TEAM_DOMAIN?: string;
  /** The application's Audience (AUD) tag — public identifier, not a secret. */
  CF_ACCESS_AUD?: string;
  /**
   * Local development only. Read from env, never from the request, so no caller
   * can turn off the wall by sending a header.
   */
  SKIP_AUTH?: string | boolean;
}

/** A fixed identity for local work, used ONLY when SKIP_AUTH is explicitly set. */
const DEV_IDENTITY: AccessIdentity = {
  id: "dev@example.com",
  kind: "user",
  claims: { aud: "", iss: "", exp: 0, email: "dev@example.com" },
};

/**
 * Cloudflare rotates the signing keys, so they are fetched rather than pinned —
 * and cached, because this runs on every request. A short TTL keeps a rotation
 * from causing more than one window of misses; an unknown `kid` refetches
 * immediately regardless, which is what actually handles rotation.
 */
const KEY_CACHE_TTL_MS = 60 * 60 * 1000;
let keyCache: { teamDomain: string; fetchedAt: number; keys: Map<string, CryptoKey> } | null = null;

async function getSigningKeys(teamDomain: string, forceRefresh = false): Promise<Map<string, CryptoKey>> {
  const fresh =
    keyCache &&
    keyCache.teamDomain === teamDomain &&
    Date.now() - keyCache.fetchedAt < KEY_CACHE_TTL_MS;
  if (fresh && !forceRefresh) return keyCache!.keys;

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error(`Access certs fetch failed: ${response.status}`);

  // `kid` is what maps a token to its key, and the runtime's JsonWebKey type
  // doesn't declare it — the certs endpoint always sends it.
  const { keys } = (await response.json()) as { keys: (JsonWebKey & { kid?: string })[] };
  const imported = new Map<string, CryptoKey>();
  for (const jwk of keys) {
    if (!jwk.kid) continue;
    imported.set(
      jwk.kid,
      await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      ),
    );
  }

  keyCache = { teamDomain, fetchedAt: Date.now(), keys: imported };
  return imported;
}

function base64UrlDecode(segment: string): Uint8Array {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function decodeJson<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(segment))) as T;
}

/**
 * The Access-verified identity behind this request, or `null`.
 *
 * FAILS CLOSED. Every failure path — no assertion, bad signature, wrong
 * audience, wrong issuer, expired, malformed, certs unreachable — returns
 * `null`. Treat `null` as 401; never fall through to an anonymous default.
 */
export async function getAccessIdentity(
  request: Request,
  env: AccessEnv,
): Promise<AccessIdentity | null> {
  // Local development. Explicit opt-in from the environment; a request cannot
  // reach this branch on its own.
  if (env.SKIP_AUTH === true || env.SKIP_AUTH === "true") return DEV_IDENTITY;

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
  const audience = env.CF_ACCESS_AUD;
  // Unconfigured is not "allow" — a Worker that enforces identity without
  // knowing which application to verify against cannot verify anything.
  if (!teamDomain || !audience) return null;

  const token =
    request.headers.get("Cf-Access-Jwt-Assertion") ??
    // The cookie carries the same assertion for a browser navigation.
    request.headers.get("Cookie")?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
  if (!token) return null;

  const [headerSegment, payloadSegment, signatureSegment] = token.split(".");
  if (!headerSegment || !payloadSegment || !signatureSegment) return null;

  try {
    const { kid, alg } = decodeJson<{ kid?: string; alg?: string }>(headerSegment);
    if (!kid || alg !== "RS256") return null;

    let keys = await getSigningKeys(teamDomain);
    // An unknown kid means the keys rotated since we cached them — refetch once
    // before rejecting, so a rotation doesn't lock everyone out for the TTL.
    let key = keys.get(kid);
    if (!key) {
      keys = await getSigningKeys(teamDomain, true);
      key = keys.get(kid);
    }
    if (!key) return null;

    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlDecode(signatureSegment),
      new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
    );
    if (!verified) return null;

    const claims = decodeJson<AccessClaims>(payloadSegment);

    // Audience: this assertion must be for THIS application. Without it, a valid
    // token for any other app in the same org would be accepted here.
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(audience)) return null;

    // Issuer: our own Access organization.
    if (claims.iss !== `https://${teamDomain}`) return null;

    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== "number" || claims.exp <= now) return null;
    if (typeof claims.nbf === "number" && claims.nbf > now) return null;

    // One path, both callers: `email` for a human, `common_name` for a service
    // token. A service-token assertion has no email and an empty `sub`.
    if (claims.email) return { id: claims.email, kind: "user", claims };
    if (claims.common_name) return { id: claims.common_name, kind: "service", claims };
    return null;
  } catch {
    // Malformed token, unreachable certs endpoint, bad JSON — all fail closed.
    return null;
  }
}
