// The memory route in the app's production Worker, under /_memory/. It answers the Cloudflare REST requests
// memory.mjs sends (a D1 batch, an R2 PUT or GET) on its own bindings, so the path's ids are ignored.
import { batchRefusal, isWrite, memberStatements, ownRuns, readRefusal, sessionIds, shadowRead } from './statements.mjs';

export const MEMORY_PREFIX = '/_memory/';
export const TEAM_HEADER = 'Wong-Memory-Team';
// The caller's role: admin, member, reader or team. The client shows "see everyone's" only to the admin.
export const ROLE_HEADER = 'Wong-Memory-Role';
// The largest transcript the bucket keeps, from any caller.
export const MAX_TRANSCRIPT_BYTES = 50 * 1024 * 1024;
const ROLES = new Set(['admin', 'member', 'reader']);

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const fail = (status, code, message) => json(status, { success: false, errors: [{ code, message }], result: null });
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function hashKey(key) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// A new memory key: wongm_<machine:UUID, base64url>.<random>.
export const newKey = machineId => `wongm_${base64url(new TextEncoder().encode(`machine:${machineId}`))}.${base64url(crypto.getRandomValues(new Uint8Array(32)))}`;

// A member reads only its own transcripts; admin reads all. PUT also checks the session ledger.
export const mayTouch = (caller, key) => caller.role === 'admin' || (caller.subject !== null && key.startsWith(`sessions/${caller.subject}/`));

// SQLite has no dynamic SQL and no escapes in identifiers, so no statement reaches the keys without naming them.
const KEYS_GUARD = /memory_keys|memory_admins|memory_schedules|writable_schema/i;

// An open-site admin key opens memory as admin only while the app has no sign-in: once the Worker has Access ids,
// memory takes the company sign-in alone. A member key needs the sign-in, and an expiry it can't read has passed.
async function keyCaller(db, bearer, env) {
  if (env.CF_ACCESS_TEAM_DOMAIN || env.CF_ACCESS_AUD) return null;
  const grant = await db.prepare('SELECT role, email, expires_at FROM memory_keys WHERE hash = ?').bind(await hashKey(bearer)).first();
  if (grant?.role !== 'admin' || (grant.expires_at != null && !(Date.parse(grant.expires_at) > Date.now()))) return null;
  return { role: 'admin', subject: null, email: grant.email || null };
}

// A cloud schedule's own sign-in, made by the owner: team facts only, until it is revoked.
async function scheduleCaller(db, id, secret) {
  const row = await db.prepare('SELECT name, secret_hash FROM memory_schedules WHERE client_id = ? AND revoked_at IS NULL').bind(id).first();
  return row && row.secret_hash === await hashKey(secret) ? { role: 'team', subject: null, email: `memory-schedule:${row.name}` } : null;
}

// Who is calling: an old admin key, a schedule's sign-in, or the company sign-in `signedIn` verified and gave a role.
async function callerOf(db, request, env, signedIn) {
  const bearer = (request.headers.get('Authorization') || '').match(/^Bearer\s+(wongm_\S+)$/i)?.[1];
  if (bearer) return keyCaller(db, bearer, env);
  const id = request.headers.get('CF-Access-Client-Id'), secret = request.headers.get('CF-Access-Client-Secret');
  if (id && secret) return scheduleCaller(db, id, secret);
  const caller = await signedIn(request, env);
  return caller && ROLES.has(caller.role) && typeof caller.subject === 'string' && caller.subject ? caller : null;
}

async function othersSession(db, statements, caller) {
  for (const id of sessionIds(statements)) {
    const row = await db.prepare('SELECT owner_subject, status FROM sessions WHERE id = ?').bind(id).first();
    if (row && row.owner_subject !== caller.subject) return `session ${id} belongs to another person or unassigned history`;
    if (row?.status === 'private') return `session ${id} is private and cannot be captured`;
  }
  return null;
}

