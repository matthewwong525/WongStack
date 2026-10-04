// The memory script's write statements, shared with the memory route. A member key may run only these
// writes, with its stored machine owner, and plain reads: it adds facts, but cannot change or delete them.
// In a team, a member's or reader's reads see only the facts it may (shadowCtes below).
// `owner` is the ownership parameter index; author fields are attribution only. The client sends these
// for every role; the route swaps in MEMBER_WRITES for a member key.

export const WRITES = {
  session: {
    sql: `INSERT INTO sessions (id, agent, author, machine, branch, cwd, started_at, ended_at, status, reason, read_through, raw_key, raw_bytes, updated_at, owner_machine_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET status = CASE WHEN sessions.status = 'private' THEN 'private' ELSE excluded.status END,
      reason = excluded.reason, read_through = coalesce(excluded.read_through, sessions.read_through), ended_at = coalesce(excluded.ended_at, sessions.ended_at),
      raw_key = coalesce(excluded.raw_key, sessions.raw_key), raw_bytes = coalesce(excluded.raw_bytes, sessions.raw_bytes), updated_at = excluded.updated_at, owner_machine_id = excluded.owner_machine_id`,
    owner: 14,
  },
  tag: { sql: 'INSERT OR IGNORE INTO tags (name, definition, alias_of, created_by, created_at) VALUES (?, ?, ?, ?, ?)' },
  fact: { sql: 'INSERT INTO facts (slug, type, body, session_id, source, created_at, author, owner_machine_id, shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id', owner: 7 },
  factTag: { sql: 'INSERT OR IGNORE INTO fact_tags (fact_id, tag) VALUES ((SELECT max(id) FROM facts), ?)' },
  supersede: { sql: 'UPDATE facts SET superseded_by = (SELECT max(id) FROM facts) WHERE superseded_by IS NULL AND id IN (?) RETURNING id' },
  run: { sql: 'INSERT INTO runs (kind, host, started_at, finished_at, status, reason, counts) VALUES (?, ?, ?, ?, ?, ?, ?)' },
};

// The admin's own writes. They sit outside WRITES, so no member or reader key may run them: a tag is shared.
export const ADMIN_WRITES = {
  tagUpdate: { sql: 'UPDATE tags SET definition = ?, alias_of = ? WHERE name = ?' },
};

