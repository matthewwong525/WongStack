// The memory route in the app's production Worker: every memory call reaches it with a memory key, under
// /_memory/. It answers the two Cloudflare REST requests memory.mjs sends — a D1 query batch and an R2
// object PUT or GET — on the Worker's MEMORY_DB and MEMORY_BUCKET bindings, so the client keeps one
// code path. Each Worker serves one store, so the ids in the path are ignored. Key hashes live in the
// store’s memory_keys table; legacy memory_admins is retained without authority.
// Only the trusted provisioning token manages grants; ordinary keys name neither table.
import { issueLoginLink } from './login-link.mjs';
import { batchRefusal, isWrite, memberStatements, readRefusal, sessionIds, shadowRead } from './statements.mjs';

export const MEMORY_PREFIX = '/_memory/';
export const TEAM_HEADER = 'Wong-Memory-Team';
// The key's role: admin, member, or reader. The client shows "see everyone's" only to the admin.
export const ROLE_HEADER = 'Wong-Memory-Role';
// The largest transcript the bucket keeps, from any key.
export const MAX_TRANSCRIPT_BYTES = 50 * 1024 * 1024;

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const fail = (status, code, message) => json(status, { success: false, errors: [{ code, message }], result: null });
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function hashKey(key) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// A new memory key: wongm_<machine:UUID, base64url>.<random>.
export const newKey = machineId => `wongm_${base64url(new TextEncoder().encode(`machine:${machineId}`))}.${base64url(crypto.getRandomValues(new Uint8Array(32)))}`;

// A member reads only owned transcripts; admin reads all. PUT also checks the session ledger.
export const mayTouch = (grant, key) => grant.role === 'admin' || key.startsWith(`sessions/${grant.machine_id}/`);

// SQLite has no dynamic SQL and no escapes in identifiers, so no statement reaches the keys without naming them.
const KEYS_GUARD = /memory_keys|memory_admins|writable_schema/i;

// Missing schema and legacy rows fail closed; there is no email fallback.
async function findGrant(db, hash) {
  return db.prepare('SELECT machine_id, email, role, reader, expires_at, login_identity FROM memory_keys WHERE hash = ?').bind(hash).first();
}

async function othersSession(db, statements, machineId) {
  for (const id of sessionIds(statements)) {
    const row = await db.prepare('SELECT owner_machine_id, status FROM sessions WHERE id = ?').bind(id).first();
    if (row && row.owner_machine_id !== machineId) return `session ${id} belongs to another machine or unassigned history`;
    if (row?.status === 'private') return `session ${id} is private and cannot be captured`;
  }
  return null;
}

async function query(db, grant, request) {
  const input = await request.json().catch(() => null);
  const statements = input?.batch || (input?.sql ? [input] : null);
  if (!statements?.length) return fail(400, 'bad_request', 'send {"sql", "params"} or {"batch": [...]}');
  if (statements.some(({ sql }) => KEYS_GUARD.test(String(sql)))) return fail(403, 'keys_table', 'no memory key can read or change memory keys');
  const sessionRefusal = await othersSession(db, statements, grant.machine_id);
  if (sessionRefusal) return fail(403, 'member_write', sessionRefusal);
  let run = statements;
  if (grant.role !== 'admin') {
    const refusal = batchRefusal(statements, grant.machine_id);
    if (refusal) return fail(403, 'member_write', refusal);
    run = memberStatements(statements, grant);
    {
      // Every machine-granted read sees only the facts this key may see, however it is written.
      const reads = new Set(statements.filter(statement => !isWrite(statement)));
      const refusal = [...reads].map(({ sql }) => readRefusal(sql)).find(Boolean);
      if (refusal) return fail(403, 'member_read', refusal);
      run = run.map((statement, index) => reads.has(statements[index]) ? { ...statement, sql: shadowRead(statement.sql, grant.machine_id, grant) } : statement);
    }
  }
  try {
    const result = await db.batch(run.map(({ sql, params = [] }) => db.prepare(sql).bind(...params)));
    return json(200, { success: true, errors: [], result: result.map(({ results = [], meta = {} }) => ({ success: true, results, meta })) });
  } catch (error) {
    return fail(400, 7500, error.message);
  }
}

