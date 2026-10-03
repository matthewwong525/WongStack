-- Inactive additive source preparation. Legacy tables, receipts and keys are unchanged.
-- Only the separately reviewed trusted initializer populates these tables.
CREATE TABLE memory_machine_configuration (
  installation_id TEXT PRIMARY KEY REFERENCES memory_installation(installation_id),
  repository_id TEXT NOT NULL,
  target_json TEXT NOT NULL CHECK(json_valid(target_json)),
  pin_hash TEXT NOT NULL CHECK(length(pin_hash) = 64 AND pin_hash NOT GLOB '*[^0-9a-f]*'),
  pin_revision INTEGER NOT NULL DEFAULT 1 CHECK(pin_revision >= 1),
  auth_revision INTEGER NOT NULL DEFAULT 1 CHECK(auth_revision >= 1),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','maintenance')),
  barrier_attempt_id TEXT,
  operation_id TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL CHECK(length(request_hash) = 64),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(installation_id, repository_id) REFERENCES memory_installation(installation_id, repository_id),
  CHECK((state = 'maintenance') = (barrier_attempt_id IS NOT NULL))
);
CREATE TABLE memory_machine_audit (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL REFERENCES memory_machine_configuration(installation_id),
  attempt_id TEXT NOT NULL UNIQUE,
  action TEXT NOT NULL CHECK(action IN ('bootstrap','issue','enroll','revoke')),
  target_id TEXT NOT NULL,
  request_hash TEXT NOT NULL CHECK(length(request_hash) = 64),
  created_at INTEGER NOT NULL
);
CREATE TABLE memory_machine_manifest_receipts (
  installation_id TEXT PRIMARY KEY REFERENCES memory_machine_configuration(installation_id),
  repository_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK(schema_version = 12),
  manifest_hash TEXT NOT NULL CHECK(length(manifest_hash) = 64),
  request_hash TEXT NOT NULL CHECK(length(request_hash) = 64),
  audit_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_audit(id),
  FOREIGN KEY(installation_id, repository_id) REFERENCES memory_installation(installation_id, repository_id)
);
CREATE TABLE memory_machine_bootstrap_completions (
  installation_id TEXT PRIMARY KEY REFERENCES memory_machine_configuration(installation_id),
  operation_id TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL CHECK(length(request_hash) = 64),
  pin_hash TEXT NOT NULL CHECK(length(pin_hash) = 64),
  audit_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_audit(id)
);
CREATE TABLE memory_machine_attempts (
  id TEXT PRIMARY KEY CHECK(length(id) >= 32),
  installation_id TEXT NOT NULL REFERENCES memory_machine_configuration(installation_id),
  action TEXT NOT NULL CHECK(action IN ('issue','enroll','revoke')),
  target_id TEXT NOT NULL,
  request_hash TEXT NOT NULL CHECK(length(request_hash) = 64),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  snapshot_hash TEXT NOT NULL CHECK(length(snapshot_hash) = 64),
  pin_hash TEXT NOT NULL CHECK(length(pin_hash) = 64),
  pin_revision INTEGER NOT NULL CHECK(pin_revision >= 1),
  auth_revision INTEGER NOT NULL CHECK(auth_revision >= 1),
  audit_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE memory_machine_grants (
  id TEXT PRIMARY KEY CHECK(length(id) >= 32),
  installation_id TEXT NOT NULL REFERENCES memory_machine_configuration(installation_id),
  repository_id TEXT NOT NULL,
  commitment TEXT NOT NULL CHECK(length(commitment) = 64 AND commitment NOT GLOB '*[^0-9a-f]*'),
  secret_hash TEXT NOT NULL UNIQUE CHECK(length(secret_hash) = 64 AND secret_hash NOT GLOB '*[^0-9a-f]*'),
  scope TEXT NOT NULL CHECK(scope IN ('memory:read','memory:read memory:write','memory:read memory:write memory:admin')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','consumed','revoked')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  issued_attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_attempts(id),
  consumed_attempt_id TEXT UNIQUE REFERENCES memory_machine_attempts(id),
  machine_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at AND expires_at <= created_at + 600),
  CHECK((consumed_attempt_id IS NULL) = (machine_id IS NULL)),
  CHECK(state != 'consumed' OR machine_id IS NOT NULL),
  FOREIGN KEY(installation_id, repository_id) REFERENCES memory_installation(installation_id, repository_id)
);
CREATE TABLE memory_machine_principals (
  id TEXT PRIMARY KEY REFERENCES memory_principals(id) CHECK(length(id) >= 32),
  installation_id TEXT NOT NULL REFERENCES memory_machine_configuration(installation_id),
  repository_id TEXT NOT NULL,
  commitment TEXT NOT NULL CHECK(length(commitment) = 64),
  grant_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_grants(id),
  scope TEXT NOT NULL CHECK(scope IN ('memory:read','memory:read memory:write','memory:read memory:write memory:admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  enrollment_attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_attempts(id),
  created_at INTEGER NOT NULL,
  FOREIGN KEY(installation_id, repository_id) REFERENCES memory_installation(installation_id, repository_id)
);
CREATE TABLE memory_machine_credentials (
  hash TEXT PRIMARY KEY CHECK(length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'),
  machine_id TEXT NOT NULL REFERENCES memory_machine_principals(id),
  grant_revision INTEGER NOT NULL CHECK(grant_revision >= 1),
  machine_revision INTEGER NOT NULL CHECK(machine_revision >= 1),
  attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_attempts(id),
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > issued_at AND expires_at <= issued_at + 2592000)
);
CREATE TABLE memory_machine_completions (
  attempt_id TEXT PRIMARY KEY REFERENCES memory_machine_attempts(id),
  installation_id TEXT NOT NULL REFERENCES memory_machine_configuration(installation_id),
  request_hash TEXT NOT NULL CHECK(length(request_hash) = 64),
  audit_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_audit(id),
  auth_revision INTEGER NOT NULL CHECK(auth_revision >= 2),
  created_at INTEGER NOT NULL
);
-- Reserving an attempt closes the barrier atomically with the reservation itself.
CREATE TRIGGER memory_machine_attempt_barrier BEFORE INSERT ON memory_machine_attempts
WHEN NOT EXISTS (SELECT 1 FROM memory_machine_configuration c WHERE c.installation_id = NEW.installation_id
  AND c.state = 'pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision = NEW.auth_revision
  AND c.pin_revision = NEW.pin_revision AND c.pin_hash = NEW.pin_hash)
 OR EXISTS (SELECT 1 FROM memory_machine_attempts a LEFT JOIN memory_machine_completions done ON done.attempt_id = a.id
  WHERE a.installation_id = NEW.installation_id AND done.attempt_id IS NULL)
BEGIN SELECT RAISE(ABORT, 'machine authority is stale or incomplete'); END;
CREATE TRIGGER memory_machine_attempt_close AFTER INSERT ON memory_machine_attempts
BEGIN UPDATE memory_machine_configuration SET state = 'maintenance', barrier_attempt_id = NEW.id,
  auth_revision = auth_revision + 1 WHERE installation_id = NEW.installation_id; END;
CREATE TRIGGER memory_machine_configuration_guard BEFORE UPDATE ON memory_machine_configuration
WHEN NEW.installation_id IS NOT OLD.installation_id OR NEW.repository_id IS NOT OLD.repository_id
  OR NEW.target_json IS NOT OLD.target_json OR NEW.pin_hash IS NOT OLD.pin_hash OR NEW.pin_revision != OLD.pin_revision
  OR NEW.operation_id IS NOT OLD.operation_id OR NEW.request_hash IS NOT OLD.request_hash OR NEW.created_at != OLD.created_at
  OR NOT ((OLD.state = 'pending' AND NEW.state = 'maintenance' AND NEW.auth_revision = OLD.auth_revision + 1
    AND EXISTS (SELECT 1 FROM memory_machine_attempts a WHERE a.id = NEW.barrier_attempt_id AND a.installation_id = OLD.installation_id
      AND a.auth_revision = OLD.auth_revision AND a.pin_revision = OLD.pin_revision AND a.pin_hash = OLD.pin_hash))
    OR (OLD.state = 'maintenance' AND NEW.state = 'pending' AND NEW.barrier_attempt_id IS NULL AND NEW.auth_revision = OLD.auth_revision
      AND EXISTS (SELECT 1 FROM memory_machine_completions done WHERE done.attempt_id = OLD.barrier_attempt_id
        AND done.installation_id = OLD.installation_id AND done.auth_revision = OLD.auth_revision)))
BEGIN SELECT RAISE(ABORT, 'machine configuration requires exact attempt barrier'); END;
CREATE TRIGGER memory_machine_completion_guard BEFORE INSERT ON memory_machine_completions
WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id)
  JOIN memory_machine_audit audit ON audit.id = a.audit_id AND audit.attempt_id = a.id AND audit.installation_id = a.installation_id
  WHERE a.id = NEW.attempt_id AND a.request_hash = NEW.request_hash AND a.audit_id = NEW.audit_id
    AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = NEW.auth_revision
    AND NEW.auth_revision = a.auth_revision + 1 AND c.pin_hash = a.pin_hash AND c.pin_revision = a.pin_revision
    AND audit.action = a.action AND audit.target_id = a.target_id AND audit.request_hash = a.request_hash)
BEGIN SELECT RAISE(ABORT, 'machine completion requires exact audit and barrier'); END;
CREATE TRIGGER memory_machine_completion_release AFTER INSERT ON memory_machine_completions
BEGIN UPDATE memory_machine_configuration SET state = 'pending', barrier_attempt_id = NULL
  WHERE installation_id = NEW.installation_id AND barrier_attempt_id = NEW.attempt_id; END;
CREATE TRIGGER memory_machine_grant_transition BEFORE UPDATE ON memory_machine_grants
WHEN OLD.state = 'revoked' OR NEW.id IS NOT OLD.id OR NEW.installation_id IS NOT OLD.installation_id
  OR NEW.repository_id IS NOT OLD.repository_id OR NEW.commitment IS NOT OLD.commitment OR NEW.secret_hash IS NOT OLD.secret_hash
  OR NEW.scope IS NOT OLD.scope OR NEW.issued_attempt_id IS NOT OLD.issued_attempt_id OR NEW.created_at != OLD.created_at
  OR NEW.expires_at != OLD.expires_at OR NEW.revision != OLD.revision + 1
  OR NOT ((OLD.state = 'pending' AND NEW.state = 'consumed') OR NEW.state = 'revoked')
  OR (OLD.machine_id IS NOT NULL AND (NEW.machine_id IS NOT OLD.machine_id OR NEW.consumed_attempt_id IS NOT OLD.consumed_attempt_id))
BEGIN SELECT RAISE(ABORT, 'machine grant cannot widen or reopen'); END;
CREATE TRIGGER memory_machine_principal_transition BEFORE UPDATE ON memory_machine_principals
WHEN OLD.status != 'active' OR NEW.status != 'revoked' OR NEW.revision != OLD.revision + 1
  OR NEW.id IS NOT OLD.id OR NEW.installation_id IS NOT OLD.installation_id OR NEW.repository_id IS NOT OLD.repository_id
  OR NEW.commitment IS NOT OLD.commitment OR NEW.grant_id IS NOT OLD.grant_id OR NEW.scope IS NOT OLD.scope
  OR NEW.enrollment_attempt_id IS NOT OLD.enrollment_attempt_id OR NEW.created_at != OLD.created_at
BEGIN SELECT RAISE(ABORT, 'machine namespace cannot be reassigned or revived'); END;
CREATE TRIGGER memory_machine_configuration_retained BEFORE DELETE ON memory_machine_configuration
BEGIN SELECT RAISE(ABORT, 'machine configuration retained'); END;
CREATE TRIGGER memory_machine_grants_retained BEFORE DELETE ON memory_machine_grants
BEGIN SELECT RAISE(ABORT, 'machine grants retained'); END;
CREATE TRIGGER memory_machine_principals_retained BEFORE DELETE ON memory_machine_principals
BEGIN SELECT RAISE(ABORT, 'machine principals retained'); END;
CREATE TRIGGER memory_machine_credentials_immutable BEFORE UPDATE ON memory_machine_credentials
BEGIN SELECT RAISE(ABORT, 'machine credentials immutable'); END;
CREATE TRIGGER memory_machine_credentials_retained BEFORE DELETE ON memory_machine_credentials
BEGIN SELECT RAISE(ABORT, 'machine credentials retained'); END;
CREATE TRIGGER memory_machine_audit_immutable BEFORE UPDATE ON memory_machine_audit
BEGIN SELECT RAISE(ABORT, 'machine audit immutable'); END;
CREATE TRIGGER memory_machine_audit_retained BEFORE DELETE ON memory_machine_audit
BEGIN SELECT RAISE(ABORT, 'machine audit retained'); END;
CREATE TRIGGER memory_machine_manifest_receipts_immutable BEFORE UPDATE ON memory_machine_manifest_receipts
BEGIN SELECT RAISE(ABORT, 'machine manifest_receipts immutable'); END;
CREATE TRIGGER memory_machine_manifest_receipts_retained BEFORE DELETE ON memory_machine_manifest_receipts
BEGIN SELECT RAISE(ABORT, 'machine manifest_receipts retained'); END;
CREATE TRIGGER memory_machine_bootstrap_completions_immutable BEFORE UPDATE ON memory_machine_bootstrap_completions
BEGIN SELECT RAISE(ABORT, 'machine bootstrap_completions immutable'); END;
CREATE TRIGGER memory_machine_bootstrap_completions_retained BEFORE DELETE ON memory_machine_bootstrap_completions
BEGIN SELECT RAISE(ABORT, 'machine bootstrap_completions retained'); END;
CREATE TRIGGER memory_machine_attempts_immutable BEFORE UPDATE ON memory_machine_attempts
BEGIN SELECT RAISE(ABORT, 'machine attempts immutable'); END;
CREATE TRIGGER memory_machine_attempts_retained BEFORE DELETE ON memory_machine_attempts
BEGIN SELECT RAISE(ABORT, 'machine attempts retained'); END;
CREATE TRIGGER memory_machine_completions_immutable BEFORE UPDATE ON memory_machine_completions
BEGIN SELECT RAISE(ABORT, 'machine completions immutable'); END;
CREATE TRIGGER memory_machine_completions_retained BEFORE DELETE ON memory_machine_completions
BEGIN SELECT RAISE(ABORT, 'machine completions retained'); END;
-- Infrastructure clients must still present a reserved exact maintenance attempt.
CREATE TRIGGER memory_machine_grant_insert_guard BEFORE INSERT ON memory_machine_grants
WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id)
 WHERE a.id = NEW.issued_attempt_id AND a.action = 'issue' AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id
  AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash
  AND a.target_id = NEW.id AND a.installation_id = NEW.installation_id AND c.repository_id = NEW.repository_id
  AND json_extract(a.payload_json, '$.grantId') = NEW.id AND json_extract(a.payload_json, '$.scope') = NEW.scope
  AND json_extract(a.payload_json, '$.machineCommitment') = NEW.commitment AND json_extract(a.payload_json, '$.capabilityHash') = NEW.secret_hash
  AND json_extract(a.payload_json, '$.expiresAt') = NEW.expires_at)
