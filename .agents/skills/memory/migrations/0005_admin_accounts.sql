-- WongStack memory store, schema 5: the admin is a GitHub account, and every key ends. `memory.mjs member admin`
-- (or `migrate`, once) links the admin's GitHub account here; a join gives an admin key only to that account.
-- The link has its own table because expiry and the key cap delete key rows. Every key made without an end
-- date stops now; its machine rejoins through GitHub at the next session start.
CREATE TABLE IF NOT EXISTS memory_admins (github_id TEXT PRIMARY KEY, login TEXT, email TEXT NOT NULL, created_at TEXT NOT NULL);
ALTER TABLE memory_keys ADD COLUMN github_id TEXT;
UPDATE memory_keys SET expires_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE expires_at IS NULL;
