// The memory route in the app's production Worker: every memory call reaches it with a memory key, under
// /_memory/. It answers the two Cloudflare REST requests memory.mjs sends — a D1 query batch and an R2
// object PUT or GET — on the Worker's MEMORY_DB and MEMORY_BUCKET bindings, so the client keeps one
// code path. Each Worker serves one store, so the ids in the path are ignored. Key hashes live in the
// store's memory_keys table, which no request may name: the admin's Cloudflare token manages keys, and
// the join route below makes a key for a person GitHub lets into this repo.
import { batchRefusal, sessionIds } from './statements.mjs';

export const MEMORY_PREFIX = '/_memory/';
export const TEAM_HEADER = 'Wong-Memory-Team';
export const KEY_DAYS = 30;
const GITHUB_API = 'https://api.github.com';

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const fail = (status, code, message) => json(status, { success: false, errors: [{ code, message }], result: null });
const iso = time => new Date(time).toISOString().replace(/\.\d{3}Z$/, 'Z');
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function hashKey(key) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// A new memory key: wongm_<the email, base64url>.<random>.
export const newKey = email => `wongm_${base64url(new TextEncoder().encode(email))}.${base64url(crypto.getRandomValues(new Uint8Array(32)))}`;

// A member may touch only its own transcripts; an admin reads and writes its whole bucket.
export const mayTouch = (grant, key) => grant.role === 'admin' || key.startsWith(`sessions/${grant.email}/`);

// SQLite has no dynamic SQL and no escapes in identifiers, so no statement reaches the keys without naming them.
const KEYS_GUARD = /memory_keys|writable_schema/i;

// The key's email, role, expiry, and whether more than one email holds a key, in one query. A store the
// admin has not migrated to schema 3 has no expiry column; its keys keep working until then.
const TEAM = '(SELECT count(DISTINCT email) FROM memory_keys) > 1 AS team';
async function findGrant(db, hash) {
  try {
    return await db.prepare(`SELECT email, role, expires_at, ${TEAM} FROM memory_keys WHERE hash = ?`).bind(hash).first();
  } catch (error) {
    if (!/no such column/i.test(error.message)) throw error;
    return db.prepare(`SELECT email, role, NULL AS expires_at, ${TEAM} FROM memory_keys WHERE hash = ?`).bind(hash).first();
  }
}

// Why a member's session upserts would rewrite a row another author holds, or null when every row is its own
// or new. A row with no author predates keys, and only the admin may take it over.
async function othersSession(db, statements, email) {
  for (const id of sessionIds(statements)) {
    const row = await db.prepare('SELECT author FROM sessions WHERE id = ?').bind(id).first();
    if (row && String(row.author ?? '').toLowerCase() !== email) return `session ${id} belongs to another author`;
  }
  return null;
}

async function query(db, grant, request) {
  const input = await request.json().catch(() => null);
  const statements = input?.batch || (input?.sql ? [input] : null);
  if (!statements?.length) return fail(400, 'bad_request', 'send {"sql", "params"} or {"batch": [...]}');
  if (statements.some(({ sql }) => KEYS_GUARD.test(String(sql)))) return fail(403, 'keys_table', 'no memory key can read or change memory keys');
  if (grant.role !== 'admin') {
    const refusal = batchRefusal(statements, grant.email) || await othersSession(db, statements, grant.email);
    if (refusal) return fail(403, 'member_write', refusal);
  }
  try {
    const result = await db.batch(statements.map(({ sql, params = [] }) => db.prepare(sql).bind(...params)));
    return json(200, { success: true, errors: [], result: result.map(({ results = [], meta = {} }) => ({ success: true, results, meta })) });
  } catch (error) {
    return fail(400, 7500, error.message);
  }
}

async function object(bucket, grant, method, key, request) {
  if (!mayTouch(grant, key)) return fail(403, 'not_author', 'only the author and the admin can read this transcript');
  if (method === 'PUT') {
    await bucket.put(key, await request.arrayBuffer());
    return json(200, { success: true, errors: [], result: { key } });
  }
  if (method !== 'GET') return fail(405, 'method', `${method} is not supported`);
  const found = await bucket.get(key);
  return found ? new Response(found.body) : fail(404, 10007, 'object not found');
}

