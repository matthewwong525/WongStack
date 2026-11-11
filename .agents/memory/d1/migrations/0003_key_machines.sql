-- WongStack memory store, schema 3: a key per machine, and expiry. `memory.mjs join` makes a key for one
-- machine through GitHub, which expires and is renewed by joining again. A key with no machine came from
-- `member add`; a key with no expiry never expires, as every key made before this schema.
ALTER TABLE memory_keys ADD COLUMN machine TEXT;
ALTER TABLE memory_keys ADD COLUMN expires_at TEXT;
CREATE INDEX IF NOT EXISTS memory_keys_email ON memory_keys (email, machine);
