// The memory script's write statements, shared with the memory route. A member may run only these writes, as its
// signed-in person, and plain reads. The client sends these for every role; the route swaps in MEMBER_WRITES.

export const WRITES = {
  session: {
    sql: `INSERT INTO sessions (id, agent, author, machine, branch, cwd, started_at, ended_at, status, reason, read_through, raw_key, raw_bytes, updated_at, owner_subject, owner_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET status = CASE WHEN sessions.status = 'private' THEN 'private' ELSE excluded.status END,
      reason = excluded.reason, read_through = coalesce(excluded.read_through, sessions.read_through), ended_at = coalesce(excluded.ended_at, sessions.ended_at),
      raw_key = coalesce(excluded.raw_key, sessions.raw_key), raw_bytes = coalesce(excluded.raw_bytes, sessions.raw_bytes), updated_at = excluded.updated_at, owner_subject = excluded.owner_subject,
      owner_email = coalesce(excluded.owner_email, sessions.owner_email)`,
    owner: 14,
    email: 15,
  },
  tag: { sql: 'INSERT OR IGNORE INTO tags (name, definition, alias_of, created_by, created_at) VALUES (?, ?, ?, ?, ?)' },
  fact: { sql: 'INSERT INTO facts (slug, type, body, session_id, source, created_at, author, owner_subject, shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id', owner: 7 },
  factTag: { sql: 'INSERT OR IGNORE INTO fact_tags (fact_id, tag) VALUES ((SELECT max(id) FROM facts), ?)' },
  supersede: { sql: 'UPDATE facts SET superseded_by = (SELECT max(id) FROM facts) WHERE superseded_by IS NULL AND id IN (?) RETURNING id' },
  run: { sql: 'INSERT INTO runs (kind, host, started_at, finished_at, status, reason, counts) VALUES (?, ?, ?, ?, ?, ?, ?)' },
};

// What the route runs for every caller's run record, the admin's too: the same insert, stored under the sign-in
// that sent it (NULL for a schedule or an old key). The request has no parameter that names the owner.
export const RUN_WITH_OWNER = 'INSERT INTO runs (kind, host, started_at, finished_at, status, reason, counts, owner_subject) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

// The admin's own writes. They sit outside WRITES, so no member or reader may run them: a tag is shared.
export const ADMIN_WRITES = {
  tagUpdate: { sql: 'UPDATE tags SET definition = ?, alias_of = ? WHERE name = ?' },
};

// What the route runs for a member in place of the script's own statement: a supersede marks only the caller's
// own facts, so a teammate's fact stays live, and a reader's fact is stored unshared.
export const MEMBER_WRITES = {
  supersede: { sql: 'UPDATE facts SET superseded_by = (SELECT max(id) FROM facts) WHERE superseded_by IS NULL AND id IN (?) AND owner_subject = ? RETURNING id' },
  readerFact: { sql: 'INSERT INTO facts (slug, type, body, session_id, source, created_at, author, owner_subject, shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0) RETURNING id' },
};

const listOf = (sql, count) => sql.replace('IN (?)', `IN (${Array.from({ length: count }, () => '?').join(', ')})`);

// The supersede statement for `count` fact ids.
export const supersedeSql = count => listOf(WRITES.supersede.sql, count);

// One shape per statement: whitespace collapsed, and a list of placeholders read as one.
const shape = sql => String(sql).replace(/\s+/g, ' ').replace(/\(\s*\?(?:\s*,\s*\?)*\s*\)/g, '(?)').trim();
const BY_SHAPE = new Map(Object.values(WRITES).map(write => [shape(write.sql), write]));

const WRITE_WORDS = /\b(?:INSERT|UPDATE|DELETE|REPLACE|UPSERT|DROP|ALTER|CREATE|PRAGMA|ATTACH|DETACH|VACUUM|REINDEX|ANALYZE)\b/i;
// Writes that act on the newest fact: a member sends them only after its own fact insert in the same batch.
const AFTER_OWN_FACT = new Set([WRITES.factTag, WRITES.supersede]);

