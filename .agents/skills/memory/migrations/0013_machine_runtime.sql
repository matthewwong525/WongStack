-- Inactive schema13: no routes, retirement, principal adoption or data publication.
CREATE TABLE memory_runtime_configuration (
 installation_id TEXT PRIMARY KEY REFERENCES memory_machine_configuration(installation_id),
 repository_id TEXT NOT NULL, target_json TEXT NOT NULL CHECK(json_valid(target_json)),
 baseline_hash TEXT NOT NULL CHECK(length(baseline_hash)=64), baseline_request_hash TEXT NOT NULL,
 baseline_audit_id TEXT NOT NULL REFERENCES memory_machine_audit(id), pin_hash TEXT NOT NULL,
 operation_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL CHECK(length(request_hash)=64),
 upgrade_expected_json TEXT NOT NULL CHECK(json_valid(upgrade_expected_json)),
 runtime_revision INTEGER NOT NULL DEFAULT 1 CHECK(runtime_revision>=1),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','maintenance')),
 barrier_attempt_id TEXT, created_at INTEGER NOT NULL,
 CHECK((state='maintenance')=(barrier_attempt_id IS NOT NULL))
);
CREATE TABLE memory_runtime_manifests (
 installation_id TEXT PRIMARY KEY REFERENCES memory_runtime_configuration(installation_id),
 repository_id TEXT NOT NULL, schema_version INTEGER NOT NULL CHECK(schema_version=13),
 manifest_hash TEXT NOT NULL CHECK(length(manifest_hash)=64), baseline_hash TEXT NOT NULL,
 request_hash TEXT NOT NULL, audit_id TEXT NOT NULL UNIQUE
);
CREATE TABLE memory_runtime_bootstrap (
 installation_id TEXT PRIMARY KEY REFERENCES memory_runtime_configuration(installation_id),
 operation_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL, baseline_hash TEXT NOT NULL,
 audit_id TEXT NOT NULL UNIQUE
);
CREATE TABLE memory_runtime_attempts (
 id TEXT PRIMARY KEY CHECK(length(id)>=32), installation_id TEXT NOT NULL REFERENCES memory_runtime_configuration(installation_id),
 action TEXT NOT NULL CHECK(action IN ('issue','enroll','revoke','renew','stage','publish','activate')),
 target_id TEXT NOT NULL, request_hash TEXT NOT NULL CHECK(length(request_hash)=64),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), snapshot_hash TEXT NOT NULL,
 baseline_hash TEXT NOT NULL, pin_hash TEXT NOT NULL, pin_revision INTEGER NOT NULL,
 auth_revision INTEGER NOT NULL, runtime_revision INTEGER NOT NULL, audit_id TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL
);
CREATE TABLE memory_runtime_audit (
 id TEXT PRIMARY KEY, installation_id TEXT NOT NULL REFERENCES memory_runtime_configuration(installation_id),
 attempt_id TEXT NOT NULL UNIQUE, action TEXT NOT NULL, target_id TEXT NOT NULL,
 request_hash TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE memory_runtime_completions (
 attempt_id TEXT PRIMARY KEY REFERENCES memory_runtime_attempts(id), installation_id TEXT NOT NULL,
 request_hash TEXT NOT NULL, audit_id TEXT NOT NULL UNIQUE REFERENCES memory_runtime_audit(id),
 auth_revision INTEGER NOT NULL, runtime_revision INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE memory_runtime_proofs (
 nonce_hash TEXT PRIMARY KEY CHECK(length(nonce_hash)=64), attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_runtime_attempts(id),
 machine_id TEXT NOT NULL, grant_id TEXT NOT NULL, commitment TEXT NOT NULL,
 proof_hash TEXT NOT NULL CHECK(length(proof_hash)=64), deadline INTEGER NOT NULL, created_at INTEGER NOT NULL,
 CHECK(deadline>created_at AND deadline<=created_at+120)
);
CREATE TABLE memory_runtime_keys (
 machine_id TEXT PRIMARY KEY REFERENCES memory_machine_principals(id), commitment TEXT NOT NULL,
 public_key_json TEXT NOT NULL CHECK(json_valid(public_key_json)), attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_runtime_attempts(id)
);
CREATE TABLE memory_runtime_rotations (
 hash TEXT PRIMARY KEY CHECK(length(hash)=64 AND hash NOT GLOB '*[^0-9a-f]*'),
 machine_id TEXT NOT NULL REFERENCES memory_machine_principals(id), grant_id TEXT NOT NULL REFERENCES memory_machine_grants(id),
 generation INTEGER NOT NULL CHECK(generation>=1), previous_hash TEXT, overlap_until INTEGER NOT NULL,
 scope TEXT NOT NULL, grant_revision INTEGER NOT NULL, machine_revision INTEGER NOT NULL,
 issued_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK(expires_at>issued_at AND expires_at<=issued_at+2592000),
 attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_runtime_attempts(id),
 UNIQUE(machine_id,generation), CHECK(overlap_until>=issued_at AND overlap_until<=issued_at+120)
);
CREATE TABLE memory_runtime_transcripts (
 attempt_id TEXT PRIMARY KEY REFERENCES memory_runtime_attempts(id), machine_id TEXT NOT NULL REFERENCES memory_machine_principals(id),
 object_hash TEXT NOT NULL CHECK(length(object_hash)=64), session_hash TEXT NOT NULL CHECK(length(session_hash)=64),
 content_hash TEXT NOT NULL CHECK(length(content_hash)=64), visibility TEXT NOT NULL CHECK(visibility IN ('private','shared')),
 event TEXT NOT NULL CHECK(event IN ('staged','published')), stage_attempt_id TEXT,
 auth_revision INTEGER NOT NULL, grant_revision INTEGER NOT NULL, machine_revision INTEGER NOT NULL,
 credential_generation INTEGER NOT NULL CHECK(credential_generation>=1),
 created_at INTEGER NOT NULL, UNIQUE(object_hash,event),
 CHECK((event='published')=(stage_attempt_id IS NOT NULL))
);
CREATE TABLE memory_runtime_activations (
 attempt_id TEXT PRIMARY KEY REFERENCES memory_runtime_attempts(id), installation_id TEXT NOT NULL UNIQUE,
 baseline_hash TEXT NOT NULL, pin_hash TEXT NOT NULL, protocol_hash TEXT NOT NULL CHECK(length(protocol_hash)=64),
 route_contract_hash TEXT NOT NULL CHECK(length(route_contract_hash)=64), auth_revision INTEGER NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TRIGGER memory_runtime_attempt_guard BEFORE INSERT ON memory_runtime_attempts
WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_configuration r JOIN memory_machine_configuration c USING(installation_id)
 JOIN memory_runtime_bootstrap b ON b.installation_id=r.installation_id AND b.request_hash=r.request_hash AND b.baseline_hash=r.baseline_hash
 WHERE r.installation_id=NEW.installation_id AND r.state='pending' AND r.barrier_attempt_id IS NULL
 AND c.state='pending' AND c.barrier_attempt_id IS NULL AND r.runtime_revision=NEW.runtime_revision
 AND c.auth_revision=NEW.auth_revision AND c.pin_revision=NEW.pin_revision AND c.pin_hash=NEW.pin_hash
 AND r.pin_hash=c.pin_hash AND r.baseline_hash=NEW.baseline_hash)
 OR EXISTS(SELECT 1 FROM memory_runtime_attempts a LEFT JOIN memory_runtime_completions d ON d.attempt_id=a.id
 WHERE a.installation_id=NEW.installation_id AND d.attempt_id IS NULL)
BEGIN SELECT RAISE(ABORT,'runtime authority stale or incomplete'); END;
CREATE TRIGGER memory_runtime_attempt_close AFTER INSERT ON memory_runtime_attempts
BEGIN UPDATE memory_runtime_configuration SET state='maintenance',barrier_attempt_id=NEW.id,
 runtime_revision=runtime_revision+1 WHERE installation_id=NEW.installation_id; END;
CREATE TRIGGER memory_runtime_configuration_guard BEFORE UPDATE ON memory_runtime_configuration
WHEN NEW.installation_id IS NOT OLD.installation_id OR NEW.repository_id IS NOT OLD.repository_id
 OR NEW.target_json IS NOT OLD.target_json OR NEW.baseline_hash IS NOT OLD.baseline_hash
 OR NEW.baseline_request_hash IS NOT OLD.baseline_request_hash OR NEW.baseline_audit_id IS NOT OLD.baseline_audit_id
 OR NEW.pin_hash IS NOT OLD.pin_hash OR NEW.operation_id IS NOT OLD.operation_id OR NEW.request_hash IS NOT OLD.request_hash
 OR NEW.created_at!=OLD.created_at OR NEW.upgrade_expected_json IS NOT OLD.upgrade_expected_json
 OR NOT((OLD.state='pending' AND NEW.state='maintenance' AND NEW.runtime_revision=OLD.runtime_revision+1
 AND EXISTS(SELECT 1 FROM memory_runtime_attempts a WHERE a.id=NEW.barrier_attempt_id AND a.installation_id=OLD.installation_id AND a.runtime_revision=OLD.runtime_revision))
 OR(OLD.state='maintenance' AND NEW.state='pending' AND NEW.barrier_attempt_id IS NULL AND NEW.runtime_revision=OLD.runtime_revision
 AND EXISTS(SELECT 1 FROM memory_runtime_completions d WHERE d.attempt_id=OLD.barrier_attempt_id AND d.runtime_revision=OLD.runtime_revision)))
BEGIN SELECT RAISE(ABORT,'runtime configuration requires exact barrier'); END;
-- Schema12 remains byte-identical; its mutations after preparation must nest in this runtime attempt.
CREATE TRIGGER memory_runtime_machine_attempt_guard BEFORE INSERT ON memory_machine_attempts
WHEN EXISTS(SELECT 1 FROM memory_runtime_configuration)
 AND NOT EXISTS(SELECT 1 FROM memory_runtime_configuration r JOIN memory_runtime_attempts a ON a.id=r.barrier_attempt_id
 WHERE r.installation_id=NEW.installation_id AND r.state='maintenance' AND r.runtime_revision=a.runtime_revision+1
 AND a.id=NEW.id AND a.action=NEW.action AND a.target_id=NEW.target_id AND a.request_hash=NEW.request_hash
 AND a.payload_json=NEW.payload_json AND a.audit_id=NEW.audit_id AND a.auth_revision=NEW.auth_revision
 AND a.pin_hash=NEW.pin_hash AND a.pin_revision=NEW.pin_revision)
BEGIN SELECT RAISE(ABORT,'schema12 requires runtime maintenance'); END;
CREATE TRIGGER memory_runtime_proofs_guard BEFORE INSERT ON memory_runtime_proofs
WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id)
 JOIN memory_machine_configuration c USING(installation_id)
 WHERE a.id=NEW.attempt_id AND r.state='maintenance' AND r.barrier_attempt_id=a.id
 AND r.runtime_revision=a.runtime_revision+1 AND r.baseline_hash=a.baseline_hash
 AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision
 AND c.state='pending' AND c.barrier_attempt_id IS NULL
 AND c.auth_revision=a.auth_revision AND a.action IN ('enroll','renew','stage','publish') AND NEW.machine_id=json_extract(a.payload_json,'$.machineId')
 AND NEW.grant_id=json_extract(a.payload_json,'$.grantId') AND NEW.commitment=json_extract(a.payload_json,'$.machineCommitment')
 AND NEW.nonce_hash=json_extract(a.payload_json,'$.nonceHash') AND NEW.proof_hash=json_extract(a.payload_json,'$.proofHash')
 AND NEW.deadline=json_extract(a.payload_json,'$.deadline') AND NEW.deadline>unixepoch())