BEGIN SELECT RAISE(ABORT, 'grant requires exact maintenance attempt'); END;
CREATE TRIGGER memory_machine_grant_update_guard BEFORE UPDATE ON memory_machine_grants
WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id)
 WHERE c.installation_id = OLD.installation_id AND c.repository_id = OLD.repository_id AND c.state = 'maintenance'
  AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash
  AND ((a.action = 'enroll' AND NEW.state = 'consumed' AND a.id = NEW.consumed_attempt_id
    AND json_extract(a.payload_json, '$.grantId') = OLD.id AND json_extract(a.payload_json, '$.machineId') = NEW.machine_id
    AND json_extract(a.payload_json, '$.machineCommitment') = OLD.commitment AND json_extract(a.payload_json, '$.capabilityHash') = OLD.secret_hash)
   OR (a.action = 'revoke' AND NEW.state = 'revoked' AND json_extract(a.payload_json, '$.machineId') = OLD.machine_id
    AND json_extract(a.payload_json, '$.grantRevision') = OLD.revision)))
BEGIN SELECT RAISE(ABORT, 'grant mutation requires exact maintenance attempt'); END;
CREATE TRIGGER memory_machine_principal_insert_guard BEFORE INSERT ON memory_machine_principals
WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id)
 JOIN memory_machine_grants g ON g.id = NEW.grant_id AND g.installation_id = NEW.installation_id AND g.repository_id = NEW.repository_id
 JOIN memory_principals generic ON generic.id = NEW.id AND generic.installation_id = NEW.installation_id AND generic.status = 'active'
 WHERE a.id = NEW.enrollment_attempt_id AND a.action = 'enroll' AND a.target_id = NEW.id AND c.state = 'maintenance'
  AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash
  AND g.state = 'consumed' AND g.machine_id = NEW.id AND g.consumed_attempt_id = a.id AND g.commitment = NEW.commitment
  AND json_extract(a.payload_json, '$.scope') = NEW.scope)
