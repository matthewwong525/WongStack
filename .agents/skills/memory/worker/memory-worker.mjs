// The account's memory Worker (wong-memory): every memory call goes through it with a memory key.
// It answers the two Cloudflare REST requests memory.mjs sends — a D1 query batch and an R2 object
// PUT or GET — on its own bindings, so the client keeps one code path. It has bindings to each
// attached repo's memory database (DB_<id without hyphens>) and bucket (R2_<name, - to _>), and to the
// keys database (KEYS), which no request path reaches.

export const bindingFor = {
  database: id => `DB_${id.replace(/-/g, '')}`,
  bucket: name => `R2_${name.replace(/-/g, '_')}`,
};

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status, code, message) => json(status, { success: false, errors: [{ code, message }], result: null });

export async function hashKey(key) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// A member may touch only its own transcripts; an admin reads and writes its whole bucket.
export const mayTouch = (grant, key) => grant.role === 'admin' || key.startsWith(`sessions/${grant.email}/`);

async function query(db, request) {
  const input = await request.json().catch(() => null);
  const statements = input?.batch || (input?.sql ? [input] : null);
  if (!statements?.length) return fail(400, 'bad_request', 'send {"sql", "params"} or {"batch": [...]}');
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

export default {
  async fetch(request, env) {
    const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const grant = bearer && await env.KEYS.prepare('SELECT email, role, database_id, bucket FROM keys WHERE hash = ?').bind(await hashKey(bearer)).first();
    if (!grant) return fail(401, 10000, 'unknown memory key');

    const { pathname } = new URL(request.url);
    const d1 = pathname.match(/\/d1\/database\/([^/]+)\/query$/);
    if (d1 && request.method === 'POST') {
      if (d1[1] !== grant.database_id) return fail(403, 'other_store', 'this key opens another memory store');
      const db = env[bindingFor.database(d1[1])];
      return db ? query(db, request) : fail(404, 'unattached', 'this memory database is not attached to the Worker');
    }
    const r2 = pathname.match(/\/r2\/buckets\/([^/]+)\/objects\/(.+)$/);
    if (r2) {
      if (r2[1] !== grant.bucket) return fail(403, 'other_store', 'this key opens another memory store');
      const bucket = env[bindingFor.bucket(r2[1])];
      return bucket ? object(bucket, grant, request.method, decodeURIComponent(r2[2]), request) : fail(404, 'unattached', 'this bucket is not attached to the Worker');
    }
    return fail(404, 'no_route', `no route for ${request.method} ${pathname}`);
  },
};
