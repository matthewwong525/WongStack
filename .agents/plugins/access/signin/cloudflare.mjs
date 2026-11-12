// Cloudflare Access sign-in: verify the signed assertion, not a header; a service token gets no email header. The
// project's `signIn` slot is `signIn(env)`. wiki/stack/cloudflare-access.md#turning-it-on
import { isEmail } from '../server/sets.mjs';

/** True where Cloudflare's sign-in stands in front of the site, so a caller has a session to end. False while the
 *  site is open until the card, and on a local run, where the stand-in identity has none. */
export const hasSignIn = env => !!env.CF_ACCESS_TEAM_DOMAIN && !!env.CF_ACCESS_AUD && env.WONG_ENVIRONMENT !== 'local';

/** The stand-in person for local work, used ONLY on a local run with SKIP_AUTH set, from this computer. It has a
 *  subject and an hour left, so person-only routes take it there. */
const devIdentity = () => ({
  id: 'dev@example.com',
  kind: 'user',
  claims: { aud: '', iss: '', sub: 'local', exp: Math.floor(Date.now() / 1000) + 3600, email: 'dev@example.com' },
});

/** Cloudflare rotates the signing keys, so they are fetched and cached, not pinned. An unknown `kid` refetches at
 *  once, which is what handles a rotation; the time limit only bounds a stale set. */
const KEY_CACHE_TTL_MS = 60 * 60 * 1000;
let keyCache = null;

async function getSigningKeys(teamDomain, forceRefresh = false) {
  const fresh = keyCache && keyCache.teamDomain === teamDomain && Date.now() - keyCache.fetchedAt < KEY_CACHE_TTL_MS;
  if (fresh && !forceRefresh) return keyCache.keys;
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) return new Map();
  const { keys } = await response.json();
  const imported = new Map();
  for (const jwk of keys) {
    if (!jwk.kid) continue;
    imported.set(jwk.kid, await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
  }
  keyCache = { teamDomain, fetchedAt: Date.now(), keys: imported };
  return imported;
}

function base64UrlDecode(segment) {
  // atob decodes forgiving base64, so the missing padding needs no restoring.
  const binary = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
const decodeJson = segment => JSON.parse(new TextDecoder().decode(base64UrlDecode(segment)));

function identityFromClaims(claims, audience, teamDomain) {
  // Audience: this assertion must be for THIS application, not any other app in the same organization.
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(audience)) return null;
  // Issuer: our own Access organization.
  if (claims.iss !== `https://${teamDomain}`) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp <= now) return null;
  if (typeof claims.nbf === 'number' && claims.nbf > now) return null;
  // One path, both callers: `email` for a person, `common_name` for a service token, which has no email.
  if (claims.email) return { id: claims.email, kind: 'user', claims };
  if (claims.common_name) return { id: claims.common_name, kind: 'service', claims };
  return null;
}

/** The app token as the edge, a browser, `cloudflared access token`, or git's Basic password sends it. Every source
 *  is verified the same way, so reading more of them widens no one's access. */
function accessToken(request) {
  const { headers } = request;
  return headers.get('Cf-Access-Jwt-Assertion') ?? headers.get('Cookie')?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1] ??
    headers.get('cf-access-token') ?? basicPassword(headers.get('Authorization'));
}

/** Git sends the credential helper's password as HTTP Basic; the username is ignored. */
function basicPassword(authorization) {
  const encoded = authorization?.match(/^Basic\s+(\S+)$/i)?.[1];
  if (!encoded) return undefined;
  try {
    const decoded = atob(encoded);
    return decoded.slice(decoded.indexOf(':') + 1) || undefined;
  } catch {
    return undefined;
  }
}

/** The Access-verified identity behind this request, or null. FAILS CLOSED: every failure path returns null. Treat
 *  null as 401; never fall through to an anonymous default. */
export async function getAccessIdentity(request, env) {
  // Local development: an explicit opt-in from the environment; a request can not reach this branch on its own.
  if (env.WONG_ENVIRONMENT === 'local' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname) &&
    (env.SKIP_AUTH === true || env.SKIP_AUTH === 'true')) return devIdentity();
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
  const audience = env.CF_ACCESS_AUD;
  // Unconfigured is not "allow": a server that knows no application to verify against can verify nothing.
  if (!teamDomain || !audience) return null;
  const token = accessToken(request);
  if (!token) return null;
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  const [headerSegment, payloadSegment, signatureSegment] = segments;
  if (!headerSegment || !payloadSegment || !signatureSegment) return null;
  try {
    const { kid, alg } = decodeJson(headerSegment);
    if (!kid || alg !== 'RS256') return null;
    let keys = await getSigningKeys(teamDomain);
    // An unknown kid means the keys rotated since they were cached: refetch once before refusing.
    let key = keys.get(kid);
    if (!key) {
      keys = await getSigningKeys(teamDomain, true);
      key = keys.get(kid);
    }
    if (!key) return null;
    const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlDecode(signatureSegment),
      new TextEncoder().encode(`${headerSegment}.${payloadSegment}`));
    if (!verified) return null;
    return identityFromClaims(decodeJson(payloadSegment), audience, teamDomain);
  } catch {
    // A malformed token, an unreachable certs address, bad JSON: all fail closed.
    return null;
  }
}

/** A verified person's email. A service token, a missing subject or a stale assertion is no person. */
export function personOf(identity) {
  const now = Math.floor(Date.now() / 1000);
  if (!identity || identity.kind !== 'user' || identity.claims.common_name || !identity.claims.sub ||
    identity.claims.exp <= now || (identity.claims.nbf !== undefined && identity.claims.nbf > now)) return null;
  const email = identity.id.trim().toLowerCase();
  return isEmail(email) && identity.claims.email?.trim().toLowerCase() === email ? email : null;
}

/** A service token the sign-in wall admits: a machine, never a person. */
export const machineOf = identity => identity?.kind === 'service' && !identity.claims.email && !!identity.claims.common_name &&
  identity.id === identity.claims.common_name ? identity.id : null;

/** The slot's shape for a verified identity: a person, a machine, or nobody. A sign-in that is neither, such as a
 *  user with no subject, is a caller with no name: refused as a stranger is, never taken for no sign-in at all. */
export function callerOf(identity) {
  const email = personOf(identity);
  if (email) return { email, subject: identity.claims.sub };
  const machine = machineOf(identity);
  return machine ? { machine } : identity ? { machine: '' } : null;
}

/** The `signIn` slot over Cloudflare Access with the project's settings. */
export const signIn = env => async request => callerOf(await getAccessIdentity(request, env));
