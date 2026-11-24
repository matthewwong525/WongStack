// Every call the plugin makes. A backend answers each and decides what the caller sees; the plugin never filters.
// No operation edits or deletes a fact. Runs in Node and in a Worker.

// The shapes of a fact, a read, and a write are in interface.d.mts.
export const OPERATIONS = {
  caller: 'who is calling → { role: admin|member|reader|team, subject, email }',
  facts: 'FactQuery[] → Fact[][], one round trip for many reads',
  digest: '{ slug, stepTags } → { live, threads, steps, run, daily, lately, fresh }',
  write: '{ session?, source, slug?, newTags?, facts: FactWrite[], createdAt? } → { ids, superseded: [{ asked, marked }], left: [{ id, author }] }',
  tags: '→ [{ name, definition, alias_of, uses }]',
  defineTag: '{ name, definition, aliasOf } → {}, admin only',
  session: '{ id } → session row or null',
  putSession: '{ id, agent, host, branch, cwd, startedAt, endedAt, status, reason, readThrough, rawBytes } → {}',
  transcript: '{ factId } → bytes, or { missing: why, session }, or { fact: null }',
  putTranscript: '{ sessionId, agent } + bytes → { key } or { missing: why }',
  putRun: '{ kind, host, startedAt, status, reason, counts, day?, force? } → {}, or { claimed } for a daily run',
  stats: '→ { types, totals, consolidations }',
};

export const TEAM_HEADER = 'Wong-Memory-Team';
// The caller's role on every answer: the digest offers "see everyone's" only to the admin.
export const ROLE_HEADER = 'Wong-Memory-Role';
// The largest transcript a store keeps, from any caller.
export const MAX_TRANSCRIPT_BYTES = 50 * 1024 * 1024;
export const megabytes = bytes => `${Math.ceil(bytes / 1024 / 1024)} MB`;
export const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const SPOOLABLE = new Set(['unconfigured', 'auth', 'network', 'server', 'signin']);

// kind: unconfigured | signin | auth | network | server | forbidden | query | tooLarge. `reason` is the short form.
export class StoreError extends Error {
  constructor(reason, { kind = 'query', help } = {}) {
    super(help ? `${reason}. See ${help}.` : reason);
    this.kind = kind;
    this.reason = reason;
  }
  get spoolable() { return SPOOLABLE.has(this.kind); }
}

const STATUS = { forbidden: 403, query: 400, tooLarge: 413, auth: 401 };

// The client: POST <url>/v2/<operation> with JSON; a transcript goes as bytes, its arguments in the query.
export function httpStore({ url, headers = () => ({}), timeoutMs = 15000, signal, onRequest = () => {} }) {
  let role = null;
  async function call(op, args = {}, bytes) {
    const sent = await headers();
    const query = bytes ? `?args=${encodeURIComponent(JSON.stringify(args))}` : '';
    const timeout = AbortSignal.timeout(timeoutMs);
    let response;
    try {
      onRequest();
      response = await fetch(`${url.replace(/\/$/, '')}/v2/${op}${query}`, {
        method: 'POST', redirect: 'manual', body: bytes ?? JSON.stringify(args),
        headers: { 'Content-Type': bytes ? 'application/octet-stream' : 'application/json', ...sent },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (error) {
      throw new StoreError(`memory store unreachable (${error.name === 'TimeoutError' ? 'timeout' : 'network'})`, { kind: 'network' });
    }
    role = response.headers.get(ROLE_HEADER) || role;
    if (response.status >= 300 && response.status < 400) throw new StoreError('memory transport refused a redirect', { kind: 'auth' });
    if (response.ok && !(response.headers.get('Content-Type') || '').includes('json')) return new Uint8Array(await response.arrayBuffer());
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data.result;
    throw answerError(response.status, data);
  }
  const store = Object.fromEntries(Object.keys(OPERATIONS).map(op => [op, (args, bytes) => call(op, args, bytes)]));
  return Object.defineProperty(store, 'role', { get: () => role });
}

// An answer's error, by status: an edge refusal (no `kind` of the store's own) is the sign-in's fault.
function answerError(status, { error, kind }) {
  if (status === 403 && kind === 'forbidden') return new StoreError(`the memory store refused this: ${error}`, { kind: 'forbidden' });
  if (status === 401 || status === 403) return new StoreError(`the memory store refused this sign-in (HTTP ${status})`, { kind: 'auth' });
  if (status === 404) return new StoreError('the memory store does not answer yet; it serves memory once production deploys its route', { kind: 'unconfigured' });
  if (status >= 500) return new StoreError(`memory store error (HTTP ${status}${error ? `: ${error}` : ''})`, { kind: 'server' });
  return new StoreError(error || `memory store refused the request (HTTP ${status})`, { kind: kind === 'tooLarge' ? 'tooLarge' : 'query' });
}

const answer = (status, body, headers) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

// The server: route a request under `prefix` to the store's operation, with the caller's role on every answer.
export async function serve(request, { prefix, caller, store }) {
  const { pathname, searchParams } = new URL(request.url);
  const op = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
  if (!caller) return answer(401, { error: 'not signed in: sign in to the company app again to reach memory' });
  const headers = { [TEAM_HEADER]: '1', [ROLE_HEADER]: caller.role };
  if (request.method !== 'POST' || !Object.hasOwn(OPERATIONS, op)) return answer(404, { error: `no memory operation ${op || pathname}` }, headers);
  try {
    const bytes = op === 'putTranscript';
    // Refuse an advertised oversize body before it is read; the store checks the bytes it gets again.
    if (bytes && Number(request.headers.get('Content-Length')) > MAX_TRANSCRIPT_BYTES) return answer(413, { error: `a transcript over ${megabytes(MAX_TRANSCRIPT_BYTES)} is not kept`, kind: 'tooLarge' }, headers);
    const args = bytes ? JSON.parse(searchParams.get('args') || '{}') : await request.json();
    const result = await store[op](args, bytes ? new Uint8Array(await request.arrayBuffer()) : undefined);
    if (result instanceof Uint8Array) return new Response(result, { headers: { ...headers, 'Content-Type': 'application/octet-stream' } });
    return answer(200, { result: result ?? null }, headers);
  } catch (error) {
    if (error instanceof SyntaxError) return answer(400, { error: 'the request is not JSON', kind: 'query' }, headers);
    // A store a release has not migrated yet: the caller waits and spools, as for any server error.
    const status = STATUS[error.kind] ?? (/no such (?:column|table)/i.test(error.message) ? 503 : 500);
    return answer(status, { error: error.reason || error.message, kind: error.kind }, headers);
  }
}
