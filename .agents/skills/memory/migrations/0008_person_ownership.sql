-- Private memory belongs to the signed-in person: their Access subject, with the email kept for display.
-- A row moves once from no owner to a person (migrate-people, assign); after that ownership never changes.
ALTER TABLE facts ADD COLUMN owner_subject TEXT;
ALTER TABLE facts ADD COLUMN owner_email TEXT;
ALTER TABLE sessions ADD COLUMN owner_subject TEXT;
ALTER TABLE sessions ADD COLUMN owner_email TEXT;
CREATE INDEX facts_subject ON facts (owner_subject, superseded_by);
CREATE INDEX sessions_subject ON sessions (owner_subject);
CREATE TRIGGER facts_subject_once BEFORE UPDATE OF owner_subject ON facts
WHEN old.owner_subject IS NOT NULL AND new.owner_subject IS NOT old.owner_subject
BEGIN SELECT RAISE(ABORT, 'fact ownership cannot change'); END;
CREATE TRIGGER sessions_subject_once BEFORE UPDATE OF owner_subject ON sessions
WHEN old.owner_subject IS NOT NULL AND new.owner_subject IS NOT old.owner_subject
BEGIN SELECT RAISE(ABORT, 'session ownership cannot change'); END;
-- A cloud schedule's own sign-in: the Worker keeps only its secret's hash; revoked_at switches it off.
CREATE TABLE memory_schedules (
  client_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  secret_hash TEXT NOT NULL,
  token_id TEXT,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