BEGIN SELECT RAISE(ABORT,'runtime row requires exact current outcome'); END;
CREATE TRIGGER memory_runtime_keys_guard BEFORE INSERT ON memory_runtime_keys
WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id)
 JOIN memory_machine_configuration c USING(installation_id)
 WHERE a.id=NEW.attempt_id AND r.state='maintenance' AND r.barrier_attempt_id=a.id
 AND r.runtime_revision=a.runtime_revision+1 AND r.baseline_hash=a.baseline_hash
 AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision
 AND c.state='pending' AND c.barrier_attempt_id IS NULL
 AND c.auth_revision=a.auth_revision+CASE WHEN a.action IN ('issue','enroll','revoke') THEN 1 ELSE 0 END AND a.action IN ('enroll','renew') AND NEW.machine_id=json_extract(a.payload_json,'$.machineId')
 AND NEW.commitment=json_extract(a.payload_json,'$.machineCommitment') AND NEW.public_key_json=json_extract(a.payload_json,'$.publicKeyJson'))
BEGIN SELECT RAISE(ABORT,'runtime row requires exact current outcome'); END;
CREATE TRIGGER memory_runtime_rotations_guard BEFORE INSERT ON memory_runtime_rotations
WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id)
 JOIN memory_machine_configuration c USING(installation_id)
 WHERE a.id=NEW.attempt_id AND r.state='maintenance' AND r.barrier_attempt_id=a.id
 AND r.runtime_revision=a.runtime_revision+1 AND r.baseline_hash=a.baseline_hash
 AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision
 AND c.state='pending' AND c.barrier_attempt_id IS NULL
 AND c.auth_revision=a.auth_revision+CASE WHEN a.action IN ('issue','enroll','revoke') THEN 1 ELSE 0 END AND a.action IN ('enroll','renew') AND NEW.machine_id=json_extract(a.payload_json,'$.machineId')
 AND NEW.grant_id=json_extract(a.payload_json,'$.grantId') AND NEW.hash=json_extract(a.payload_json,'$.credentialHash')
 AND NEW.generation=json_extract(a.payload_json,'$.generation') AND NEW.previous_hash IS json_extract(a.payload_json,'$.previousHash')
 AND NEW.overlap_until=json_extract(a.payload_json,'$.overlapUntil') AND NEW.expires_at=json_extract(a.payload_json,'$.credentialExpiresAt')
 AND NEW.scope=json_extract(a.payload_json,'$.scope') AND NEW.grant_revision=json_extract(a.payload_json,'$.grantRevision')
 AND NEW.machine_revision=json_extract(a.payload_json,'$.machineRevision') AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id
 JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id
 WHERE p.id=json_extract(a.payload_json,'$.machineId') AND p.installation_id=a.installation_id
 AND p.repository_id=r.repository_id AND p.status='active' AND generic.status='active'
 AND g.state='consumed' AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id
 AND g.id=json_extract(a.payload_json,'$.grantId') AND p.scope=json_extract(a.payload_json,'$.scope')
 AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.revision=json_extract(a.payload_json,'$.machineRevision'))
 AND ((a.action='enroll' AND NEW.generation=1 AND NEW.previous_hash IS NULL)
 OR (a.action='renew' AND EXISTS(SELECT 1 FROM memory_runtime_rotations old
 WHERE old.machine_id=NEW.machine_id AND old.hash=NEW.previous_hash AND old.generation=NEW.generation-1
 AND old.scope=NEW.scope AND old.grant_revision=NEW.grant_revision AND old.machine_revision=NEW.machine_revision))
 OR(a.action='renew' AND NEW.generation=1 AND NOT EXISTS(SELECT 1 FROM memory_runtime_rotations WHERE machine_id=NEW.machine_id)
 AND EXISTS(SELECT 1 FROM memory_machine_credentials old JOIN memory_machine_completions done ON done.attempt_id=old.attempt_id
 WHERE old.hash=NEW.previous_hash AND old.machine_id=NEW.machine_id AND old.grant_revision=NEW.grant_revision
 AND old.machine_revision=NEW.machine_revision))))