BEGIN SELECT RAISE(ABORT, 'machine principal requires exact maintenance attempt'); END;
CREATE TRIGGER memory_machine_principal_update_guard BEFORE UPDATE ON memory_machine_principals
WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id)
 WHERE c.installation_id = OLD.installation_id AND c.repository_id = OLD.repository_id AND c.state = 'maintenance'
  AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash
  AND a.action = 'revoke' AND a.target_id = OLD.id AND json_extract(a.payload_json, '$.machineRevision') = OLD.revision)
BEGIN SELECT RAISE(ABORT, 'machine revocation requires exact maintenance attempt'); END;
CREATE TRIGGER memory_machine_credential_insert_guard BEFORE INSERT ON memory_machine_credentials
WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id)
 JOIN memory_machine_principals p ON p.id = NEW.machine_id AND p.installation_id = a.installation_id AND p.repository_id = c.repository_id
 JOIN memory_machine_grants g ON g.id = p.grant_id AND g.consumed_attempt_id = a.id AND g.machine_id = p.id
 WHERE a.id = NEW.attempt_id AND a.action = 'enroll' AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id
  AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash
  AND p.status = 'active' AND g.state = 'consumed' AND p.revision = NEW.machine_revision AND g.revision = NEW.grant_revision
  AND json_extract(a.payload_json, '$.credentialHash') = NEW.hash AND json_extract(a.payload_json, '$.credentialExpiresAt') = NEW.expires_at)
