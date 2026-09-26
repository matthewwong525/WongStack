-- The memory Worker's keys database (wong-memory-keys). Only the Worker binds it; the admin manages rows
-- through the Cloudflare REST API. A key opens one repo's store. Only the SHA-256 of each key is kept.
CREATE TABLE IF NOT EXISTS keys (hash TEXT PRIMARY KEY, email TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('admin', 'member')), database_id TEXT NOT NULL, bucket TEXT, created_at TEXT NOT NULL)