// Why a member may not run this statement, or null when it may. A read is checked on its whole text,
// with nothing stripped: stripping quotes let a quoted name such as ['] hide a write from the check.
export function memberRefusal({ sql, params = [] }, { subject, email }) {
  const write = BY_SHAPE.get(shape(sql));
  if (write) {
    // A schedule has no person: it writes shared facts with no owner, and never a session.
    if (write === WRITES.session && subject === null) return 'a schedule sign-in writes team facts only, never a session';
    if (write.email !== undefined && params[write.email] !== email) return 'a session names its signed-in person\'s own email';
    if (write.owner === undefined || params[write.owner] === subject) return null;
    return subject === null ? 'a schedule sign-in writes facts with no owner' : 'a member writes only as its signed-in person';
  }
  const text = String(sql).trim().replace(/;\s*$/, '');
  if (/^(?:SELECT|WITH)\b/i.test(text) && !WRITE_WORDS.test(text) && !text.includes(';')) return null;
  return 'a member may add facts, but not change or delete them';
}

// Why a member may not run this batch, or null when it may: each statement passes memberRefusal, and a
// fact tag or a supersede comes after the member's own fact insert, so it never acts on someone else's fact.
export function batchRefusal(statements, caller) {
  let ownFact = false;
  for (const statement of statements) {
    const refusal = memberRefusal(statement, caller);
    if (refusal) return refusal;
    const write = BY_SHAPE.get(shape(statement.sql));
    if (write === WRITES.fact) ownFact = true;
    if (AFTER_OWN_FACT.has(write) && !ownFact) return 'a member tags or supersedes only after writing its own fact in the same batch';
  }
  return null;
}

// A plain UTC timestamp, as the script writes one: anything else, such as `Tue Oct 20 2026`, sorts after every date.
// The dream's record check uses it too.
export const PLAIN_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
// A fact's time: the one sent if it is plain UTC and not after `now`, so a re-tag keeps its date; else `now`.
const factTime = (sent, now) => PLAIN_UTC.test(String(sent)) && Date.parse(sent) <= Date.parse(now) ? sent : now;

// The batch a member runs, once batchRefusal has passed it: each supersede gains the caller's subject, a fact
// dated ahead of `now` gets `now`, and a reader's fact insert stores the fact unshared, whatever the request said.
export function memberStatements(statements, { subject, reader, now = new Date().toISOString() }) {
  return statements.map(statement => {
    const write = BY_SHAPE.get(shape(statement.sql));
    const params = statement.params || [];
    if (write === WRITES.supersede) return { sql: listOf(MEMBER_WRITES.supersede.sql, params.length), params: [...params, subject] };
    if (write !== WRITES.fact) return statement;
    const dated = params.map((param, index) => index === 5 ? factTime(param, now) : param);
    return reader ? { sql: MEMBER_WRITES.readerFact.sql, params: dated.slice(0, 8) } : { ...statement, params: dated };
  });
}

// Every caller's batch, the admin's included: each run record is stored under the caller's own subject.
export const ownRuns = (statements, subject) => statements.map(statement => BY_SHAPE.get(shape(statement.sql)) === WRITES.run
  ? { sql: RUN_WITH_OWNER, params: [...(statement.params || []).slice(0, 7), subject ?? null] } : statement);

// The one way a read searches the full-text index; a non-admin's runs as SHADOW_FTS_HITS. Each unary `+` stops
// SQLite driving facts_fts by rowid, which re-ran the MATCH once per stored fact.
export const FTS_HITS = '(SELECT +rowid AS rowid, rank FROM facts_fts WHERE facts_fts MATCH ? AND +rowid IN (SELECT id FROM facts))';
// The fragment a computer that has not updated still sends; it filters the same way. Drop it once every computer has.
export const LEGACY_FTS_HITS = '(SELECT rowid, rank FROM facts_fts WHERE facts_fts MATCH ? AND rowid IN (SELECT id FROM facts))';
// The fragment a shadowed read runs: it filters by __mem_facts, a name no read may write, so no `facts` of the
// caller's own, however it is quoted or commented, can stand in for the facts the caller may see.
export const SHADOW_FTS_HITS = FTS_HITS.replace('SELECT id FROM facts', 'SELECT id FROM __mem_facts');

