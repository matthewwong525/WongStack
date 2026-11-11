// WongStack's memory store on D1 and R2: every SQL statement memory runs, and who is calling. It runs in the
// app's Worker, so it imports nothing from Node. wiki/development/memory.md#who-sees-what
import { MAX_TRANSCRIPT_BYTES, megabytes, now, serve, StoreError } from '../../skills/memory/store/interface.mjs';

export const MEMORY_PREFIX = '/_memory/';
const ROUTE = '/_memory/v2/';
const ROLES = new Set(['admin', 'member', 'reader']);
const SOURCES = ['save', 'backfill', 'migration', 'consolidation'];
const COLUMNS = 'f.id, f.slug, f.type, f.body, f.author, f.created_at, f.session_id, f.superseded_by, f.owner_subject, f.shared';
const NEWEST = 'f.created_at DESC, f.id DESC';
const TYPE_ORDER = "CASE f.type WHEN 'feedback' THEN 1 WHEN 'project' THEN 2 WHEN 'reference' THEN 3 WHEN 'user' THEN 4 ELSE 5 END";
const FILTERS = { slug: 'f.slug = ?', session: 'f.session_id = ?', notSlug: 'f.slug != ?', type: 'f.type = ?', notType: 'f.type != ?', since: 'f.created_at >= ?', until: 'f.created_at <= ?', author: 'f.author LIKE ?' };
// Each unary `+` stops SQLite driving facts_fts by rowid, which re-ran the MATCH once per stored fact.
const FTS_HITS = '(SELECT +rowid AS rowid, rank FROM facts_fts WHERE facts_fts MATCH ? AND +rowid IN (SELECT id FROM facts))';
const SESSION_UPSERT = `INSERT INTO sessions (id, agent, author, machine, branch, cwd, started_at, ended_at, status, reason, read_through, raw_bytes, updated_at, owner_subject, owner_email)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (id) DO UPDATE SET status = CASE WHEN sessions.status = 'private' THEN 'private' ELSE excluded.status END,
    reason = excluded.reason, read_through = coalesce(excluded.read_through, sessions.read_through), ended_at = coalesce(excluded.ended_at, sessions.ended_at),
    raw_bytes = coalesce(excluded.raw_bytes, sessions.raw_bytes), updated_at = excluded.updated_at, owner_email = coalesce(excluded.owner_email, sessions.owner_email)`;
