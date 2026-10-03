// Full public core contract. SQL13/14's retained base contracts stay immutable.
import { digest } from '../scripts/lib/installation-validation.mjs';
export const CORE_D1_LIMIT = 50;
export const CORE_CAPTURE_WRITES = 20;
export const CORE_ROUTES = Object.freeze({
 'enroll':'POST','enrollment-status':'POST','self-status':'POST','renew':'POST',
 'capture':'POST','capture-status':'POST','query':'POST','stage':'POST','publish':'POST',
 'transcript':'GET','upload':'PUT'
});
export const CORE_OPERATIONS = Object.freeze(['facts','fact','sessions','session','tags','digest','stats','runs','consolidation','transcript-info']);
export const compiledCoreHashes = async () => ({
 protocolHash: await digest(JSON.stringify({version:2,schema:14,identity:'installation-machine',proof:'P-256/SHA-256',privacy:'machine-private-and-shared-work',sql:'finite-only-consolidated-digest',receipts:'exact-runtime-and-data-own-attempt-status',metrics:'completed-source-session-pieces',upkeep:'finite-own-only-oldest-stale-before-limit',limit:CORE_D1_LIMIT})),
 routeContractHash: await digest(JSON.stringify({routes:CORE_ROUTES,operations:CORE_OPERATIONS,origin:'pinned-production',version:'actual-CF_VERSION_METADATA.id-with-trusted-genuine-version_metadata-binding',transcripts:'immutable-owned-session-generation-content-addressed-exact-journal-recovery'}))
});