BEGIN SELECT RAISE(ABORT,'runtime row requires exact current outcome'); END;
CREATE TRIGGER memory_runtime_transcripts_guard BEFORE INSERT ON memory_runtime_transcripts
WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id)
 JOIN memory_machine_configuration c USING(installation_id)
 WHERE a.id=NEW.attempt_id AND r.state='maintenance' AND r.barrier_attempt_id=a.id
 AND r.runtime_revision=a.runtime_revision+1 AND r.baseline_hash=a.baseline_hash
 AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision
 AND c.state='pending' AND c.barrier_attempt_id IS NULL
 AND c.auth_revision=a.auth_revision+CASE WHEN a.action IN ('issue','enroll','revoke') THEN 1 ELSE 0 END AND a.action IN ('stage','publish') AND NEW.machine_id=json_extract(a.payload_json,'$.machineId')
 AND NEW.object_hash=json_extract(a.payload_json,'$.objectHash') AND NEW.session_hash=json_extract(a.payload_json,'$.sessionHash')
 AND NEW.content_hash=json_extract(a.payload_json,'$.contentHash') AND NEW.visibility=json_extract(a.payload_json,'$.visibility')
 AND NEW.auth_revision=c.auth_revision AND NEW.machine_revision=json_extract(a.payload_json,'$.machineRevision')
 AND NEW.grant_revision=json_extract(a.payload_json,'$.grantRevision') AND NEW.credential_generation=json_extract(a.payload_json,'$.credentialGeneration')
 AND NEW.credential_generation=(SELECT max(generation) FROM memory_runtime_rotations WHERE machine_id=NEW.machine_id)
 AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id
 JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id
 WHERE p.id=json_extract(a.payload_json,'$.machineId') AND p.installation_id=a.installation_id
 AND p.repository_id=r.repository_id AND p.status='active' AND generic.status='active'
 AND g.state='consumed' AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id
 AND g.id=json_extract(a.payload_json,'$.grantId') AND p.scope=json_extract(a.payload_json,'$.scope')
 AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.revision=json_extract(a.payload_json,'$.machineRevision'))
 AND (NEW.visibility='private' OR json_extract(a.payload_json,'$.scope')!='memory:read')
 AND ((a.action='stage' AND NEW.event='staged' AND NEW.stage_attempt_id IS NULL)
 OR(a.action='publish' AND NEW.event='published' AND NEW.stage_attempt_id=json_extract(a.payload_json,'$.stageAttemptId')
 AND EXISTS(SELECT 1 FROM memory_runtime_transcripts staged JOIN memory_runtime_completions done ON done.attempt_id=staged.attempt_id
 WHERE staged.attempt_id=NEW.stage_attempt_id AND staged.event='staged' AND staged.machine_id=NEW.machine_id
 AND staged.object_hash=NEW.object_hash AND staged.session_hash=NEW.session_hash AND staged.content_hash=NEW.content_hash
 AND staged.visibility=NEW.visibility AND staged.credential_generation=NEW.credential_generation
 AND staged.machine_revision=NEW.machine_revision AND staged.grant_revision=NEW.grant_revision))))