const FACT_INSERT = 'INSERT INTO facts (slug, type, body, session_id, source, created_at, author, owner_subject, shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const RUN_STATUS = { capture: ['ok', 'failed'], consolidation: ['ok', 'failed'], daily: ['started', 'ok', 'failed'] };
const DAILY_ROW = "kind = 'daily' AND owner_subject IS ? AND day = ?";
const NEWEST_DAILY = "SELECT day, host, started_at, finished_at, status, reason, counts FROM runs WHERE kind = 'daily' AND owner_subject IS ? ORDER BY day DESC, id DESC LIMIT 1";
// A store not yet migrated to 0010 has no `runs.day`: it answers as before and claims no daily tidy.
const UNMIGRATED = /no such column:?\s*day\b|has no column named day\b/i;
const LATELY_DAYS = 7, LATELY_LIMIT = 8, FRESH_LIMIT = 5;
const PLAIN_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const marks = list => list.map(() => '?').join(', ') || 'NULL';
const ago = ms => new Date(Date.now() - ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const parsed = text => { try { const value = JSON.parse(text || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } };
// The caller's newest daily run, as the digest answers it.
const dailyOf = row => row ? { day: row.day, last: row.finished_at || row.started_at, status: row.status, host: row.host, reason: row.reason, counts: parsed(row.counts) } : null;
const forbidden = reason => new StoreError(reason, { kind: 'forbidden' });
// A fact's time: the one sent if it is plain UTC and not after now, so a backfill keeps its date; else now.
const factTime = (sent, time) => PLAIN_UTC.test(String(sent)) && Date.parse(sent) <= Date.parse(time) ? sent : time;

// Words too common to match on their own: a fact sharing only *how* or *should* with a question is noise.
const FILLER = new Set(('how should what when which does the and for with that this from into about have been would could there their '
  + 'them then than also just only some any all our your you are was were can will not').split(' '));

// FTS5 query: every significant word, OR-joined, so a paraphrase that shares a few words still ranks. Filler
// words drop out, unless nothing else is left.
export function ftsQuery(text) {
  const all = [...new Set(String(text).toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) || [])];
  const meant = all.filter(word => !FILLER.has(word));
  const words = (meant.length ? meant : all).slice(0, 24);
  return words.length ? words.map(word => `"${word}"`).join(' OR ') : null;
}

// Facts carrying any of these tags, or a tag aliased to one, one level deep.
const tagClause = count => `f.id IN (SELECT fact_id FROM fact_tags WHERE tag IN (SELECT name FROM tags WHERE coalesce(alias_of, name) IN (
  SELECT coalesce(alias_of, name) FROM tags WHERE name IN (${marks(Array(count).fill(0))}))))`;

// Who sees a fact: shared non-personal facts plus the caller's own. A schedule owns nothing, an old admin key's own
// are the unassigned rows, and only the admin's `everyone` sees every fact.
function visible(caller, everyone, alias = 'f') {
  if (everyone && caller.role === 'admin') return ['1', []];
  const shared = `(${alias}.type NOT IN ('user', 'feedback') AND ${alias}.shared = 1)`;
  return caller.role === 'team' ? [shared, []] : [`(${shared} OR ${alias}.owner_subject IS ?)`, [caller.subject ?? null]];
}
// Sessions and their transcripts: the caller's own, or every one for the admin.
const ownSessions = (caller, alias = 's') => caller.role === 'admin' ? ['1', []] : [`${alias}.owner_subject = ?`, [caller.subject]];

const asFact = row => ({ ...row, ...(typeof row.tags === 'string' ? { tags: JSON.parse(row.tags) } : {}), sources: row.session_id ? [`session:${row.session_id}`] : [] });

// One FactQuery as SQL. Terms with no word to match filter nothing; a missing limit means every row.
function factRead(q, caller) {
  const where = [], params = [];
  const add = (sql, ...values) => { where.push(sql); params.push(...values); };
  const match = q.terms ? ftsQuery(q.terms) : null;
  if (match) params.push(match);
  const sessions = [];
  if (q.branch) {
    const [own, values] = ownSessions(caller, 'b');
    sessions.push([`f.session_id IN (SELECT b.id FROM sessions b WHERE b.branch = ? AND ${own})`, [q.branch, ...values]]);
  }
  if (q.change) {
    const [seen, values] = visible(caller, q.everyone, 'c');
    sessions.push([`f.session_id IN (SELECT DISTINCT c.session_id FROM facts c WHERE c.slug = ? AND c.session_id IS NOT NULL AND ${seen})`, [q.change, ...values]]);
  }
  if (sessions.length) add(`(${sessions.map(([sql]) => sql).join(' OR ')})`, ...sessions.flatMap(([, values]) => values));
  if (!q.all) add('f.superseded_by IS NULL');
  if (Array.isArray(q.ids)) {
    const ids = q.ids.map(Number).filter(Number.isSafeInteger).slice(0, 500);
    add(`f.id IN (${marks(ids)})`, ...ids);
  }
  for (const [key, sql] of Object.entries(FILTERS)) if (q[key]) add(sql, key === 'author' ? `%${q[key]}%` : q[key]);
  if (q.tags?.length) add(tagClause(q.tags.length), ...q.tags);
  const [seen, values] = visible(caller, q.everyone);
  add(seen, ...values);
  const order = { newest: NEWEST, 'threads-first': "CASE WHEN f.type = 'thread' THEN 0 ELSE 1 END, f.created_at DESC" }[q.order]
    ?? (match ? `hits.rank, ${NEWEST}` : NEWEST);
  const tags = q.withTags ? ', (SELECT json_group_array(tag) FROM fact_tags WHERE fact_id = f.id) AS tags' : '';
  const limit = Number.isInteger(q.limit) && q.limit >= 0 ? ` LIMIT ${q.limit}` : '';
  return [`SELECT ${COLUMNS}${tags} FROM facts f${match ? ` JOIN ${FTS_HITS} hits ON hits.rowid = f.id` : ''}
    WHERE ${where.join(' AND ')} ORDER BY ${order}${limit}`, params];
}

// The memory operations for one verified caller. `bucket` is optional: with none, no transcript is kept.
export function d1Store(db, bucket, caller) {
  const statement = ([sql, params]) => db.prepare(sql).bind(...params);
  const rows = async reads => (await db.batch(reads.map(statement))).map(result => result.results || []);
  const first = (sql, ...params) => db.prepare(sql).bind(...params).first();
  const change = async statements => { await rows(statements); return {}; };
  const admin = caller.role === 'admin';
  const subject = caller.subject ?? null;

  // A session row belongs to its signed-in person; a schedule has none, and a private one stays private.
  async function sessionWrite(session) {
    if (caller.role === 'team') throw forbidden('a schedule sign-in writes team facts only, never a session');
    const row = await first('SELECT owner_subject, status FROM sessions WHERE id = ?', String(session.id));
    if (row && row.owner_subject !== subject) throw forbidden(`session ${session.id} belongs to another person or unassigned history`);
    if (row?.status === 'private') throw forbidden(`session ${session.id} is private and cannot be captured`);
    return [SESSION_UPSERT, [session.id, session.agent, caller.email, session.host ?? null, session.branch ?? null, session.cwd ?? null,
      session.startedAt ?? null, session.endedAt ?? null, session.status, session.reason ?? null,
      session.readThrough == null ? null : String(session.readThrough), session.rawBytes ?? null, now(), subject, caller.email ?? null]];
  }

  // The live facts a restate or close copies: only the caller's own, or any for the admin.
  async function targets(ids) {
    if (!ids.length) return new Map();
    const [found] = await rows([factRead({ ids, everyone: true, withTags: true }, caller)]);
    const byId = new Map(found.map(row => [row.id, asFact(row)]));
    for (const id of ids) {
      if (!byId.has(id)) throw new StoreError(`fact #${id} is not live, or not one you may see`);
      if (!admin && (subject === null || byId.get(id).owner_subject !== subject)) throw forbidden(`fact #${id} is someone else's; only they or the admin can restate it`);
    }
    return byId;
  }

  // A new fact's row, or a restated or closed one's with its origin kept.
  function factRow(fact, { session, slug, createdAt, time, old }) {
    if (fact.restate) return { ...old, tags: [...new Set([...old.tags, ...(fact.tags || [])])], supersedes: [old.id] };
    if (fact.close) return { ...old, type: 'project', body: String(fact.body).trim(), session_id: null, created_at: time, supersedes: [old.id] };
    for (const source of fact.sources || []) {
      if (source !== `session:${session?.id}`) throw forbidden('a fact\'s source may name only the session that writes it');
    }
    return { slug: fact.slug || slug, type: fact.type, body: String(fact.body).trim(), session_id: session?.id ?? null,
      created_at: factTime(createdAt, time), author: caller.email ?? null, owner_subject: subject, shared: caller.role === 'reader' ? 0 : 1,
      tags: fact.tags || [], supersedes: (fact.supersedes || []).map(Number).filter(Boolean) };
  }

  return {
    caller: async () => caller,

    facts: async queries => (await rows(queries.map(q => factRead(q, caller)))).map(found => found.map(asFact)),

    async digest({ slug = null, stepTags = [], limit = 60 }) {
      const [seen, values] = visible(caller, false);
      const live = `f.superseded_by IS NULL AND ${seen}`;
      // A preference is new until a finished tidy started after it; with none, for a day.
      const lastOk = "(SELECT started_at FROM runs WHERE kind = 'daily' AND status = 'ok' AND owner_subject IS ? ORDER BY day DESC, id DESC LIMIT 1)";
      const shared = [
        // Other changes' open threads by step tag: one with two tags counts under each; untagged ones have a null tag.
        [`SELECT ft.tag, count(*) AS n FROM facts f LEFT JOIN fact_tags ft ON ft.fact_id = f.id AND ft.tag IN (${marks(stepTags)})
          WHERE ${live} AND f.type = 'thread' AND f.slug != ? GROUP BY ft.tag`, [...stepTags, ...values, slug || '']],
        [`SELECT count(*) AS live FROM facts f WHERE ${live}`, values],
        [`SELECT ${COLUMNS} FROM facts f WHERE ${live} AND f.type = 'thread' AND f.slug = ? ORDER BY f.created_at DESC`, [...values, slug || '']],
        // Only this sign-in's own runs: another person's record never reaches this digest.
        ["SELECT kind, host, started_at, finished_at, status, reason, counts FROM runs WHERE owner_subject IS ? AND kind != 'daily' ORDER BY id DESC LIMIT 1", [subject]],
      ];
      const older = async () => {
        const [steps, [count], threads, [run], facts] = await rows([...shared,
          [`SELECT ${COLUMNS} FROM facts f WHERE ${live} AND f.type != 'thread' ORDER BY ${TYPE_ORDER}, ${NEWEST} LIMIT ?`, [...values, Number(limit) || 60]]]);
        return { facts: facts.map(asFact), live: count.live, threads: threads.map(asFact), steps, run: run ?? null };
      };
      const answer = await rows([...shared,
        [NEWEST_DAILY, [subject]],
        [`SELECT ft.tag, count(*) AS n FROM facts f JOIN fact_tags ft ON ft.fact_id = f.id WHERE ${live} AND f.created_at >= ?
          GROUP BY ft.tag ORDER BY n DESC, ft.tag LIMIT ${LATELY_LIMIT}`, [...values, ago(LATELY_DAYS * 86400000)]],
        // A schedule owns no fact, so it has no preferences of its own.
        [`SELECT ${COLUMNS} FROM facts f WHERE ${live} AND ${caller.role === 'team' ? '0' : 'f.owner_subject IS ?'} AND f.type IN ('feedback', 'user')
          AND f.created_at > coalesce(${lastOk}, ?) ORDER BY ${NEWEST} LIMIT ${FRESH_LIMIT}`,
        [...values, ...(caller.role === 'team' ? [] : [subject]), subject, ago(86400000)]],
      ]).catch(error => { if (UNMIGRATED.test(error.message)) return null; throw error; });
      if (!answer) return older();
      const [steps, [count], threads, [run], [daily], lately, fresh] = answer;
      return { live: count.live, threads: threads.map(asFact), steps, run: run ?? null, daily: dailyOf(daily), lately, fresh: fresh.map(asFact) };
    },

    // One atomic batch: the session row, new tags, then each fact with its tags and supersedes.
    async write({ session, source = 'save', slug, newTags = [], facts = [], createdAt }) {
      if (!SOURCES.includes(source)) throw new StoreError(`source must be one of ${SOURCES.join(', ')}`);
      const time = now();
      const old = await targets(facts.map(fact => Number(fact.restate || fact.close)).filter(Boolean));
      const statements = session ? [await sessionWrite(session)] : [];
      for (const tag of newTags) {
        statements.push(['INSERT OR IGNORE INTO tags (name, definition, alias_of, created_by, created_at) VALUES (?, ?, ?, ?, ?)', [tag.name, tag.definition, tag.aliasOf ?? null, caller.email ?? null, time]]);
      }
      const inserts = [], supersedes = [];
      for (const fact of facts) {
        const row = factRow(fact, { session, slug, createdAt, time, old: old.get(Number(fact.restate || fact.close)) });
        inserts.push(statements.length);
        statements.push([FACT_INSERT, [row.slug, row.type, row.body, row.session_id, source, row.created_at, row.author, row.owner_subject, row.shared]]);
        for (const tag of row.tags) statements.push(['INSERT OR IGNORE INTO fact_tags (fact_id, tag) VALUES ((SELECT max(id) FROM facts), ?)', [tag]]);
        if (!row.supersedes.length) continue;
        supersedes.push({ asked: row.supersedes, at: statements.length });
        // A member's supersede marks only its own facts, so a teammate's fact stays live.
        statements.push([`UPDATE facts SET superseded_by = (SELECT max(id) FROM facts) WHERE superseded_by IS NULL AND id IN (${marks(row.supersedes)})${admin ? '' : ' AND owner_subject = ?'} RETURNING id`,
          [...row.supersedes, ...(admin ? [] : [subject])]]);
      }
      const results = await rows(statements);
      const superseded = supersedes.map(({ asked, at }) => ({ asked, marked: results[at].map(row => row.id) }));
      const unmarked = superseded.flatMap(({ asked, marked }) => asked.filter(id => !marked.includes(id)));
      const [seen, values] = visible(caller, true);
      const [left] = unmarked.length ? await rows([[`SELECT f.id, f.author FROM facts f WHERE f.superseded_by IS NULL AND f.id IN (${marks(unmarked)}) AND ${seen} ORDER BY f.id`, [...unmarked, ...values]]]) : [[]];
      return { ids: inserts.map(at => results[at][0].id), superseded, left };
    },

    async tags() {
      const [seen, values] = visible(caller, true);
      return (await rows([[`SELECT t.name, t.definition, t.alias_of, count(f.id) AS uses FROM tags t LEFT JOIN fact_tags ft ON ft.tag = t.name
        LEFT JOIN facts f ON f.id = ft.fact_id AND ${seen} GROUP BY t.name ORDER BY t.name`, values]]))[0];
    },

    // A tag is shared by everyone, so only the admin defines or merges one.
    async defineTag({ name, definition, aliasOf = null }) {
      if (!admin) throw forbidden('only the admin can change a tag; a member may add facts, but not change them');
      return change([['INSERT INTO tags (name, definition, alias_of, created_by, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (name) DO UPDATE SET definition = excluded.definition, alias_of = excluded.alias_of',
        [name, definition, aliasOf, caller.email ?? null, now()]]]);
    },

    async session({ id }) {
      const [own, values] = ownSessions(caller);
      return (await first(`SELECT * FROM sessions s WHERE s.id = ? AND ${own}`, String(id), ...values)) ?? null;
    },

    putSession: async session => change([await sessionWrite(session)]),

    async transcript({ factId }) {
      const [seen, values] = visible(caller, true);
      const row = await first(`SELECT f.session_id, s.raw_key, s.raw_bytes, s.owner_subject FROM facts f LEFT JOIN sessions s ON s.id = f.session_id WHERE f.id = ? AND ${seen}`, Number(factId), ...values);
      if (!row) return { fact: null };
      const session = row.session_id;
      const missing = why => ({ missing: why, session });
      if (!bucket) return missing('this store has no R2 bucket, so transcripts are not stored');
      if (session && !admin && (row.owner_subject === null || row.owner_subject !== subject)) return missing('only its owner and the admin can read this transcript');
      if (!row.raw_key) return missing(row.raw_bytes > MAX_TRANSCRIPT_BYTES ? `the transcript was ${megabytes(row.raw_bytes)}, over the ${megabytes(MAX_TRANSCRIPT_BYTES)} limit, so it was not kept` : 'no transcript was stored for this session');
      const found = await bucket.get(row.raw_key);
      return found ? new Uint8Array(await new Response(found.body).arrayBuffer()) : missing('the transcript object is missing');
    },

    // A transcript is kept under its signed-in person, only for a session row they own that is not private.
    async putTranscript({ sessionId, agent }, bytes) {
      const id = String(sessionId), uuid = id.split(':')[1] || '';
      if (!['claude', 'codex'].includes(agent) || id !== `${agent}:${uuid}` || !/^[0-9a-f-]+$/.test(uuid)) throw new StoreError('a transcript names its own claude or codex session');
      const row = await first('SELECT owner_subject, status FROM sessions WHERE id = ?', id);
      if (caller.role === 'team' || !row || row.owner_subject !== subject || row.status === 'private') throw forbidden('register an owned, nonprivate session before upload');
      if (!bucket) return { missing: 'this store has no R2 bucket, so transcripts are not stored' };
      if (bytes.byteLength > MAX_TRANSCRIPT_BYTES) throw new StoreError(`a transcript over ${megabytes(MAX_TRANSCRIPT_BYTES)} is not kept`, { kind: 'tooLarge' });
      const key = `sessions/${subject ?? 'unassigned'}/${agent}/${uuid}.jsonl`;
      await bucket.put(key, bytes);
      await rows([['UPDATE sessions SET raw_key = ?, raw_bytes = ?, updated_at = ? WHERE id = ?', [key, bytes.byteLength, now(), id]]]);
      return { key };
    },

    // Every run is stored under the sign-in that sent it; the request names no owner. A daily run is one row per
    // person and day: `started` claims it in one statement, unless `force`, and `ok` or `failed` finishes it.
    async putRun({ kind, host, startedAt, status, reason, counts, day, force = false }) {
      if (!RUN_STATUS[kind]?.includes(status)) throw new StoreError(`a ${kind} run's status is one of ${(RUN_STATUS[kind] || ['ok', 'failed']).join(', ')}`);
      const text = typeof counts === 'string' ? counts : JSON.stringify(counts ?? {});
      const why = reason ? String(reason).slice(0, 300) : null;
      if (kind !== 'daily') {
        return change([['INSERT INTO runs (kind, host, started_at, finished_at, status, reason, counts, owner_subject) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [kind, host ?? null, startedAt || now(), now(), status, why, text, subject]]]);
      }
      if (caller.role === 'team') throw forbidden('a schedule sign-in runs no daily tidy');
      if (!DAY.test(String(day))) throw new StoreError('a daily run names its day as YYYY-MM-DD');
      const started = status === 'started';
      const insert = [`INSERT INTO runs (kind, host, started_at, finished_at, status, reason, counts, owner_subject, day)
        SELECT 'daily', ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM runs WHERE ${DAILY_ROW}) RETURNING id`,
      [host ?? null, startedAt || now(), started ? null : now(), status, why, text, subject, day, subject, day]];
      const update = started
        ? [`UPDATE runs SET host = ?, started_at = ?, finished_at = NULL, status = 'started', reason = NULL, counts = '{}' WHERE ${DAILY_ROW} RETURNING id`, [host ?? null, startedAt || now(), subject, day]]
        : [`UPDATE runs SET finished_at = ?, status = ?, reason = ?, counts = ? WHERE ${DAILY_ROW} RETURNING id`, [now(), status, why, text, subject, day]];
      try {
        if (started && !force) return { claimed: (await rows([insert]))[0].length > 0 };
        await rows([update, insert]);
        return { claimed: started };
      } catch (error) {
        if (UNMIGRATED.test(error.message)) return { claimed: false };
        throw error;
      }
    },

    async stats() {
      const [seen, values] = visible(caller, true);
      const [own, ownValues] = ownSessions(caller);
      const [types, [totals], consolidations] = await rows([
        [`SELECT f.type, count(*) AS n FROM facts f WHERE f.superseded_by IS NULL AND ${seen} GROUP BY f.type ORDER BY f.type`, values],
        [`SELECT (SELECT count(*) FROM facts f WHERE ${seen}) AS facts, (SELECT count(*) FROM facts f WHERE f.superseded_by IS NULL AND ${seen}) AS live,
          (SELECT count(*) FROM sessions s WHERE ${own}) AS sessions, (SELECT count(*) FROM sessions s WHERE s.status = 'private' AND ${own}) AS private`,
        [...values, ...values, ...ownValues, ...ownValues]],
        ["SELECT counts FROM runs WHERE kind = 'consolidation' AND status = 'ok' AND owner_subject IS ? ORDER BY id DESC LIMIT 10", [subject]],
      ]);
      return { types, totals, consolidations };
    },
  };
}

export async function hashKey(key) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// A new memory key: wongm_<machine:UUID, base64url>.<random>.
export const newKey = machineId => `wongm_${base64url(new TextEncoder().encode(`machine:${machineId}`))}.${base64url(crypto.getRandomValues(new Uint8Array(32)))}`;

// An open-site admin key opens memory as admin only while the app has no sign-in: once the Worker has Access ids,
// memory takes the company sign-in alone. An expiry it can't read has passed.
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
export async function callerOf(db, request, env, signedIn) {
  const bearer = (request.headers.get('Authorization') || '').match(/^Bearer\s+(wongm_\S+)$/i)?.[1];
  if (bearer) return keyCaller(db, bearer, env);
  const id = request.headers.get('CF-Access-Client-Id'), secret = request.headers.get('CF-Access-Client-Secret');
  if (id && secret) return scheduleCaller(db, id, secret);
  const caller = await signedIn(request, env);
  return caller && ROLES.has(caller.role) && typeof caller.subject === 'string' && caller.subject ? caller : null;
}

// The app Worker's memory route: /_memory/v2/<operation> on its own bindings; any other memory path answers 404.
export async function handleMemory(request, env, signedIn = async () => null, prefix = ROUTE) {
  const db = env.MEMORY_DB;
  const missing = error => Response.json({ error }, { status: 404 });
  if (!db) return missing('this Worker serves no memory store; memory is on the production Worker');
  if (!new URL(request.url).pathname.startsWith(prefix)) return missing('memory answers only under /_memory/v2/');
  let caller;
  try { caller = await callerOf(db, request, env, signedIn); } catch (error) {
    if (/no such (?:column|table)/i.test(error.message)) return Response.json({ error: 'the memory store needs its latest migration' }, { status: 503 });
    throw error;
  }
  return serve(request, { prefix, caller, store: caller && d1Store(db, env.MEMORY_BUCKET, caller) });
}