async function query(db, caller, request) {
  const input = await request.json().catch(() => null);
  const statements = input?.batch || (input?.sql ? [input] : null);
  if (!statements?.length) return fail(400, 'bad_request', 'send {"sql", "params"} or {"batch": [...]}');
  if (statements.some(({ sql }) => KEYS_GUARD.test(String(sql)))) return fail(403, 'keys_table', 'no caller can read or change sign-ins');
  const sessionRefusal = await othersSession(db, statements, caller);
  if (sessionRefusal) return fail(403, 'member_write', sessionRefusal);
  // Every run record is stored under the sign-in that sent it, the admin's too.
  let run = ownRuns(statements, caller.subject);
  if (caller.role !== 'admin') {
    const refusal = batchRefusal(statements, caller);
    if (refusal) return fail(403, 'member_write', refusal);
    run = ownRuns(memberStatements(statements, { subject: caller.subject, reader: caller.role === 'reader', now: new Date().toISOString() }), caller.subject);
    // Every read sees only the facts this caller may see, however it is written.
    const reads = new Set(statements.filter(statement => !isWrite(statement)));
    const readError = [...reads].map(({ sql }) => readRefusal(sql)).find(Boolean);
    if (readError) return fail(403, 'member_read', readError);
    run = run.map((statement, index) => reads.has(statements[index]) ? { ...statement, sql: shadowRead(statement.sql, caller.subject) } : statement);
  }
  try {
    const result = await db.batch(run.map(({ sql, params = [] }) => db.prepare(sql).bind(...params)));
    return json(200, { success: true, errors: [], result: result.map(({ results = [], meta = {} }) => ({ success: true, results, meta })) });
  } catch (error) {
    return fail(400, 7500, error.message);
  }
}

async function object(db, bucket, caller, method, key, request) {
  if (!mayTouch(caller, key)) return fail(403, 'not_author', 'only its owner and the admin can read this transcript');
  if (method === 'PUT') {
    const path = key.match(/^sessions\/([^/]+)\/(claude|codex)\/([0-9a-f-]+)\.jsonl$/);
    if (!path || path[1] !== (caller.subject ?? 'unassigned')) return fail(403, 'not_author', 'transcripts are written only under the signed-in person');
    const row = await db.prepare('SELECT owner_subject, status FROM sessions WHERE id = ?').bind(`${path[2]}:${path[3]}`).first();
    if (!row || row.owner_subject !== caller.subject || row.status === 'private') return fail(403, 'not_author', 'register an owned, nonprivate session before upload');
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

// `signedIn` verifies the company sign-in and gives { role, subject, email }, or null; the app Worker passes it.
export async function handleMemory(request, env, signedIn = async () => null) {
  const db = env.MEMORY_DB;
  if (!db) return fail(404, 'no_store', 'this Worker serves no memory store; memory is on the production Worker');
  const { pathname } = new URL(request.url);
  let caller;
  try { caller = await callerOf(db, request, env, signedIn); } catch (error) {
    if (/no such (?:column|table)/i.test(error.message)) return fail(503, 'not_migrated', 'the memory store needs its latest migration');
    throw error;
  }
  if (!caller) return fail(401, 10000, 'not signed in: sign in to the company app again to reach memory');

  const response = await route(db, env, caller, request, pathname);
  const headers = new Headers(response.headers);
  headers.set(TEAM_HEADER, '1');
  headers.set(ROLE_HEADER, caller.role);
  return new Response(response.body, { status: response.status, headers });
}

function route(db, env, caller, request, pathname) {
  if (pathname.endsWith('/caller') && request.method === 'GET') return json(200, { success: true, result: caller });
  if (/\/d1\/database\/[^/]+\/query$/.test(pathname) && request.method === 'POST') return query(db, caller, request);
  const r2 = pathname.match(/\/r2\/buckets\/[^/]+\/objects\/(.+)$/);
  if (r2) {
    if (!env.MEMORY_BUCKET) return fail(404, 'no_bucket', 'this memory store keeps no transcripts');
    let key;
    try { key = decodeURIComponent(r2[1]); } catch { return fail(400, 'bad_path', 'the object path is not valid percent-encoding'); }
    return object(db, env.MEMORY_BUCKET, caller, request.method, key, request);
  }
  return fail(404, 'no_route', `no route for ${request.method} ${pathname}`);
}
