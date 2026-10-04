-- Durable provider work and one-use owner attempts; no business data changes.
CREATE TABLE wong_access_attempts (
  attempt_id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  owner_subject TEXT NOT NULL,
  state_hash TEXT NOT NULL,
  cookie_hash TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('register', 'install', 'consumed')),
  expires_at TEXT NOT NULL
);
CREATE TABLE wong_access_leases (
  installation_id TEXT PRIMARY KEY REFERENCES wong_access_installation(installation_id),
  holder TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
ALTER TABLE wong_access_connections ADD COLUMN detail TEXT;
ALTER TABLE wong_access_work ADD COLUMN outcome TEXT;
CREATE UNIQUE INDEX wong_access_receipt_request ON wong_access_receipts(installation_id, email, machine_id, receipt_id);
CREATE TABLE wong_access_policy_writes (
  intent_id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  generation INTEGER NOT NULL CHECK (generation > 0),
  status TEXT NOT NULL CHECK (status IN ('in_flight', 'completed', 'unknown')),
  started_at TEXT NOT NULL
);
