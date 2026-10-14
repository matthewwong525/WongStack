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

// The batch a member runs, once batchRefusal has passed it: each supersede gains the caller's subject, and a
// reader's fact insert stores the fact unshared, whatever the request said.
export function memberStatements(statements, { subject, reader }) {
  return statements.map(statement => {
    const write = BY_SHAPE.get(shape(statement.sql));
    const params = statement.params || [];
    if (write === WRITES.supersede) return { sql: listOf(MEMBER_WRITES.supersede.sql, params.length), params: [...params, subject] };
    if (write === WRITES.fact && reader) return { sql: MEMBER_WRITES.readerFact.sql, params: params.slice(0, 8) };
    return statement;
  });
}

// The one way any read searches the full-text index: only facts the caller may see (`facts` is the shadow below).
// Each unary `+` stops SQLite driving facts_fts by rowid, which re-ran the MATCH once per stored fact.
export const FTS_HITS = '(SELECT +rowid AS rowid, rank FROM facts_fts WHERE facts_fts MATCH ? AND +rowid IN (SELECT id FROM facts))';
// The fragment a computer that has not updated still sends; it filters the same way. Drop it once every computer has.
export const LEGACY_FTS_HITS = '(SELECT rowid, rank FROM facts_fts WHERE facts_fts MATCH ? AND rowid IN (SELECT id FROM facts))';

const quote = text => `'${String(text).replaceAll("'", "''")}'`;

// The CTEs that stand in for `facts` and `fact_tags` for a member, reader or schedule: shared facts that are not
// personal, plus the caller's own. SQLite resolves a CTE before a same-named table, so every read sees only these.
export function shadowCtes(subject) {
  const owner = subject === null ? 'NULL' : quote(subject);
  return `facts AS (SELECT * FROM main.facts WHERE (type NOT IN ('user', 'feedback') AND shared = 1) OR owner_subject = ${owner}), `
    + 'fact_tags AS (SELECT * FROM main.fact_tags WHERE fact_id IN (SELECT id FROM facts)), '
    + `sessions AS (SELECT * FROM main.sessions WHERE owner_subject = ${owner})`;
}

// A read with the shadow CTEs in front, merged into its own WITH list when it has one.
export function shadowRead(sql, subject) {
  const ctes = shadowCtes(subject);
  const text = String(sql).trim();
  const own = text.match(/^WITH(\s+RECURSIVE)?\s+/i);
  return own ? `WITH${own[1] || ''} ${ctes}, ${text.slice(own[0].length)}` : `WITH ${ctes} ${text}`;
}

// A schema-qualified name skips a CTE, and a raw page read skips every name, so a shadowed read names neither.
const SCHEMA_NAME = /(?<![\w$])(?:main|temp)(?![\w$])|sqlite_dbpage/i;

// A CTE of its own named `facts` or `fact_tags`, at any depth: a nested one would replace the shadow inside FTS_HITS.
const OWN_SHADOW = /(?<![\w$.])["`[]?(?:facts|fact_tags|sessions)["`\]]?\s*(?:\([^)]*\)\s*)?AS\s*(?:NOT\s+)?(?:MATERIALIZED\s*)?\(/i;

// Why a member, reader or schedule may not run this read, or null: it must name no schema, define no `facts` or
// `fact_tags` of its own, and reach the full-text index only through FTS_HITS. Checked before the shadow is added.
export function readRefusal(sql) {
  const text = String(sql);
  if (SCHEMA_NAME.test(text)) return 'a member reads facts only by their plain names, never main., temp., or raw pages';
  if (OWN_SHADOW.test(text)) return 'a member reads facts only by their plain names, never a facts or fact_tags of its own';
  if (/facts_fts/i.test(text.replaceAll(FTS_HITS, '').replaceAll(LEGACY_FTS_HITS, ''))) return 'a member searches memory only through the shared full-text fragment; update this branch from main to search memory';
  return null;
}

// Whether a statement is one of the script's writes; everything else a member sends is a read.
export const isWrite = ({ sql }) => BY_SHAPE.has(shape(sql));

// The session ids a batch upserts, so the route can check that each one is the caller's own.
export const sessionIds = statements => statements
  .filter(({ sql }) => BY_SHAPE.get(shape(sql)) === WRITES.session)
  .map(({ params = [] }) => params[0]);
