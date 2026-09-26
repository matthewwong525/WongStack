-- WongStack memory store, schema 2: memory keys. The app's production Worker reads a key's role here, and
-- refuses every request that names this table; only the admin's Cloudflare token (memory.mjs member) writes it.
-- A key opens this store only. Only the SHA-256 of each key is kept.
CREATE TABLE IF NOT EXISTS memory_keys (
  hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TEXT NOT NULL
);