BEGIN SELECT RAISE(ABORT,'runtime row requires exact current outcome'); END;
CREATE TRIGGER memory_runtime_activations_guard BEFORE INSERT ON memory_runtime_activations
WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id)
 JOIN memory_machine_configuration c USING(installation_id) WHERE a.id=NEW.attempt_id AND a.action='activate'
 AND a.installation_id=NEW.installation_id AND r.baseline_hash=NEW.baseline_hash AND r.pin_hash=NEW.pin_hash
 AND r.state='maintenance' AND r.barrier_attempt_id=a.id AND r.runtime_revision=a.runtime_revision+1
 AND c.state='pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision=a.auth_revision AND NEW.auth_revision=c.auth_revision
 AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision AND r.baseline_hash=a.baseline_hash
 AND NEW.protocol_hash=json_extract(a.payload_json,'$.protocolHash') AND NEW.route_contract_hash=json_extract(a.payload_json,'$.routeContractHash')
 AND NOT EXISTS(SELECT 1 FROM memory_keys) AND NOT EXISTS(SELECT 1 FROM memory_admins) AND NOT EXISTS(SELECT 1 FROM memory_credentials) AND NOT EXISTS(SELECT 1 FROM memory_devices) AND NOT EXISTS(SELECT 1 FROM memory_identity_bindings) AND NOT EXISTS(SELECT 1 FROM memory_memberships) AND NOT EXISTS(SELECT 1 FROM memory_providers) AND NOT EXISTS(SELECT 1 FROM memory_owner_intents) AND NOT EXISTS(SELECT 1 FROM memory_installation_configuration) AND NOT EXISTS(SELECT 1 FROM memory_bootstrap_completion) AND NOT EXISTS(SELECT 1 FROM memory_schema_receipts))
