-- Operator bootstrap metadata. No principal, membership or machine grant is created.
CREATE TABLE IF NOT EXISTS memory_installation_configuration (
  installation_id TEXT PRIMARY KEY NOT NULL REFERENCES memory_installation (installation_id),
  app_origin TEXT NOT NULL CHECK (app_origin LIKE 'https://%'),
  memory_origin TEXT NOT NULL CHECK (memory_origin LIKE 'https://%'),
  app_worker_name TEXT NOT NULL,
  memory_worker_name TEXT NOT NULL,
  operation_id TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL CHECK (length(request_hash) = 64 AND request_hash NOT GLOB '*[^0-9a-f]*'),
  owner_email TEXT NOT NULL,
  access_json TEXT CHECK (access_json IS NULL OR json_valid(access_json)),
  pin_revision INTEGER NOT NULL DEFAULT 1 CHECK (pin_revision >= 1),
  created_at INTEGER NOT NULL
);
-- A later reviewed operator repin must advance the revision, preserving the initial receipt.
CREATE TRIGGER IF NOT EXISTS memory_configuration_revision BEFORE UPDATE ON memory_installation_configuration
WHEN NEW.installation_id IS NOT OLD.installation_id OR NEW.operation_id IS NOT OLD.operation_id
  OR NEW.request_hash IS NOT OLD.request_hash OR NEW.pin_revision != OLD.pin_revision + 1
BEGIN SELECT RAISE(ABORT, 'installation configuration requires an explicit revision preserving its receipt'); END;
CREATE TRIGGER IF NOT EXISTS memory_configuration_retained BEFORE DELETE ON memory_installation_configuration
BEGIN SELECT RAISE(ABORT, 'installation configuration and bootstrap receipt are retained'); END;
-- Written last, only after the complete bootstrap metadata can be read back.
-- A partial REST batch must never be adopted just because some IDs exist.
CREATE TABLE IF NOT EXISTS memory_bootstrap_completion (
  installation_id TEXT PRIMARY KEY NOT NULL REFERENCES memory_installation_configuration (installation_id),
  request_hash TEXT NOT NULL CHECK (length(request_hash) = 64 AND request_hash NOT GLOB '*[^0-9a-f]*'),
  audit_id TEXT NOT NULL UNIQUE REFERENCES memory_audit (id)
);
CREATE TRIGGER IF NOT EXISTS memory_bootstrap_completion_immutable BEFORE UPDATE ON memory_bootstrap_completion
BEGIN SELECT RAISE(ABORT, 'bootstrap completion is immutable'); END;
CREATE TRIGGER IF NOT EXISTS memory_bootstrap_completion_retained BEFORE DELETE ON memory_bootstrap_completion
BEGIN SELECT RAISE(ABORT, 'bootstrap completion is retained'); END;
INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (10, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
