-- Additive app policy storage. No business or memory table is altered.
CREATE TABLE wong_access_installation (
  slot INTEGER PRIMARY KEY CHECK (slot = 1),
  installation_id TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL,
  account_id TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  access_app_id TEXT NOT NULL,
  access_policy_id TEXT NOT NULL,
  issuer TEXT NOT NULL,
  audience TEXT NOT NULL,
  owner_subject TEXT NOT NULL,
  owner_email TEXT NOT NULL CHECK (owner_email = lower(trim(owner_email))),
  repository_id INTEGER NOT NULL CHECK (repository_id > 0),
  repository_name TEXT NOT NULL,
  policy_enabled INTEGER NOT NULL DEFAULT 0 CHECK (policy_enabled IN (0, 1)),
  issuance_enabled INTEGER NOT NULL DEFAULT 0 CHECK (issuance_enabled IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  activated_at TEXT NOT NULL
);

CREATE TABLE wong_access_members (
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  email TEXT NOT NULL CHECK (email = lower(trim(email))),
  status TEXT NOT NULL CHECK (status IN ('active', 'removed')),
  project_editing INTEGER NOT NULL DEFAULT 0 CHECK (project_editing IN (0, 1)),
  revision INTEGER NOT NULL CHECK (revision > 0),
  changed_at TEXT NOT NULL,
  PRIMARY KEY (installation_id, email)
);

CREATE TABLE wong_access_apps (
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  app_id TEXT NOT NULL,
  PRIMARY KEY (installation_id, app_id)
);

CREATE TABLE wong_access_grants (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  app_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  PRIMARY KEY (installation_id, email, app_id),
  FOREIGN KEY (installation_id, email) REFERENCES wong_access_members(installation_id, email),
  FOREIGN KEY (installation_id, app_id) REFERENCES wong_access_apps(installation_id, app_id)
);

CREATE TABLE wong_access_connections (
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  provider TEXT NOT NULL CHECK (provider IN ('access', 'github')),
  status TEXT NOT NULL CHECK (status IN ('missing', 'pending', 'ready', 'blocked')),
  generation INTEGER NOT NULL CHECK (generation > 0),
  sealed_material TEXT,
  verified_at TEXT,
  PRIMARY KEY (installation_id, provider)
);

CREATE TABLE wong_access_work (
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  kind TEXT NOT NULL CHECK (kind IN ('policy', 'sessions', 'github_tokens')),
  generation INTEGER NOT NULL CHECK (generation > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'failed')),
  retry_after TEXT,
  error_code TEXT,
  PRIMARY KEY (installation_id, kind)
);

CREATE TABLE wong_access_receipts (
  receipt_id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  grant_revision INTEGER NOT NULL CHECK (grant_revision > 0),
  repository_id INTEGER NOT NULL CHECK (repository_id > 0),
  status TEXT NOT NULL CHECK (status IN ('issuing', 'issued', 'revoke_pending', 'revoked', 'unknown', 'expired')),
  sealed_token TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (installation_id, email) REFERENCES wong_access_members(installation_id, email)
);
CREATE INDEX wong_access_receipts_member ON wong_access_receipts(installation_id, email, status);

CREATE TABLE wong_access_audit (
  event_id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  actor_email TEXT NOT NULL,
  event TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  created_at TEXT NOT NULL
);