BEGIN SELECT RAISE(ABORT,'runtime activation requires exact fresh authority'); END;
CREATE VIEW memory_runtime_outcomes AS SELECT a.id,a.installation_id,a.request_hash,a.audit_id,a.action,a.target_id,c.auth_revision,r.runtime_revision
 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id)
 JOIN memory_machine_configuration c USING(installation_id)
 WHERE c.state='pending' AND c.barrier_attempt_id IS NULL AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash
 AND c.pin_revision=a.pin_revision AND r.baseline_hash=a.baseline_hash
 AND c.auth_revision=a.auth_revision+CASE WHEN a.action IN ('issue','enroll','revoke') THEN 1 ELSE 0 END
 AND r.runtime_revision=a.runtime_revision+1 AND ((a.action='issue' AND EXISTS(SELECT 1 FROM memory_machine_completions d JOIN memory_machine_attempts la ON la.id=d.attempt_id
 JOIN memory_machine_audit audit ON audit.id=d.audit_id
 WHERE d.attempt_id=a.id AND d.request_hash=a.request_hash AND d.audit_id=a.audit_id
 AND d.auth_revision=c.auth_revision AND la.payload_json=a.payload_json AND la.action=a.action AND audit.target_id=a.target_id) AND EXISTS(SELECT 1 FROM memory_machine_grants g WHERE g.id=a.target_id AND g.state='pending' AND g.revision=1
 AND g.issued_attempt_id=a.id AND g.commitment=json_extract(a.payload_json,'$.machineCommitment')
 AND g.secret_hash=json_extract(a.payload_json,'$.capabilityHash') AND g.scope=json_extract(a.payload_json,'$.scope')
 AND g.expires_at=json_extract(a.payload_json,'$.expiresAt') AND g.expires_at>unixepoch()))
 OR(a.action='revoke' AND EXISTS(SELECT 1 FROM memory_machine_completions d JOIN memory_machine_attempts la ON la.id=d.attempt_id
 JOIN memory_machine_audit audit ON audit.id=d.audit_id
 WHERE d.attempt_id=a.id AND d.request_hash=a.request_hash AND d.audit_id=a.audit_id
 AND d.auth_revision=c.auth_revision AND la.payload_json=a.payload_json AND la.action=a.action AND audit.target_id=a.target_id) AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id
 JOIN memory_principals generic ON generic.id=p.id AND generic.status='removed'
 WHERE p.id=a.target_id AND p.installation_id=a.installation_id AND p.repository_id=r.repository_id
 AND p.status='revoked' AND p.revision=json_extract(a.payload_json,'$.machineRevision')+1
 AND g.state='revoked' AND g.machine_id=p.id AND g.revision=json_extract(a.payload_json,'$.grantRevision')+1))
 OR(a.action='enroll' AND EXISTS(SELECT 1 FROM memory_machine_completions d JOIN memory_machine_attempts la ON la.id=d.attempt_id
 JOIN memory_machine_audit audit ON audit.id=d.audit_id
 WHERE d.attempt_id=a.id AND d.request_hash=a.request_hash AND d.audit_id=a.audit_id
 AND d.auth_revision=c.auth_revision AND la.payload_json=a.payload_json AND la.action=a.action AND audit.target_id=a.target_id) AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id
 JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id
 WHERE p.id=json_extract(a.payload_json,'$.machineId') AND p.installation_id=a.installation_id
 AND p.repository_id=r.repository_id AND p.status='active' AND generic.status='active'
 AND g.state='consumed' AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id
 AND g.id=json_extract(a.payload_json,'$.grantId') AND p.scope=json_extract(a.payload_json,'$.scope')
 AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.revision=json_extract(a.payload_json,'$.machineRevision')) AND EXISTS(SELECT 1 FROM memory_runtime_proofs p WHERE p.attempt_id=a.id
 AND p.nonce_hash=json_extract(a.payload_json,'$.nonceHash') AND p.proof_hash=json_extract(a.payload_json,'$.proofHash')
 AND p.deadline>unixepoch() AND p.deadline=json_extract(a.payload_json,'$.deadline')
 AND p.machine_id=a.target_id AND p.grant_id=json_extract(a.payload_json,'$.grantId')
 AND p.commitment=json_extract(a.payload_json,'$.machineCommitment')) AND EXISTS(SELECT 1 FROM memory_runtime_rotations k WHERE k.attempt_id=a.id
 AND k.hash=json_extract(a.payload_json,'$.credentialHash') AND k.generation=json_extract(a.payload_json,'$.generation')
 AND k.machine_id=a.target_id AND k.scope=json_extract(a.payload_json,'$.scope') AND k.expires_at>unixepoch()
 AND k.grant_id=json_extract(a.payload_json,'$.grantId') AND k.grant_revision=json_extract(a.payload_json,'$.grantRevision')
 AND k.machine_revision=json_extract(a.payload_json,'$.machineRevision') AND k.previous_hash IS json_extract(a.payload_json,'$.previousHash')
 AND k.overlap_until=json_extract(a.payload_json,'$.overlapUntil') AND k.expires_at=json_extract(a.payload_json,'$.credentialExpiresAt'))
 AND EXISTS(SELECT 1 FROM memory_runtime_keys k WHERE k.machine_id=a.target_id AND k.attempt_id=a.id AND k.commitment=json_extract(a.payload_json,'$.machineCommitment')
 AND k.public_key_json=json_extract(a.payload_json,'$.publicKeyJson')))
 OR(a.action='renew' AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id
 JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id
 WHERE p.id=json_extract(a.payload_json,'$.machineId') AND p.installation_id=a.installation_id
 AND p.repository_id=r.repository_id AND p.status='active' AND generic.status='active'
 AND g.state='consumed' AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id
 AND g.id=json_extract(a.payload_json,'$.grantId') AND p.scope=json_extract(a.payload_json,'$.scope')
 AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.revision=json_extract(a.payload_json,'$.machineRevision')) AND EXISTS(SELECT 1 FROM memory_runtime_proofs p WHERE p.attempt_id=a.id
 AND p.nonce_hash=json_extract(a.payload_json,'$.nonceHash') AND p.proof_hash=json_extract(a.payload_json,'$.proofHash')
 AND p.deadline>unixepoch() AND p.deadline=json_extract(a.payload_json,'$.deadline')
 AND p.machine_id=a.target_id AND p.grant_id=json_extract(a.payload_json,'$.grantId')
 AND p.commitment=json_extract(a.payload_json,'$.machineCommitment')) AND EXISTS(SELECT 1 FROM memory_runtime_rotations k WHERE k.attempt_id=a.id
 AND k.hash=json_extract(a.payload_json,'$.credentialHash') AND k.generation=json_extract(a.payload_json,'$.generation')
 AND k.machine_id=a.target_id AND k.scope=json_extract(a.payload_json,'$.scope') AND k.expires_at>unixepoch()
 AND k.grant_id=json_extract(a.payload_json,'$.grantId') AND k.grant_revision=json_extract(a.payload_json,'$.grantRevision')
 AND k.machine_revision=json_extract(a.payload_json,'$.machineRevision') AND k.previous_hash IS json_extract(a.payload_json,'$.previousHash')
 AND k.overlap_until=json_extract(a.payload_json,'$.overlapUntil') AND k.expires_at=json_extract(a.payload_json,'$.credentialExpiresAt')) AND EXISTS(SELECT 1 FROM memory_runtime_keys stored_key WHERE stored_key.machine_id=a.target_id
 AND stored_key.commitment=json_extract(a.payload_json,'$.machineCommitment') AND stored_key.public_key_json=json_extract(a.payload_json,'$.publicKeyJson')))
 OR(a.action='activate' AND EXISTS(SELECT 1 FROM memory_runtime_activations x WHERE x.attempt_id=a.id
 AND x.installation_id=a.installation_id AND x.baseline_hash=r.baseline_hash AND x.pin_hash=r.pin_hash
 AND x.auth_revision=c.auth_revision AND x.protocol_hash=json_extract(a.payload_json,'$.protocolHash')
 AND x.route_contract_hash=json_extract(a.payload_json,'$.routeContractHash')) AND NOT EXISTS(SELECT 1 FROM memory_keys) AND NOT EXISTS(SELECT 1 FROM memory_admins) AND NOT EXISTS(SELECT 1 FROM memory_credentials) AND NOT EXISTS(SELECT 1 FROM memory_devices) AND NOT EXISTS(SELECT 1 FROM memory_identity_bindings) AND NOT EXISTS(SELECT 1 FROM memory_memberships) AND NOT EXISTS(SELECT 1 FROM memory_providers) AND NOT EXISTS(SELECT 1 FROM memory_owner_intents) AND NOT EXISTS(SELECT 1 FROM memory_installation_configuration) AND NOT EXISTS(SELECT 1 FROM memory_bootstrap_completion) AND NOT EXISTS(SELECT 1 FROM memory_schema_receipts))
 OR(a.action IN ('stage','publish') AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id
 JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id
 WHERE p.id=json_extract(a.payload_json,'$.machineId') AND p.installation_id=a.installation_id
 AND p.repository_id=r.repository_id AND p.status='active' AND generic.status='active'
 AND g.state='consumed' AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id
 AND g.id=json_extract(a.payload_json,'$.grantId') AND p.scope=json_extract(a.payload_json,'$.scope')
 AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.revision=json_extract(a.payload_json,'$.machineRevision')) AND EXISTS(SELECT 1 FROM memory_runtime_proofs p WHERE p.attempt_id=a.id
 AND p.nonce_hash=json_extract(a.payload_json,'$.nonceHash') AND p.proof_hash=json_extract(a.payload_json,'$.proofHash')
 AND p.deadline>unixepoch() AND p.deadline=json_extract(a.payload_json,'$.deadline')
 AND p.machine_id=a.target_id AND p.grant_id=json_extract(a.payload_json,'$.grantId')
 AND p.commitment=json_extract(a.payload_json,'$.machineCommitment')) AND EXISTS(SELECT 1 FROM memory_runtime_transcripts x WHERE x.attempt_id=a.id AND x.machine_id=a.target_id
 AND x.object_hash=json_extract(a.payload_json,'$.objectHash') AND x.content_hash=json_extract(a.payload_json,'$.contentHash')
 AND x.session_hash=json_extract(a.payload_json,'$.sessionHash') AND x.visibility=json_extract(a.payload_json,'$.visibility')
 AND x.auth_revision=c.auth_revision AND x.grant_revision=json_extract(a.payload_json,'$.grantRevision')
 AND x.machine_revision=json_extract(a.payload_json,'$.machineRevision')
 AND x.credential_generation=json_extract(a.payload_json,'$.credentialGeneration')
 AND x.credential_generation=(SELECT max(generation) FROM memory_runtime_rotations WHERE machine_id=x.machine_id)
 AND x.event=CASE WHEN a.action='stage' THEN 'staged' ELSE 'published' END)));
