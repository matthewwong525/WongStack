// Core only, deliberately unwired. `human` MUST be getAccessHumanIdentity's result
// for THIS request, never JSON/headers/decoded claims or a cached prior login.
import { MemoryIdentityError, verifiedHuman } from './identity.mjs';

const requests = new WeakMap();
const paths = { GET: '/api/memory-auth/session', POST: '/api/memory-auth/setup/candidates' };
export function ownerNeed(value, code = 'owner-setup-unavailable') {
  if (!value) throw new MemoryIdentityError(code);
}
export async function hashOwnerMaterial(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function ownerRandom(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}

const ownerFrom = `FROM memory_installation i
  JOIN memory_installation_configuration c ON c.installation_id = i.installation_id
  JOIN memory_bootstrap_completion done ON done.installation_id = i.installation_id AND done.request_hash = c.request_hash
  JOIN memory_audit audit ON audit.id = done.audit_id AND audit.installation_id = i.installation_id
    AND audit.actor_kind = 'operator' AND audit.action = 'installation-initialized' AND audit.target_id = i.installation_id AND audit.result = 'allowed'
  JOIN memory_providers p ON p.installation_id = i.installation_id AND p.id = json_extract(c.access_json, '$.providerConfigurationId')
  JOIN memory_owner_intents intent ON intent.installation_id = i.installation_id AND intent.provider_id = p.id`;
const ownerWhere = `i.singleton = 1 AND i.state = 'pending' AND i.minimum_protocol = 1
  AND i.canonical_origin = c.app_origin AND p.status = 'active' AND intent.state = 'pending'
  AND p.issuer = json_extract(c.access_json, '$.issuer') AND p.audience = json_extract(c.access_json, '$.audience')
  AND p.issuer = ? AND p.audience = ? AND lower(intent.email) = ? AND lower(c.owner_email) = ?
  AND json_extract(c.access_json, '$.appApplicationId') = ?
  AND NOT EXISTS (SELECT 1 FROM memory_memberships m WHERE m.installation_id = i.installation_id AND m.role = 'owner' AND m.status = 'active')`;

export async function resolveInitialOwnerRequest(db, request, env, human) {
  ownerNeed(env?.MEMORY_DB === db && db && env.WONG_ENVIRONMENT === 'production' &&
    !Object.hasOwn(env, 'SKIP_AUTH') && !Object.hasOwn(env, 'WORKSPACE_LOGIN'), 'human-required');
  ownerNeed(human && Object.keys(human).length === 4 && ['issuer', 'audience', 'subject', 'email'].every(key => Object.hasOwn(human, key)), 'human-required');
  const proof = verifiedHuman(human);
  ownerNeed(proof.issuer === `https://${env.CF_ACCESS_TEAM_DOMAIN}` && proof.audience === env.CF_ACCESS_AUD &&
    typeof env.CF_ACCESS_APP_ID === 'string' && env.CF_ACCESS_APP_ID.length > 0 && /^[a-f0-9]{32}$/.test(env.CF_ACCESS_WORKER_ID || ''), 'human-required');
  ownerNeed(!request.headers.has('Authorization') && !request.headers.has('Cf-Access-Client-Id') && !request.headers.has('Cf-Access-Client-Secret'), 'human-required');
  const url = new URL(request.url);
  ownerNeed(paths[request.method] === url.pathname && !url.search && !url.hash, 'owner-request-denied');
  const site = request.headers.get('Sec-Fetch-Site');
  ownerNeed(site === null || site === 'same-origin', 'owner-request-denied');
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion') ?? request.headers.get('Cookie')?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
  ownerNeed(typeof assertion === 'string' && assertion.length > 0, 'human-required');
  const params = [proof.issuer, proof.audience, proof.email, proof.email, env.CF_ACCESS_APP_ID];
  let row;
  try {
    row = await db.prepare(`SELECT i.installation_id, i.repository_id, i.auth_revision, c.pin_revision, c.app_origin, p.id AS provider_id
      ${ownerFrom} WHERE ${ownerWhere}`).bind(...params).first();
  } catch { throw new MemoryIdentityError('owner-setup-unavailable'); }
  ownerNeed(row && url.origin === row.app_origin);
  const origin = request.headers.get('Origin');
  ownerNeed(request.method === 'POST' ? origin === row.app_origin : origin === null || origin === row.app_origin, 'owner-request-denied');
  const context = Object.freeze({ installationId: row.installation_id, repositoryId: row.repository_id, verifiedEmail: proof.email });
  requests.set(context, { db, request, proof, row, params, sessionHash: await hashOwnerMaterial(assertion), used: false });
  return context;
}

export function takeInitialOwnerRequest(db, context, method) {
  const value = requests.get(context);
  ownerNeed(value && value.db === db && !value.used && value.request.method === method, 'owner-request-denied');
  value.used = true; // A context cannot stand in for verification on another request.
  const { row } = value;
  return { ...value, guard: {
    sql: `EXISTS (SELECT 1 ${ownerFrom} WHERE ${ownerWhere}
      AND i.installation_id = ? AND i.repository_id = ? AND i.auth_revision = ?
      AND c.pin_revision = ? AND c.app_origin = ? AND p.id = ?)`,
    params: [...value.params, row.installation_id, row.repository_id, row.auth_revision, row.pin_revision, row.app_origin, row.provider_id],
  } };
}

export async function issueInitialOwnerCsrf(db, context) {
  const { guard, row, proof, sessionHash } = takeInitialOwnerRequest(db, context, 'GET');
  const token = `wm_csrf_${ownerRandom(32)}`;
  const hash = await hashOwnerMaterial(token);
  const scope = [row.installation_id, row.provider_id, proof.subject];
  let result;
  try {
    result = await db.batch([
      db.prepare(`DELETE FROM memory_csrf_proofs WHERE hash IN (SELECT hash FROM memory_csrf_proofs
        WHERE installation_id = ? AND provider_id = ? AND subject = ? AND expires_at <= unixepoch() LIMIT 64) AND ${guard.sql}`)
        .bind(...scope, ...guard.params),
      db.prepare(`INSERT INTO memory_csrf_proofs (hash, installation_id, provider_id, issuer, subject, session_hash, created_at, expires_at)
        SELECT ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch() + 600 WHERE ${guard.sql}
        AND (SELECT count(*) FROM memory_csrf_proofs WHERE installation_id = ? AND provider_id = ? AND subject = ? AND expires_at > unixepoch()) < 16
        RETURNING hash, expires_at`)
        .bind(hash, row.installation_id, row.provider_id, proof.issuer, proof.subject, sessionHash, ...guard.params, ...scope),
    ]);
  } catch { throw new MemoryIdentityError('owner-setup-unavailable'); }
  ownerNeed(Array.isArray(result) && result.length === 2 && result.every(item => item?.success === true));
  const issued = result[1]?.results;
  ownerNeed(Array.isArray(issued) && issued.length === 1 && issued[0].hash === hash, 'owner-csrf-unavailable');
  return { csrfToken: token, expiresAt: issued[0].expires_at };
}

export async function emptyOwnerBody(request) {
  ownerNeed(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() === 'application/json', 'owner-request-denied');
  let reader;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = ''; let bytes = 0;
  try {
    reader = request.body?.getReader();
    ownerNeed(reader, 'owner-request-denied');
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 256) { await reader.cancel(); throw new MemoryIdentityError('owner-request-denied'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const body = JSON.parse(text);
    ownerNeed(body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0, 'owner-request-denied');
  } catch { throw new MemoryIdentityError('owner-request-denied'); }
  finally { reader?.releaseLock(); }
}