// Make a key for this machine when GitHub lets the token's user into this Worker's own repository: read
// access for a private repository, push for a public one. The repository and GitHub's address come from
// the Worker's env, never the request. The token is used for two GitHub calls and never kept.
async function join(db, env, request) {
  const repo = env.GITHUB_REPOSITORY;
  if (!repo) return fail(503, 'no_repo', 'this Worker does not know its GitHub repository; CI\'s production deploy sets it');
  const input = await request.json().catch(() => null);
  const token = typeof input?.token === 'string' ? input.token : '';
  const machine = typeof input?.machine === 'string' ? input.machine.slice(0, 100) : '';
  if (!token || !machine) return fail(400, 'bad_request', 'send {"token", "machine", "email"}');
  const api = (env.GITHUB_API || GITHUB_API).replace(/\/$/, '');
  const github = path => fetch(`${api}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'wongstack-memory' } });

  const found = await github(`/repos/${repo}`);
  if (found.status === 401) return fail(401, 'github_token', 'GitHub did not accept the token');
  if (!found.ok) return fail(403, 'no_access', `GitHub does not show ${repo} to this account`);
  const info = await found.json();
  if (!(info.private ? info.permissions?.pull : info.permissions?.push)) {
    return fail(403, 'no_access', info.private ? `this account cannot read ${repo}` : `${repo} is public, so joining its memory needs push access`);
  }
  const listed = await github('/user/emails');
  if (listed.status === 403 || listed.status === 404) return fail(403, 'needs_scope', 'the GitHub token cannot read your verified emails');
  if (!listed.ok) return fail(502, 'github', `GitHub answered HTTP ${listed.status}`);
  const verified = (await listed.json()).filter(entry => entry.verified && typeof entry.email === 'string');
  const wanted = String(input.email || '').toLowerCase();
  const chosen = verified.find(entry => entry.email.toLowerCase() === wanted) || verified.find(entry => entry.primary);
  if (!chosen) return fail(403, 'no_email', 'your GitHub account has no verified email');

  const email = chosen.email.toLowerCase();
  const key = newKey(email);
  const expiresAt = iso(Date.now() + KEY_DAYS * 86400000);
  try {
    const admin = await db.prepare("SELECT 1 AS yes FROM memory_keys WHERE email = ? AND role = 'admin' LIMIT 1").bind(email).first();
    const role = admin ? 'admin' : 'member';
    await db.batch([
      db.prepare('DELETE FROM memory_keys WHERE email = ? AND machine = ?').bind(email, machine),
      db.prepare('INSERT INTO memory_keys (hash, email, role, created_at, machine, expires_at) VALUES (?, ?, ?, ?, ?, ?)').bind(await hashKey(key), email, role, iso(Date.now()), machine, expiresAt),
    ]);
    return json(200, { success: true, errors: [], result: { key, email, role, machine, expiresAt } });
  } catch (error) {
    if (/no such column/i.test(error.message)) return fail(503, 'not_migrated', 'the memory store needs its schema 3 migration');
    throw error;
  }
}

export async function handleMemory(request, env) {
  const db = env.MEMORY_DB;
  if (!db) return fail(404, 'no_store', 'this Worker serves no memory store; memory is on the production Worker');
  const { pathname } = new URL(request.url);
  if (pathname === `${MEMORY_PREFIX}join` && request.method === 'POST') return join(db, env, request);

  const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const grant = bearer && await findGrant(db, await hashKey(bearer));
  if (!grant) return fail(401, 10000, 'unknown memory key');
  if (grant.expires_at && Date.parse(grant.expires_at) <= Date.now()) return fail(401, 'key_expired', 'this memory key expired; memory.mjs join renews it');

  const response = await route(db, env, grant, request, pathname);
  const headers = new Headers(response.headers);
  headers.set(TEAM_HEADER, grant.team ? '1' : '0');
  return new Response(response.body, { status: response.status, headers });
}

function route(db, env, grant, request, pathname) {
  if (/\/d1\/database\/[^/]+\/query$/.test(pathname) && request.method === 'POST') return query(db, grant, request);
  const r2 = pathname.match(/\/r2\/buckets\/[^/]+\/objects\/(.+)$/);
  if (r2) {
    if (!env.MEMORY_BUCKET) return fail(404, 'no_bucket', 'this memory store keeps no transcripts');
    let key;
    try { key = decodeURIComponent(r2[1]); } catch { return fail(400, 'bad_path', 'the object path is not valid percent-encoding'); }
    return object(env.MEMORY_BUCKET, grant, request.method, key, request);
  }
  return fail(404, 'no_route', `no route for ${request.method} ${pathname}`);
}
