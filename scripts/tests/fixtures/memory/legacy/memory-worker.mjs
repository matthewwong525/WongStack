// The memory route in the app's production Worker: every memory call reaches it with a memory key, under
// /_memory/. It answers the two Cloudflare REST requests memory.mjs sends — a D1 query batch and an R2
// object PUT or GET — on the Worker's MEMORY_DB and MEMORY_BUCKET bindings, so the client keeps one
// code path. Each Worker serves one store, so the ids in the path are ignored. Key hashes live in the
// store's memory_keys table, and the admin's GitHub account in memory_admins; no request may name either. The
// admin's Cloudflare token manages keys, and the join route below makes a key for a person GitHub lets into this repo.
import { batchRefusal, isWrite, memberStatements, readRefusal, sessionIds, shadowRead } from './statements.mjs';

export const MEMORY_PREFIX = '/_memory/';
export const TEAM_HEADER = 'Wong-Memory-Team';
// The key's role: admin, member, or reader. The client shows "see everyone's" only to the admin.
export const ROLE_HEADER = 'Wong-Memory-Role';
export const KEY_DAYS = 30;
// The most live keys one GitHub account holds: a join past it stops the key of the machine that joined longest ago.
export const KEY_LIMIT = 10;
// The largest transcript the bucket keeps, from any key.
export const MAX_TRANSCRIPT_BYTES = 50 * 1024 * 1024;
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
const KEYS_GUARD = /memory_keys|memory_admins|writable_schema/i;

// The key's email, role, expiry, reader mark, and whether more than one email holds a key, in one query. A
// store the admin has not migrated has fewer columns: before schema 4 no key is a reader and no fact is
// unshared, and before schema 3 no key expires. Its keys keep working until then.
const TEAM = '(SELECT count(DISTINCT email) FROM memory_keys) > 1 AS team';
const GRANTS = ['expires_at, reader', 'expires_at, 0 AS reader', 'NULL AS expires_at, 0 AS reader']
  .map(columns => `SELECT email, role, ${columns}, ${TEAM} FROM memory_keys WHERE hash = ?`);