BEGIN SELECT RAISE(ABORT, 'credential requires exact maintenance attempt'); END;
-- Receipt publication itself proves the exact authority outcome before releasing maintenance.
CREATE TRIGGER memory_machine_completion_outcome_guard BEFORE INSERT ON memory_machine_completions
WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id)
 WHERE a.id = NEW.attempt_id AND a.installation_id = NEW.installation_id AND a.request_hash = NEW.request_hash
 AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1
 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash AND ((a.action = 'issue' AND EXISTS (SELECT 1 FROM memory_machine_grants g
 WHERE g.id = a.target_id AND g.installation_id = a.installation_id AND g.repository_id = c.repository_id
 AND g.id = json_extract(a.payload_json, '$.grantId') AND g.commitment = json_extract(a.payload_json, '$.machineCommitment')
 AND g.secret_hash = json_extract(a.payload_json, '$.capabilityHash') AND g.scope = json_extract(a.payload_json, '$.scope')
 AND g.expires_at = json_extract(a.payload_json, '$.expiresAt') AND g.expires_at > unixepoch()
 AND g.state = 'pending' AND g.revision = 1 AND g.machine_id IS NULL AND g.issued_attempt_id = a.id)) OR (a.action = 'enroll' AND EXISTS (SELECT 1 FROM memory_machine_grants g
 JOIN memory_machine_principals p ON p.id = g.machine_id AND p.grant_id = g.id AND p.installation_id = g.installation_id AND p.repository_id = g.repository_id
 JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'active'
 JOIN memory_machine_credentials k ON k.machine_id = p.id AND k.attempt_id = a.id AND k.machine_revision = p.revision AND k.grant_revision = g.revision
 WHERE p.id = a.target_id AND g.installation_id = a.installation_id AND g.repository_id = c.repository_id
 AND g.id = json_extract(a.payload_json, '$.grantId') AND p.id = json_extract(a.payload_json, '$.machineId')
 AND g.commitment = json_extract(a.payload_json, '$.machineCommitment') AND p.commitment = g.commitment
 AND g.secret_hash = json_extract(a.payload_json, '$.capabilityHash') AND p.scope = json_extract(a.payload_json, '$.scope')
 AND (g.scope = p.scope OR g.scope = 'memory:read memory:write memory:admin' OR (g.scope = 'memory:read memory:write' AND p.scope = 'memory:read'))
 AND g.state = 'consumed' AND g.revision = 2 AND g.consumed_attempt_id = a.id
 AND p.status = 'active' AND p.revision = 1 AND p.enrollment_attempt_id = a.id
 AND k.hash = json_extract(a.payload_json, '$.credentialHash') AND k.expires_at = json_extract(a.payload_json, '$.credentialExpiresAt')
 AND k.expires_at > unixepoch()
 AND EXISTS (SELECT 1 FROM memory_machine_completions issue_done JOIN memory_machine_attempts issue_a ON issue_a.id = issue_done.attempt_id
   JOIN memory_machine_audit issue_audit ON issue_audit.id = issue_done.audit_id AND issue_audit.attempt_id = issue_a.id
   WHERE issue_a.id = g.issued_attempt_id AND issue_a.action = 'issue' AND issue_a.target_id = g.id
    AND issue_a.installation_id = g.installation_id AND issue_done.installation_id = g.installation_id
    AND issue_done.request_hash = issue_a.request_hash AND issue_done.audit_id = issue_a.audit_id
    AND issue_done.auth_revision = issue_a.auth_revision + 1 AND issue_audit.action = 'issue'
    AND issue_audit.target_id = g.id AND issue_audit.installation_id = g.installation_id AND issue_audit.request_hash = issue_a.request_hash))) OR (a.action = 'revoke' AND EXISTS (SELECT 1 FROM memory_machine_principals p
 JOIN memory_machine_grants g ON g.id = p.grant_id AND g.machine_id = p.id AND g.installation_id = p.installation_id AND g.repository_id = p.repository_id
 JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'removed'
 WHERE p.id = a.target_id AND p.id = json_extract(a.payload_json, '$.machineId') AND p.installation_id = a.installation_id AND p.repository_id = c.repository_id
 AND p.status = 'revoked' AND p.revision = json_extract(a.payload_json, '$.machineRevision') + 1
 AND g.state = 'revoked' AND g.revision = json_extract(a.payload_json, '$.grantRevision') + 1))))