// What the route runs for a member key in place of the script's own statement: a supersede marks only facts
// under the key's machine, so a teammate's fact stays live, and a reader key's fact is stored unshared.
export const MEMBER_WRITES = {
  supersede: { sql: 'UPDATE facts SET superseded_by = (SELECT max(id) FROM facts) WHERE superseded_by IS NULL AND id IN (?) AND owner_machine_id = ? RETURNING id' },
  readerFact: { sql: 'INSERT INTO facts (slug, type, body, session_id, source, created_at, author, owner_machine_id, shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0) RETURNING id' },
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

// Why a member key may not run this statement, or null when it may. A read is checked on its whole text,
// with nothing stripped: stripping quotes let a quoted name such as ['] hide a write from the check.
export function memberRefusal({ sql, params = [] }, machineId) {
  const write = BY_SHAPE.get(shape(sql));
  if (write) {
    if (write.owner === undefined || params[write.owner] === machineId) return null;
    return `a member key writes only under its own machine, ${machineId}`;
  }
  const text = String(sql).trim().replace(/;\s*$/, '');
  if (/^(?:SELECT|WITH)\b/i.test(text) && !WRITE_WORDS.test(text) && !text.includes(';')) return null;
  return 'a member key may add facts, but not change or delete them';
}

// Why a member key may not run this batch, or null when it may: each statement passes memberRefusal, and a
// fact tag or a supersede comes after the member's own fact insert, so it never acts on someone else's fact.
export function batchRefusal(statements, machineId) {
  let ownFact = false;
  for (const statement of statements) {
    const refusal = memberRefusal(statement, machineId);
    if (refusal) return refusal;
    const write = BY_SHAPE.get(shape(statement.sql));
    if (write === WRITES.fact) ownFact = true;
    if (AFTER_OWN_FACT.has(write) && !ownFact) return 'a member key tags or supersedes only after writing its own fact in the same batch';
  }
  return null;
}

// The batch a member key runs, once batchRefusal has passed it: each supersede gains the key's machine, and a
// reader's fact insert stores the fact unshared, whatever the request said.
export function memberStatements(statements, { machine_id, reader }) {
  return statements.map(statement => {
    const write = BY_SHAPE.get(shape(statement.sql));
    const params = statement.params || [];
    if (write === WRITES.supersede) return { sql: listOf(MEMBER_WRITES.supersede.sql, params.length), params: [...params, machine_id] };
    if (write === WRITES.fact && reader) return { sql: MEMBER_WRITES.readerFact.sql, params: params.slice(0, 8) };
    return statement;
  });
}

// ---------- what a member or reader key may read in a team ----------

// The one way any read searches the full-text index: a subquery that matches only facts the key may see,
// because `facts` inside it is the shadow below. The client joins it as `hits` and orders by `hits.rank`.
export const FTS_HITS = '(SELECT rowid, rank FROM facts_fts WHERE facts_fts MATCH ? AND rowid IN (SELECT id FROM facts))';

const quote = text => `'${String(text).replaceAll("'", "''")}'`;

// The CTEs that stand in for `facts` and `fact_tags` for a member or reader key in a team: everyone's shared
// facts that are not personal, plus the key's own. SQLite resolves a CTE before a table of the same name, so every read sees only these.
export function shadowCtes(machineId) {
  const owner = quote(machineId);
  return `facts AS (SELECT * FROM main.facts WHERE (type NOT IN ('user', 'feedback') AND shared = 1) OR owner_machine_id = ${owner}), `
    + 'fact_tags AS (SELECT * FROM main.fact_tags WHERE fact_id IN (SELECT id FROM facts)), '
    + `sessions AS (SELECT * FROM main.sessions WHERE owner_machine_id = ${owner})`;
}

// A read with the shadow CTEs in front, merged into its own WITH list when it has one.
export function shadowRead(sql, machineId, options) {
  const ctes = shadowCtes(machineId, options);
  const text = String(sql).trim();
  const own = text.match(/^WITH(\s+RECURSIVE)?\s+/i);
  return own ? `WITH${own[1] || ''} ${ctes}, ${text.slice(own[0].length)}` : `WITH ${ctes} ${text}`;
}

// A schema-qualified name skips a CTE, and a raw page read skips every name, so a shadowed read names neither.
const SCHEMA_NAME = /(?<![\w$])(?:main|temp)(?![\w$])|sqlite_dbpage/i;

// A CTE of its own named `facts` or `fact_tags`, at any depth: a nested one would stand in for the shadow inside FTS_HITS.
const OWN_SHADOW = /(?<![\w$.])["`[]?(?:facts|fact_tags|sessions)["`\]]?\s*(?:\([^)]*\)\s*)?AS\s*(?:NOT\s+)?(?:MATERIALIZED\s*)?\(/i;

// Why a member or reader key in a team may not run this read, or null when it may: it names no schema, defines
// no `facts` or `fact_tags` of its own, and reads the full-text index only through FTS_HITS. Checked before the
// shadow is added.
export function readRefusal(sql) {
  const text = String(sql);
  if (SCHEMA_NAME.test(text)) return 'a member key reads facts only by their plain names, never main., temp., or raw pages';
  if (OWN_SHADOW.test(text)) return 'a member key reads facts only by their plain names, never a facts or fact_tags of its own';
  if (/facts_fts/i.test(text.replaceAll(FTS_HITS, ''))) return 'a member key searches memory only through the shared full-text fragment; update this branch from main to search memory';
  return null;
}

// Whether a statement is one of the script's writes; everything else a member key sends is a read.
export const isWrite = ({ sql }) => BY_SHAPE.has(shape(sql));

// The session ids a batch upserts, so the route can check that each one is the key's own.
export const sessionIds = statements => statements
  .filter(({ sql }) => BY_SHAPE.get(shape(sql)) === WRITES.session)
  .map(({ params = [] }) => params[0]);