async function findGrant(db, hash) {
  for (const [index, sql] of GRANTS.entries()) {
    try {
      const grant = await db.prepare(sql).bind(hash).first();
      return grant && { ...grant, readerSchema: index === 0 };
    } catch (error) {
      if (index === GRANTS.length - 1 || !/no such column/i.test(error.message)) throw error;
    }
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
  let run = statements;
  if (grant.role !== 'admin') {
    const refusal = batchRefusal(statements, grant.email) || await othersSession(db, statements, grant.email);
    if (refusal) return fail(403, 'member_write', refusal);
    run = memberStatements(statements, grant);
    if (grant.team) {
      // In a team, every read sees only the facts this key may see, however it is written.
      const reads = new Set(statements.filter(statement => !isWrite(statement)));
      const refusal = [...reads].map(({ sql }) => readRefusal(sql)).find(Boolean);
      if (refusal) return fail(403, 'member_read', refusal);
      run = run.map((statement, index) => reads.has(statements[index]) ? { ...statement, sql: shadowRead(statement.sql, grant.email, grant) } : statement);
    }
  }
  try {
    const result = await db.batch(run.map(({ sql, params = [] }) => db.prepare(sql).bind(...params)));
    return json(200, { success: true, errors: [], result: result.map(({ results = [], meta = {} }) => ({ success: true, results, meta })) });
  } catch (error) {
    return fail(400, 7500, error.message);
  }
}

async function object(bucket, grant, method, key, request) {
  if (!mayTouch(grant, key)) return fail(403, 'not_author', 'only the author and the admin can read this transcript');
  if (method === 'PUT') {
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

// Whether the store links this GitHub account as its admin, or null on a store before schema 5: there no
// join makes an admin, and a join replaces keys by email and machine only.
async function linkedAdmin(db, githubId) {
  try {
    return Boolean(await db.prepare('SELECT 1 AS yes FROM memory_admins WHERE github_id = ?').bind(githubId).first());
  } catch (error) {
    if (/no such table/i.test(error.message)) return null;
    throw error;
  }
}

// What a join deletes before its insert. On schema 5: this machine's key, the account's expired keys, and its
// keys on other machines beyond the KEY_LIMIT - 1 newest. A renewal rewrites created_at, so the oldest key
// is the machine's that joined longest ago.
const replacedKeys = (db, { email, machine, githubId, now }, linked) => linked === null
  ? [db.prepare('DELETE FROM memory_keys WHERE email = ? AND machine = ?').bind(email, machine)]
  : [
    db.prepare('DELETE FROM memory_keys WHERE machine = ? AND (email = ? OR github_id = ?)').bind(machine, email, githubId),
    db.prepare('DELETE FROM memory_keys WHERE github_id = ? AND expires_at <= ?').bind(githubId, now),
    db.prepare('DELETE FROM memory_keys WHERE github_id = ? AND hash NOT IN (SELECT hash FROM memory_keys WHERE github_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?)')
      .bind(githubId, githubId, KEY_LIMIT - 1),
  ];

// Make a key for this machine when GitHub lets the token's user into this Worker's own repository. Push access
// gives a member key, or an admin key to the GitHub account the admin linked. Read access alone gives a reader
// key, on a private repository only: GitHub can not tell a public repository's read-only collaborator from a
// stranger. The repository and GitHub's address come from the Worker's env, never the request. The token is
// used for three GitHub calls and never kept.
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
  const push = Boolean(info.permissions?.push);
  if (!push && !(info.private && info.permissions?.pull)) {
    return fail(403, 'no_access', info.private ? `this account cannot read ${repo}` : `${repo} is public, so joining its memory needs push access`);
  }
  const listed = await github('/user/emails');
  if (listed.status === 403 || listed.status === 404) return fail(403, 'needs_scope', 'the GitHub token cannot read your verified emails');
  if (!listed.ok) return fail(502, 'github', `GitHub answered HTTP ${listed.status}`);
  const verified = (await listed.json()).filter(entry => entry.verified && typeof entry.email === 'string');
  const wanted = String(input.email || '').toLowerCase();
  const chosen = verified.find(entry => entry.email.toLowerCase() === wanted) || verified.find(entry => entry.primary);
  if (!chosen) return fail(403, 'no_email', 'your GitHub account has no verified email');
  const account = await github('/user');
  const githubId = account.ok ? String((await account.json()).id || '') : '';
  if (!githubId) return fail(502, 'github', `GitHub did not name the account (HTTP ${account.status})`);

  const email = chosen.email.toLowerCase();
  const key = newKey(email);
  const now = iso(Date.now());
  const expiresAt = iso(Date.now() + KEY_DAYS * 86400000);
  try {
    const linked = await linkedAdmin(db, githubId);
    const role = linked ? 'admin' : 'member';
    // An admin is never a reader. Only a reader's key names the schema 4 column, and only a schema 5 store
    // gets the account id, so members join an older store.
    const reader = !linked && !push;
    const row = { hash: await hashKey(key), email, role, created_at: now, machine, expires_at: expiresAt, ...(linked === null ? {} : { github_id: githubId }), ...(reader ? { reader: 1 } : {}) };
    const insert = `INSERT INTO memory_keys (${Object.keys(row).join(', ')}) VALUES (${Object.keys(row).map(() => '?').join(', ')})`;
    await db.batch([...replacedKeys(db, { email, machine, githubId, now }, linked), db.prepare(insert).bind(...Object.values(row))]);
    return json(200, { success: true, errors: [], result: { key, email, role: reader ? 'reader' : role, machine, expiresAt } });
  } catch (error) {
    // SQLite names a missing column one way in a read and another in an insert.
    if (/no such column|has no column named/i.test(error.message)) return fail(503, 'not_migrated', 'the memory store needs its latest migration');
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
  headers.set(ROLE_HEADER, grant.role === 'admin' ? 'admin' : grant.reader ? 'reader' : 'member');
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