async function object(db, bucket, grant, method, key, request) {
  if (!mayTouch(grant, key)) return fail(403, 'not_author', 'only the owning machine and the admin can read this transcript');
  if (method === 'PUT') {
    const path = key.match(/^sessions\/([^/]+)\/(claude|codex)\/([0-9a-f-]+)\.jsonl$/);
    if (!path || path[1] !== grant.machine_id) return fail(403, 'not_author', 'transcripts are written only under the credential machine');
    const row = await db.prepare('SELECT owner_machine_id, status FROM sessions WHERE id = ?').bind(`${path[2]}:${path[3]}`).first();
    if (!row || row.owner_machine_id !== grant.machine_id || row.status === 'private') return fail(403, 'not_author', 'register an owned, nonprivate session before upload');
    const tooLarge = () => fail(413, 'too_large', `a transcript over ${MAX_TRANSCRIPT_BYTES / 1024 / 1024} MB is not kept`);
    if (Number(request.headers.get('Content-Length')) > MAX_TRANSCRIPT_BYTES) return tooLarge();
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_TRANSCRIPT_BYTES) return tooLarge();
    await bucket.put(key, body);
    return json(200, { success: true, errors: [], result: { key } });
  }
  if (method !== 'GET') return fail(405, 'method', `${method} is not supported`);
  const found = await bucket.get(key);
  return found ? new Response(found.body) : fail(404, 10007, 'object not found');
}

export async function handleMemory(request, env) {
  const db = env.MEMORY_DB;
  if (!db) return fail(404, 'no_store', 'this Worker serves no memory store; memory is on the production Worker');
  const { pathname } = new URL(request.url);
  if (pathname === `${MEMORY_PREFIX}join`) return fail(404, 'no_route', 'install a trusted machine credential; enrollment is not served');

  const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  let grant;
  try { grant = bearer && await findGrant(db, await hashKey(bearer)); } catch (error) {
    if (/no such (?:column|table)/i.test(error.message)) return fail(503, 'not_migrated', 'the memory store needs the machine ownership migration');
    throw error;
  }
  if (!grant) return fail(401, 10000, 'unknown memory key');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(grant.machine_id || '')) return fail(401, 'legacy_key', 'replace this legacy key with a trusted machine credential');
  if (grant.expires_at && Date.parse(grant.expires_at) <= Date.now()) return fail(401, 'key_revoked', 'this memory key was revoked or replaced; ask the admin for a replacement');

  grant.hash = await hashKey(bearer);
  const response = await route(db, env, grant, request, pathname);
  const headers = new Headers(response.headers);
  headers.set(TEAM_HEADER, '1');
  headers.set(ROLE_HEADER, grant.role === 'admin' ? 'admin' : grant.reader ? 'reader' : 'member');
  return new Response(response.body, { status: response.status, headers });
}

function route(db, env, grant, request, pathname) {
  if (pathname.endsWith('/login-link') && request.method === 'POST') return issueLoginLink(db, grant, request);
  if (pathname.endsWith('/caller') && request.method === 'GET') return json(200, { success: true, result: { machineId: grant.machine_id, role: grant.reader ? 'reader' : grant.role, loginIdentity: grant.login_identity ? JSON.parse(grant.login_identity) : null } });
  if (/\/d1\/database\/[^/]+\/query$/.test(pathname) && request.method === 'POST') return query(db, grant, request);
  const r2 = pathname.match(/\/r2\/buckets\/[^/]+\/objects\/(.+)$/);
  if (r2) {
    if (!env.MEMORY_BUCKET) return fail(404, 'no_bucket', 'this memory store keeps no transcripts');
    let key;
    try { key = decodeURIComponent(r2[1]); } catch { return fail(400, 'bad_path', 'the object path is not valid percent-encoding'); }
    return object(db, env.MEMORY_BUCKET, grant, request.method, key, request);
  }
  return fail(404, 'no_route', `no route for ${request.method} ${pathname}`);
}