BEGIN SELECT RAISE(ABORT, 'machine completion requires exact current outcome'); END;
CREATE TRIGGER memory_machine_audit_insert_guard BEFORE INSERT ON memory_machine_audit
WHEN NOT EXISTS (SELECT 1 FROM memory_machine_configuration c WHERE c.installation_id = NEW.installation_id AND (
 (NEW.action = 'bootstrap' AND NEW.attempt_id = c.operation_id AND NEW.target_id = c.installation_id
  AND NEW.request_hash = c.request_hash AND c.auth_revision = 1 AND c.pin_revision = 1 AND c.state = 'pending'
  AND NOT EXISTS (SELECT 1 FROM memory_machine_attempts WHERE installation_id = c.installation_id))
 OR EXISTS (SELECT 1 FROM memory_machine_attempts a WHERE a.installation_id = c.installation_id AND a.id = NEW.attempt_id
  AND a.audit_id = NEW.id AND a.action = NEW.action AND a.target_id = NEW.target_id AND a.request_hash = NEW.request_hash
  AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1
 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash AND ((a.action = 'issue' AND EXISTS (SELECT 1 FROM memory_machine_grants g
 WHERE g.id = a.target_id AND g.installation_id = a.installation_id AND g.repository_id = c.repository_id
 AND g.id = json_extract(a.payload_json, '$.grantId') AND g.commitment = json_extract(a.payload_json, '$.machineCommitment')
 AND g.secret_hash = json_extract(a.payload_json, '$.capabilityHash') AND g.scope = json_extract(a.payload_json, '$.scope')
 AND g.expires_at = json_extract(a.payload_json, '$.expiresAt') AND g.expires_at > unixepoch()
 AND g.state = 'pending' AND g.revision = 1 AND g.machine_id IS NULL AND g.issued_attempt_id = a.id)) OR (a.action = 'enroll' AND EXISTS (SELECT 1 FROM memory_machine_grants g
 JOIN memory_machine_principals p ON p.id = g.machine_id AND p.grant_id = g.id AND p.installation_id = g.installation_id AND p.repository_id = g.repository_id
 JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'active'
 JOIN memory_machine_credentials k ON k.machine_id = p.id AND k.attempt_id = a.id AND k.machine_revision = p.revision AND k.grant_revision = g.revision
 WHERE p.id = a.target_id AND g.installation_id = a.installation_id AND g.repository_id = c.repository_id
 AND g.id = json_extract(a.payload_json, '$.grantId') AND p.id = json_extract(a.payload_json, '$.machineId')
 AND g.commitment = json_extract(a.payload_json, '$.machineCommitment') AND p.commitment = g.commitment
 AND g.secret_hash = json_extract(a.payload_json, '$.capabilityHash') AND p.scope = json_extract(a.payload_json, '$.scope')
 AND (g.scope = p.scope OR g.scope = 'memory:read memory:write memory:admin' OR (g.scope = 'memory:read memory:write' AND p.scope = 'memory:read'))
 AND g.state = 'consumed' AND g.revision = 2 AND g.consumed_attempt_id = a.id
 AND p.status = 'active' AND p.revision = 1 AND p.enrollment_attempt_id = a.id
 AND k.hash = json_extract(a.payload_json, '$.credentialHash') AND k.expires_at = json_extract(a.payload_json, '$.credentialExpiresAt')
 AND k.expires_at > unixepoch()
 AND EXISTS (SELECT 1 FROM memory_machine_completions issue_done JOIN memory_machine_attempts issue_a ON issue_a.id = issue_done.attempt_id
   JOIN memory_machine_audit issue_audit ON issue_audit.id = issue_done.audit_id AND issue_audit.attempt_id = issue_a.id
   WHERE issue_a.id = g.issued_attempt_id AND issue_a.action = 'issue' AND issue_a.target_id = g.id
    AND issue_a.installation_id = g.installation_id AND issue_done.installation_id = g.installation_id
    AND issue_done.request_hash = issue_a.request_hash AND issue_done.audit_id = issue_a.audit_id
    AND issue_done.auth_revision = issue_a.auth_revision + 1 AND issue_audit.action = 'issue'
    AND issue_audit.target_id = g.id AND issue_audit.installation_id = g.installation_id AND issue_audit.request_hash = issue_a.request_hash))) OR (a.action = 'revoke' AND EXISTS (SELECT 1 FROM memory_machine_principals p
 JOIN memory_machine_grants g ON g.id = p.grant_id AND g.machine_id = p.id AND g.installation_id = p.installation_id AND g.repository_id = p.repository_id
 JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'removed'
 WHERE p.id = a.target_id AND p.id = json_extract(a.payload_json, '$.machineId') AND p.installation_id = a.installation_id AND p.repository_id = c.repository_id
 AND p.status = 'revoked' AND p.revision = json_extract(a.payload_json, '$.machineRevision') + 1
 AND g.state = 'revoked' AND g.revision = json_extract(a.payload_json, '$.grantRevision') + 1))))))
BEGIN SELECT RAISE(ABORT, 'machine audit requires exact current outcome'); END;
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (12, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
