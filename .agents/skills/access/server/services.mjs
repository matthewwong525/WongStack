// GET /api/services: one short list of the saved keys a caller can use, each with its purpose and whether it is
// ready. wiki/stack/service-catalogue.md
import { described, forwards, keyIds, keyTitle, offered, saved, worksAlone } from './levels.mjs';

const MAX = 200;
/** Token shapes no list may carry, whatever their name. */
const TOKEN = /(?:wongm_|wongl_|ghp_|github_pat_|sk-)[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;

const refusal = (code, message, status) => Response.json({ error: { code, message, requestId: crypto.randomUUID() } },
  { status, headers: { 'Cache-Control': 'no-store' } });

/** The level the caller holds for a key now, or null. Before permissions start, only the owner holds one. */
function heldLevel(registry, policy, id) {
  if (policy.state === 'current') return policy.keys?.get(id) ?? null;
  return policy.state === 'not_started' && policy.role === 'owner' ? offered(registry, id).at(-1) : null;
}

/** Whether the list would show a saved value of 8 characters or more, or anything shaped like a token. */
const showsSecret = (value, registry, secret) => {
  const text = JSON.stringify(value);
  return TOKEN.test(text) || keyIds(registry).some(id => registry[id].secrets.some(name => {
    const held = secret(name);
    return typeof held === 'string' && held.length >= 8 && text.includes(held);
  }));
};

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** The services list for `caller` (or null) under `policy`, unless `refusal`. `leaks(value)` adds the project's own
 *  check for a value that must not leave. A key the server uses alone is not a service. */
export async function servicesRoute({ request, caller, policy, refusal: denied, registry, secret = () => undefined, leaks = () => false }) {
  if (!caller) return refusal('authentication_required', 'Company login required', 401);
  if (request.method !== 'GET') return Response.json({ error: 'Not found' }, { status: 404 });
  if (denied) return denied;
  const all = new URL(request.url).searchParams.get('all') === '1';
  const listed = keyIds(registry).filter(id => !worksAlone(registry, id)).map(id => ({ id, name: keyTitle(registry, id), ...described(registry, id),
    ready: saved(registry, secret, id), level: heldLevel(registry, policy, id), direct: forwards(registry, id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const value = { services: listed.filter(key => all || key.level).slice(0, MAX), needAccess: listed.filter(key => !key.level).length };
  if (showsSecret(value, registry, secret) || leaks(value)) return refusal('internal_error', 'Action failed', 500);
  const revision = await digest(value);
  const headers = { ETag: `"${await digest({ revision, caller })}"`, 'Cache-Control': 'private, no-cache',
    Vary: 'Cookie, Cf-Access-Jwt-Assertion, cf-access-token' };
  if (request.headers.get('if-none-match') === headers.ETag) return new Response(null, { status: 304, headers });
  return Response.json({ revision, ...value }, { headers });
}