const quote = text => `'${String(text).replaceAll("'", "''")}'`;

// The CTEs a non-admin's read sees in place of the same-named tables: shared non-personal facts plus the caller's own,
// under __mem_facts, which the search fragment reads; and only the caller's runs (`IS`, so NULL is a schedule's).
export function shadowCtes(subject) {
  const owner = subject === null ? 'NULL' : quote(subject);
  return `__mem_facts AS (SELECT * FROM main.facts WHERE (type NOT IN ('user', 'feedback') AND shared = 1) OR owner_subject = ${owner}), `
    + 'facts AS (SELECT * FROM __mem_facts), '
    + 'fact_tags AS (SELECT * FROM main.fact_tags WHERE fact_id IN (SELECT id FROM __mem_facts)), '
    + `sessions AS (SELECT * FROM main.sessions WHERE owner_subject = ${owner}), `
    + `runs AS (SELECT * FROM main.runs WHERE owner_subject IS ${owner})`;
}

// A read with each search fragment bound to the reserved filter, and the shadow CTEs in front, merged into its own
// WITH list when it has one.
export function shadowRead(sql, subject) {
  const ctes = shadowCtes(subject);
  const text = String(sql).trim().replaceAll(FTS_HITS, SHADOW_FTS_HITS).replaceAll(LEGACY_FTS_HITS, SHADOW_FTS_HITS);
  const own = text.match(/^WITH(\s+RECURSIVE)?\s+/i);
  return own ? `WITH${own[1] || ''} ${ctes}, ${text.slice(own[0].length)}` : `WITH ${ctes} ${text}`;
}

// A schema-qualified name skips a CTE, and a raw page read skips every name, so a shadowed read names neither.
const SCHEMA_NAME = /(?<![\w$])(?:main|temp)(?![\w$])|sqlite_dbpage/i;

// A CTE of its own named `facts`, `fact_tags`, `sessions` or `runs`, at any depth. An extra refusal only: the search
// fragment reads the reserved __mem_facts, so a `facts` this misses (behind a comment or a quote) widens nothing.
const OWN_SHADOW = /(?<![\w$.])["`[]?(?:facts|fact_tags|sessions|runs)["`\]]?\s*(?:\([^)]*\)\s*)?AS\s*(?:NOT\s+)?(?:MATERIALIZED\s*)?\(/i;
// The shadow's own names. SQLite has no dynamic names or escapes besides doubled quotes, so no read reaches one
// without this text.
const RESERVED = /__mem_/i;

// Why a non-admin may not run this read, or null: no schema or reserved name, no `facts` or `fact_tags` of its own,
// and the full-text index only through FTS_HITS. Checked before the shadow is added.
export function readRefusal(sql) {
  const text = String(sql);
  if (SCHEMA_NAME.test(text)) return 'a member reads facts only by their plain names, never main., temp., or raw pages';
  if (RESERVED.test(text)) return 'a member reads facts only by their plain names, never the memory store\'s own __mem_ names';
  if (OWN_SHADOW.test(text)) return 'a member reads facts only by their plain names, never a facts, fact_tags, sessions or runs of its own';
  if (/facts_fts/i.test(text.replaceAll(FTS_HITS, '').replaceAll(LEGACY_FTS_HITS, ''))) return 'a member searches memory only through the shared full-text fragment; update this branch from main to search memory';
  return null;
}

// Whether a statement is one of the script's writes; everything else a member sends is a read.
export const isWrite = ({ sql }) => BY_SHAPE.has(shape(sql));

// The session ids a batch upserts, so the route can check that each one is the caller's own.
export const sessionIds = statements => statements
  .filter(({ sql }) => BY_SHAPE.get(shape(sql)) === WRITES.session)
  .map(({ params = [] }) => params[0]);
