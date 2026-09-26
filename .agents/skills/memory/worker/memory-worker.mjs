// The memory route in the app's production Worker: every memory call reaches it with a memory key, under
// /_memory/. It answers the two Cloudflare REST requests memory.mjs sends — a D1 query batch and an R2
// object PUT or GET — on the Worker's MEMORY_DB and MEMORY_BUCKET bindings, so the client keeps one
// code path. Each Worker serves one store, so the ids in the path are ignored. Key hashes live in the
// store's memory_keys table, which no request may name: only the admin's Cloudflare token manages keys.

export const MEMORY_PREFIX = '/_memory/';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status, code, message) => json(status, { success: false, errors: [{ code, message }], result: null });

export async function hashKey(key) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// A member may touch only its own transcripts; an admin reads and writes its whole bucket.
export const mayTouch = (grant, key) => grant.role === 'admin' || key.startsWith(`sessions/${grant.email}/`);

// SQLite has no dynamic SQL and no escapes in identifiers, so no statement reaches the keys without naming them.
const KEYS_GUARD = /memory_keys|writable_schema/i;

async function query(db, request) {
  const input = await request.json().catch(() => null);
  const statements = input?.batch || (input?.sql ? [input] : null);
  if (!statements?.length) return fail(400, 'bad_request', 'send {"sql", "params"} or {"batch": [...]}');
  if (statements.some(({ sql }) => KEYS_GUARD.test(String(sql)))) return fail(403, 'keys_table', 'no memory key can read or change memory keys');
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

export async function handleMemory(request, env) {
  const db = env.MEMORY_DB;
  if (!db) return fail(404, 'no_store', 'this Worker serves no memory store; memory is on the production Worker');
  const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const grant = bearer && await db.prepare('SELECT email, role FROM memory_keys WHERE hash = ?').bind(await hashKey(bearer)).first();
  if (!grant) return fail(401, 10000, 'unknown memory key');

  const { pathname } = new URL(request.url);
  if (/\/d1\/database\/[^/]+\/query$/.test(pathname) && request.method === 'POST') return query(db, request);
  const r2 = pathname.match(/\/r2\/buckets\/[^/]+\/objects\/(.+)$/);
  if (r2) {
    if (!env.MEMORY_BUCKET) return fail(404, 'no_bucket', 'this memory store keeps no transcripts');
    return object(env.MEMORY_BUCKET, grant, request.method, decodeURIComponent(r2[1]), request);
  }
  return fail(404, 'no_route', `no route for ${request.method} ${pathname}`);
}