CREATE TRIGGER memory_runtime_audit_guard BEFORE INSERT ON memory_runtime_audit
WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_configuration r WHERE r.installation_id=NEW.installation_id
 AND ((NEW.action='upgrade' AND NEW.attempt_id=r.operation_id AND NEW.target_id=r.installation_id
 AND NEW.request_hash=r.request_hash AND r.runtime_revision=1 AND r.state='pending')
 OR EXISTS(SELECT 1 FROM memory_runtime_outcomes o WHERE o.id=NEW.attempt_id AND o.audit_id=NEW.id
 AND o.installation_id=NEW.installation_id AND o.action=NEW.action AND o.target_id=NEW.target_id
 AND o.request_hash=NEW.request_hash AND r.state='maintenance' AND r.barrier_attempt_id=o.id)))
BEGIN SELECT RAISE(ABORT,'runtime audit requires exact outcome'); END;
CREATE TRIGGER memory_runtime_completion_guard BEFORE INSERT ON memory_runtime_completions
WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_outcomes o JOIN memory_runtime_audit audit ON audit.id=o.audit_id
 JOIN memory_runtime_configuration r ON r.installation_id=o.installation_id
 WHERE o.id=NEW.attempt_id AND o.installation_id=NEW.installation_id AND o.request_hash=NEW.request_hash
 AND o.audit_id=NEW.audit_id AND o.auth_revision=NEW.auth_revision AND o.runtime_revision=NEW.runtime_revision
 AND audit.attempt_id=o.id AND audit.action=o.action AND audit.target_id=o.target_id AND audit.request_hash=o.request_hash
 AND r.state='maintenance' AND r.barrier_attempt_id=o.id)
