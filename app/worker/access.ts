// Cloudflare Access identity: verify the signed assertion, not a header; a service token gets no email header.
// Enforced before pages, assets, APIs and mini apps. wiki/stack/cloudflare-access.md#turning-it-on

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

export interface AccessEnv {
  /** "<your-team-name>.cloudflareaccess.com" — public identifier, not a secret. */
  CF_ACCESS_TEAM_DOMAIN?: string;
  /** The application's Audience (AUD) tag — public identifier, not a secret. */
  CF_ACCESS_AUD?: string;
  /** "off" while the account has no Zero Trust login yet: a committed switch, honored only when both Access
   *  identifiers above are blank. wiki/stack/cloudflare-access.md#open-until-the-card */
  WORKSPACE_LOGIN?: string;
  /** Local development only. Read from env, never from the request, so no caller can turn off the wall by header. */
  SKIP_AUTH?: string | boolean;
  WONG_ENVIRONMENT?: string;
}

/** True where Cloudflare's sign-in stands in front of this site, so a caller has a session to end. False while the
 *  site is open until the card, and on a local run, where the stand-in identity has none. */
export const hasSignIn = (env: AccessEnv): boolean =>
  !!env.CF_ACCESS_TEAM_DOMAIN && !!env.CF_ACCESS_AUD && env.WONG_ENVIRONMENT !== "local";

/** A fixed identity for local work, used ONLY when SKIP_AUTH is explicitly set. */
const DEV_IDENTITY: AccessIdentity = {
  id: "dev@example.com",
  kind: "user",
  claims: { aud: "", iss: "", exp: 0, email: "dev@example.com" },
};

/** Cloudflare rotates the signing keys, so they are fetched and cached, not pinned: this runs on every request.
 *  An unknown `kid` refetches at once, which is what handles a rotation; the TTL only bounds a stale set. */
const KEY_CACHE_TTL_MS = 60 * 60 * 1000;
let keyCache: { teamDomain: string; fetchedAt: number; keys: Map<string, CryptoKey> } | null = null;

async function getSigningKeys(teamDomain: string, forceRefresh = false): Promise<Map<string, CryptoKey>> {
  const fresh =
    keyCache &&
    keyCache.teamDomain === teamDomain &&
    Date.now() - keyCache.fetchedAt < KEY_CACHE_TTL_MS;
  if (fresh && !forceRefresh) return keyCache!.keys;

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) return new Map();

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
  // atob decodes forgiving base64, so the missing padding needs no restoring.
  const binary = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function decodeJson<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(segment))) as T;
}

function identityFromClaims(
  claims: AccessClaims,
  audience: string,
  teamDomain: string,
): AccessIdentity | null {
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
}

/** The app token as the edge, a browser, `cloudflared access token`, or git's Basic password sends it.
 *  Every source is verified the same way, so reading more of them widens no one's access. */
function accessToken(request: Request): string | undefined {
  const { headers } = request;
  return (
    headers.get("Cf-Access-Jwt-Assertion") ??
    headers.get("Cookie")?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1] ??
    headers.get("cf-access-token") ??
    basicPassword(headers.get("Authorization"))
  );
}

/** Git sends the credential helper's password as HTTP Basic; the username is ignored. */
function basicPassword(authorization: string | null): string | undefined {
  const encoded = authorization?.match(/^Basic\s+(\S+)$/i)?.[1];
  if (!encoded) return undefined;
  try {
    const decoded = atob(encoded);
    return decoded.slice(decoded.indexOf(":") + 1) || undefined;
  } catch {
    return undefined;
  }
}

/** The Access-verified identity behind this request, or `null`. FAILS CLOSED: every failure path returns `null`.
 *  Treat `null` as 401; never fall through to an anonymous default. */
export async function getAccessIdentity(
  request: Request,
  env: AccessEnv,
): Promise<AccessIdentity | null> {
  // Local development. Explicit opt-in from the environment; a request cannot
  // reach this branch on its own.
  if (
    env.WONG_ENVIRONMENT === "local" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname) &&
    (env.SKIP_AUTH === true || env.SKIP_AUTH === "true")
  ) return DEV_IDENTITY;

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
  const audience = env.CF_ACCESS_AUD;
  // Unconfigured is not "allow" — a Worker that enforces identity without
  // knowing which application to verify against cannot verify anything.
  if (!teamDomain || !audience) return null;

  const token = accessToken(request);
  if (!token) return null;

  const segments = token.split(".");
  if (segments.length !== 3) return null;
  const [headerSegment, payloadSegment, signatureSegment] = segments;
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

    return identityFromClaims(decodeJson<AccessClaims>(payloadSegment), audience, teamDomain);
  } catch {
    // Malformed token, unreachable certs endpoint, bad JSON — all fail closed.
    return null;
  }
}
