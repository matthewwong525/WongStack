-- Additive source preparation only; no owner, review or installation is seeded.
CREATE TABLE memory_schema_receipts (
  installation_id TEXT PRIMARY KEY REFERENCES memory_installation(installation_id),
  repository_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK(schema_version = 11),
  manifest_hash TEXT NOT NULL CHECK(length(manifest_hash) = 64 AND manifest_hash NOT GLOB '*[^0-9a-f]*'),
  request_hash TEXT NOT NULL,
  audit_id TEXT NOT NULL REFERENCES memory_audit(id),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(installation_id, repository_id) REFERENCES memory_installation(installation_id, repository_id)
);
CREATE TRIGGER memory_schema_receipt_immutable BEFORE UPDATE ON memory_schema_receipts
BEGIN SELECT RAISE(ABORT, 'schema receipt is immutable'); END;
CREATE TRIGGER memory_schema_receipt_retained BEFORE DELETE ON memory_schema_receipts
BEGIN SELECT RAISE(ABORT, 'schema receipt is retained'); END;
CREATE TABLE memory_owner_reviews (
  id TEXT PRIMARY KEY CHECK(length(id) >= 32),
  installation_id TEXT NOT NULL REFERENCES memory_installation(installation_id),
  candidate_id TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL CHECK(length(snapshot_hash) = 64),
  target_hash TEXT NOT NULL CHECK(length(target_hash) = 64),
  protection_hash TEXT NOT NULL CHECK(length(protection_hash) = 64),
  code_hash TEXT NOT NULL CHECK(length(code_hash) = 64),
  auth_revision INTEGER NOT NULL CHECK(auth_revision >= 1),
  pin_revision INTEGER NOT NULL CHECK(pin_revision >= 1),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','consumed','expired','revoked')),
  consumed_attempt_id TEXT REFERENCES memory_owner_attempts(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at AND expires_at <= created_at + 600),
  UNIQUE(candidate_id, snapshot_hash),
  CHECK((state = 'consumed') = (consumed_attempt_id IS NOT NULL))
);
CREATE TRIGGER memory_owner_review_transition BEFORE UPDATE ON memory_owner_reviews
WHEN OLD.state != 'pending' OR NEW.id IS NOT OLD.id OR NEW.installation_id IS NOT OLD.installation_id
  OR NEW.candidate_id IS NOT OLD.candidate_id OR NEW.snapshot_hash IS NOT OLD.snapshot_hash
  OR NEW.target_hash IS NOT OLD.target_hash OR NEW.protection_hash IS NOT OLD.protection_hash
  OR NEW.code_hash IS NOT OLD.code_hash OR NEW.auth_revision IS NOT OLD.auth_revision
  OR NEW.pin_revision IS NOT OLD.pin_revision OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at
BEGIN SELECT RAISE(ABORT, 'owner review is immutable except one terminal transition'); END;
CREATE TRIGGER memory_owner_review_retained BEFORE DELETE ON memory_owner_reviews
BEGIN SELECT RAISE(ABORT, 'owner review is retained'); END;
CREATE TABLE memory_owner_attempts (
  id TEXT PRIMARY KEY CHECK(length(id) >= 32),
  installation_id TEXT NOT NULL UNIQUE REFERENCES memory_installation(installation_id),
  review_id TEXT NOT NULL UNIQUE REFERENCES memory_owner_reviews(id),
  request_hash TEXT NOT NULL CHECK(length(request_hash) = 64),
  principal_id TEXT NOT NULL CHECK(length(principal_id) >= 32),
  binding_id TEXT NOT NULL,
  audit_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TRIGGER memory_owner_attempt_immutable BEFORE UPDATE ON memory_owner_attempts
BEGIN SELECT RAISE(ABORT, 'owner attempt is immutable'); END;
CREATE TRIGGER memory_owner_attempt_retained BEFORE DELETE ON memory_owner_attempts
BEGIN SELECT RAISE(ABORT, 'incomplete owner attempt requires explicit recovery'); END;
CREATE TABLE memory_owner_completions (
  attempt_id TEXT PRIMARY KEY REFERENCES memory_owner_attempts(id),
  installation_id TEXT NOT NULL UNIQUE REFERENCES memory_installation(installation_id),
  review_id TEXT NOT NULL UNIQUE REFERENCES memory_owner_reviews(id),
  principal_id TEXT NOT NULL REFERENCES memory_principals(id),
  binding_id TEXT NOT NULL REFERENCES memory_identity_bindings(id),
  audit_id TEXT NOT NULL UNIQUE REFERENCES memory_audit(id),
  created_at INTEGER NOT NULL
);
CREATE TRIGGER memory_owner_completion_immutable BEFORE UPDATE ON memory_owner_completions
BEGIN SELECT RAISE(ABORT, 'owner completion is immutable'); END;
CREATE TRIGGER memory_owner_completion_retained BEFORE DELETE ON memory_owner_completions
BEGIN SELECT RAISE(ABORT, 'owner completion is retained'); END;
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (11, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