BEGIN SELECT RAISE(ABORT,'runtime completion requires exact outcome'); END;
CREATE TRIGGER memory_runtime_completion_release AFTER INSERT ON memory_runtime_completions
BEGIN UPDATE memory_runtime_configuration SET state='pending',barrier_attempt_id=NULL
 WHERE installation_id=NEW.installation_id AND barrier_attempt_id=NEW.attempt_id; END;
CREATE TRIGGER memory_runtime_bootstrap_guard BEFORE INSERT ON memory_runtime_bootstrap
WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_configuration r JOIN memory_machine_configuration c USING(installation_id)
 JOIN memory_machine_bootstrap_completions old ON old.installation_id=c.installation_id
 JOIN memory_machine_manifest_receipts oldm ON oldm.installation_id=c.installation_id AND oldm.schema_version=12
 JOIN memory_machine_audit olda ON olda.id=old.audit_id AND olda.action='bootstrap'
 JOIN memory_runtime_manifests m ON m.installation_id=r.installation_id AND m.repository_id=r.repository_id
 JOIN memory_runtime_audit a ON a.id=m.audit_id AND a.action='upgrade' AND a.attempt_id=r.operation_id
 WHERE r.installation_id=NEW.installation_id AND r.operation_id=NEW.operation_id AND r.request_hash=NEW.request_hash
 AND r.baseline_hash=NEW.baseline_hash AND m.baseline_hash=r.baseline_hash AND m.schema_version=13
 AND m.request_hash=r.request_hash AND NEW.audit_id=a.id AND a.target_id=r.installation_id AND a.request_hash=r.request_hash
 AND c.state='pending' AND c.barrier_attempt_id IS NULL AND old.audit_id=r.baseline_audit_id
 AND old.request_hash=c.request_hash AND oldm.request_hash=c.request_hash AND oldm.audit_id=olda.id
 AND r.baseline_request_hash=c.request_hash AND olda.request_hash=c.request_hash AND olda.target_id=c.installation_id
 AND old.operation_id=c.operation_id AND r.pin_hash=c.pin_hash AND r.target_json=c.target_json
 AND r.runtime_revision=1 AND r.state='pending' AND r.barrier_attempt_id IS NULL)
