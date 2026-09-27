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
// A statement with its string literals emptied and its comments removed, so neither can hide a word.
const bare = sql => sql.replace(/'(?:[^']|'')*'/g, "''").replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?(?:\*\/|$)/g, ' ');

// Why a member key may not run this statement, or null when it may.
export function memberRefusal({ sql, params = [] }, email) {
  const write = BY_SHAPE.get(shape(sql));
  if (write) {
    if (write.author === undefined || String(params[write.author] ?? '').toLowerCase() === email) return null;
    return `a member key writes only under its own email, ${email}`;
  }
  const text = bare(String(sql)).trim().replace(/;\s*$/, '');
  if (/^(?:SELECT|WITH)\b/i.test(text) && !WRITE_WORDS.test(text) && !text.includes(';')) return null;
  return 'a member key may add facts, but not change or delete them';
}
