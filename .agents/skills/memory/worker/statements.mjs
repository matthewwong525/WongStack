// The memory script's write statements, shared with the memory route. A member key may run only these
// writes, with its own email as the author, and plain reads: it adds facts, but cannot change or delete them.
// `author` is the index of the author parameter; a write without one names no person.

export const WRITES = {
  session: {
    sql: `INSERT INTO sessions (id, agent, author, machine, branch, cwd, started_at, ended_at, status, reason, read_through, raw_key, raw_bytes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET status = CASE WHEN sessions.status = 'private' THEN 'private' ELSE excluded.status END,
      reason = excluded.reason, read_through = coalesce(excluded.read_through, sessions.read_through), ended_at = coalesce(excluded.ended_at, sessions.ended_at),
      raw_key = coalesce(excluded.raw_key, sessions.raw_key), raw_bytes = coalesce(excluded.raw_bytes, sessions.raw_bytes), updated_at = excluded.updated_at`,
    author: 2,
  },
  tag: { sql: 'INSERT OR IGNORE INTO tags (name, definition, alias_of, created_by, created_at) VALUES (?, ?, ?, ?, ?)', author: 3 },
  fact: { sql: 'INSERT INTO facts (slug, type, body, session_id, source, created_at, author) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id', author: 6 },
  factTag: { sql: 'INSERT OR IGNORE INTO fact_tags (fact_id, tag) VALUES ((SELECT max(id) FROM facts), ?)' },
  supersede: { sql: 'UPDATE facts SET superseded_by = (SELECT max(id) FROM facts) WHERE superseded_by IS NULL AND id IN (?) RETURNING id' },
  run: { sql: 'INSERT INTO runs (kind, host, started_at, finished_at, status, reason, counts) VALUES (?, ?, ?, ?, ?, ?, ?)' },
};

// The supersede statement for `count` fact ids.
export const supersedeSql = count => WRITES.supersede.sql.replace('IN (?)', `IN (${Array.from({ length: count }, () => '?').join(', ')})`);

// One shape per statement: whitespace collapsed, and a list of placeholders read as one.
const shape = sql => String(sql).replace(/\s+/g, ' ').replace(/\(\s*\?(?:\s*,\s*\?)*\s*\)/g, '(?)').trim();
const BY_SHAPE = new Map(Object.values(WRITES).map(write => [shape(write.sql), write]));

const WRITE_WORDS = /\b(?:INSERT|UPDATE|DELETE|REPLACE|UPSERT|DROP|ALTER|CREATE|PRAGMA|ATTACH|DETACH|VACUUM|REINDEX|ANALYZE)\b/i;
// Writes that act on the newest fact: a member sends them only after its own fact insert in the same batch.
const AFTER_OWN_FACT = new Set([WRITES.factTag, WRITES.supersede]);

// Why a member key may not run this statement, or null when it may. A read is checked on its whole text,
// with nothing stripped: stripping quotes let a quoted name such as ['] hide a write from the check.
export function memberRefusal({ sql, params = [] }, email) {
  const write = BY_SHAPE.get(shape(sql));
  if (write) {
    if (write.author === undefined || String(params[write.author] ?? '').toLowerCase() === email) return null;
    return `a member key writes only under its own email, ${email}`;
  }
  const text = String(sql).trim().replace(/;\s*$/, '');
  if (/^(?:SELECT|WITH)\b/i.test(text) && !WRITE_WORDS.test(text) && !text.includes(';')) return null;
  return 'a member key may add facts, but not change or delete them';
}

// Why a member key may not run this batch, or null when it may: each statement passes memberRefusal, and a
// fact tag or a supersede comes after the member's own fact insert, so it never acts on someone else's fact.
export function batchRefusal(statements, email) {
  let ownFact = false;
  for (const statement of statements) {
    const refusal = memberRefusal(statement, email);
    if (refusal) return refusal;
    const write = BY_SHAPE.get(shape(statement.sql));
    if (write === WRITES.fact) ownFact = true;
    if (AFTER_OWN_FACT.has(write) && !ownFact) return 'a member key tags or supersedes only after writing its own fact in the same batch';
  }
  return null;
}

// The session ids a batch upserts, so the route can check that each one is the key's own.
export const sessionIds = statements => statements
  .filter(({ sql }) => BY_SHAPE.get(shape(sql)) === WRITES.session)
  .map(({ params = [] }) => params[0]);