BEGIN SELECT RAISE(ABORT,'runtime bootstrap requires original completed12'); END;
CREATE TRIGGER memory_runtime_manifests_immutable BEFORE UPDATE ON memory_runtime_manifests
BEGIN SELECT RAISE(ABORT,'runtime manifests immutable'); END;
CREATE TRIGGER memory_runtime_manifests_retained BEFORE DELETE ON memory_runtime_manifests
BEGIN SELECT RAISE(ABORT,'runtime manifests retained'); END;
CREATE TRIGGER memory_runtime_bootstrap_immutable BEFORE UPDATE ON memory_runtime_bootstrap
BEGIN SELECT RAISE(ABORT,'runtime bootstrap immutable'); END;
CREATE TRIGGER memory_runtime_bootstrap_retained BEFORE DELETE ON memory_runtime_bootstrap
BEGIN SELECT RAISE(ABORT,'runtime bootstrap retained'); END;
CREATE TRIGGER memory_runtime_attempts_immutable BEFORE UPDATE ON memory_runtime_attempts
BEGIN SELECT RAISE(ABORT,'runtime attempts immutable'); END;
CREATE TRIGGER memory_runtime_attempts_retained BEFORE DELETE ON memory_runtime_attempts
BEGIN SELECT RAISE(ABORT,'runtime attempts retained'); END;
CREATE TRIGGER memory_runtime_audit_immutable BEFORE UPDATE ON memory_runtime_audit
BEGIN SELECT RAISE(ABORT,'runtime audit immutable'); END;
CREATE TRIGGER memory_runtime_audit_retained BEFORE DELETE ON memory_runtime_audit
BEGIN SELECT RAISE(ABORT,'runtime audit retained'); END;
CREATE TRIGGER memory_runtime_completions_immutable BEFORE UPDATE ON memory_runtime_completions
BEGIN SELECT RAISE(ABORT,'runtime completions immutable'); END;
CREATE TRIGGER memory_runtime_completions_retained BEFORE DELETE ON memory_runtime_completions
BEGIN SELECT RAISE(ABORT,'runtime completions retained'); END;
CREATE TRIGGER memory_runtime_proofs_immutable BEFORE UPDATE ON memory_runtime_proofs
BEGIN SELECT RAISE(ABORT,'runtime proofs immutable'); END;
CREATE TRIGGER memory_runtime_proofs_retained BEFORE DELETE ON memory_runtime_proofs
BEGIN SELECT RAISE(ABORT,'runtime proofs retained'); END;
CREATE TRIGGER memory_runtime_keys_immutable BEFORE UPDATE ON memory_runtime_keys
BEGIN SELECT RAISE(ABORT,'runtime keys immutable'); END;
CREATE TRIGGER memory_runtime_keys_retained BEFORE DELETE ON memory_runtime_keys
BEGIN SELECT RAISE(ABORT,'runtime keys retained'); END;
CREATE TRIGGER memory_runtime_rotations_immutable BEFORE UPDATE ON memory_runtime_rotations
BEGIN SELECT RAISE(ABORT,'runtime rotations immutable'); END;
CREATE TRIGGER memory_runtime_rotations_retained BEFORE DELETE ON memory_runtime_rotations
BEGIN SELECT RAISE(ABORT,'runtime rotations retained'); END;
CREATE TRIGGER memory_runtime_transcripts_immutable BEFORE UPDATE ON memory_runtime_transcripts
BEGIN SELECT RAISE(ABORT,'runtime transcripts immutable'); END;
CREATE TRIGGER memory_runtime_transcripts_retained BEFORE DELETE ON memory_runtime_transcripts
BEGIN SELECT RAISE(ABORT,'runtime transcripts retained'); END;
CREATE TRIGGER memory_runtime_configuration_retained BEFORE DELETE ON memory_runtime_configuration
BEGIN SELECT RAISE(ABORT,'runtime configuration retained'); END;
INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(13,strftime('%Y-%m-%dT%H:%M:%SZ','now'));
CREATE TRIGGER memory_runtime_activations_immutable BEFORE UPDATE ON memory_runtime_activations
BEGIN SELECT RAISE(ABORT,'runtime activations immutable'); END;
CREATE TRIGGER memory_runtime_activations_retained BEFORE DELETE ON memory_runtime_activations
BEGIN SELECT RAISE(ABORT,'runtime activations retained'); END;
CREATE TRIGGER memory_runtime_legacy_keys_insert_guard BEFORE INSERT ON memory_keys
WHEN EXISTS(SELECT 1 FROM memory_runtime_activations)
BEGIN SELECT RAISE(ABORT,'legacy authority retired by runtime activation'); END;
CREATE TRIGGER memory_runtime_legacy_keys_update_guard BEFORE UPDATE ON memory_keys
WHEN EXISTS(SELECT 1 FROM memory_runtime_activations)
BEGIN SELECT RAISE(ABORT,'legacy authority retired by runtime activation'); END;
CREATE TRIGGER memory_runtime_legacy_admins_insert_guard BEFORE INSERT ON memory_admins
WHEN EXISTS(SELECT 1 FROM memory_runtime_activations)
BEGIN SELECT RAISE(ABORT,'legacy authority retired by runtime activation'); END;
CREATE TRIGGER memory_runtime_legacy_admins_update_guard BEFORE UPDATE ON memory_admins
WHEN EXISTS(SELECT 1 FROM memory_runtime_activations)
BEGIN SELECT RAISE(ABORT,'legacy authority retired by runtime activation'); END;
