-- WongStack memory store, schema 1. Forward-only; every statement is safe to run again.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- One row per transcript (or per migrated note).
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                      -- 'claude:<uuid>' | 'codex:<uuid>' | 'migration:<slug>'
  agent TEXT NOT NULL CHECK (agent IN ('claude', 'codex', 'migration')),
  author TEXT,
  machine TEXT,
  branch TEXT,
  cwd TEXT,
  started_at TEXT,
  ended_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('captured', 'skipped', 'private')),
  reason TEXT,                              -- why a session was skipped
  read_through TEXT,                        -- last message id processed
  raw_key TEXT,                             -- R2 object key; NULL when private or when the store has no bucket
  raw_bytes INTEGER,
  updated_at TEXT NOT NULL
);

-- The unit of memory. Never edited or deleted: a later fact supersedes it.
CREATE TABLE IF NOT EXISTS facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('user', 'feedback', 'project', 'reference', 'thread')),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 400),
  session_id TEXT REFERENCES sessions (id),
  source TEXT NOT NULL CHECK (source IN ('save', 'backfill', 'migration', 'consolidation')),
  created_at TEXT NOT NULL,
  author TEXT,
  superseded_by INTEGER REFERENCES facts (id)  -- NULL while the fact is live
);
CREATE INDEX IF NOT EXISTS facts_live ON facts (superseded_by, type, created_at);
CREATE INDEX IF NOT EXISTS facts_slug ON facts (slug, superseded_by);

CREATE TRIGGER IF NOT EXISTS facts_never_edited
BEFORE UPDATE OF slug, type, body, session_id, source, created_at, author ON facts
BEGIN SELECT RAISE(ABORT, 'facts are never edited; write a fact that supersedes it'); END;

CREATE TRIGGER IF NOT EXISTS facts_never_deleted
BEFORE DELETE ON facts
BEGIN SELECT RAISE(ABORT, 'facts are never deleted; write a fact that supersedes it'); END;

CREATE TABLE IF NOT EXISTS tags (
  name TEXT PRIMARY KEY,
  definition TEXT NOT NULL CHECK (length(definition) > 0),
  alias_of TEXT REFERENCES tags (name),
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fact_tags (
  fact_id INTEGER NOT NULL REFERENCES facts (id),
  tag TEXT NOT NULL REFERENCES tags (name),
  PRIMARY KEY (fact_id, tag)
);

CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5 (body, content = 'facts', content_rowid = 'id');

CREATE TRIGGER IF NOT EXISTS facts_fts_insert AFTER INSERT ON facts
BEGIN INSERT INTO facts_fts (rowid, body) VALUES (new.id, new.body); END;

-- Background runs. A run that captures and consolidates writes one row of each kind.
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('capture', 'consolidation')),
  host TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('ok', 'failed')),
  reason TEXT,
  counts TEXT NOT NULL DEFAULT '{}'        -- JSON: captured, skipped, private, added, superseded, dropped, merged, live
);

INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