export const normalizeCoreDdl = sql => sql.replace(/--[^\n]*/g,'').replace(/"([A-Za-z0-9_]+)"/g,'$1').trim().replace(/\s+/g,' ').replace(/\s*([(),])\s*/g,'$1');
const protectionSource = {
 "schema_migrations": {
  "type": "table",
  "sql": "CREATE TABLE schema_migrations ( version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL )"
 },
 "sessions": {
  "type": "table",
  "sql": "CREATE TABLE sessions ( id TEXT PRIMARY KEY, agent TEXT NOT NULL CHECK (agent IN ('claude', 'codex', 'migration')), author TEXT, machine TEXT, branch TEXT, cwd TEXT, started_at TEXT, ended_at TEXT, status TEXT NOT NULL CHECK (status IN ('captured', 'skipped', 'private')), reason TEXT, read_through TEXT, raw_key TEXT, raw_bytes INTEGER, updated_at TEXT NOT NULL , owner_principal_id TEXT REFERENCES memory_principals (id), capture_attempt_id TEXT)"
 },
 "facts": {
  "type": "table",
  "sql": "CREATE TABLE facts ( id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('user', 'feedback', 'project', 'reference', 'thread')), body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 400), session_id TEXT REFERENCES sessions (id), source TEXT NOT NULL CHECK (source IN ('save', 'backfill', 'migration', 'consolidation')), created_at TEXT NOT NULL, author TEXT, superseded_by INTEGER REFERENCES facts (id) , shared INTEGER NOT NULL DEFAULT 1, owner_principal_id TEXT REFERENCES memory_principals (id), capture_attempt_id TEXT, capture_ordinal INTEGER)"
 },
 "facts_live": {
  "type": "index",
  "sql": "CREATE INDEX facts_live ON facts (superseded_by, type, created_at)"
 },
 "facts_slug": {
  "type": "index",
  "sql": "CREATE INDEX facts_slug ON facts (slug, superseded_by)"
 },
 "facts_never_edited": {
  "type": "trigger",
  "sql": "CREATE TRIGGER facts_never_edited BEFORE UPDATE OF slug, type, body, session_id, source, created_at, author ON facts BEGIN SELECT RAISE(ABORT, 'facts are never edited; write a fact that supersedes it'); END"
 },
 "facts_never_deleted": {
  "type": "trigger",
  "sql": "CREATE TRIGGER facts_never_deleted BEFORE DELETE ON facts BEGIN SELECT RAISE(ABORT, 'facts are never deleted; write a fact that supersedes it'); END"
 },
 "tags": {
  "type": "table",
  "sql": "CREATE TABLE tags ( name TEXT PRIMARY KEY, definition TEXT NOT NULL CHECK (length(definition) > 0), alias_of TEXT REFERENCES tags (name), created_by TEXT, created_at TEXT NOT NULL )"
 },
 "fact_tags": {
  "type": "table",
  "sql": "CREATE TABLE fact_tags ( fact_id INTEGER NOT NULL REFERENCES facts (id), tag TEXT NOT NULL REFERENCES tags (name), PRIMARY KEY (fact_id, tag) )"
 },
 "facts_fts_insert": {
  "type": "trigger",
  "sql": "CREATE TRIGGER facts_fts_insert AFTER INSERT ON facts BEGIN INSERT INTO facts_fts (rowid, body) VALUES (new.id, new.body); END"
 },
 "runs": {
  "type": "table",
  "sql": "CREATE TABLE runs ( id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK (kind IN ('capture', 'consolidation')), host TEXT, started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL CHECK (status IN ('ok', 'failed')), reason TEXT, counts TEXT NOT NULL DEFAULT '{}' , capture_attempt_id TEXT)"
 },
 "memory_keys": {
  "type": "table",
  "sql": "CREATE TABLE memory_keys ( hash TEXT PRIMARY KEY, email TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('admin', 'member')), created_at TEXT NOT NULL , machine TEXT, expires_at TEXT, reader INTEGER NOT NULL DEFAULT 0, github_id TEXT)"
 },
 "memory_keys_email": {
  "type": "index",
  "sql": "CREATE INDEX memory_keys_email ON memory_keys (email, machine)"
 },
 "memory_admins": {
  "type": "table",
  "sql": "CREATE TABLE memory_admins (github_id TEXT PRIMARY KEY, login TEXT, email TEXT NOT NULL, created_at TEXT NOT NULL)"
 },
 "facts_fts": {
  "type": "table",
  "sql": "CREATE VIRTUAL TABLE facts_fts USING fts5 (body, content = 'facts', content_rowid = 'id', tokenize = 'porter unicode61')"
 },
 "memory_installation": {
  "type": "table",
  "sql": "CREATE TABLE memory_installation ( singleton INTEGER PRIMARY KEY CHECK (singleton = 1), installation_id TEXT NOT NULL UNIQUE CHECK (length(installation_id) >= 32), repository_id TEXT NOT NULL UNIQUE CHECK (length(repository_id) >= 32), account_id TEXT NOT NULL, database_id TEXT NOT NULL, bucket_name TEXT, canonical_origin TEXT NOT NULL CHECK (canonical_origin LIKE 'https://%'), state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'maintenance', 'ready')), minimum_protocol INTEGER NOT NULL DEFAULT 1 CHECK (minimum_protocol >= 1), auth_revision INTEGER NOT NULL DEFAULT 1 CHECK (auth_revision >= 1), created_at INTEGER NOT NULL, UNIQUE (installation_id, repository_id) )"
 },
 "memory_principals": {
  "type": "table",
  "sql": "CREATE TABLE memory_principals ( id TEXT PRIMARY KEY NOT NULL CHECK (length(id) >= 32), installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id), status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')), created_at INTEGER NOT NULL, UNIQUE (installation_id, id) )"
 },
 "memory_providers": {
  "type": "table",
  "sql": "CREATE TABLE memory_providers ( id TEXT PRIMARY KEY NOT NULL, installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id), issuer TEXT NOT NULL, audience TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('active', 'retired')), created_at INTEGER NOT NULL, UNIQUE (installation_id, id), UNIQUE (installation_id, id, issuer), UNIQUE (installation_id, issuer, audience) )"
 },
 "memory_identity_bindings": {
  "type": "table",
  "sql": "CREATE TABLE memory_identity_bindings ( id TEXT PRIMARY KEY NOT NULL, installation_id TEXT NOT NULL, provider_id TEXT NOT NULL, principal_id TEXT NOT NULL, issuer TEXT NOT NULL, subject TEXT NOT NULL CHECK (length(trim(subject)) > 0), verified_email TEXT NOT NULL CHECK (length(verified_email) > 3), status TEXT NOT NULL CHECK (status IN ('active', 'review', 'retired')), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, replaces_binding_id TEXT UNIQUE REFERENCES memory_identity_bindings (id), evidence_ref TEXT, FOREIGN KEY (installation_id, provider_id, issuer) REFERENCES memory_providers (installation_id, id, issuer), FOREIGN KEY (installation_id, principal_id) REFERENCES memory_principals (installation_id, id), CHECK ((replaces_binding_id IS NULL) = (evidence_ref IS NULL)), CHECK (evidence_ref IS NULL OR length(trim(evidence_ref)) > 0) )"
 },
 "memory_memberships": {
  "type": "table",
  "sql": "CREATE TABLE memory_memberships ( installation_id TEXT NOT NULL, repository_id TEXT NOT NULL, principal_id TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'reader')), status TEXT NOT NULL CHECK (status IN ('active', 'removed')), revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (repository_id, principal_id), FOREIGN KEY (installation_id, repository_id) REFERENCES memory_installation (installation_id, repository_id), FOREIGN KEY (installation_id, principal_id) REFERENCES memory_principals (installation_id, id) )"
 },
 "memory_invitations": {
  "type": "table",
  "sql": "CREATE TABLE memory_invitations ( id TEXT PRIMARY KEY NOT NULL, repository_id TEXT NOT NULL REFERENCES memory_installation (repository_id), email TEXT NOT NULL CHECK (email = lower(trim(email)) AND length(email) > 3), role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'reader')), actor_principal_id TEXT NOT NULL REFERENCES memory_principals (id), consumed_principal_id TEXT REFERENCES memory_principals (id), state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'consumed', 'revoked', 'expired')), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + 604800), CHECK ((state = 'consumed') = (consumed_principal_id IS NOT NULL)) )"
 },
 "memory_owner_intents": {
  "type": "table",
  "sql": "CREATE TABLE memory_owner_intents ( installation_id TEXT PRIMARY KEY NOT NULL REFERENCES memory_installation (installation_id), provider_id TEXT NOT NULL REFERENCES memory_providers (id), email TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'consumed')), owner_principal_id TEXT REFERENCES memory_principals (id), created_at INTEGER NOT NULL, CHECK ((state = 'consumed') = (owner_principal_id IS NOT NULL)) )"
 },
 "memory_login_candidates": {
  "type": "table",
  "sql": "CREATE TABLE memory_login_candidates ( id TEXT PRIMARY KEY NOT NULL CHECK (length(id) >= 32), installation_id TEXT NOT NULL, provider_id TEXT NOT NULL, issuer TEXT NOT NULL, subject TEXT NOT NULL CHECK (length(trim(subject)) > 0), verified_email TEXT NOT NULL, code_hash TEXT NOT NULL CHECK (length(code_hash) = 64 AND code_hash NOT GLOB '*[^0-9a-f]*'), purpose TEXT NOT NULL CHECK (purpose IN ('owner', 'recovery', 'link')), state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'consumed', 'expired', 'revoked')), consumed_principal_id TEXT REFERENCES memory_principals (id), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + 600), FOREIGN KEY (installation_id, provider_id) REFERENCES memory_providers (installation_id, id), CHECK ((state = 'consumed') = (consumed_principal_id IS NOT NULL)) )"
 },
 "memory_device_requests": {
  "type": "table",
  "sql": "CREATE TABLE memory_device_requests ( id TEXT PRIMARY KEY NOT NULL CHECK (length(id) >= 32), installation_id TEXT NOT NULL, repository_id TEXT NOT NULL, nonce_hash TEXT NOT NULL UNIQUE CHECK (length(nonce_hash) = 64 AND nonce_hash NOT GLOB '*[^0-9a-f]*'), secret_hash TEXT NOT NULL CHECK (length(secret_hash) = 64 AND secret_hash NOT GLOB '*[^0-9a-f]*'), credential_hash TEXT NOT NULL UNIQUE CHECK (length(credential_hash) = 64 AND credential_hash NOT GLOB '*[^0-9a-f]*'), comparison_code TEXT NOT NULL CHECK (length(comparison_code) = 8), label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 100), scope TEXT NOT NULL CHECK (scope IN ('memory:read', 'memory:read memory:write', 'memory:read memory:write memory:admin')), state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'approved', 'claimed', 'denied', 'expired', 'revoked')), principal_id TEXT, membership_revision INTEGER, approved_at INTEGER, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + 600), poll_after INTEGER NOT NULL DEFAULT 0, early_polls INTEGER NOT NULL DEFAULT 0 CHECK (early_polls >= 0), FOREIGN KEY (installation_id, repository_id) REFERENCES memory_installation (installation_id, repository_id), FOREIGN KEY (repository_id, principal_id) REFERENCES memory_memberships (repository_id, principal_id), CHECK ((principal_id IS NULL) = (membership_revision IS NULL)), CHECK (state NOT IN ('approved', 'claimed') OR (principal_id IS NOT NULL AND approved_at IS NOT NULL)) )"
 },
 "memory_requests_expiry": {
  "type": "index",
  "sql": "CREATE INDEX memory_requests_expiry ON memory_device_requests (expires_at)"
 },
 "memory_requests_principal": {
  "type": "index",
  "sql": "CREATE INDEX memory_requests_principal ON memory_device_requests (principal_id, state)"
 },
 "memory_devices": {
  "type": "table",
  "sql": "CREATE TABLE memory_devices ( id TEXT PRIMARY KEY NOT NULL CHECK (length(id) >= 32), request_id TEXT NOT NULL UNIQUE, installation_id TEXT NOT NULL, repository_id TEXT NOT NULL, principal_id TEXT NOT NULL, label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 100), scope TEXT NOT NULL CHECK (scope IN ('memory:read', 'memory:read memory:write', 'memory:read memory:write memory:admin')), status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')), generation INTEGER NOT NULL DEFAULT 1 CHECK (generation >= 1), membership_revision INTEGER NOT NULL CHECK (membership_revision >= 1), approved_at INTEGER NOT NULL, reauthorize_at INTEGER NOT NULL CHECK (reauthorize_at > approved_at AND reauthorize_at <= approved_at + 7776000), last_used_at INTEGER, revoked_at INTEGER, FOREIGN KEY (installation_id, repository_id) REFERENCES memory_installation (installation_id, repository_id), FOREIGN KEY (repository_id, principal_id) REFERENCES memory_memberships (repository_id, principal_id), CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)) )"
 },
 "memory_devices_principal": {
  "type": "index",
  "sql": "CREATE INDEX memory_devices_principal ON memory_devices (principal_id, status)"
 },
 "memory_credentials": {
  "type": "table",
  "sql": "CREATE TABLE memory_credentials ( hash TEXT PRIMARY KEY NOT NULL CHECK (length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'), device_id TEXT NOT NULL REFERENCES memory_devices (id), generation INTEGER NOT NULL CHECK (generation >= 1), issued_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK (expires_at > issued_at AND expires_at <= issued_at + 2592000), UNIQUE (device_id, generation) )"
 },
 "memory_csrf_proofs": {
  "type": "table",
  "sql": "CREATE TABLE memory_csrf_proofs ( hash TEXT PRIMARY KEY NOT NULL CHECK (length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'), installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id), provider_id TEXT NOT NULL, issuer TEXT NOT NULL, subject TEXT NOT NULL CHECK (length(trim(subject)) > 0), binding_id TEXT REFERENCES memory_identity_bindings (id), session_hash TEXT NOT NULL CHECK (length(session_hash) = 64 AND session_hash NOT GLOB '*[^0-9a-f]*'), membership_revision INTEGER CHECK (membership_revision >= 1), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + 600), FOREIGN KEY (installation_id, provider_id, issuer) REFERENCES memory_providers (installation_id, id, issuer) )"
 },
 "memory_csrf_expiry": {
  "type": "index",
  "sql": "CREATE INDEX memory_csrf_expiry ON memory_csrf_proofs (expires_at)"
 },
 "memory_quotas": {
  "type": "table",
  "sql": "CREATE TABLE memory_quotas ( installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id), kind TEXT NOT NULL CHECK (kind IN ('start-install', 'start-ip', 'poll')), key_hash TEXT NOT NULL CHECK (length(key_hash) = 64 AND key_hash NOT GLOB '*[^0-9a-f]*'), window_start INTEGER NOT NULL, count INTEGER NOT NULL CHECK (count >= 0), expires_at INTEGER NOT NULL CHECK (expires_at > window_start AND expires_at <= window_start + 1200), PRIMARY KEY (installation_id, kind, key_hash, window_start) )"
 },
 "memory_quotas_expiry": {
  "type": "index",
  "sql": "CREATE INDEX memory_quotas_expiry ON memory_quotas (expires_at)"
 },
 "memory_audit": {
  "type": "table",
  "sql": "CREATE TABLE memory_audit ( id TEXT PRIMARY KEY NOT NULL, installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id), actor_principal_id TEXT REFERENCES memory_principals (id), actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'operator', 'machine', 'system')), action TEXT NOT NULL, target_id TEXT NOT NULL, result TEXT NOT NULL CHECK (result IN ('allowed', 'denied', 'failed')), created_at INTEGER NOT NULL )"
 },
 "memory_audit_created": {
  "type": "index",
  "sql": "CREATE INDEX memory_audit_created ON memory_audit (created_at)"
 },
 "memory_binding_replacement": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_binding_replacement BEFORE INSERT ON memory_identity_bindings WHEN (EXISTS ( SELECT 1 FROM memory_identity_bindings previous WHERE previous.installation_id = NEW.installation_id AND previous.provider_id = NEW.provider_id AND previous.issuer = NEW.issuer AND previous.subject = NEW.subject ) AND NEW.replaces_binding_id IS NULL) OR (NEW.replaces_binding_id IS NOT NULL AND NOT EXISTS ( SELECT 1 FROM memory_identity_bindings previous WHERE previous.id = NEW.replaces_binding_id AND previous.status = 'retired' AND previous.installation_id = NEW.installation_id AND previous.provider_id = NEW.provider_id AND previous.issuer = NEW.issuer AND previous.subject = NEW.subject )) BEGIN SELECT RAISE(ABORT, 'a reused login requires a reviewed retired binding replacement'); END"
 },
 "memory_binding_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_binding_immutable BEFORE UPDATE ON memory_identity_bindings WHEN NEW.principal_id IS NOT OLD.principal_id OR NEW.installation_id IS NOT OLD.installation_id OR NEW.provider_id IS NOT OLD.provider_id OR NEW.issuer IS NOT OLD.issuer OR NEW.subject IS NOT OLD.subject OR NEW.replaces_binding_id IS NOT OLD.replaces_binding_id OR NEW.evidence_ref IS NOT OLD.evidence_ref OR (OLD.status = 'retired' AND NEW.status != 'retired') BEGIN SELECT RAISE(ABORT, 'identity bindings cannot be reassigned or revived'); END"
 },
 "memory_binding_tombstone": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_binding_tombstone BEFORE DELETE ON memory_identity_bindings BEGIN SELECT RAISE(ABORT, 'identity bindings retain tombstones'); END"
 },
 "memory_membership_revision": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_membership_revision BEFORE UPDATE ON memory_memberships WHEN NEW.revision != OLD.revision + 1 OR NEW.principal_id IS NOT OLD.principal_id OR NEW.repository_id IS NOT OLD.repository_id OR NEW.installation_id IS NOT OLD.installation_id BEGIN SELECT RAISE(ABORT, 'membership changes require a new revision with the same identity'); END"
 },
 "memory_membership_tombstone": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_membership_tombstone BEFORE DELETE ON memory_memberships BEGIN SELECT RAISE(ABORT, 'memberships retain tombstones'); END"
 },
 "memory_invitation_consumed": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_invitation_consumed BEFORE UPDATE ON memory_invitations WHEN OLD.state != 'pending' BEGIN SELECT RAISE(ABORT, 'invitation already ended'); END"
 },
 "memory_owner_consumed": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_owner_consumed BEFORE UPDATE ON memory_owner_intents WHEN OLD.state = 'consumed' BEGIN SELECT RAISE(ABORT, 'initial owner already confirmed'); END"
 },
 "memory_candidate_consumed": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_candidate_consumed BEFORE UPDATE ON memory_login_candidates WHEN OLD.state != 'pending' BEGIN SELECT RAISE(ABORT, 'login candidate already ended'); END"
 },
 "memory_request_transition": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_request_transition BEFORE UPDATE ON memory_device_requests WHEN NEW.installation_id IS NOT OLD.installation_id OR NEW.repository_id IS NOT OLD.repository_id OR NEW.nonce_hash IS NOT OLD.nonce_hash OR NEW.secret_hash IS NOT OLD.secret_hash OR NEW.credential_hash IS NOT OLD.credential_hash OR NEW.expires_at != OLD.expires_at OR NEW.scope != OLD.scope OR (OLD.principal_id IS NOT NULL AND (NEW.principal_id IS NOT OLD.principal_id OR NEW.membership_revision IS NOT OLD.membership_revision)) OR (NEW.state != OLD.state AND NOT ( (OLD.state = 'pending' AND NEW.state IN ('approved', 'denied', 'expired', 'revoked')) OR (OLD.state = 'approved' AND NEW.state IN ('claimed', 'denied', 'expired', 'revoked')))) BEGIN SELECT RAISE(ABORT, 'invalid device request transition'); END"
 },
 "memory_device_activation": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_device_activation BEFORE INSERT ON memory_devices WHEN NOT EXISTS ( SELECT 1 FROM memory_device_requests request JOIN memory_memberships member ON member.repository_id = request.repository_id AND member.principal_id = request.principal_id JOIN memory_principals person ON person.id = member.principal_id WHERE request.id = NEW.request_id AND request.state = 'approved' AND request.installation_id = NEW.installation_id AND request.repository_id = NEW.repository_id AND request.principal_id = NEW.principal_id AND request.scope = NEW.scope AND request.approved_at = NEW.approved_at AND request.membership_revision = NEW.membership_revision AND member.revision = NEW.membership_revision AND member.status = 'active' AND person.status = 'active' AND request.expires_at > unixepoch() ) OR (SELECT count(*) FROM memory_devices WHERE principal_id = NEW.principal_id AND status = 'active') >= 10 BEGIN SELECT RAISE(ABORT, 'device approval is stale or the device limit is reached'); END"
 },
 "memory_device_claim": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_device_claim AFTER INSERT ON memory_devices BEGIN UPDATE memory_device_requests SET state = 'claimed' WHERE id = NEW.request_id; END"
 },
 "memory_first_credential": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_first_credential BEFORE INSERT ON memory_credentials WHEN NEW.generation = 1 AND NOT EXISTS ( SELECT 1 FROM memory_devices device JOIN memory_device_requests request ON request.id = device.request_id WHERE device.id = NEW.device_id AND request.credential_hash = NEW.hash ) BEGIN SELECT RAISE(ABORT, 'credential must match the initiating machine commitment'); END"
 },
 "memory_device_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_device_immutable BEFORE UPDATE ON memory_devices WHEN NEW.principal_id IS NOT OLD.principal_id OR NEW.repository_id IS NOT OLD.repository_id OR NEW.installation_id IS NOT OLD.installation_id OR NEW.request_id IS NOT OLD.request_id OR NEW.scope != OLD.scope OR NEW.approved_at != OLD.approved_at OR NEW.reauthorize_at != OLD.reauthorize_at OR NEW.generation < OLD.generation OR NEW.generation > OLD.generation + 1 OR (OLD.status = 'revoked' AND NEW.status != 'revoked') BEGIN SELECT RAISE(ABORT, 'device approval cannot be reassigned or widened'); END"
 },
 "memory_device_tombstone": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_device_tombstone BEFORE DELETE ON memory_devices BEGIN SELECT RAISE(ABORT, 'devices retain revocation tombstones'); END"
 },
 "memory_credential_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_credential_immutable BEFORE UPDATE ON memory_credentials BEGIN SELECT RAISE(ABORT, 'credential generations are immutable'); END"
 },
 "memory_audit_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_audit_immutable BEFORE UPDATE ON memory_audit BEGIN SELECT RAISE(ABORT, 'audit events are immutable'); END"
 },
 "facts_owner": {
  "type": "index",
  "sql": "CREATE INDEX facts_owner ON facts (owner_principal_id, superseded_by)"
 },
 "sessions_owner": {
  "type": "index",
  "sql": "CREATE INDEX sessions_owner ON sessions (owner_principal_id)"
 },
 "facts_owner_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER facts_owner_immutable BEFORE UPDATE OF owner_principal_id ON facts WHEN OLD.owner_principal_id IS NOT NULL AND NEW.owner_principal_id IS NOT OLD.owner_principal_id BEGIN SELECT RAISE(ABORT, 'fact ownership is immutable'); END"
 },
 "sessions_owner_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER sessions_owner_immutable BEFORE UPDATE OF owner_principal_id ON sessions WHEN OLD.owner_principal_id IS NOT NULL AND NEW.owner_principal_id IS NOT OLD.owner_principal_id BEGIN SELECT RAISE(ABORT, 'session ownership is immutable'); END"
 },
 "memory_ownership_mappings": {
  "type": "table",
  "sql": "CREATE TABLE memory_ownership_mappings ( id TEXT PRIMARY KEY NOT NULL, installation_id TEXT NOT NULL, principal_id TEXT NOT NULL, actor_principal_id TEXT NOT NULL, fact_id INTEGER REFERENCES facts (id), session_id TEXT REFERENCES sessions (id), raw_key TEXT CHECK (raw_key IS NULL OR length(raw_key) > 0), evidence_type TEXT NOT NULL CHECK (evidence_type IN ('legacy-challenge', 'operator-provenance', 'correction')), evidence_ref TEXT NOT NULL CHECK (length(trim(evidence_ref)) > 0), snapshot_hash TEXT NOT NULL CHECK (length(snapshot_hash) = 64 AND snapshot_hash NOT GLOB '*[^0-9a-f]*'), supersedes TEXT UNIQUE REFERENCES memory_ownership_mappings (id), created_at INTEGER NOT NULL, FOREIGN KEY (installation_id, principal_id) REFERENCES memory_principals (installation_id, id), FOREIGN KEY (installation_id, actor_principal_id) REFERENCES memory_principals (installation_id, id), CHECK ((fact_id IS NOT NULL) + (session_id IS NOT NULL) + (raw_key IS NOT NULL) = 1), CHECK ((evidence_type = 'correction') = (supersedes IS NOT NULL)) )"
 },
 "memory_mapping_correction": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_mapping_correction BEFORE INSERT ON memory_ownership_mappings WHEN NEW.supersedes IS NOT NULL AND NOT EXISTS ( SELECT 1 FROM memory_ownership_mappings previous WHERE previous.id = NEW.supersedes AND previous.installation_id = NEW.installation_id AND previous.fact_id IS NEW.fact_id AND previous.session_id IS NEW.session_id AND previous.raw_key IS NEW.raw_key ) BEGIN SELECT RAISE(ABORT, 'ownership correction must name the same exact record'); END"
 },
 "memory_mapping_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_mapping_immutable BEFORE UPDATE ON memory_ownership_mappings BEGIN SELECT RAISE(ABORT, 'ownership review history is immutable'); END"
 },
 "memory_mapping_preserved": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_mapping_preserved BEFORE DELETE ON memory_ownership_mappings BEGIN SELECT RAISE(ABORT, 'ownership review history is retained'); END"
 },
 "memory_legacy_evidence": {
  "type": "table",
  "sql": "CREATE TABLE memory_legacy_evidence ( id TEXT PRIMARY KEY NOT NULL, installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id), kind TEXT NOT NULL CHECK (kind IN ('key', 'admin', 'backup', 'inventory', 'cutover', 'recovery')), evidence_ref TEXT NOT NULL CHECK (length(trim(evidence_ref)) > 0), snapshot_hash TEXT NOT NULL CHECK (length(snapshot_hash) = 64 AND snapshot_hash NOT GLOB '*[^0-9a-f]*'), created_at INTEGER NOT NULL )"
 },
 "memory_legacy_evidence_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_legacy_evidence_immutable BEFORE UPDATE ON memory_legacy_evidence BEGIN SELECT RAISE(ABORT, 'legacy evidence is immutable'); END"
 },
 "memory_legacy_evidence_preserved": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_legacy_evidence_preserved BEFORE DELETE ON memory_legacy_evidence BEGIN SELECT RAISE(ABORT, 'legacy evidence is retained'); END"
 },
 "memory_identity_reviews": {
  "type": "table",
  "sql": "CREATE TABLE memory_identity_reviews ( id TEXT PRIMARY KEY NOT NULL, installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id), actor_principal_id TEXT NOT NULL, target_principal_id TEXT NOT NULL, binding_id TEXT NOT NULL UNIQUE REFERENCES memory_identity_bindings (id), candidate_id TEXT NOT NULL UNIQUE, outcome TEXT NOT NULL CHECK (outcome IN ('continuity', 'new-person')), evidence_ref TEXT NOT NULL CHECK (length(evidence_ref) BETWEEN 1 AND 200), created_at INTEGER NOT NULL, FOREIGN KEY (installation_id, actor_principal_id) REFERENCES memory_principals (installation_id, id), FOREIGN KEY (installation_id, target_principal_id) REFERENCES memory_principals (installation_id, id) )"
 },
 "memory_identity_review_binding": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_identity_review_binding BEFORE INSERT ON memory_identity_reviews WHEN NOT EXISTS (SELECT 1 FROM memory_identity_bindings b WHERE b.id = NEW.binding_id AND b.installation_id = NEW.installation_id AND b.principal_id = NEW.target_principal_id) BEGIN SELECT RAISE(ABORT, 'identity review must match the exact installation and principal binding'); END"
 },
 "memory_identity_review_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_identity_review_immutable BEFORE UPDATE ON memory_identity_reviews BEGIN SELECT RAISE(ABORT, 'identity review evidence is immutable'); END"
 },
 "memory_identity_review_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_identity_review_retained BEFORE DELETE ON memory_identity_reviews BEGIN SELECT RAISE(ABORT, 'identity review evidence is retained'); END"
 },
 "memory_installation_configuration": {
  "type": "table",
  "sql": "CREATE TABLE memory_installation_configuration ( installation_id TEXT PRIMARY KEY NOT NULL REFERENCES memory_installation (installation_id), app_origin TEXT NOT NULL CHECK (app_origin LIKE 'https://%'), memory_origin TEXT NOT NULL CHECK (memory_origin LIKE 'https://%'), app_worker_name TEXT NOT NULL, memory_worker_name TEXT NOT NULL, operation_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL CHECK (length(request_hash) = 64 AND request_hash NOT GLOB '*[^0-9a-f]*'), owner_email TEXT NOT NULL, access_json TEXT CHECK (access_json IS NULL OR json_valid(access_json)), pin_revision INTEGER NOT NULL DEFAULT 1 CHECK (pin_revision >= 1), created_at INTEGER NOT NULL )"
 },
 "memory_configuration_revision": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_configuration_revision BEFORE UPDATE ON memory_installation_configuration WHEN NEW.installation_id IS NOT OLD.installation_id OR NEW.operation_id IS NOT OLD.operation_id OR NEW.request_hash IS NOT OLD.request_hash OR NEW.pin_revision != OLD.pin_revision + 1 BEGIN SELECT RAISE(ABORT, 'installation configuration requires an explicit revision preserving its receipt'); END"
 },
 "memory_configuration_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_configuration_retained BEFORE DELETE ON memory_installation_configuration BEGIN SELECT RAISE(ABORT, 'installation configuration and bootstrap receipt are retained'); END"
 },
 "memory_bootstrap_completion": {
  "type": "table",
  "sql": "CREATE TABLE memory_bootstrap_completion ( installation_id TEXT PRIMARY KEY NOT NULL REFERENCES memory_installation_configuration (installation_id), request_hash TEXT NOT NULL CHECK (length(request_hash) = 64 AND request_hash NOT GLOB '*[^0-9a-f]*'), audit_id TEXT NOT NULL UNIQUE REFERENCES memory_audit (id) )"
 },
 "memory_bootstrap_completion_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_bootstrap_completion_immutable BEFORE UPDATE ON memory_bootstrap_completion BEGIN SELECT RAISE(ABORT, 'bootstrap completion is immutable'); END"
 },
 "memory_bootstrap_completion_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_bootstrap_completion_retained BEFORE DELETE ON memory_bootstrap_completion BEGIN SELECT RAISE(ABORT, 'bootstrap completion is retained'); END"
 },
 "memory_schema_receipts": {
  "type": "table",
  "sql": "CREATE TABLE memory_schema_receipts ( installation_id TEXT PRIMARY KEY REFERENCES memory_installation(installation_id), repository_id TEXT NOT NULL, schema_version INTEGER NOT NULL CHECK(schema_version = 11), manifest_hash TEXT NOT NULL CHECK(length(manifest_hash) = 64 AND manifest_hash NOT GLOB '*[^0-9a-f]*'), request_hash TEXT NOT NULL, audit_id TEXT NOT NULL REFERENCES memory_audit(id), created_at INTEGER NOT NULL, FOREIGN KEY(installation_id, repository_id) REFERENCES memory_installation(installation_id, repository_id) )"
 },
 "memory_schema_receipt_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_schema_receipt_immutable BEFORE UPDATE ON memory_schema_receipts BEGIN SELECT RAISE(ABORT, 'schema receipt is immutable'); END"
 },
 "memory_schema_receipt_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_schema_receipt_retained BEFORE DELETE ON memory_schema_receipts BEGIN SELECT RAISE(ABORT, 'schema receipt is retained'); END"
 },
 "memory_owner_reviews": {
  "type": "table",
  "sql": "CREATE TABLE memory_owner_reviews ( id TEXT PRIMARY KEY CHECK(length(id) >= 32), installation_id TEXT NOT NULL REFERENCES memory_installation(installation_id), candidate_id TEXT NOT NULL, snapshot_hash TEXT NOT NULL CHECK(length(snapshot_hash) = 64), target_hash TEXT NOT NULL CHECK(length(target_hash) = 64), protection_hash TEXT NOT NULL CHECK(length(protection_hash) = 64), code_hash TEXT NOT NULL CHECK(length(code_hash) = 64), auth_revision INTEGER NOT NULL CHECK(auth_revision >= 1), pin_revision INTEGER NOT NULL CHECK(pin_revision >= 1), state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','consumed','expired','revoked')), consumed_attempt_id TEXT REFERENCES memory_owner_attempts(id), created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK(expires_at > created_at AND expires_at <= created_at + 600), UNIQUE(candidate_id, snapshot_hash), CHECK((state = 'consumed') = (consumed_attempt_id IS NOT NULL)) )"
 },
 "memory_owner_review_transition": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_owner_review_transition BEFORE UPDATE ON memory_owner_reviews WHEN OLD.state != 'pending' OR NEW.id IS NOT OLD.id OR NEW.installation_id IS NOT OLD.installation_id OR NEW.candidate_id IS NOT OLD.candidate_id OR NEW.snapshot_hash IS NOT OLD.snapshot_hash OR NEW.target_hash IS NOT OLD.target_hash OR NEW.protection_hash IS NOT OLD.protection_hash OR NEW.code_hash IS NOT OLD.code_hash OR NEW.auth_revision IS NOT OLD.auth_revision OR NEW.pin_revision IS NOT OLD.pin_revision OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at BEGIN SELECT RAISE(ABORT, 'owner review is immutable except one terminal transition'); END"
 },
 "memory_owner_review_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_owner_review_retained BEFORE DELETE ON memory_owner_reviews BEGIN SELECT RAISE(ABORT, 'owner review is retained'); END"
 },
 "memory_owner_attempts": {
  "type": "table",
  "sql": "CREATE TABLE memory_owner_attempts ( id TEXT PRIMARY KEY CHECK(length(id) >= 32), installation_id TEXT NOT NULL UNIQUE REFERENCES memory_installation(installation_id), review_id TEXT NOT NULL UNIQUE REFERENCES memory_owner_reviews(id), request_hash TEXT NOT NULL CHECK(length(request_hash) = 64), principal_id TEXT NOT NULL CHECK(length(principal_id) >= 32), binding_id TEXT NOT NULL, audit_id TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL )"
 },
 "memory_owner_attempt_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_owner_attempt_immutable BEFORE UPDATE ON memory_owner_attempts BEGIN SELECT RAISE(ABORT, 'owner attempt is immutable'); END"
 },
 "memory_owner_attempt_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_owner_attempt_retained BEFORE DELETE ON memory_owner_attempts BEGIN SELECT RAISE(ABORT, 'incomplete owner attempt requires explicit recovery'); END"
 },
 "memory_owner_completions": {
  "type": "table",
  "sql": "CREATE TABLE memory_owner_completions ( attempt_id TEXT PRIMARY KEY REFERENCES memory_owner_attempts(id), installation_id TEXT NOT NULL UNIQUE REFERENCES memory_installation(installation_id), review_id TEXT NOT NULL UNIQUE REFERENCES memory_owner_reviews(id), principal_id TEXT NOT NULL REFERENCES memory_principals(id), binding_id TEXT NOT NULL REFERENCES memory_identity_bindings(id), audit_id TEXT NOT NULL UNIQUE REFERENCES memory_audit(id), created_at INTEGER NOT NULL )"
 },
 "memory_owner_completion_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_owner_completion_immutable BEFORE UPDATE ON memory_owner_completions BEGIN SELECT RAISE(ABORT, 'owner completion is immutable'); END"
 },
 "memory_owner_completion_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_owner_completion_retained BEFORE DELETE ON memory_owner_completions BEGIN SELECT RAISE(ABORT, 'owner completion is retained'); END"
 },
 "memory_machine_configuration": {
  "type": "table",
  "sql": "CREATE TABLE memory_machine_configuration ( installation_id TEXT PRIMARY KEY REFERENCES memory_installation(installation_id), repository_id TEXT NOT NULL, target_json TEXT NOT NULL CHECK(json_valid(target_json)), pin_hash TEXT NOT NULL CHECK(length(pin_hash) = 64 AND pin_hash NOT GLOB '*[^0-9a-f]*'), pin_revision INTEGER NOT NULL DEFAULT 1 CHECK(pin_revision >= 1), auth_revision INTEGER NOT NULL DEFAULT 1 CHECK(auth_revision >= 1), state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','maintenance')), barrier_attempt_id TEXT, operation_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL CHECK(length(request_hash) = 64), created_at INTEGER NOT NULL, FOREIGN KEY(installation_id, repository_id) REFERENCES memory_installation(installation_id, repository_id), CHECK((state = 'maintenance') = (barrier_attempt_id IS NOT NULL)) )"
 },
 "memory_machine_audit": {
  "type": "table",
  "sql": "CREATE TABLE memory_machine_audit ( id TEXT PRIMARY KEY, installation_id TEXT NOT NULL REFERENCES memory_machine_configuration(installation_id), attempt_id TEXT NOT NULL UNIQUE, action TEXT NOT NULL CHECK(action IN ('bootstrap','issue','enroll','revoke')), target_id TEXT NOT NULL, request_hash TEXT NOT NULL CHECK(length(request_hash) = 64), created_at INTEGER NOT NULL )"
 },
 "memory_machine_manifest_receipts": {
  "type": "table",
  "sql": "CREATE TABLE memory_machine_manifest_receipts ( installation_id TEXT PRIMARY KEY REFERENCES memory_machine_configuration(installation_id), repository_id TEXT NOT NULL, schema_version INTEGER NOT NULL CHECK(schema_version = 12), manifest_hash TEXT NOT NULL CHECK(length(manifest_hash) = 64), request_hash TEXT NOT NULL CHECK(length(request_hash) = 64), audit_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_audit(id), FOREIGN KEY(installation_id, repository_id) REFERENCES memory_installation(installation_id, repository_id) )"
 },
 "memory_machine_bootstrap_completions": {
  "type": "table",
  "sql": "CREATE TABLE memory_machine_bootstrap_completions ( installation_id TEXT PRIMARY KEY REFERENCES memory_machine_configuration(installation_id), operation_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL CHECK(length(request_hash) = 64), pin_hash TEXT NOT NULL CHECK(length(pin_hash) = 64), audit_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_audit(id) )"
 },
 "memory_machine_attempts": {
  "type": "table",
  "sql": "CREATE TABLE memory_machine_attempts ( id TEXT PRIMARY KEY CHECK(length(id) >= 32), installation_id TEXT NOT NULL REFERENCES memory_machine_configuration(installation_id), action TEXT NOT NULL CHECK(action IN ('issue','enroll','revoke')), target_id TEXT NOT NULL, request_hash TEXT NOT NULL CHECK(length(request_hash) = 64), payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), snapshot_hash TEXT NOT NULL CHECK(length(snapshot_hash) = 64), pin_hash TEXT NOT NULL CHECK(length(pin_hash) = 64), pin_revision INTEGER NOT NULL CHECK(pin_revision >= 1), auth_revision INTEGER NOT NULL CHECK(auth_revision >= 1), audit_id TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL )"
 },
 "memory_machine_grants": {
  "type": "table",
  "sql": "CREATE TABLE memory_machine_grants ( id TEXT PRIMARY KEY CHECK(length(id) >= 32), installation_id TEXT NOT NULL REFERENCES memory_machine_configuration(installation_id), repository_id TEXT NOT NULL, commitment TEXT NOT NULL CHECK(length(commitment) = 64 AND commitment NOT GLOB '*[^0-9a-f]*'), secret_hash TEXT NOT NULL UNIQUE CHECK(length(secret_hash) = 64 AND secret_hash NOT GLOB '*[^0-9a-f]*'), scope TEXT NOT NULL CHECK(scope IN ('memory:read','memory:read memory:write','memory:read memory:write memory:admin')), state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','consumed','revoked')), revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1), issued_attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_attempts(id), consumed_attempt_id TEXT UNIQUE REFERENCES memory_machine_attempts(id), machine_id TEXT UNIQUE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK(expires_at > created_at AND expires_at <= created_at + 600), CHECK((consumed_attempt_id IS NULL) = (machine_id IS NULL)), CHECK(state != 'consumed' OR machine_id IS NOT NULL), FOREIGN KEY(installation_id, repository_id) REFERENCES memory_installation(installation_id, repository_id) )"
 },
 "memory_machine_principals": {
  "type": "table",
  "sql": "CREATE TABLE memory_machine_principals ( id TEXT PRIMARY KEY REFERENCES memory_principals(id) CHECK(length(id) >= 32), installation_id TEXT NOT NULL REFERENCES memory_machine_configuration(installation_id), repository_id TEXT NOT NULL, commitment TEXT NOT NULL CHECK(length(commitment) = 64), grant_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_grants(id), scope TEXT NOT NULL CHECK(scope IN ('memory:read','memory:read memory:write','memory:read memory:write memory:admin')), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')), revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1), enrollment_attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_attempts(id), created_at INTEGER NOT NULL, FOREIGN KEY(installation_id, repository_id) REFERENCES memory_installation(installation_id, repository_id) )"
 },
 "memory_machine_credentials": {
  "type": "table",
  "sql": "CREATE TABLE memory_machine_credentials ( hash TEXT PRIMARY KEY CHECK(length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'), machine_id TEXT NOT NULL REFERENCES memory_machine_principals(id), grant_revision INTEGER NOT NULL CHECK(grant_revision >= 1), machine_revision INTEGER NOT NULL CHECK(machine_revision >= 1), attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_attempts(id), issued_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK(expires_at > issued_at AND expires_at <= issued_at + 2592000) )"
 },
 "memory_machine_completions": {
  "type": "table",
  "sql": "CREATE TABLE memory_machine_completions ( attempt_id TEXT PRIMARY KEY REFERENCES memory_machine_attempts(id), installation_id TEXT NOT NULL REFERENCES memory_machine_configuration(installation_id), request_hash TEXT NOT NULL CHECK(length(request_hash) = 64), audit_id TEXT NOT NULL UNIQUE REFERENCES memory_machine_audit(id), auth_revision INTEGER NOT NULL CHECK(auth_revision >= 2), created_at INTEGER NOT NULL )"
 },
 "memory_machine_attempt_barrier": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_attempt_barrier BEFORE INSERT ON memory_machine_attempts WHEN NOT EXISTS (SELECT 1 FROM memory_machine_configuration c WHERE c.installation_id = NEW.installation_id AND c.state = 'pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision = NEW.auth_revision AND c.pin_revision = NEW.pin_revision AND c.pin_hash = NEW.pin_hash) OR EXISTS (SELECT 1 FROM memory_machine_attempts a LEFT JOIN memory_machine_completions done ON done.attempt_id = a.id WHERE a.installation_id = NEW.installation_id AND done.attempt_id IS NULL) BEGIN SELECT RAISE(ABORT, 'machine authority is stale or incomplete'); END"
 },
 "memory_machine_attempt_close": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_attempt_close AFTER INSERT ON memory_machine_attempts BEGIN UPDATE memory_machine_configuration SET state = 'maintenance', barrier_attempt_id = NEW.id, auth_revision = auth_revision + 1 WHERE installation_id = NEW.installation_id; END"
 },
 "memory_machine_configuration_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_configuration_guard BEFORE UPDATE ON memory_machine_configuration WHEN NEW.installation_id IS NOT OLD.installation_id OR NEW.repository_id IS NOT OLD.repository_id OR NEW.target_json IS NOT OLD.target_json OR NEW.pin_hash IS NOT OLD.pin_hash OR NEW.pin_revision != OLD.pin_revision OR NEW.operation_id IS NOT OLD.operation_id OR NEW.request_hash IS NOT OLD.request_hash OR NEW.created_at != OLD.created_at OR NOT ((OLD.state = 'pending' AND NEW.state = 'maintenance' AND NEW.auth_revision = OLD.auth_revision + 1 AND EXISTS (SELECT 1 FROM memory_machine_attempts a WHERE a.id = NEW.barrier_attempt_id AND a.installation_id = OLD.installation_id AND a.auth_revision = OLD.auth_revision AND a.pin_revision = OLD.pin_revision AND a.pin_hash = OLD.pin_hash)) OR (OLD.state = 'maintenance' AND NEW.state = 'pending' AND NEW.barrier_attempt_id IS NULL AND NEW.auth_revision = OLD.auth_revision AND EXISTS (SELECT 1 FROM memory_machine_completions done WHERE done.attempt_id = OLD.barrier_attempt_id AND done.installation_id = OLD.installation_id AND done.auth_revision = OLD.auth_revision))) BEGIN SELECT RAISE(ABORT, 'machine configuration requires exact attempt barrier'); END"
 },
 "memory_machine_completion_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_completion_guard BEFORE INSERT ON memory_machine_completions WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id) JOIN memory_machine_audit audit ON audit.id = a.audit_id AND audit.attempt_id = a.id AND audit.installation_id = a.installation_id WHERE a.id = NEW.attempt_id AND a.request_hash = NEW.request_hash AND a.audit_id = NEW.audit_id AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = NEW.auth_revision AND NEW.auth_revision = a.auth_revision + 1 AND c.pin_hash = a.pin_hash AND c.pin_revision = a.pin_revision AND audit.action = a.action AND audit.target_id = a.target_id AND audit.request_hash = a.request_hash) BEGIN SELECT RAISE(ABORT, 'machine completion requires exact audit and barrier'); END"
 },
 "memory_machine_completion_release": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_completion_release AFTER INSERT ON memory_machine_completions BEGIN UPDATE memory_machine_configuration SET state = 'pending', barrier_attempt_id = NULL WHERE installation_id = NEW.installation_id AND barrier_attempt_id = NEW.attempt_id; END"
 },
 "memory_machine_grant_transition": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_grant_transition BEFORE UPDATE ON memory_machine_grants WHEN OLD.state = 'revoked' OR NEW.id IS NOT OLD.id OR NEW.installation_id IS NOT OLD.installation_id OR NEW.repository_id IS NOT OLD.repository_id OR NEW.commitment IS NOT OLD.commitment OR NEW.secret_hash IS NOT OLD.secret_hash OR NEW.scope IS NOT OLD.scope OR NEW.issued_attempt_id IS NOT OLD.issued_attempt_id OR NEW.created_at != OLD.created_at OR NEW.expires_at != OLD.expires_at OR NEW.revision != OLD.revision + 1 OR NOT ((OLD.state = 'pending' AND NEW.state = 'consumed') OR NEW.state = 'revoked') OR (OLD.machine_id IS NOT NULL AND (NEW.machine_id IS NOT OLD.machine_id OR NEW.consumed_attempt_id IS NOT OLD.consumed_attempt_id)) BEGIN SELECT RAISE(ABORT, 'machine grant cannot widen or reopen'); END"
 },
 "memory_machine_principal_transition": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_principal_transition BEFORE UPDATE ON memory_machine_principals WHEN OLD.status != 'active' OR NEW.status != 'revoked' OR NEW.revision != OLD.revision + 1 OR NEW.id IS NOT OLD.id OR NEW.installation_id IS NOT OLD.installation_id OR NEW.repository_id IS NOT OLD.repository_id OR NEW.commitment IS NOT OLD.commitment OR NEW.grant_id IS NOT OLD.grant_id OR NEW.scope IS NOT OLD.scope OR NEW.enrollment_attempt_id IS NOT OLD.enrollment_attempt_id OR NEW.created_at != OLD.created_at BEGIN SELECT RAISE(ABORT, 'machine namespace cannot be reassigned or revived'); END"
 },
 "memory_machine_configuration_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_configuration_retained BEFORE DELETE ON memory_machine_configuration BEGIN SELECT RAISE(ABORT, 'machine configuration retained'); END"
 },
 "memory_machine_grants_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_grants_retained BEFORE DELETE ON memory_machine_grants BEGIN SELECT RAISE(ABORT, 'machine grants retained'); END"
 },
 "memory_machine_principals_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_principals_retained BEFORE DELETE ON memory_machine_principals BEGIN SELECT RAISE(ABORT, 'machine principals retained'); END"
 },
 "memory_machine_credentials_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_credentials_immutable BEFORE UPDATE ON memory_machine_credentials BEGIN SELECT RAISE(ABORT, 'machine credentials immutable'); END"
 },
 "memory_machine_credentials_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_credentials_retained BEFORE DELETE ON memory_machine_credentials BEGIN SELECT RAISE(ABORT, 'machine credentials retained'); END"
 },
 "memory_machine_audit_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_audit_immutable BEFORE UPDATE ON memory_machine_audit BEGIN SELECT RAISE(ABORT, 'machine audit immutable'); END"
 },
 "memory_machine_audit_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_audit_retained BEFORE DELETE ON memory_machine_audit BEGIN SELECT RAISE(ABORT, 'machine audit retained'); END"
 },
 "memory_machine_manifest_receipts_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_manifest_receipts_immutable BEFORE UPDATE ON memory_machine_manifest_receipts BEGIN SELECT RAISE(ABORT, 'machine manifest_receipts immutable'); END"
 },
 "memory_machine_manifest_receipts_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_manifest_receipts_retained BEFORE DELETE ON memory_machine_manifest_receipts BEGIN SELECT RAISE(ABORT, 'machine manifest_receipts retained'); END"
 },
 "memory_machine_bootstrap_completions_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_bootstrap_completions_immutable BEFORE UPDATE ON memory_machine_bootstrap_completions BEGIN SELECT RAISE(ABORT, 'machine bootstrap_completions immutable'); END"
 },
 "memory_machine_bootstrap_completions_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_bootstrap_completions_retained BEFORE DELETE ON memory_machine_bootstrap_completions BEGIN SELECT RAISE(ABORT, 'machine bootstrap_completions retained'); END"
 },
 "memory_machine_attempts_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_attempts_immutable BEFORE UPDATE ON memory_machine_attempts BEGIN SELECT RAISE(ABORT, 'machine attempts immutable'); END"
 },
 "memory_machine_attempts_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_attempts_retained BEFORE DELETE ON memory_machine_attempts BEGIN SELECT RAISE(ABORT, 'machine attempts retained'); END"
 },
 "memory_machine_completions_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_completions_immutable BEFORE UPDATE ON memory_machine_completions BEGIN SELECT RAISE(ABORT, 'machine completions immutable'); END"
 },
 "memory_machine_completions_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_completions_retained BEFORE DELETE ON memory_machine_completions BEGIN SELECT RAISE(ABORT, 'machine completions retained'); END"
 },
 "memory_machine_grant_insert_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_grant_insert_guard BEFORE INSERT ON memory_machine_grants WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id) WHERE a.id = NEW.issued_attempt_id AND a.action = 'issue' AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash AND a.target_id = NEW.id AND a.installation_id = NEW.installation_id AND c.repository_id = NEW.repository_id AND json_extract(a.payload_json, '$.grantId') = NEW.id AND json_extract(a.payload_json, '$.scope') = NEW.scope AND json_extract(a.payload_json, '$.machineCommitment') = NEW.commitment AND json_extract(a.payload_json, '$.capabilityHash') = NEW.secret_hash AND json_extract(a.payload_json, '$.expiresAt') = NEW.expires_at) BEGIN SELECT RAISE(ABORT, 'grant requires exact maintenance attempt'); END"
 },
 "memory_machine_grant_update_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_grant_update_guard BEFORE UPDATE ON memory_machine_grants WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id) WHERE c.installation_id = OLD.installation_id AND c.repository_id = OLD.repository_id AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash AND ((a.action = 'enroll' AND NEW.state = 'consumed' AND a.id = NEW.consumed_attempt_id AND json_extract(a.payload_json, '$.grantId') = OLD.id AND json_extract(a.payload_json, '$.machineId') = NEW.machine_id AND json_extract(a.payload_json, '$.machineCommitment') = OLD.commitment AND json_extract(a.payload_json, '$.capabilityHash') = OLD.secret_hash) OR (a.action = 'revoke' AND NEW.state = 'revoked' AND json_extract(a.payload_json, '$.machineId') = OLD.machine_id AND json_extract(a.payload_json, '$.grantRevision') = OLD.revision))) BEGIN SELECT RAISE(ABORT, 'grant mutation requires exact maintenance attempt'); END"
 },
 "memory_machine_principal_insert_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_principal_insert_guard BEFORE INSERT ON memory_machine_principals WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id) JOIN memory_machine_grants g ON g.id = NEW.grant_id AND g.installation_id = NEW.installation_id AND g.repository_id = NEW.repository_id JOIN memory_principals generic ON generic.id = NEW.id AND generic.installation_id = NEW.installation_id AND generic.status = 'active' WHERE a.id = NEW.enrollment_attempt_id AND a.action = 'enroll' AND a.target_id = NEW.id AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash AND g.state = 'consumed' AND g.machine_id = NEW.id AND g.consumed_attempt_id = a.id AND g.commitment = NEW.commitment AND json_extract(a.payload_json, '$.scope') = NEW.scope) BEGIN SELECT RAISE(ABORT, 'machine principal requires exact maintenance attempt'); END"
 },
 "memory_machine_principal_update_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_principal_update_guard BEFORE UPDATE ON memory_machine_principals WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id) WHERE c.installation_id = OLD.installation_id AND c.repository_id = OLD.repository_id AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash AND a.action = 'revoke' AND a.target_id = OLD.id AND json_extract(a.payload_json, '$.machineRevision') = OLD.revision) BEGIN SELECT RAISE(ABORT, 'machine revocation requires exact maintenance attempt'); END"
 },
 "memory_machine_credential_insert_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_credential_insert_guard BEFORE INSERT ON memory_machine_credentials WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id) JOIN memory_machine_principals p ON p.id = NEW.machine_id AND p.installation_id = a.installation_id AND p.repository_id = c.repository_id JOIN memory_machine_grants g ON g.id = p.grant_id AND g.consumed_attempt_id = a.id AND g.machine_id = p.id WHERE a.id = NEW.attempt_id AND a.action = 'enroll' AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash AND p.status = 'active' AND g.state = 'consumed' AND p.revision = NEW.machine_revision AND g.revision = NEW.grant_revision AND json_extract(a.payload_json, '$.credentialHash') = NEW.hash AND json_extract(a.payload_json, '$.credentialExpiresAt') = NEW.expires_at) BEGIN SELECT RAISE(ABORT, 'credential requires exact maintenance attempt'); END"
 },
 "memory_machine_completion_outcome_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_completion_outcome_guard BEFORE INSERT ON memory_machine_completions WHEN NOT EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id) WHERE a.id = NEW.attempt_id AND a.installation_id = NEW.installation_id AND a.request_hash = NEW.request_hash AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash AND ((a.action = 'issue' AND EXISTS (SELECT 1 FROM memory_machine_grants g WHERE g.id = a.target_id AND g.installation_id = a.installation_id AND g.repository_id = c.repository_id AND g.id = json_extract(a.payload_json, '$.grantId') AND g.commitment = json_extract(a.payload_json, '$.machineCommitment') AND g.secret_hash = json_extract(a.payload_json, '$.capabilityHash') AND g.scope = json_extract(a.payload_json, '$.scope') AND g.expires_at = json_extract(a.payload_json, '$.expiresAt') AND g.expires_at > unixepoch() AND g.state = 'pending' AND g.revision = 1 AND g.machine_id IS NULL AND g.issued_attempt_id = a.id)) OR (a.action = 'enroll' AND EXISTS (SELECT 1 FROM memory_machine_grants g JOIN memory_machine_principals p ON p.id = g.machine_id AND p.grant_id = g.id AND p.installation_id = g.installation_id AND p.repository_id = g.repository_id JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'active' JOIN memory_machine_credentials k ON k.machine_id = p.id AND k.attempt_id = a.id AND k.machine_revision = p.revision AND k.grant_revision = g.revision WHERE p.id = a.target_id AND g.installation_id = a.installation_id AND g.repository_id = c.repository_id AND g.id = json_extract(a.payload_json, '$.grantId') AND p.id = json_extract(a.payload_json, '$.machineId') AND g.commitment = json_extract(a.payload_json, '$.machineCommitment') AND p.commitment = g.commitment AND g.secret_hash = json_extract(a.payload_json, '$.capabilityHash') AND p.scope = json_extract(a.payload_json, '$.scope') AND (g.scope = p.scope OR g.scope = 'memory:read memory:write memory:admin' OR (g.scope = 'memory:read memory:write' AND p.scope = 'memory:read')) AND g.state = 'consumed' AND g.revision = 2 AND g.consumed_attempt_id = a.id AND p.status = 'active' AND p.revision = 1 AND p.enrollment_attempt_id = a.id AND k.hash = json_extract(a.payload_json, '$.credentialHash') AND k.expires_at = json_extract(a.payload_json, '$.credentialExpiresAt') AND k.expires_at > unixepoch() AND EXISTS (SELECT 1 FROM memory_machine_completions issue_done JOIN memory_machine_attempts issue_a ON issue_a.id = issue_done.attempt_id JOIN memory_machine_audit issue_audit ON issue_audit.id = issue_done.audit_id AND issue_audit.attempt_id = issue_a.id WHERE issue_a.id = g.issued_attempt_id AND issue_a.action = 'issue' AND issue_a.target_id = g.id AND issue_a.installation_id = g.installation_id AND issue_done.installation_id = g.installation_id AND issue_done.request_hash = issue_a.request_hash AND issue_done.audit_id = issue_a.audit_id AND issue_done.auth_revision = issue_a.auth_revision + 1 AND issue_audit.action = 'issue' AND issue_audit.target_id = g.id AND issue_audit.installation_id = g.installation_id AND issue_audit.request_hash = issue_a.request_hash))) OR (a.action = 'revoke' AND EXISTS (SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id = p.grant_id AND g.machine_id = p.id AND g.installation_id = p.installation_id AND g.repository_id = p.repository_id JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'removed' WHERE p.id = a.target_id AND p.id = json_extract(a.payload_json, '$.machineId') AND p.installation_id = a.installation_id AND p.repository_id = c.repository_id AND p.status = 'revoked' AND p.revision = json_extract(a.payload_json, '$.machineRevision') + 1 AND g.state = 'revoked' AND g.revision = json_extract(a.payload_json, '$.grantRevision') + 1)))) BEGIN SELECT RAISE(ABORT, 'machine completion requires exact current outcome'); END"
 },
 "memory_machine_audit_insert_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_machine_audit_insert_guard BEFORE INSERT ON memory_machine_audit WHEN NOT EXISTS (SELECT 1 FROM memory_machine_configuration c WHERE c.installation_id = NEW.installation_id AND ( (NEW.action = 'bootstrap' AND NEW.attempt_id = c.operation_id AND NEW.target_id = c.installation_id AND NEW.request_hash = c.request_hash AND c.auth_revision = 1 AND c.pin_revision = 1 AND c.state = 'pending' AND NOT EXISTS (SELECT 1 FROM memory_machine_attempts WHERE installation_id = c.installation_id)) OR EXISTS (SELECT 1 FROM memory_machine_attempts a WHERE a.installation_id = c.installation_id AND a.id = NEW.attempt_id AND a.audit_id = NEW.id AND a.action = NEW.action AND a.target_id = NEW.target_id AND a.request_hash = NEW.request_hash AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id AND c.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash AND ((a.action = 'issue' AND EXISTS (SELECT 1 FROM memory_machine_grants g WHERE g.id = a.target_id AND g.installation_id = a.installation_id AND g.repository_id = c.repository_id AND g.id = json_extract(a.payload_json, '$.grantId') AND g.commitment = json_extract(a.payload_json, '$.machineCommitment') AND g.secret_hash = json_extract(a.payload_json, '$.capabilityHash') AND g.scope = json_extract(a.payload_json, '$.scope') AND g.expires_at = json_extract(a.payload_json, '$.expiresAt') AND g.expires_at > unixepoch() AND g.state = 'pending' AND g.revision = 1 AND g.machine_id IS NULL AND g.issued_attempt_id = a.id)) OR (a.action = 'enroll' AND EXISTS (SELECT 1 FROM memory_machine_grants g JOIN memory_machine_principals p ON p.id = g.machine_id AND p.grant_id = g.id AND p.installation_id = g.installation_id AND p.repository_id = g.repository_id JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'active' JOIN memory_machine_credentials k ON k.machine_id = p.id AND k.attempt_id = a.id AND k.machine_revision = p.revision AND k.grant_revision = g.revision WHERE p.id = a.target_id AND g.installation_id = a.installation_id AND g.repository_id = c.repository_id AND g.id = json_extract(a.payload_json, '$.grantId') AND p.id = json_extract(a.payload_json, '$.machineId') AND g.commitment = json_extract(a.payload_json, '$.machineCommitment') AND p.commitment = g.commitment AND g.secret_hash = json_extract(a.payload_json, '$.capabilityHash') AND p.scope = json_extract(a.payload_json, '$.scope') AND (g.scope = p.scope OR g.scope = 'memory:read memory:write memory:admin' OR (g.scope = 'memory:read memory:write' AND p.scope = 'memory:read')) AND g.state = 'consumed' AND g.revision = 2 AND g.consumed_attempt_id = a.id AND p.status = 'active' AND p.revision = 1 AND p.enrollment_attempt_id = a.id AND k.hash = json_extract(a.payload_json, '$.credentialHash') AND k.expires_at = json_extract(a.payload_json, '$.credentialExpiresAt') AND k.expires_at > unixepoch() AND EXISTS (SELECT 1 FROM memory_machine_completions issue_done JOIN memory_machine_attempts issue_a ON issue_a.id = issue_done.attempt_id JOIN memory_machine_audit issue_audit ON issue_audit.id = issue_done.audit_id AND issue_audit.attempt_id = issue_a.id WHERE issue_a.id = g.issued_attempt_id AND issue_a.action = 'issue' AND issue_a.target_id = g.id AND issue_a.installation_id = g.installation_id AND issue_done.installation_id = g.installation_id AND issue_done.request_hash = issue_a.request_hash AND issue_done.audit_id = issue_a.audit_id AND issue_done.auth_revision = issue_a.auth_revision + 1 AND issue_audit.action = 'issue' AND issue_audit.target_id = g.id AND issue_audit.installation_id = g.installation_id AND issue_audit.request_hash = issue_a.request_hash))) OR (a.action = 'revoke' AND EXISTS (SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id = p.grant_id AND g.machine_id = p.id AND g.installation_id = p.installation_id AND g.repository_id = p.repository_id JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'removed' WHERE p.id = a.target_id AND p.id = json_extract(a.payload_json, '$.machineId') AND p.installation_id = a.installation_id AND p.repository_id = c.repository_id AND p.status = 'revoked' AND p.revision = json_extract(a.payload_json, '$.machineRevision') + 1 AND g.state = 'revoked' AND g.revision = json_extract(a.payload_json, '$.grantRevision') + 1)))))) BEGIN SELECT RAISE(ABORT, 'machine audit requires exact current outcome'); END"
 },
 "memory_runtime_configuration": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_configuration ( installation_id TEXT PRIMARY KEY REFERENCES memory_machine_configuration(installation_id), repository_id TEXT NOT NULL, target_json TEXT NOT NULL CHECK(json_valid(target_json)), baseline_hash TEXT NOT NULL CHECK(length(baseline_hash)=64), baseline_request_hash TEXT NOT NULL, baseline_audit_id TEXT NOT NULL REFERENCES memory_machine_audit(id), pin_hash TEXT NOT NULL, operation_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL CHECK(length(request_hash)=64), upgrade_expected_json TEXT NOT NULL CHECK(json_valid(upgrade_expected_json)), runtime_revision INTEGER NOT NULL DEFAULT 1 CHECK(runtime_revision>=1), state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','maintenance')), barrier_attempt_id TEXT, created_at INTEGER NOT NULL, CHECK((state='maintenance')=(barrier_attempt_id IS NOT NULL)) )"
 },
 "memory_runtime_manifests": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_manifests ( installation_id TEXT PRIMARY KEY REFERENCES memory_runtime_configuration(installation_id), repository_id TEXT NOT NULL, schema_version INTEGER NOT NULL CHECK(schema_version=13), manifest_hash TEXT NOT NULL CHECK(length(manifest_hash)=64), baseline_hash TEXT NOT NULL, request_hash TEXT NOT NULL, audit_id TEXT NOT NULL UNIQUE )"
 },
 "memory_runtime_bootstrap": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_bootstrap ( installation_id TEXT PRIMARY KEY REFERENCES memory_runtime_configuration(installation_id), operation_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL, baseline_hash TEXT NOT NULL, audit_id TEXT NOT NULL UNIQUE )"
 },
 "memory_runtime_attempts": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_attempts ( id TEXT PRIMARY KEY CHECK(length(id)>=32), installation_id TEXT NOT NULL REFERENCES memory_runtime_configuration(installation_id), action TEXT NOT NULL CHECK(action IN ('issue','enroll','revoke','renew','stage','publish','activate')), target_id TEXT NOT NULL, request_hash TEXT NOT NULL CHECK(length(request_hash)=64), payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), snapshot_hash TEXT NOT NULL, baseline_hash TEXT NOT NULL, pin_hash TEXT NOT NULL, pin_revision INTEGER NOT NULL, auth_revision INTEGER NOT NULL, runtime_revision INTEGER NOT NULL, audit_id TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL )"
 },
 "memory_runtime_audit": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_audit ( id TEXT PRIMARY KEY, installation_id TEXT NOT NULL REFERENCES memory_runtime_configuration(installation_id), attempt_id TEXT NOT NULL UNIQUE, action TEXT NOT NULL, target_id TEXT NOT NULL, request_hash TEXT NOT NULL, created_at INTEGER NOT NULL )"
 },
 "memory_runtime_completions": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_completions ( attempt_id TEXT PRIMARY KEY REFERENCES memory_runtime_attempts(id), installation_id TEXT NOT NULL, request_hash TEXT NOT NULL, audit_id TEXT NOT NULL UNIQUE REFERENCES memory_runtime_audit(id), auth_revision INTEGER NOT NULL, runtime_revision INTEGER NOT NULL, created_at INTEGER NOT NULL )"
 },
 "memory_runtime_proofs": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_proofs ( nonce_hash TEXT PRIMARY KEY CHECK(length(nonce_hash)=64), attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_runtime_attempts(id), machine_id TEXT NOT NULL, grant_id TEXT NOT NULL, commitment TEXT NOT NULL, proof_hash TEXT NOT NULL CHECK(length(proof_hash)=64), deadline INTEGER NOT NULL, created_at INTEGER NOT NULL, CHECK(deadline>created_at AND deadline<=created_at+120) )"
 },
 "memory_runtime_keys": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_keys ( machine_id TEXT PRIMARY KEY REFERENCES memory_machine_principals(id), commitment TEXT NOT NULL, public_key_json TEXT NOT NULL CHECK(json_valid(public_key_json)), attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_runtime_attempts(id) )"
 },
 "memory_runtime_rotations": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_rotations ( hash TEXT PRIMARY KEY CHECK(length(hash)=64 AND hash NOT GLOB '*[^0-9a-f]*'), machine_id TEXT NOT NULL REFERENCES memory_machine_principals(id), grant_id TEXT NOT NULL REFERENCES memory_machine_grants(id), generation INTEGER NOT NULL CHECK(generation>=1), previous_hash TEXT, overlap_until INTEGER NOT NULL, scope TEXT NOT NULL, grant_revision INTEGER NOT NULL, machine_revision INTEGER NOT NULL, issued_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK(expires_at>issued_at AND expires_at<=issued_at+2592000), attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_runtime_attempts(id), UNIQUE(machine_id,generation), CHECK(overlap_until>=issued_at AND overlap_until<=issued_at+120) )"
 },
 "memory_runtime_transcripts": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_transcripts ( attempt_id TEXT PRIMARY KEY REFERENCES memory_runtime_attempts(id), machine_id TEXT NOT NULL REFERENCES memory_machine_principals(id), object_hash TEXT NOT NULL CHECK(length(object_hash)=64), session_hash TEXT NOT NULL CHECK(length(session_hash)=64), content_hash TEXT NOT NULL CHECK(length(content_hash)=64), visibility TEXT NOT NULL CHECK(visibility IN ('private','shared')), event TEXT NOT NULL CHECK(event IN ('staged','published')), stage_attempt_id TEXT, auth_revision INTEGER NOT NULL, grant_revision INTEGER NOT NULL, machine_revision INTEGER NOT NULL, credential_generation INTEGER NOT NULL CHECK(credential_generation>=1), created_at INTEGER NOT NULL, UNIQUE(object_hash,event), CHECK((event='published')=(stage_attempt_id IS NOT NULL)) )"
 },
 "memory_runtime_activations": {
  "type": "table",
  "sql": "CREATE TABLE memory_runtime_activations ( attempt_id TEXT PRIMARY KEY REFERENCES memory_runtime_attempts(id), installation_id TEXT NOT NULL UNIQUE, baseline_hash TEXT NOT NULL, pin_hash TEXT NOT NULL, protocol_hash TEXT NOT NULL CHECK(length(protocol_hash)=64), route_contract_hash TEXT NOT NULL CHECK(length(route_contract_hash)=64), auth_revision INTEGER NOT NULL, created_at INTEGER NOT NULL )"
 },
 "memory_runtime_attempt_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_attempt_guard BEFORE INSERT ON memory_runtime_attempts WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_configuration r JOIN memory_machine_configuration c USING(installation_id) JOIN memory_runtime_bootstrap b ON b.installation_id=r.installation_id AND b.request_hash=r.request_hash AND b.baseline_hash=r.baseline_hash WHERE r.installation_id=NEW.installation_id AND r.state='pending' AND r.barrier_attempt_id IS NULL AND c.state='pending' AND c.barrier_attempt_id IS NULL AND r.runtime_revision=NEW.runtime_revision AND c.auth_revision=NEW.auth_revision AND c.pin_revision=NEW.pin_revision AND c.pin_hash=NEW.pin_hash AND r.pin_hash=c.pin_hash AND r.baseline_hash=NEW.baseline_hash) OR EXISTS(SELECT 1 FROM memory_runtime_attempts a LEFT JOIN memory_runtime_completions d ON d.attempt_id=a.id WHERE a.installation_id=NEW.installation_id AND d.attempt_id IS NULL) BEGIN SELECT RAISE(ABORT,'runtime authority stale or incomplete'); END"
 },
 "memory_runtime_attempt_close": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_attempt_close AFTER INSERT ON memory_runtime_attempts BEGIN UPDATE memory_runtime_configuration SET state='maintenance',barrier_attempt_id=NEW.id, runtime_revision=runtime_revision+1 WHERE installation_id=NEW.installation_id; END"
 },
 "memory_runtime_configuration_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_configuration_guard BEFORE UPDATE ON memory_runtime_configuration WHEN NEW.installation_id IS NOT OLD.installation_id OR NEW.repository_id IS NOT OLD.repository_id OR NEW.target_json IS NOT OLD.target_json OR NEW.baseline_hash IS NOT OLD.baseline_hash OR NEW.baseline_request_hash IS NOT OLD.baseline_request_hash OR NEW.baseline_audit_id IS NOT OLD.baseline_audit_id OR NEW.pin_hash IS NOT OLD.pin_hash OR NEW.operation_id IS NOT OLD.operation_id OR NEW.request_hash IS NOT OLD.request_hash OR NEW.created_at!=OLD.created_at OR NEW.upgrade_expected_json IS NOT OLD.upgrade_expected_json OR NOT((OLD.state='pending' AND NEW.state='maintenance' AND NEW.runtime_revision=OLD.runtime_revision+1 AND EXISTS(SELECT 1 FROM memory_runtime_attempts a WHERE a.id=NEW.barrier_attempt_id AND a.installation_id=OLD.installation_id AND a.runtime_revision=OLD.runtime_revision)) OR(OLD.state='maintenance' AND NEW.state='pending' AND NEW.barrier_attempt_id IS NULL AND NEW.runtime_revision=OLD.runtime_revision AND EXISTS(SELECT 1 FROM memory_runtime_completions d WHERE d.attempt_id=OLD.barrier_attempt_id AND d.runtime_revision=OLD.runtime_revision))) BEGIN SELECT RAISE(ABORT,'runtime configuration requires exact barrier'); END"
 },
 "memory_runtime_machine_attempt_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_machine_attempt_guard BEFORE INSERT ON memory_machine_attempts WHEN EXISTS(SELECT 1 FROM memory_runtime_configuration) AND NOT EXISTS(SELECT 1 FROM memory_runtime_configuration r JOIN memory_runtime_attempts a ON a.id=r.barrier_attempt_id WHERE r.installation_id=NEW.installation_id AND r.state='maintenance' AND r.runtime_revision=a.runtime_revision+1 AND a.id=NEW.id AND a.action=NEW.action AND a.target_id=NEW.target_id AND a.request_hash=NEW.request_hash AND a.payload_json=NEW.payload_json AND a.audit_id=NEW.audit_id AND a.auth_revision=NEW.auth_revision AND a.pin_hash=NEW.pin_hash AND a.pin_revision=NEW.pin_revision) BEGIN SELECT RAISE(ABORT,'schema12 requires runtime maintenance'); END"
 },
 "memory_runtime_proofs_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_proofs_guard BEFORE INSERT ON memory_runtime_proofs WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id) JOIN memory_machine_configuration c USING(installation_id) WHERE a.id=NEW.attempt_id AND r.state='maintenance' AND r.barrier_attempt_id=a.id AND r.runtime_revision=a.runtime_revision+1 AND r.baseline_hash=a.baseline_hash AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision AND c.state='pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision=a.auth_revision AND a.action IN ('enroll','renew','stage','publish') AND NEW.machine_id=json_extract(a.payload_json,'$.machineId') AND NEW.grant_id=json_extract(a.payload_json,'$.grantId') AND NEW.commitment=json_extract(a.payload_json,'$.machineCommitment') AND NEW.nonce_hash=json_extract(a.payload_json,'$.nonceHash') AND NEW.proof_hash=json_extract(a.payload_json,'$.proofHash') AND NEW.deadline=json_extract(a.payload_json,'$.deadline') AND NEW.deadline>unixepoch()) BEGIN SELECT RAISE(ABORT,'runtime row requires exact current outcome'); END"
 },
 "memory_runtime_keys_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_keys_guard BEFORE INSERT ON memory_runtime_keys WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id) JOIN memory_machine_configuration c USING(installation_id) WHERE a.id=NEW.attempt_id AND r.state='maintenance' AND r.barrier_attempt_id=a.id AND r.runtime_revision=a.runtime_revision+1 AND r.baseline_hash=a.baseline_hash AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision AND c.state='pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision=a.auth_revision+CASE WHEN a.action IN ('issue','enroll','revoke') THEN 1 ELSE 0 END AND a.action IN ('enroll','renew') AND NEW.machine_id=json_extract(a.payload_json,'$.machineId') AND NEW.commitment=json_extract(a.payload_json,'$.machineCommitment') AND NEW.public_key_json=json_extract(a.payload_json,'$.publicKeyJson')) BEGIN SELECT RAISE(ABORT,'runtime row requires exact current outcome'); END"
 },
 "memory_runtime_rotations_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_rotations_guard BEFORE INSERT ON memory_runtime_rotations WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id) JOIN memory_machine_configuration c USING(installation_id) WHERE a.id=NEW.attempt_id AND r.state='maintenance' AND r.barrier_attempt_id=a.id AND r.runtime_revision=a.runtime_revision+1 AND r.baseline_hash=a.baseline_hash AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision AND c.state='pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision=a.auth_revision+CASE WHEN a.action IN ('issue','enroll','revoke') THEN 1 ELSE 0 END AND a.action IN ('enroll','renew') AND NEW.machine_id=json_extract(a.payload_json,'$.machineId') AND NEW.grant_id=json_extract(a.payload_json,'$.grantId') AND NEW.hash=json_extract(a.payload_json,'$.credentialHash') AND NEW.generation=json_extract(a.payload_json,'$.generation') AND NEW.previous_hash IS json_extract(a.payload_json,'$.previousHash') AND NEW.overlap_until=json_extract(a.payload_json,'$.overlapUntil') AND NEW.expires_at=json_extract(a.payload_json,'$.credentialExpiresAt') AND NEW.scope=json_extract(a.payload_json,'$.scope') AND NEW.grant_revision=json_extract(a.payload_json,'$.grantRevision') AND NEW.machine_revision=json_extract(a.payload_json,'$.machineRevision') AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id WHERE p.id=json_extract(a.payload_json,'$.machineId') AND p.installation_id=a.installation_id AND p.repository_id=r.repository_id AND p.status='active' AND generic.status='active' AND g.state='consumed' AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id AND g.id=json_extract(a.payload_json,'$.grantId') AND p.scope=json_extract(a.payload_json,'$.scope') AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.revision=json_extract(a.payload_json,'$.machineRevision')) AND ((a.action='enroll' AND NEW.generation=1 AND NEW.previous_hash IS NULL) OR (a.action='renew' AND EXISTS(SELECT 1 FROM memory_runtime_rotations old WHERE old.machine_id=NEW.machine_id AND old.hash=NEW.previous_hash AND old.generation=NEW.generation-1 AND old.scope=NEW.scope AND old.grant_revision=NEW.grant_revision AND old.machine_revision=NEW.machine_revision)) OR(a.action='renew' AND NEW.generation=1 AND NOT EXISTS(SELECT 1 FROM memory_runtime_rotations WHERE machine_id=NEW.machine_id) AND EXISTS(SELECT 1 FROM memory_machine_credentials old JOIN memory_machine_completions done ON done.attempt_id=old.attempt_id WHERE old.hash=NEW.previous_hash AND old.machine_id=NEW.machine_id AND old.grant_revision=NEW.grant_revision AND old.machine_revision=NEW.machine_revision)))) BEGIN SELECT RAISE(ABORT,'runtime row requires exact current outcome'); END"
 },
 "memory_runtime_transcripts_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_transcripts_guard BEFORE INSERT ON memory_runtime_transcripts WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id) JOIN memory_machine_configuration c USING(installation_id) WHERE a.id=NEW.attempt_id AND r.state='maintenance' AND r.barrier_attempt_id=a.id AND r.runtime_revision=a.runtime_revision+1 AND r.baseline_hash=a.baseline_hash AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision AND c.state='pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision=a.auth_revision+CASE WHEN a.action IN ('issue','enroll','revoke') THEN 1 ELSE 0 END AND a.action IN ('stage','publish') AND NEW.machine_id=json_extract(a.payload_json,'$.machineId') AND NEW.object_hash=json_extract(a.payload_json,'$.objectHash') AND NEW.session_hash=json_extract(a.payload_json,'$.sessionHash') AND NEW.content_hash=json_extract(a.payload_json,'$.contentHash') AND NEW.visibility=json_extract(a.payload_json,'$.visibility') AND NEW.auth_revision=c.auth_revision AND NEW.machine_revision=json_extract(a.payload_json,'$.machineRevision') AND NEW.grant_revision=json_extract(a.payload_json,'$.grantRevision') AND NEW.credential_generation=json_extract(a.payload_json,'$.credentialGeneration') AND NEW.credential_generation=(SELECT max(generation) FROM memory_runtime_rotations WHERE machine_id=NEW.machine_id) AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id WHERE p.id=json_extract(a.payload_json,'$.machineId') AND p.installation_id=a.installation_id AND p.repository_id=r.repository_id AND p.status='active' AND generic.status='active' AND g.state='consumed' AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id AND g.id=json_extract(a.payload_json,'$.grantId') AND p.scope=json_extract(a.payload_json,'$.scope') AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.revision=json_extract(a.payload_json,'$.machineRevision')) AND (NEW.visibility='private' OR json_extract(a.payload_json,'$.scope')!='memory:read') AND ((a.action='stage' AND NEW.event='staged' AND NEW.stage_attempt_id IS NULL) OR(a.action='publish' AND NEW.event='published' AND NEW.stage_attempt_id=json_extract(a.payload_json,'$.stageAttemptId') AND EXISTS(SELECT 1 FROM memory_runtime_transcripts staged JOIN memory_runtime_completions done ON done.attempt_id=staged.attempt_id WHERE staged.attempt_id=NEW.stage_attempt_id AND staged.event='staged' AND staged.machine_id=NEW.machine_id AND staged.object_hash=NEW.object_hash AND staged.session_hash=NEW.session_hash AND staged.content_hash=NEW.content_hash AND staged.visibility=NEW.visibility AND staged.credential_generation=NEW.credential_generation AND staged.machine_revision=NEW.machine_revision AND staged.grant_revision=NEW.grant_revision)))) BEGIN SELECT RAISE(ABORT,'runtime row requires exact current outcome'); END"
 },
 "memory_runtime_activations_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_activations_guard BEFORE INSERT ON memory_runtime_activations WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id) JOIN memory_machine_configuration c USING(installation_id) WHERE a.id=NEW.attempt_id AND a.action='activate' AND a.installation_id=NEW.installation_id AND r.baseline_hash=NEW.baseline_hash AND r.pin_hash=NEW.pin_hash AND r.state='maintenance' AND r.barrier_attempt_id=a.id AND r.runtime_revision=a.runtime_revision+1 AND c.state='pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision=a.auth_revision AND NEW.auth_revision=c.auth_revision AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision AND r.baseline_hash=a.baseline_hash AND NEW.protocol_hash=json_extract(a.payload_json,'$.protocolHash') AND NEW.route_contract_hash=json_extract(a.payload_json,'$.routeContractHash') AND NOT EXISTS(SELECT 1 FROM memory_keys) AND NOT EXISTS(SELECT 1 FROM memory_admins) AND NOT EXISTS(SELECT 1 FROM memory_credentials) AND NOT EXISTS(SELECT 1 FROM memory_devices) AND NOT EXISTS(SELECT 1 FROM memory_identity_bindings) AND NOT EXISTS(SELECT 1 FROM memory_memberships) AND NOT EXISTS(SELECT 1 FROM memory_providers) AND NOT EXISTS(SELECT 1 FROM memory_owner_intents) AND NOT EXISTS(SELECT 1 FROM memory_installation_configuration) AND NOT EXISTS(SELECT 1 FROM memory_bootstrap_completion) AND NOT EXISTS(SELECT 1 FROM memory_schema_receipts)) BEGIN SELECT RAISE(ABORT,'runtime activation requires exact fresh authority'); END"
 },
 "memory_runtime_outcomes": {
  "type": "view",
  "sql": "CREATE VIEW memory_runtime_outcomes AS SELECT a.id,a.installation_id,a.request_hash,a.audit_id,a.action,a.target_id,c.auth_revision,r.runtime_revision FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id) JOIN memory_machine_configuration c USING(installation_id) WHERE c.state='pending' AND c.barrier_attempt_id IS NULL AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash AND c.pin_revision=a.pin_revision AND r.baseline_hash=a.baseline_hash AND c.auth_revision=a.auth_revision+CASE WHEN a.action IN ('issue','enroll','revoke') THEN 1 ELSE 0 END AND r.runtime_revision=a.runtime_revision+1 AND ((a.action='issue' AND EXISTS(SELECT 1 FROM memory_machine_completions d JOIN memory_machine_attempts la ON la.id=d.attempt_id JOIN memory_machine_audit audit ON audit.id=d.audit_id WHERE d.attempt_id=a.id AND d.request_hash=a.request_hash AND d.audit_id=a.audit_id AND d.auth_revision=c.auth_revision AND la.payload_json=a.payload_json AND la.action=a.action AND audit.target_id=a.target_id) AND EXISTS(SELECT 1 FROM memory_machine_grants g WHERE g.id=a.target_id AND g.state='pending' AND g.revision=1 AND g.issued_attempt_id=a.id AND g.commitment=json_extract(a.payload_json,'$.machineCommitment') AND g.secret_hash=json_extract(a.payload_json,'$.capabilityHash') AND g.scope=json_extract(a.payload_json,'$.scope') AND g.expires_at=json_extract(a.payload_json,'$.expiresAt') AND g.expires_at>unixepoch())) OR(a.action='revoke' AND EXISTS(SELECT 1 FROM memory_machine_completions d JOIN memory_machine_attempts la ON la.id=d.attempt_id JOIN memory_machine_audit audit ON audit.id=d.audit_id WHERE d.attempt_id=a.id AND d.request_hash=a.request_hash AND d.audit_id=a.audit_id AND d.auth_revision=c.auth_revision AND la.payload_json=a.payload_json AND la.action=a.action AND audit.target_id=a.target_id) AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id JOIN memory_principals generic ON generic.id=p.id AND generic.status='removed' WHERE p.id=a.target_id AND p.installation_id=a.installation_id AND p.repository_id=r.repository_id AND p.status='revoked' AND p.revision=json_extract(a.payload_json,'$.machineRevision')+1 AND g.state='revoked' AND g.machine_id=p.id AND g.revision=json_extract(a.payload_json,'$.grantRevision')+1)) OR(a.action='enroll' AND EXISTS(SELECT 1 FROM memory_machine_completions d JOIN memory_machine_attempts la ON la.id=d.attempt_id JOIN memory_machine_audit audit ON audit.id=d.audit_id WHERE d.attempt_id=a.id AND d.request_hash=a.request_hash AND d.audit_id=a.audit_id AND d.auth_revision=c.auth_revision AND la.payload_json=a.payload_json AND la.action=a.action AND audit.target_id=a.target_id) AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id WHERE p.id=json_extract(a.payload_json,'$.machineId') AND p.installation_id=a.installation_id AND p.repository_id=r.repository_id AND p.status='active' AND generic.status='active' AND g.state='consumed' AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id AND g.id=json_extract(a.payload_json,'$.grantId') AND p.scope=json_extract(a.payload_json,'$.scope') AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.revision=json_extract(a.payload_json,'$.machineRevision')) AND EXISTS(SELECT 1 FROM memory_runtime_proofs p WHERE p.attempt_id=a.id AND p.nonce_hash=json_extract(a.payload_json,'$.nonceHash') AND p.proof_hash=json_extract(a.payload_json,'$.proofHash') AND p.deadline>unixepoch() AND p.deadline=json_extract(a.payload_json,'$.deadline') AND p.machine_id=a.target_id AND p.grant_id=json_extract(a.payload_json,'$.grantId') AND p.commitment=json_extract(a.payload_json,'$.machineCommitment')) AND EXISTS(SELECT 1 FROM memory_runtime_rotations k WHERE k.attempt_id=a.id AND k.hash=json_extract(a.payload_json,'$.credentialHash') AND k.generation=json_extract(a.payload_json,'$.generation') AND k.machine_id=a.target_id AND k.scope=json_extract(a.payload_json,'$.scope') AND k.expires_at>unixepoch() AND k.grant_id=json_extract(a.payload_json,'$.grantId') AND k.grant_revision=json_extract(a.payload_json,'$.grantRevision') AND k.machine_revision=json_extract(a.payload_json,'$.machineRevision') AND k.previous_hash IS json_extract(a.payload_json,'$.previousHash') AND k.overlap_until=json_extract(a.payload_json,'$.overlapUntil') AND k.expires_at=json_extract(a.payload_json,'$.credentialExpiresAt')) AND EXISTS(SELECT 1 FROM memory_runtime_keys k WHERE k.machine_id=a.target_id AND k.attempt_id=a.id AND k.commitment=json_extract(a.payload_json,'$.machineCommitment') AND k.public_key_json=json_extract(a.payload_json,'$.publicKeyJson'))) OR(a.action='renew' AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id WHERE p.id=json_extract(a.payload_json,'$.machineId') AND p.installation_id=a.installation_id AND p.repository_id=r.repository_id AND p.status='active' AND generic.status='active' AND g.state='consumed' AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id AND g.id=json_extract(a.payload_json,'$.grantId') AND p.scope=json_extract(a.payload_json,'$.scope') AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.revision=json_extract(a.payload_json,'$.machineRevision')) AND EXISTS(SELECT 1 FROM memory_runtime_proofs p WHERE p.attempt_id=a.id AND p.nonce_hash=json_extract(a.payload_json,'$.nonceHash') AND p.proof_hash=json_extract(a.payload_json,'$.proofHash') AND p.deadline>unixepoch() AND p.deadline=json_extract(a.payload_json,'$.deadline') AND p.machine_id=a.target_id AND p.grant_id=json_extract(a.payload_json,'$.grantId') AND p.commitment=json_extract(a.payload_json,'$.machineCommitment')) AND EXISTS(SELECT 1 FROM memory_runtime_rotations k WHERE k.attempt_id=a.id AND k.hash=json_extract(a.payload_json,'$.credentialHash') AND k.generation=json_extract(a.payload_json,'$.generation') AND k.machine_id=a.target_id AND k.scope=json_extract(a.payload_json,'$.scope') AND k.expires_at>unixepoch() AND k.grant_id=json_extract(a.payload_json,'$.grantId') AND k.grant_revision=json_extract(a.payload_json,'$.grantRevision') AND k.machine_revision=json_extract(a.payload_json,'$.machineRevision') AND k.previous_hash IS json_extract(a.payload_json,'$.previousHash') AND k.overlap_until=json_extract(a.payload_json,'$.overlapUntil') AND k.expires_at=json_extract(a.payload_json,'$.credentialExpiresAt')) AND EXISTS(SELECT 1 FROM memory_runtime_keys stored_key WHERE stored_key.machine_id=a.target_id AND stored_key.commitment=json_extract(a.payload_json,'$.machineCommitment') AND stored_key.public_key_json=json_extract(a.payload_json,'$.publicKeyJson'))) OR(a.action='activate' AND EXISTS(SELECT 1 FROM memory_runtime_activations x WHERE x.attempt_id=a.id AND x.installation_id=a.installation_id AND x.baseline_hash=r.baseline_hash AND x.pin_hash=r.pin_hash AND x.auth_revision=c.auth_revision AND x.protocol_hash=json_extract(a.payload_json,'$.protocolHash') AND x.route_contract_hash=json_extract(a.payload_json,'$.routeContractHash')) AND NOT EXISTS(SELECT 1 FROM memory_keys) AND NOT EXISTS(SELECT 1 FROM memory_admins) AND NOT EXISTS(SELECT 1 FROM memory_credentials) AND NOT EXISTS(SELECT 1 FROM memory_devices) AND NOT EXISTS(SELECT 1 FROM memory_identity_bindings) AND NOT EXISTS(SELECT 1 FROM memory_memberships) AND NOT EXISTS(SELECT 1 FROM memory_providers) AND NOT EXISTS(SELECT 1 FROM memory_owner_intents) AND NOT EXISTS(SELECT 1 FROM memory_installation_configuration) AND NOT EXISTS(SELECT 1 FROM memory_bootstrap_completion) AND NOT EXISTS(SELECT 1 FROM memory_schema_receipts)) OR(a.action IN ('stage','publish') AND EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id WHERE p.id=json_extract(a.payload_json,'$.machineId') AND p.installation_id=a.installation_id AND p.repository_id=r.repository_id AND p.status='active' AND generic.status='active' AND g.state='consumed' AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id AND g.id=json_extract(a.payload_json,'$.grantId') AND p.scope=json_extract(a.payload_json,'$.scope') AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.revision=json_extract(a.payload_json,'$.machineRevision')) AND EXISTS(SELECT 1 FROM memory_runtime_proofs p WHERE p.attempt_id=a.id AND p.nonce_hash=json_extract(a.payload_json,'$.nonceHash') AND p.proof_hash=json_extract(a.payload_json,'$.proofHash') AND p.deadline>unixepoch() AND p.deadline=json_extract(a.payload_json,'$.deadline') AND p.machine_id=a.target_id AND p.grant_id=json_extract(a.payload_json,'$.grantId') AND p.commitment=json_extract(a.payload_json,'$.machineCommitment')) AND EXISTS(SELECT 1 FROM memory_runtime_transcripts x WHERE x.attempt_id=a.id AND x.machine_id=a.target_id AND x.object_hash=json_extract(a.payload_json,'$.objectHash') AND x.content_hash=json_extract(a.payload_json,'$.contentHash') AND x.session_hash=json_extract(a.payload_json,'$.sessionHash') AND x.visibility=json_extract(a.payload_json,'$.visibility') AND x.auth_revision=c.auth_revision AND x.grant_revision=json_extract(a.payload_json,'$.grantRevision') AND x.machine_revision=json_extract(a.payload_json,'$.machineRevision') AND x.credential_generation=json_extract(a.payload_json,'$.credentialGeneration') AND x.credential_generation=(SELECT max(generation) FROM memory_runtime_rotations WHERE machine_id=x.machine_id) AND x.event=CASE WHEN a.action='stage' THEN 'staged' ELSE 'published' END)))"
 },
 "memory_runtime_audit_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_audit_guard BEFORE INSERT ON memory_runtime_audit WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_configuration r WHERE r.installation_id=NEW.installation_id AND ((NEW.action='upgrade' AND NEW.attempt_id=r.operation_id AND NEW.target_id=r.installation_id AND NEW.request_hash=r.request_hash AND r.runtime_revision=1 AND r.state='pending') OR EXISTS(SELECT 1 FROM memory_runtime_outcomes o WHERE o.id=NEW.attempt_id AND o.audit_id=NEW.id AND o.installation_id=NEW.installation_id AND o.action=NEW.action AND o.target_id=NEW.target_id AND o.request_hash=NEW.request_hash AND r.state='maintenance' AND r.barrier_attempt_id=o.id))) BEGIN SELECT RAISE(ABORT,'runtime audit requires exact outcome'); END"
 },
 "memory_runtime_completion_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_completion_guard BEFORE INSERT ON memory_runtime_completions WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_outcomes o JOIN memory_runtime_audit audit ON audit.id=o.audit_id JOIN memory_runtime_configuration r ON r.installation_id=o.installation_id WHERE o.id=NEW.attempt_id AND o.installation_id=NEW.installation_id AND o.request_hash=NEW.request_hash AND o.audit_id=NEW.audit_id AND o.auth_revision=NEW.auth_revision AND o.runtime_revision=NEW.runtime_revision AND audit.attempt_id=o.id AND audit.action=o.action AND audit.target_id=o.target_id AND audit.request_hash=o.request_hash AND r.state='maintenance' AND r.barrier_attempt_id=o.id) BEGIN SELECT RAISE(ABORT,'runtime completion requires exact outcome'); END"
 },
 "memory_runtime_completion_release": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_completion_release AFTER INSERT ON memory_runtime_completions BEGIN UPDATE memory_runtime_configuration SET state='pending',barrier_attempt_id=NULL WHERE installation_id=NEW.installation_id AND barrier_attempt_id=NEW.attempt_id; END"
 },
 "memory_runtime_bootstrap_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_bootstrap_guard BEFORE INSERT ON memory_runtime_bootstrap WHEN NOT EXISTS(SELECT 1 FROM memory_runtime_configuration r JOIN memory_machine_configuration c USING(installation_id) JOIN memory_machine_bootstrap_completions old ON old.installation_id=c.installation_id JOIN memory_machine_manifest_receipts oldm ON oldm.installation_id=c.installation_id AND oldm.schema_version=12 JOIN memory_machine_audit olda ON olda.id=old.audit_id AND olda.action='bootstrap' JOIN memory_runtime_manifests m ON m.installation_id=r.installation_id AND m.repository_id=r.repository_id JOIN memory_runtime_audit a ON a.id=m.audit_id AND a.action='upgrade' AND a.attempt_id=r.operation_id WHERE r.installation_id=NEW.installation_id AND r.operation_id=NEW.operation_id AND r.request_hash=NEW.request_hash AND r.baseline_hash=NEW.baseline_hash AND m.baseline_hash=r.baseline_hash AND m.schema_version=13 AND m.request_hash=r.request_hash AND NEW.audit_id=a.id AND a.target_id=r.installation_id AND a.request_hash=r.request_hash AND c.state='pending' AND c.barrier_attempt_id IS NULL AND old.audit_id=r.baseline_audit_id AND old.request_hash=c.request_hash AND oldm.request_hash=c.request_hash AND oldm.audit_id=olda.id AND r.baseline_request_hash=c.request_hash AND olda.request_hash=c.request_hash AND olda.target_id=c.installation_id AND old.operation_id=c.operation_id AND r.pin_hash=c.pin_hash AND r.target_json=c.target_json AND r.runtime_revision=1 AND r.state='pending' AND r.barrier_attempt_id IS NULL) BEGIN SELECT RAISE(ABORT,'runtime bootstrap requires original completed12'); END"
 },
 "memory_runtime_manifests_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_manifests_immutable BEFORE UPDATE ON memory_runtime_manifests BEGIN SELECT RAISE(ABORT,'runtime manifests immutable'); END"
 },
 "memory_runtime_manifests_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_manifests_retained BEFORE DELETE ON memory_runtime_manifests BEGIN SELECT RAISE(ABORT,'runtime manifests retained'); END"
 },
 "memory_runtime_bootstrap_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_bootstrap_immutable BEFORE UPDATE ON memory_runtime_bootstrap BEGIN SELECT RAISE(ABORT,'runtime bootstrap immutable'); END"
 },
 "memory_runtime_bootstrap_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_bootstrap_retained BEFORE DELETE ON memory_runtime_bootstrap BEGIN SELECT RAISE(ABORT,'runtime bootstrap retained'); END"
 },
 "memory_runtime_attempts_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_attempts_immutable BEFORE UPDATE ON memory_runtime_attempts BEGIN SELECT RAISE(ABORT,'runtime attempts immutable'); END"
 },
 "memory_runtime_attempts_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_attempts_retained BEFORE DELETE ON memory_runtime_attempts BEGIN SELECT RAISE(ABORT,'runtime attempts retained'); END"
 },
 "memory_runtime_audit_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_audit_immutable BEFORE UPDATE ON memory_runtime_audit BEGIN SELECT RAISE(ABORT,'runtime audit immutable'); END"
 },
 "memory_runtime_audit_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_audit_retained BEFORE DELETE ON memory_runtime_audit BEGIN SELECT RAISE(ABORT,'runtime audit retained'); END"
 },
 "memory_runtime_completions_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_completions_immutable BEFORE UPDATE ON memory_runtime_completions BEGIN SELECT RAISE(ABORT,'runtime completions immutable'); END"
 },
 "memory_runtime_completions_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_completions_retained BEFORE DELETE ON memory_runtime_completions BEGIN SELECT RAISE(ABORT,'runtime completions retained'); END"
 },
 "memory_runtime_proofs_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_proofs_immutable BEFORE UPDATE ON memory_runtime_proofs BEGIN SELECT RAISE(ABORT,'runtime proofs immutable'); END"
 },
 "memory_runtime_proofs_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_proofs_retained BEFORE DELETE ON memory_runtime_proofs BEGIN SELECT RAISE(ABORT,'runtime proofs retained'); END"
 },
 "memory_runtime_keys_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_keys_immutable BEFORE UPDATE ON memory_runtime_keys BEGIN SELECT RAISE(ABORT,'runtime keys immutable'); END"
 },
 "memory_runtime_keys_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_keys_retained BEFORE DELETE ON memory_runtime_keys BEGIN SELECT RAISE(ABORT,'runtime keys retained'); END"
 },
 "memory_runtime_rotations_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_rotations_immutable BEFORE UPDATE ON memory_runtime_rotations BEGIN SELECT RAISE(ABORT,'runtime rotations immutable'); END"
 },
 "memory_runtime_rotations_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_rotations_retained BEFORE DELETE ON memory_runtime_rotations BEGIN SELECT RAISE(ABORT,'runtime rotations retained'); END"
 },
 "memory_runtime_transcripts_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_transcripts_immutable BEFORE UPDATE ON memory_runtime_transcripts BEGIN SELECT RAISE(ABORT,'runtime transcripts immutable'); END"
 },
 "memory_runtime_transcripts_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_transcripts_retained BEFORE DELETE ON memory_runtime_transcripts BEGIN SELECT RAISE(ABORT,'runtime transcripts retained'); END"
 },
 "memory_runtime_configuration_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_configuration_retained BEFORE DELETE ON memory_runtime_configuration BEGIN SELECT RAISE(ABORT,'runtime configuration retained'); END"
 },
 "memory_runtime_activations_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_activations_immutable BEFORE UPDATE ON memory_runtime_activations BEGIN SELECT RAISE(ABORT,'runtime activations immutable'); END"
 },
 "memory_runtime_activations_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_activations_retained BEFORE DELETE ON memory_runtime_activations BEGIN SELECT RAISE(ABORT,'runtime activations retained'); END"
 },
 "memory_runtime_legacy_keys_insert_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_legacy_keys_insert_guard BEFORE INSERT ON memory_keys WHEN EXISTS(SELECT 1 FROM memory_runtime_activations) BEGIN SELECT RAISE(ABORT,'legacy authority retired by runtime activation'); END"
 },
 "memory_runtime_legacy_keys_update_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_legacy_keys_update_guard BEFORE UPDATE ON memory_keys WHEN EXISTS(SELECT 1 FROM memory_runtime_activations) BEGIN SELECT RAISE(ABORT,'legacy authority retired by runtime activation'); END"
 },
 "memory_runtime_legacy_admins_insert_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_legacy_admins_insert_guard BEFORE INSERT ON memory_admins WHEN EXISTS(SELECT 1 FROM memory_runtime_activations) BEGIN SELECT RAISE(ABORT,'legacy authority retired by runtime activation'); END"
 },
 "memory_runtime_legacy_admins_update_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_runtime_legacy_admins_update_guard BEFORE UPDATE ON memory_admins WHEN EXISTS(SELECT 1 FROM memory_runtime_activations) BEGIN SELECT RAISE(ABORT,'legacy authority retired by runtime activation'); END"
 },
 "memory_data_configuration": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_configuration ( installation_id TEXT PRIMARY KEY REFERENCES memory_runtime_configuration(installation_id), repository_id TEXT NOT NULL, operation_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL, manifest_hash TEXT NOT NULL, schema_hash TEXT NOT NULL, baseline_hash TEXT NOT NULL, original_pin_hash TEXT NOT NULL, expected_json TEXT NOT NULL CHECK(json_valid(expected_json)), revision INTEGER NOT NULL DEFAULT 1, state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','maintenance')), barrier_attempt_id TEXT, CHECK((state='maintenance')=(barrier_attempt_id IS NOT NULL)) )"
 },
 "memory_data_bootstrap": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_bootstrap ( installation_id TEXT PRIMARY KEY REFERENCES memory_data_configuration(installation_id), operation_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL, genesis_json TEXT NOT NULL CHECK(json_valid(genesis_json)) )"
 },
 "memory_data_attempts": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_attempts ( id TEXT PRIMARY KEY, installation_id TEXT NOT NULL REFERENCES memory_data_configuration(installation_id), action TEXT NOT NULL CHECK(action IN ('capture','deployment')), request_hash TEXT NOT NULL, payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), expected_json TEXT NOT NULL CHECK(json_valid(expected_json)), revision INTEGER NOT NULL, audit_id TEXT NOT NULL UNIQUE, nonce_hash TEXT UNIQUE, proof_hash TEXT, deadline INTEGER, created_at INTEGER NOT NULL, CHECK((action='capture')=(nonce_hash IS NOT NULL AND proof_hash IS NOT NULL AND deadline IS NOT NULL)), CHECK(action!='capture' OR (length(nonce_hash)=64 AND length(proof_hash)=64 AND deadline>created_at AND deadline<=created_at+120)) )"
 },
 "memory_data_session_owners": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_session_owners ( session_id TEXT PRIMARY KEY REFERENCES sessions(id), installation_id TEXT NOT NULL, repository_id TEXT NOT NULL, machine_id TEXT NOT NULL REFERENCES memory_machine_principals(id) )"
 },
 "memory_data_session_events": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_session_events ( attempt_id TEXT PRIMARY KEY REFERENCES memory_data_attempts(id), session_id TEXT NOT NULL REFERENCES sessions(id), machine_id TEXT NOT NULL, previous_cursor TEXT, next_cursor TEXT, session_json TEXT NOT NULL CHECK(json_valid(session_json)) )"
 },
 "memory_data_fact_links": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_fact_links ( attempt_id TEXT NOT NULL REFERENCES memory_data_attempts(id), ordinal INTEGER NOT NULL, fact_id INTEGER NOT NULL UNIQUE REFERENCES facts(id), machine_id TEXT NOT NULL, fact_json TEXT NOT NULL CHECK(json_valid(fact_json)), PRIMARY KEY(attempt_id,ordinal) )"
 },
 "memory_data_tag_definitions": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_tag_definitions ( attempt_id TEXT NOT NULL REFERENCES memory_data_attempts(id), name TEXT NOT NULL REFERENCES tags(name), tag_json TEXT NOT NULL CHECK(json_valid(tag_json)), PRIMARY KEY(attempt_id,name) )"
 },
 "memory_data_tag_links": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_tag_links ( attempt_id TEXT NOT NULL, ordinal INTEGER NOT NULL, tag TEXT NOT NULL REFERENCES tags(name), PRIMARY KEY(attempt_id,ordinal,tag), FOREIGN KEY(attempt_id,ordinal) REFERENCES memory_data_fact_links(attempt_id,ordinal) )"
 },
 "memory_data_supersedes": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_supersedes ( attempt_id TEXT NOT NULL REFERENCES memory_data_attempts(id), old_fact_id INTEGER NOT NULL UNIQUE REFERENCES facts(id), ordinal INTEGER NOT NULL, new_fact_id INTEGER NOT NULL REFERENCES facts(id), machine_id TEXT NOT NULL, PRIMARY KEY(attempt_id,old_fact_id), FOREIGN KEY(attempt_id,ordinal) REFERENCES memory_data_fact_links(attempt_id,ordinal) )"
 },
 "memory_data_runs": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_runs ( attempt_id TEXT PRIMARY KEY REFERENCES memory_data_attempts(id), run_id INTEGER NOT NULL UNIQUE REFERENCES runs(id), run_json TEXT NOT NULL CHECK(json_valid(run_json)) )"
 },
 "memory_data_deployments": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_deployments ( attempt_id TEXT PRIMARY KEY REFERENCES memory_data_attempts(id), predecessor_id TEXT NOT NULL UNIQUE, previous_pin_hash TEXT NOT NULL, pin_hash TEXT NOT NULL, evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)), review_hash TEXT NOT NULL, protocol_hash TEXT NOT NULL, route_contract_hash TEXT NOT NULL, rollback INTEGER NOT NULL CHECK(rollback IN (0,1)) )"
 },
 "memory_data_outcomes": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_outcomes ( attempt_id TEXT PRIMARY KEY REFERENCES memory_data_attempts(id), outcome_json TEXT NOT NULL CHECK(json_valid(outcome_json)) )"
 },
 "memory_data_audit": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_audit ( id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL UNIQUE REFERENCES memory_data_attempts(id), request_hash TEXT NOT NULL )"
 },
 "memory_data_completions": {
  "type": "table",
  "sql": "CREATE TABLE memory_data_completions ( attempt_id TEXT PRIMARY KEY REFERENCES memory_data_attempts(id), request_hash TEXT NOT NULL, audit_id TEXT NOT NULL UNIQUE REFERENCES memory_data_audit(id), revision INTEGER NOT NULL, outcome_json TEXT NOT NULL CHECK(json_valid(outcome_json)) )"
 },
 "memory_data_runtime_barrier": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_runtime_barrier BEFORE INSERT ON memory_runtime_attempts WHEN NOT EXISTS(SELECT 1 FROM memory_data_configuration c JOIN memory_data_bootstrap b USING(installation_id) WHERE c.installation_id=NEW.installation_id AND c.state='pending' AND c.barrier_attempt_id IS NULL) BEGIN SELECT RAISE(ABORT,'data lifecycle incomplete'); END"
 },
 "memory_data_machine_barrier": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_machine_barrier BEFORE INSERT ON memory_machine_attempts WHEN EXISTS(SELECT 1 FROM memory_data_configuration WHERE state='maintenance') OR NOT EXISTS(SELECT 1 FROM memory_data_bootstrap) BEGIN SELECT RAISE(ABORT,'data lifecycle incomplete'); END"
 },
 "memory_data_attempt_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_attempt_guard BEFORE INSERT ON memory_data_attempts WHEN NOT EXISTS(SELECT 1 FROM memory_data_configuration d JOIN memory_data_bootstrap b USING(installation_id) JOIN memory_runtime_configuration r USING(installation_id) JOIN memory_machine_configuration c USING(installation_id) WHERE d.installation_id=NEW.installation_id AND d.revision=NEW.revision AND d.state='pending' AND d.barrier_attempt_id IS NULL AND r.state='pending' AND r.barrier_attempt_id IS NULL AND c.state='pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision=json_extract(NEW.expected_json,'$.authRevision') AND c.pin_revision=json_extract(NEW.expected_json,'$.pinRevision') AND r.runtime_revision=json_extract(NEW.expected_json,'$.runtimeRevision') AND d.revision=json_extract(NEW.expected_json,'$.dataRevision')) OR EXISTS(SELECT 1 FROM memory_data_attempts a LEFT JOIN memory_data_completions c ON c.attempt_id=a.id WHERE c.attempt_id IS NULL) BEGIN SELECT RAISE(ABORT,'data authority stale or incomplete'); END"
 },
 "memory_data_attempt_close": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_attempt_close AFTER INSERT ON memory_data_attempts BEGIN UPDATE memory_data_configuration SET state='maintenance',barrier_attempt_id=NEW.id,revision=revision+1 WHERE installation_id=NEW.installation_id; END"
 },
 "memory_data_configuration_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_configuration_guard BEFORE UPDATE ON memory_data_configuration WHEN NEW.installation_id IS NOT OLD.installation_id OR NEW.repository_id IS NOT OLD.repository_id OR NEW.operation_id IS NOT OLD.operation_id OR NEW.request_hash IS NOT OLD.request_hash OR NEW.manifest_hash IS NOT OLD.manifest_hash OR NEW.schema_hash IS NOT OLD.schema_hash OR NEW.baseline_hash IS NOT OLD.baseline_hash OR NEW.original_pin_hash IS NOT OLD.original_pin_hash OR NEW.expected_json IS NOT OLD.expected_json OR NOT( (OLD.state='pending' AND NEW.state='maintenance' AND NEW.revision=OLD.revision+1 AND EXISTS(SELECT 1 FROM memory_data_attempts WHERE id=NEW.barrier_attempt_id AND revision=OLD.revision)) OR(OLD.state='maintenance' AND NEW.state='pending' AND NEW.revision=OLD.revision AND NEW.barrier_attempt_id IS NULL AND EXISTS(SELECT 1 FROM memory_data_completions WHERE attempt_id=OLD.barrier_attempt_id AND revision=OLD.revision))) BEGIN SELECT RAISE(ABORT,'data configuration requires exact barrier'); END"
 },
 "memory_data_live_attempts": {
  "type": "view",
  "sql": "CREATE VIEW memory_data_live_attempts AS SELECT a.* FROM memory_data_attempts a JOIN memory_data_configuration d USING(installation_id) JOIN memory_runtime_configuration r USING(installation_id) JOIN memory_machine_configuration c USING(installation_id) WHERE d.state='maintenance' AND d.barrier_attempt_id=a.id AND d.revision=a.revision+1 AND r.state='pending' AND r.barrier_attempt_id IS NULL AND c.state='pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision=json_extract(a.expected_json,'$.authRevision') AND c.pin_revision=json_extract(a.expected_json,'$.pinRevision') AND r.runtime_revision=json_extract(a.expected_json,'$.runtimeRevision')"
 },
 "memory_data_capture_authority": {
  "type": "view",
  "sql": "CREATE VIEW memory_data_capture_authority AS SELECT a.* FROM memory_data_live_attempts a JOIN memory_machine_principals p ON p.id=json_extract(a.payload_json,'$.machineId') JOIN memory_machine_grants g ON g.id=p.grant_id AND g.machine_id=p.id JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id JOIN memory_runtime_keys k ON k.machine_id=p.id WHERE a.action='capture' AND (json_extract(a.payload_json,'$.session.status')!='private' OR (json_array_length(a.payload_json,'$.facts')=0 AND json_array_length(a.payload_json,'$.newTags')=0) OR json_type(a.payload_json,'$.session')='null') AND a.deadline>unixepoch() AND EXISTS(SELECT 1 FROM memory_runtime_activations act JOIN memory_runtime_completions done ON done.attempt_id=act.attempt_id WHERE act.installation_id=a.installation_id) AND p.installation_id=a.installation_id AND p.repository_id=json_extract(a.payload_json,'$.repositoryId') AND p.status='active' AND generic.status='active' AND g.state='consumed' AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id AND g.id=json_extract(a.payload_json,'$.grantId') AND p.revision=json_extract(a.payload_json,'$.machineRevision') AND g.revision=json_extract(a.payload_json,'$.grantRevision') AND p.commitment=json_extract(a.payload_json,'$.machineCommitment') AND k.public_key_json=json_extract(a.payload_json,'$.publicKeyJson') AND EXISTS(SELECT 1 FROM memory_runtime_rotations rot JOIN memory_runtime_completions done ON done.attempt_id=rot.attempt_id JOIN memory_runtime_attempts ra ON ra.id=done.attempt_id AND ra.audit_id=done.audit_id AND ra.request_hash=done.request_hash JOIN memory_runtime_audit audit ON audit.id=done.audit_id AND audit.attempt_id=ra.id AND audit.request_hash=ra.request_hash WHERE rot.machine_id=p.id AND rot.grant_id=g.id AND rot.grant_revision=g.revision AND rot.machine_revision=p.revision AND rot.hash=json_extract(a.payload_json,'$.credentialHash') AND rot.expires_at>unixepoch() AND rot.generation=json_extract(a.payload_json,'$.credentialGeneration') AND rot.generation=(SELECT max(generation) FROM memory_runtime_rotations WHERE machine_id=p.id)) AND (json_extract(a.payload_json,'$.visibility')='private' OR p.scope IN ('memory:read memory:write','memory:read memory:write memory:admin'))"
 },
 "memory_data_fact_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_fact_guard BEFORE INSERT ON facts WHEN (NEW.capture_attempt_id IS NULL)!=(NEW.capture_ordinal IS NULL) OR (NEW.capture_attempt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM memory_data_capture_authority a JOIN json_each(a.payload_json,'$.facts') j WHERE a.id=NEW.capture_attempt_id AND j.key=NEW.capture_ordinal AND NEW.slug=json_extract(j.value,'$.slug') AND NEW.type=json_extract(j.value,'$.type') AND NEW.body=json_extract(j.value,'$.body') AND NEW.session_id=json_extract(a.payload_json,'$.session.id') AND NEW.source=json_extract(a.payload_json,'$.source') AND NEW.source IN ('save','backfill','consolidation') AND NEW.author=json_extract(a.payload_json,'$.machineId') AND NEW.owner_principal_id=json_extract(a.payload_json,'$.machineId') AND NEW.shared=CASE WHEN json_extract(a.payload_json,'$.visibility')='shared' AND NEW.type NOT IN ('user','feedback') THEN 1 ELSE 0 END)) BEGIN SELECT RAISE(ABORT,'fact requires exact capture'); END"
 },
 "memory_data_fact_binding_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_fact_binding_immutable BEFORE UPDATE OF capture_attempt_id,capture_ordinal ON facts BEGIN SELECT RAISE(ABORT,'capture binding immutable'); END"
 },
 "memory_data_bootstrap_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_bootstrap_guard BEFORE INSERT ON memory_data_bootstrap WHEN NOT EXISTS(SELECT 1 FROM memory_data_configuration d JOIN memory_runtime_configuration r USING(installation_id) JOIN memory_runtime_bootstrap b USING(installation_id) JOIN memory_runtime_manifests m USING(installation_id) WHERE d.installation_id=NEW.installation_id AND d.operation_id=NEW.operation_id AND d.request_hash=NEW.request_hash AND d.baseline_hash=r.baseline_hash AND d.original_pin_hash=r.pin_hash AND r.state='pending' AND r.barrier_attempt_id IS NULL AND b.request_hash=r.request_hash AND m.schema_version=13 AND d.revision=1 AND d.state='pending') BEGIN SELECT RAISE(ABORT,'data bootstrap requires retained13'); END"
 },
 "memory_data_session_insert_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_session_insert_guard BEFORE INSERT ON sessions WHEN NEW.capture_attempt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM memory_data_capture_authority a WHERE a.id=NEW.capture_attempt_id AND NEW.id=json_extract(a.payload_json,'$.session.id') AND json_extract(a.payload_json,'$.session.previousCursor') IS NULL AND NEW.owner_principal_id=json_extract(a.payload_json,'$.machineId') AND NEW.author=NEW.owner_principal_id AND NEW.machine=NEW.owner_principal_id AND NEW.agent=json_extract(a.payload_json,'$.session.agent') AND NEW.status=json_extract(a.payload_json,'$.session.status') AND NEW.reason IS json_extract(a.payload_json,'$.session.reason') AND NEW.read_through IS json_extract(a.payload_json,'$.session.nextCursor') AND NEW.updated_at=json_extract(a.payload_json,'$.session.updatedAt') AND NEW.raw_key IS NULL AND NEW.branch IS json_extract(a.payload_json,'$.session.branch') AND NEW.cwd IS json_extract(a.payload_json,'$.session.cwd') AND NEW.started_at IS json_extract(a.payload_json,'$.session.startedAt') AND NEW.ended_at IS json_extract(a.payload_json,'$.session.endedAt')) BEGIN SELECT RAISE(ABORT,'session requires exact capture'); END"
 },
 "memory_data_session_update_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_session_update_guard BEFORE UPDATE ON sessions WHEN (OLD.capture_attempt_id IS NOT NULL OR NEW.capture_attempt_id IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM memory_data_capture_authority a JOIN memory_data_session_owners o ON o.session_id=OLD.id AND o.machine_id=json_extract(a.payload_json,'$.machineId') WHERE a.id=NEW.capture_attempt_id AND NEW.id=OLD.id AND OLD.id=json_extract(a.payload_json,'$.session.id') AND NEW.owner_principal_id=OLD.owner_principal_id AND NEW.owner_principal_id=o.machine_id AND NEW.author=OLD.author AND NEW.machine=OLD.machine AND NEW.agent=OLD.agent AND NEW.agent=json_extract(a.payload_json,'$.session.agent') AND OLD.read_through IS json_extract(a.payload_json,'$.session.previousCursor') AND NEW.read_through IS json_extract(a.payload_json,'$.session.nextCursor') AND NEW.status=json_extract(a.payload_json,'$.session.status') AND NEW.reason IS json_extract(a.payload_json,'$.session.reason') AND NEW.updated_at=json_extract(a.payload_json,'$.session.updatedAt') AND NEW.raw_key IS OLD.raw_key AND NEW.raw_bytes IS OLD.raw_bytes AND NEW.branch IS json_extract(a.payload_json,'$.session.branch') AND NEW.cwd IS json_extract(a.payload_json,'$.session.cwd') AND NEW.started_at IS json_extract(a.payload_json,'$.session.startedAt') AND NEW.ended_at IS json_extract(a.payload_json,'$.session.endedAt')) BEGIN SELECT RAISE(ABORT,'session requires owned cursor compare'); END"
 },
 "memory_data_session_owner_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_session_owner_guard BEFORE INSERT ON memory_data_session_owners WHEN NOT EXISTS(SELECT 1 FROM memory_data_capture_authority a JOIN sessions sess ON sess.id=NEW.session_id WHERE a.id=sess.capture_attempt_id AND NEW.installation_id=a.installation_id AND NEW.repository_id=json_extract(a.payload_json,'$.repositoryId') AND NEW.machine_id=json_extract(a.payload_json,'$.machineId') AND sess.owner_principal_id=NEW.machine_id) BEGIN SELECT RAISE(ABORT,'session ownership requires exact capture'); END"
 },
 "memory_data_supersede_update_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_supersede_update_guard BEFORE UPDATE OF superseded_by ON facts WHEN (OLD.capture_attempt_id IS NOT NULL OR NEW.superseded_by IN (SELECT fact_id FROM memory_data_fact_links)) AND NOT EXISTS( SELECT 1 FROM memory_data_capture_authority a JOIN memory_data_fact_links l ON l.attempt_id=a.id AND l.fact_id=NEW.superseded_by JOIN json_each(a.payload_json,'$.facts') j ON j.key=l.ordinal JOIN json_each(j.value,'$.supersedes') superseded ON superseded.value=OLD.id WHERE OLD.superseded_by IS NULL AND (OLD.owner_principal_id=l.machine_id OR EXISTS(SELECT 1 FROM memory_machine_principals admin JOIN memory_machine_principals owner ON owner.id=OLD.owner_principal_id AND owner.installation_id=admin.installation_id AND owner.repository_id=admin.repository_id WHERE admin.id=l.machine_id AND admin.status='active' AND admin.scope='memory:read memory:write memory:admin')) AND l.machine_id=json_extract(a.payload_json,'$.machineId') AND OLD.id IN (SELECT oldlink.fact_id FROM memory_data_fact_links oldlink JOIN memory_data_attempts olda ON olda.id=oldlink.attempt_id WHERE olda.installation_id=a.installation_id)) BEGIN SELECT RAISE(ABORT,'supersede requires owned fact'); END"
 },
 "memory_data_verified_captures": {
  "type": "view",
  "sql": "CREATE VIEW memory_data_verified_captures AS SELECT a.id, json_object('action','capture','attemptId',a.id,'tags',json(json_extract(a.payload_json,'$.newTags')), 'facts',json((SELECT json_group_array(json_object('ordinal',ordinal,'factId',fact_id)) FROM (SELECT ordinal,fact_id FROM memory_data_fact_links WHERE attempt_id=a.id ORDER BY ordinal))), 'session',json(CASE WHEN json_type(a.payload_json,'$.session')='null' THEN 'null' ELSE json_object('id',json_extract(a.payload_json,'$.session.id'),'previousCursor',json_extract(a.payload_json,'$.session.previousCursor'),'nextCursor',json_extract(a.payload_json,'$.session.nextCursor')) END), 'supersedes',json((SELECT json_group_array(json_object('factId',old_fact_id,'ordinal',ordinal,'newFactId',new_fact_id)) FROM ( SELECT x.old_fact_id,x.ordinal,x.new_fact_id FROM json_each(a.payload_json,'$.facts') j JOIN json_each(j.value,'$.supersedes') old JOIN memory_data_supersedes x ON x.attempt_id=a.id AND x.ordinal=j.key AND x.old_fact_id=old.value ORDER BY j.key,old.key))), 'run',json(CASE WHEN json_type(a.payload_json,'$.run')='null' THEN 'null' ELSE (SELECT json_object('id',run_id,'counts',json(json_extract(a.payload_json,'$.run.counts'))) FROM memory_data_runs WHERE attempt_id=a.id) END)) outcome_json FROM memory_data_capture_authority a WHERE (SELECT count(*) FROM memory_data_tag_definitions WHERE attempt_id=a.id)=json_array_length(a.payload_json,'$.newTags') AND NOT EXISTS(SELECT 1 FROM json_each(a.payload_json,'$.newTags') j WHERE NOT EXISTS(SELECT 1 FROM memory_data_tag_definitions l JOIN tags t ON t.name=l.name WHERE l.attempt_id=a.id AND l.tag_json=j.value AND t.name=json_extract(j.value,'$.name') AND t.definition=json_extract(j.value,'$.definition') AND t.alias_of IS json_extract(j.value,'$.aliasOf'))) AND (SELECT count(*) FROM memory_data_fact_links WHERE attempt_id=a.id)=json_array_length(a.payload_json,'$.facts') AND (SELECT count(*) FROM facts WHERE capture_attempt_id=a.id)=json_array_length(a.payload_json,'$.facts') AND NOT EXISTS(SELECT 1 FROM json_each(a.payload_json,'$.facts') j WHERE NOT EXISTS( SELECT 1 FROM memory_data_fact_links l JOIN facts f ON f.id=l.fact_id WHERE l.attempt_id=a.id AND l.ordinal=j.key AND l.fact_json=j.value AND l.machine_id=json_extract(a.payload_json,'$.machineId') AND f.owner_principal_id=l.machine_id AND f.capture_attempt_id=a.id AND f.capture_ordinal=j.key AND f.slug=json_extract(j.value,'$.slug') AND f.type=json_extract(j.value,'$.type') AND f.body=json_extract(j.value,'$.body') AND f.session_id=json_extract(a.payload_json,'$.session.id') AND f.source=json_extract(a.payload_json,'$.source') AND f.source IN ('save','backfill','consolidation') AND f.author=l.machine_id AND f.created_at=json_extract(a.payload_json,'$.session.updatedAt') AND f.shared=CASE WHEN json_extract(a.payload_json,'$.visibility')='shared' AND f.type NOT IN ('user','feedback') THEN 1 ELSE 0 END AND (SELECT count(*) FROM fact_tags WHERE fact_id=f.id)=json_array_length(j.value,'$.tags') AND (SELECT count(*) FROM memory_data_tag_links WHERE attempt_id=a.id AND ordinal=j.key)=json_array_length(j.value,'$.tags') AND NOT EXISTS(SELECT 1 FROM json_each(j.value,'$.tags') t WHERE NOT EXISTS(SELECT 1 FROM fact_tags ft JOIN memory_data_tag_links tl ON tl.tag=ft.tag AND tl.attempt_id=a.id AND tl.ordinal=j.key WHERE ft.fact_id=f.id AND ft.tag=t.value)))) AND (SELECT count(*) FROM memory_data_supersedes WHERE attempt_id=a.id)=(SELECT coalesce(sum(json_array_length(j.value,'$.supersedes')),0) FROM json_each(a.payload_json,'$.facts') j) AND NOT EXISTS(SELECT 1 FROM json_each(a.payload_json,'$.facts') j JOIN json_each(j.value,'$.supersedes') old WHERE NOT EXISTS( SELECT 1 FROM memory_data_supersedes x JOIN memory_data_fact_links l ON l.attempt_id=x.attempt_id AND l.ordinal=x.ordinal JOIN facts f ON f.id=x.old_fact_id WHERE x.attempt_id=a.id AND x.ordinal=j.key AND x.old_fact_id=old.value AND x.new_fact_id=l.fact_id AND f.superseded_by=x.new_fact_id AND (f.owner_principal_id=x.machine_id OR EXISTS(SELECT 1 FROM memory_machine_principals admin JOIN memory_machine_principals owner ON owner.id=f.owner_principal_id AND owner.installation_id=admin.installation_id AND owner.repository_id=admin.repository_id WHERE admin.id=x.machine_id AND admin.status='active' AND admin.scope='memory:read memory:write memory:admin')) AND x.machine_id=json_extract(a.payload_json,'$.machineId') AND f.id IN (SELECT oldlink.fact_id FROM memory_data_fact_links oldlink JOIN memory_data_attempts olda ON olda.id=oldlink.attempt_id WHERE olda.installation_id=a.installation_id))) AND ((json_type(a.payload_json,'$.session')='null' AND NOT EXISTS(SELECT 1 FROM memory_data_session_events WHERE attempt_id=a.id)) OR EXISTS( SELECT 1 FROM memory_data_session_events e JOIN sessions sess ON sess.id=e.session_id JOIN memory_data_session_owners o ON o.session_id=sess.id WHERE e.attempt_id=a.id AND e.session_json=json_extract(a.payload_json,'$.session') AND e.session_id=json_extract(a.payload_json,'$.session.id') AND e.machine_id=json_extract(a.payload_json,'$.machineId') AND o.machine_id=e.machine_id AND o.installation_id=a.installation_id AND o.repository_id=json_extract(a.payload_json,'$.repositoryId') AND sess.owner_principal_id=e.machine_id AND e.previous_cursor IS json_extract(a.payload_json,'$.session.previousCursor') AND e.next_cursor IS json_extract(a.payload_json,'$.session.nextCursor') AND sess.read_through IS e.next_cursor AND sess.capture_attempt_id=a.id AND sess.status=json_extract(a.payload_json,'$.session.status') AND sess.reason IS json_extract(a.payload_json,'$.session.reason') AND sess.agent=json_extract(a.payload_json,'$.session.agent') AND sess.updated_at=json_extract(a.payload_json,'$.session.updatedAt') AND sess.branch IS json_extract(a.payload_json,'$.session.branch') AND sess.cwd IS json_extract(a.payload_json,'$.session.cwd') AND sess.started_at IS json_extract(a.payload_json,'$.session.startedAt') AND sess.ended_at IS json_extract(a.payload_json,'$.session.endedAt'))) AND ((json_type(a.payload_json,'$.run')='null' AND NOT EXISTS(SELECT 1 FROM memory_data_runs WHERE attempt_id=a.id)) OR EXISTS( SELECT 1 FROM memory_data_runs l JOIN runs r ON r.id=l.run_id WHERE l.attempt_id=a.id AND r.capture_attempt_id=a.id AND l.run_json=json_extract(a.payload_json,'$.run') AND r.kind='capture' AND r.host=json_extract(a.payload_json,'$.machineId') AND r.started_at=json_extract(a.payload_json,'$.run.startedAt') AND r.finished_at=json_extract(a.payload_json,'$.run.finishedAt') AND r.status='ok' AND r.counts=json_extract(a.payload_json,'$.run.counts') AND json_extract(r.counts,'$.added')=json_array_length(a.payload_json,'$.facts') AND json_extract(r.counts,'$.superseded')=(SELECT count(*) FROM memory_data_supersedes WHERE attempt_id=a.id) AND json_extract(r.counts,'$.captured')=CASE WHEN json_type(a.payload_json,'$.session')='null' THEN 0 ELSE 1 END))"
 },
 "memory_data_verified_deployments": {
  "type": "view",
  "sql": "CREATE VIEW memory_data_verified_deployments AS SELECT a.id,json_object('action','deployment','attemptId',a.id,'predecessorId',x.predecessor_id,'pinHash',x.pin_hash,'reviewHash',x.review_hash) outcome_json FROM memory_data_live_attempts a JOIN memory_data_deployments x ON x.attempt_id=a.id JOIN memory_data_bootstrap b USING(installation_id) WHERE a.action='deployment' AND x.predecessor_id=json_extract(a.payload_json,'$.predecessorId') AND x.previous_pin_hash=json_extract(a.payload_json,'$.previousPinHash') AND x.pin_hash=json_extract(a.payload_json,'$.pinHash') AND x.evidence_json=json_extract(a.payload_json,'$.evidence') AND x.review_hash=json_extract(a.payload_json,'$.reviewHash') AND x.protocol_hash=json_extract(a.payload_json,'$.protocolHash') AND x.protocol_hash='df18cc2f36acc77853d71052acf562d851dac20f840ded5c2bfc85338421a7cf' AND x.route_contract_hash='b79fb3c35e3bd32ff6689f4c29c9472ee552ff2a1cbc7c12bd53f92f083c6464' AND x.route_contract_hash=json_extract(a.payload_json,'$.routeContractHash') AND x.rollback=json_extract(a.payload_json,'$.rollback') AND json_extract(x.evidence_json,'$.identity')=json_extract(b.genesis_json,'$.evidence.identity') AND json_extract(x.evidence_json,'$.targetJson')=json_extract(b.genesis_json,'$.targetJson') AND x.pin_hash=json_extract(x.evidence_json,'$.pinHash') AND x.pin_hash!=x.previous_pin_hash AND ((x.predecessor_id=b.operation_id AND x.previous_pin_hash=json_extract(b.genesis_json,'$.pinHash')) OR EXISTS( SELECT 1 FROM memory_data_deployments previous JOIN memory_data_completions done ON done.attempt_id=previous.attempt_id WHERE previous.attempt_id=x.predecessor_id AND previous.pin_hash=x.previous_pin_hash)) AND NOT EXISTS(SELECT 1 FROM memory_data_session_events WHERE attempt_id=a.id) AND NOT EXISTS(SELECT 1 FROM memory_data_fact_links WHERE attempt_id=a.id) AND NOT EXISTS(SELECT 1 FROM memory_data_runs WHERE attempt_id=a.id)"
 },
 "memory_data_outcome_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_outcome_guard BEFORE INSERT ON memory_data_outcomes WHEN NOT EXISTS(SELECT 1 FROM (SELECT * FROM memory_data_verified_captures UNION ALL SELECT * FROM memory_data_verified_deployments) v WHERE v.id=NEW.attempt_id AND v.outcome_json=NEW.outcome_json) BEGIN SELECT RAISE(ABORT,'outcome requires current barrier'); END"
 },
 "memory_data_audit_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_audit_guard BEFORE INSERT ON memory_data_audit WHEN NOT EXISTS(SELECT 1 FROM memory_data_live_attempts a JOIN memory_data_outcomes o ON o.attempt_id=a.id JOIN (SELECT * FROM memory_data_verified_captures UNION ALL SELECT * FROM memory_data_verified_deployments) v ON v.id=a.id AND v.outcome_json=o.outcome_json WHERE a.id=NEW.attempt_id AND a.audit_id=NEW.id AND a.request_hash=NEW.request_hash) BEGIN SELECT RAISE(ABORT,'audit requires exact outcome'); END"
 },
 "memory_data_completion_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_completion_guard BEFORE INSERT ON memory_data_completions WHEN NOT EXISTS(SELECT 1 FROM memory_data_live_attempts a JOIN memory_data_outcomes o ON o.attempt_id=a.id JOIN (SELECT * FROM memory_data_verified_captures UNION ALL SELECT * FROM memory_data_verified_deployments) v ON v.id=a.id AND v.outcome_json=o.outcome_json JOIN memory_data_audit audit ON audit.id=a.audit_id AND audit.attempt_id=a.id AND audit.request_hash=a.request_hash WHERE a.id=NEW.attempt_id AND a.audit_id=NEW.audit_id AND a.request_hash=NEW.request_hash AND NEW.revision=a.revision+1 AND NEW.outcome_json=o.outcome_json) BEGIN SELECT RAISE(ABORT,'completion requires exact outcome'); END"
 },
 "memory_data_completion_release": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_completion_release AFTER INSERT ON memory_data_completions BEGIN UPDATE memory_data_configuration SET state='pending',barrier_attempt_id=NULL WHERE installation_id=(SELECT installation_id FROM memory_data_attempts WHERE id=NEW.attempt_id) AND barrier_attempt_id=NEW.attempt_id; END"
 },
 "memory_data_session_events_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_session_events_guard BEFORE INSERT ON memory_data_session_events WHEN NOT EXISTS(SELECT 1 FROM memory_data_capture_authority WHERE id=NEW.attempt_id) BEGIN SELECT RAISE(ABORT,'data row requires current attempt'); END"
 },
 "memory_data_fact_links_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_fact_links_guard BEFORE INSERT ON memory_data_fact_links WHEN NOT EXISTS(SELECT 1 FROM memory_data_capture_authority WHERE id=NEW.attempt_id) BEGIN SELECT RAISE(ABORT,'data row requires current attempt'); END"
 },
 "memory_data_tag_links_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_tag_links_guard BEFORE INSERT ON memory_data_tag_links WHEN NOT EXISTS(SELECT 1 FROM memory_data_capture_authority WHERE id=NEW.attempt_id) BEGIN SELECT RAISE(ABORT,'data row requires current attempt'); END"
 },
 "memory_data_supersedes_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_supersedes_guard BEFORE INSERT ON memory_data_supersedes WHEN NOT EXISTS(SELECT 1 FROM memory_data_capture_authority WHERE id=NEW.attempt_id) BEGIN SELECT RAISE(ABORT,'data row requires current attempt'); END"
 },
 "memory_data_runs_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_runs_guard BEFORE INSERT ON memory_data_runs WHEN NOT EXISTS(SELECT 1 FROM memory_data_capture_authority WHERE id=NEW.attempt_id) BEGIN SELECT RAISE(ABORT,'data row requires current attempt'); END"
 },
 "memory_data_deployments_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_deployments_guard BEFORE INSERT ON memory_data_deployments WHEN NOT EXISTS(SELECT 1 FROM memory_data_live_attempts WHERE id=NEW.attempt_id) BEGIN SELECT RAISE(ABORT,'data row requires current attempt'); END"
 },
 "memory_data_bootstrap_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_bootstrap_immutable BEFORE UPDATE ON memory_data_bootstrap BEGIN SELECT RAISE(ABORT,'data bootstrap immutable'); END"
 },
 "memory_data_bootstrap_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_bootstrap_retained BEFORE DELETE ON memory_data_bootstrap BEGIN SELECT RAISE(ABORT,'data bootstrap retained'); END"
 },
 "memory_data_attempts_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_attempts_immutable BEFORE UPDATE ON memory_data_attempts BEGIN SELECT RAISE(ABORT,'data attempts immutable'); END"
 },
 "memory_data_attempts_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_attempts_retained BEFORE DELETE ON memory_data_attempts BEGIN SELECT RAISE(ABORT,'data attempts retained'); END"
 },
 "memory_data_session_owners_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_session_owners_immutable BEFORE UPDATE ON memory_data_session_owners BEGIN SELECT RAISE(ABORT,'data session_owners immutable'); END"
 },
 "memory_data_session_owners_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_session_owners_retained BEFORE DELETE ON memory_data_session_owners BEGIN SELECT RAISE(ABORT,'data session_owners retained'); END"
 },
 "memory_data_session_events_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_session_events_immutable BEFORE UPDATE ON memory_data_session_events BEGIN SELECT RAISE(ABORT,'data session_events immutable'); END"
 },
 "memory_data_session_events_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_session_events_retained BEFORE DELETE ON memory_data_session_events BEGIN SELECT RAISE(ABORT,'data session_events retained'); END"
 },
 "memory_data_fact_links_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_fact_links_immutable BEFORE UPDATE ON memory_data_fact_links BEGIN SELECT RAISE(ABORT,'data fact_links immutable'); END"
 },
 "memory_data_fact_links_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_fact_links_retained BEFORE DELETE ON memory_data_fact_links BEGIN SELECT RAISE(ABORT,'data fact_links retained'); END"
 },
 "memory_data_tag_links_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_tag_links_immutable BEFORE UPDATE ON memory_data_tag_links BEGIN SELECT RAISE(ABORT,'data tag_links immutable'); END"
 },
 "memory_data_tag_links_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_tag_links_retained BEFORE DELETE ON memory_data_tag_links BEGIN SELECT RAISE(ABORT,'data tag_links retained'); END"
 },
 "memory_data_supersedes_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_supersedes_immutable BEFORE UPDATE ON memory_data_supersedes BEGIN SELECT RAISE(ABORT,'data supersedes immutable'); END"
 },
 "memory_data_supersedes_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_supersedes_retained BEFORE DELETE ON memory_data_supersedes BEGIN SELECT RAISE(ABORT,'data supersedes retained'); END"
 },
 "memory_data_runs_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_runs_immutable BEFORE UPDATE ON memory_data_runs BEGIN SELECT RAISE(ABORT,'data runs immutable'); END"
 },
 "memory_data_runs_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_runs_retained BEFORE DELETE ON memory_data_runs BEGIN SELECT RAISE(ABORT,'data runs retained'); END"
 },
 "memory_data_deployments_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_deployments_immutable BEFORE UPDATE ON memory_data_deployments BEGIN SELECT RAISE(ABORT,'data deployments immutable'); END"
 },
 "memory_data_deployments_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_deployments_retained BEFORE DELETE ON memory_data_deployments BEGIN SELECT RAISE(ABORT,'data deployments retained'); END"
 },
 "memory_data_outcomes_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_outcomes_immutable BEFORE UPDATE ON memory_data_outcomes BEGIN SELECT RAISE(ABORT,'data outcomes immutable'); END"
 },
 "memory_data_outcomes_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_outcomes_retained BEFORE DELETE ON memory_data_outcomes BEGIN SELECT RAISE(ABORT,'data outcomes retained'); END"
 },
 "memory_data_audit_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_audit_immutable BEFORE UPDATE ON memory_data_audit BEGIN SELECT RAISE(ABORT,'data audit immutable'); END"
 },
 "memory_data_audit_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_audit_retained BEFORE DELETE ON memory_data_audit BEGIN SELECT RAISE(ABORT,'data audit retained'); END"
 },
 "memory_data_completions_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_completions_immutable BEFORE UPDATE ON memory_data_completions BEGIN SELECT RAISE(ABORT,'data completions immutable'); END"
 },
 "memory_data_completions_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_completions_retained BEFORE DELETE ON memory_data_completions BEGIN SELECT RAISE(ABORT,'data completions retained'); END"
 },
 "memory_data_configuration_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_configuration_retained BEFORE DELETE ON memory_data_configuration BEGIN SELECT RAISE(ABORT,'data configuration retained'); END"
 },
 "memory_data_tag_definitions_guard": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_tag_definitions_guard BEFORE INSERT ON memory_data_tag_definitions WHEN NOT EXISTS(SELECT 1 FROM memory_data_capture_authority a JOIN json_each(a.payload_json,'$.newTags') j WHERE a.id=NEW.attempt_id AND NEW.name=json_extract(j.value,'$.name') AND NEW.tag_json=j.value) BEGIN SELECT RAISE(ABORT,'tag definition requires exact capture'); END"
 },
 "memory_data_tag_definitions_immutable": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_tag_definitions_immutable BEFORE UPDATE ON memory_data_tag_definitions BEGIN SELECT RAISE(ABORT,'tag definitions immutable'); END"
 },
 "memory_data_tag_definitions_retained": {
  "type": "trigger",
  "sql": "CREATE TRIGGER memory_data_tag_definitions_retained BEFORE DELETE ON memory_data_tag_definitions BEGIN SELECT RAISE(ABORT,'tag definitions retained'); END"
 }
};
export const coreProtectionDdl=Object.freeze(Object.fromEntries(Object.entries(protectionSource).map(([name,row])=>[name,{...row,sql:normalizeCoreDdl(row.sql)}])));
export const coreTableColumns = Object.freeze({
 "schema_migrations": [
  "version",
  "applied_at"
 ],
 "sessions": [
  "id",
  "agent",
  "author",
  "machine",
  "branch",
  "cwd",
  "started_at",
  "ended_at",
  "status",
  "reason",
  "read_through",
  "raw_key",
  "raw_bytes",
  "updated_at"
 ],
 "facts": [
  "id",
  "slug",
  "type",
  "body",
  "session_id",
  "source",
  "created_at",
  "author",
  "superseded_by"
 ],
 "tags": [
  "name",
  "definition",
  "alias_of",
  "created_by",
  "created_at"
 ],
 "fact_tags": [
  "fact_id",
  "tag"
 ],
 "runs": [
  "id",
  "kind",
  "host",
  "started_at",
  "finished_at",
  "status",
  "reason",
  "counts"
 ],
 "memory_keys": [
  "hash",
  "email",
  "role",
  "created_at"
 ],
 "memory_admins": [
  "github_id",
  "login",
  "email",
  "created_at"
 ],
 "memory_installation": [
  "singleton",
  "installation_id",
  "repository_id",
  "account_id",
  "database_id",
  "bucket_name",
  "canonical_origin",
  "state",
  "minimum_protocol",
  "auth_revision",
  "created_at"
 ],
 "memory_principals": [
  "id",
  "installation_id",
  "status",
  "created_at"
 ],
 "memory_providers": [
  "id",
  "installation_id",
  "issuer",
  "audience",
  "status",
  "created_at"
 ],
 "memory_identity_bindings": [
  "id",
  "installation_id",
  "provider_id",
  "principal_id",
  "issuer",
  "subject",
  "verified_email",
  "status",
  "created_at",
  "updated_at",
  "replaces_binding_id",
  "evidence_ref"
 ],
 "memory_memberships": [
  "installation_id",
  "repository_id",
  "principal_id",
  "role",
  "status",
  "revision",
  "created_at",
  "updated_at"
 ],
 "memory_invitations": [
  "id",
  "repository_id",
  "email",
  "role",
  "actor_principal_id",
  "consumed_principal_id",
  "state",
  "created_at",
  "expires_at"
 ],
 "memory_owner_intents": [
  "installation_id",
  "provider_id",
  "email",
  "state",
  "owner_principal_id",
  "created_at"
 ],
 "memory_login_candidates": [
  "id",
  "installation_id",
  "provider_id",
  "issuer",
  "subject",
  "verified_email",
  "code_hash",
  "purpose",
  "state",
  "consumed_principal_id",
  "created_at",
  "expires_at"
 ],
 "memory_device_requests": [
  "id",
  "installation_id",
  "repository_id",
  "nonce_hash",
  "secret_hash",
  "credential_hash",
  "comparison_code",
  "label",
  "scope",
  "state",
  "principal_id",
  "membership_revision",
  "approved_at",
  "created_at",
  "expires_at",
  "poll_after",
  "early_polls"
 ],
 "memory_devices": [
  "id",
  "request_id",
  "installation_id",
  "repository_id",
  "principal_id",
  "label",
  "scope",
  "status",
  "generation",
  "membership_revision",
  "approved_at",
  "reauthorize_at",
  "last_used_at",
  "revoked_at"
 ],
 "memory_credentials": [
  "hash",
  "device_id",
  "generation",
  "issued_at",
  "expires_at"
 ],
 "memory_csrf_proofs": [
  "hash",
  "installation_id",
  "provider_id",
  "issuer",
  "subject",
  "binding_id",
  "session_hash",
  "membership_revision",
  "created_at",
  "expires_at"
 ],
 "memory_quotas": [
  "installation_id",
  "kind",
  "key_hash",
  "window_start",
  "count",
  "expires_at"
 ],
 "memory_audit": [
  "id",
  "installation_id",
  "actor_principal_id",
  "actor_kind",
  "action",
  "target_id",
  "result",
  "created_at"
 ],
 "memory_ownership_mappings": [
  "id",
  "installation_id",
  "principal_id",
  "actor_principal_id",
  "fact_id",
  "session_id",
  "raw_key",
  "evidence_type",
  "evidence_ref",
  "snapshot_hash",
  "supersedes",
  "created_at"
 ],
 "memory_legacy_evidence": [
  "id",
  "installation_id",
  "kind",
  "evidence_ref",
  "snapshot_hash",
  "created_at"
 ],
 "memory_identity_reviews": [
  "id",
  "installation_id",
  "actor_principal_id",
  "target_principal_id",
  "binding_id",
  "candidate_id",
  "outcome",
  "evidence_ref",
  "created_at"
 ],
 "memory_installation_configuration": [
  "installation_id",
  "app_origin",
  "memory_origin",
  "app_worker_name",
  "memory_worker_name",
  "operation_id",
  "request_hash",
  "owner_email",
  "access_json",
  "pin_revision",
  "created_at"
 ],
 "memory_bootstrap_completion": [
  "installation_id",
  "request_hash",
  "audit_id"
 ],
 "memory_schema_receipts": [
  "installation_id",
  "repository_id",
  "schema_version",
  "manifest_hash",
  "request_hash",
  "audit_id",
  "created_at"
 ],
 "memory_owner_reviews": [
  "id",
  "installation_id",
  "candidate_id",
  "snapshot_hash",
  "target_hash",
  "protection_hash",
  "code_hash",
  "auth_revision",
  "pin_revision",
  "state",
  "consumed_attempt_id",
  "created_at",
  "expires_at",
  "UNIQUE(candidate_id,",
  "CHECK((state"
 ],
 "memory_owner_attempts": [
  "id",
  "installation_id",
  "review_id",
  "request_hash",
  "principal_id",
  "binding_id",
  "audit_id",
  "created_at"
 ],
 "memory_owner_completions": [
  "attempt_id",
  "installation_id",
  "review_id",
  "principal_id",
  "binding_id",
  "audit_id",
  "created_at"
 ],
 "memory_machine_configuration": [
  "installation_id",
  "repository_id",
  "target_json",
  "pin_hash",
  "pin_revision",
  "auth_revision",
  "state",
  "barrier_attempt_id",
  "operation_id",
  "request_hash",
  "created_at",
  "CHECK((state"
 ],
 "memory_machine_audit": [
  "id",
  "installation_id",
  "attempt_id",
  "action",
  "target_id",
  "request_hash",
  "created_at"
 ],
 "memory_machine_manifest_receipts": [
  "installation_id",
  "repository_id",
  "schema_version",
  "manifest_hash",
  "request_hash",
  "audit_id"
 ],
 "memory_machine_bootstrap_completions": [
  "installation_id",
  "operation_id",
  "request_hash",
  "pin_hash",
  "audit_id"
 ],
 "memory_machine_attempts": [
  "id",
  "installation_id",
  "action",
  "target_id",
  "request_hash",
  "payload_json",
  "snapshot_hash",
  "pin_hash",
  "pin_revision",
  "auth_revision",
  "audit_id",
  "created_at"
 ],
 "memory_machine_grants": [
  "id",
  "installation_id",
  "repository_id",
  "commitment",
  "secret_hash",
  "scope",
  "state",
  "revision",
  "issued_attempt_id",
  "consumed_attempt_id",
  "machine_id",
  "created_at",
  "expires_at",
  "CHECK((consumed_attempt_id",
  "CHECK(state"
 ],
 "memory_machine_principals": [
  "id",
  "installation_id",
  "repository_id",
  "commitment",
  "grant_id",
  "scope",
  "status",
  "revision",
  "enrollment_attempt_id",
  "created_at"
 ],
 "memory_machine_credentials": [
  "hash",
  "machine_id",
  "grant_revision",
  "machine_revision",
  "attempt_id",
  "issued_at",
  "expires_at"
 ],
 "memory_machine_completions": [
  "attempt_id",
  "installation_id",
  "request_hash",
  "audit_id",
  "auth_revision",
  "created_at"
 ],
 "memory_runtime_configuration": [
  "installation_id",
  "repository_id",
  "target_json",
  "baseline_hash",
  "baseline_request_hash",
  "baseline_audit_id",
  "pin_hash",
  "operation_id",
  "request_hash",
  "upgrade_expected_json",
  "runtime_revision",
  "state",
  "barrier_attempt_id",
  "created_at",
  "CHECK((state='maintenance')=(barrier_attempt_id"
 ],
 "memory_runtime_manifests": [
  "installation_id",
  "repository_id",
  "schema_version",
  "manifest_hash",
  "baseline_hash",
  "request_hash",
  "audit_id"
 ],
 "memory_runtime_bootstrap": [
  "installation_id",
  "operation_id",
  "request_hash",
  "baseline_hash",
  "audit_id"
 ],
 "memory_runtime_attempts": [
  "id",
  "installation_id",
  "action",
  "target_id",
  "request_hash",
  "payload_json",
  "snapshot_hash",
  "baseline_hash",
  "pin_hash",
  "pin_revision",
  "auth_revision",
  "runtime_revision",
  "audit_id",
  "created_at"
 ],
 "memory_runtime_audit": [
  "id",
  "installation_id",
  "attempt_id",
  "action",
  "target_id",
  "request_hash",
  "created_at"
 ],
 "memory_runtime_completions": [
  "attempt_id",
  "installation_id",
  "request_hash",
  "audit_id",
  "auth_revision",
  "runtime_revision",
  "created_at"
 ],
 "memory_runtime_proofs": [
  "nonce_hash",
  "attempt_id",
  "machine_id",
  "grant_id",
  "commitment",
  "proof_hash",
  "deadline",
  "created_at",
  "CHECK(deadline>created_at"
 ],
 "memory_runtime_keys": [
  "machine_id",
  "commitment",
  "public_key_json",
  "attempt_id"
 ],
 "memory_runtime_rotations": [
  "hash",
  "machine_id",
  "grant_id",
  "generation",
  "previous_hash",
  "overlap_until",
  "scope",
  "grant_revision",
  "machine_revision",
  "issued_at",
  "expires_at",
  "attempt_id",
  "UNIQUE(machine_id,generation)",
  "CHECK(overlap_until>=issued_at"
 ],
 "memory_runtime_transcripts": [
  "attempt_id",
  "machine_id",
  "object_hash",
  "session_hash",
  "content_hash",
  "visibility",
  "event",
  "stage_attempt_id",
  "auth_revision",
  "grant_revision",
  "machine_revision",
  "credential_generation",
  "created_at",
  "UNIQUE(object_hash,event)",
  "CHECK((event='published')=(stage_attempt_id"
 ],
 "memory_runtime_activations": [
  "attempt_id",
  "installation_id",
  "baseline_hash",
  "pin_hash",
  "protocol_hash",
  "route_contract_hash",
  "auth_revision",
  "created_at"
 ],
 "memory_data_configuration": [
  "installation_id",
  "repository_id",
  "operation_id",
  "request_hash",
  "manifest_hash",
  "schema_hash",
  "baseline_hash",
  "original_pin_hash",
  "expected_json",
  "revision",
  "state",
  "barrier_attempt_id",
  "CHECK((state='maintenance')=(barrier_attempt_id"
 ],
 "memory_data_bootstrap": [
  "installation_id",
  "operation_id",
  "request_hash",
  "genesis_json"
 ],
 "memory_data_attempts": [
  "id",
  "installation_id",
  "action",
  "request_hash",
  "payload_json",
  "expected_json",
  "revision",
  "audit_id",
  "nonce_hash",
  "proof_hash",
  "deadline",
  "created_at",
  "CHECK((action='capture')=(nonce_hash",
  "CHECK(action!='capture'"
 ],
 "memory_data_session_owners": [
  "session_id",
  "installation_id",
  "repository_id",
  "machine_id"
 ],
 "memory_data_session_events": [
  "attempt_id",
  "session_id",
  "machine_id",
  "previous_cursor",
  "next_cursor",
  "session_json"
 ],
 "memory_data_fact_links": [
  "attempt_id",
  "ordinal",
  "fact_id",
  "machine_id",
  "fact_json"
 ],
 "memory_data_tag_definitions": [
  "attempt_id",
  "name",
  "tag_json"
 ],
 "memory_data_tag_links": [
  "attempt_id",
  "ordinal",
  "tag"
 ],
 "memory_data_supersedes": [
  "attempt_id",
  "old_fact_id",
  "ordinal",
  "new_fact_id",
  "machine_id"
 ],
 "memory_data_runs": [
  "attempt_id",
  "run_id",
  "run_json"
 ],
 "memory_data_deployments": [
  "attempt_id",
  "predecessor_id",
  "previous_pin_hash",
  "pin_hash",
  "evidence_json",
  "review_hash",
  "protocol_hash",
  "route_contract_hash",
  "rollback"
 ],
 "memory_data_outcomes": [
  "attempt_id",
  "outcome_json"
 ],
 "memory_data_audit": [
  "id",
  "attempt_id",
  "request_hash"
 ],
 "memory_data_completions": [
  "attempt_id",
  "request_hash",
  "audit_id",
  "revision",
  "outcome_json"
 ]
});
