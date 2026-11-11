-- Machine ownership is separate from attribution. History remains unassigned.
ALTER TABLE facts ADD COLUMN owner_machine_id TEXT;
ALTER TABLE sessions ADD COLUMN owner_machine_id TEXT;
ALTER TABLE memory_keys ADD COLUMN machine_id TEXT;
ALTER TABLE memory_keys ADD COLUMN login_identity TEXT;
ALTER TABLE memory_keys ADD COLUMN login_link_hash TEXT;
ALTER TABLE memory_keys ADD COLUMN login_link_expires_at TEXT;
CREATE INDEX facts_machine ON facts (owner_machine_id, superseded_by);
CREATE INDEX sessions_machine ON sessions (owner_machine_id);
CREATE INDEX memory_keys_machine ON memory_keys (machine_id);
CREATE UNIQUE INDEX memory_keys_login_link ON memory_keys (login_link_hash) WHERE login_link_hash IS NOT NULL;
CREATE TRIGGER facts_owner_immutable BEFORE UPDATE OF owner_machine_id ON facts
WHEN new.owner_machine_id IS NOT old.owner_machine_id
BEGIN SELECT RAISE(ABORT, 'fact ownership cannot change'); END;
CREATE TRIGGER sessions_owner_immutable BEFORE UPDATE OF owner_machine_id ON sessions
WHEN new.owner_machine_id IS NOT old.owner_machine_id
BEGIN SELECT RAISE(ABORT, 'session ownership cannot change'); END;
CREATE TRIGGER keys_machine_immutable BEFORE UPDATE OF machine_id ON memory_keys
WHEN new.machine_id IS NOT old.machine_id
BEGIN SELECT RAISE(ABORT, 'key ownership cannot change'); END;

CREATE TRIGGER sessions_private_preserved BEFORE UPDATE ON sessions
WHEN old.status = 'private'
BEGIN SELECT RAISE(ABORT, 'a private session cannot be captured'); END;
