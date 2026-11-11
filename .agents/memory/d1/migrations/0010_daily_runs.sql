-- The daily tidy: one `daily` run per person and day, claimed as `started` and finished in the same row. SQLite can
-- not change a CHECK, so the runs table is rebuilt with its rows and its index.
CREATE TABLE runs_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('capture', 'consolidation', 'daily')),
  host TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('ok', 'failed', 'started')),
  reason TEXT,
  counts TEXT NOT NULL DEFAULT '{}',
  owner_subject TEXT,
  day TEXT
);
INSERT INTO runs_next (id, kind, host, started_at, finished_at, status, reason, counts, owner_subject)
  SELECT id, kind, host, started_at, finished_at, status, reason, counts, owner_subject FROM runs;
DROP TABLE runs;
ALTER TABLE runs_next RENAME TO runs;
CREATE INDEX runs_owner ON runs (owner_subject, id);
CREATE UNIQUE INDEX runs_daily ON runs (owner_subject, day) WHERE kind = 'daily';
