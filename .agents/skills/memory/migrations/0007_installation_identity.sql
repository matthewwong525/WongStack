-- Additive preparation only: no installation is activated and no legacy authority is retired here.
-- The operator supplies random IDs and verified resource/provider configuration in later setup steps.
CREATE TABLE IF NOT EXISTS memory_installation (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  installation_id TEXT NOT NULL UNIQUE CHECK (length(installation_id) >= 32),
  repository_id TEXT NOT NULL UNIQUE CHECK (length(repository_id) >= 32),
  account_id TEXT NOT NULL,
  database_id TEXT NOT NULL,
  bucket_name TEXT,
  canonical_origin TEXT NOT NULL CHECK (canonical_origin LIKE 'https://%'),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'maintenance', 'ready')),
  minimum_protocol INTEGER NOT NULL DEFAULT 1 CHECK (minimum_protocol >= 1),
  auth_revision INTEGER NOT NULL DEFAULT 1 CHECK (auth_revision >= 1),
  created_at INTEGER NOT NULL,
  UNIQUE (installation_id, repository_id)
);
CREATE TABLE IF NOT EXISTS memory_principals (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) >= 32),
  installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_at INTEGER NOT NULL,
  UNIQUE (installation_id, id)
);
CREATE TABLE IF NOT EXISTS memory_providers (
  id TEXT PRIMARY KEY NOT NULL,
  installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id),
  issuer TEXT NOT NULL,
  audience TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'retired')),
  created_at INTEGER NOT NULL,
  UNIQUE (installation_id, id),
  UNIQUE (installation_id, id, issuer),
  UNIQUE (installation_id, issuer, audience)
);
CREATE TABLE IF NOT EXISTS memory_identity_bindings (
  id TEXT PRIMARY KEY NOT NULL,
  installation_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (length(trim(subject)) > 0),
  verified_email TEXT NOT NULL CHECK (length(verified_email) > 3),
  status TEXT NOT NULL CHECK (status IN ('active', 'review', 'retired')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  replaces_binding_id TEXT UNIQUE REFERENCES memory_identity_bindings (id),
  evidence_ref TEXT,
  FOREIGN KEY (installation_id, provider_id, issuer) REFERENCES memory_providers (installation_id, id, issuer),
  FOREIGN KEY (installation_id, principal_id) REFERENCES memory_principals (installation_id, id),
  CHECK ((replaces_binding_id IS NULL) = (evidence_ref IS NULL)),
  CHECK (evidence_ref IS NULL OR length(trim(evidence_ref)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS memory_current_binding
ON memory_identity_bindings (installation_id, provider_id, issuer, subject) WHERE status != 'retired';
CREATE TABLE IF NOT EXISTS memory_memberships (
  installation_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'reader')),
  status TEXT NOT NULL CHECK (status IN ('active', 'removed')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (repository_id, principal_id),
  FOREIGN KEY (installation_id, repository_id) REFERENCES memory_installation (installation_id, repository_id),
  FOREIGN KEY (installation_id, principal_id) REFERENCES memory_principals (installation_id, id)
);
CREATE TABLE IF NOT EXISTS memory_invitations (
  id TEXT PRIMARY KEY NOT NULL,
  repository_id TEXT NOT NULL REFERENCES memory_installation (repository_id),
  email TEXT NOT NULL CHECK (email = lower(trim(email)) AND length(email) > 3),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'reader')),
  actor_principal_id TEXT NOT NULL REFERENCES memory_principals (id),
  consumed_principal_id TEXT REFERENCES memory_principals (id),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'consumed', 'revoked', 'expired')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + 604800),
  CHECK ((state = 'consumed') = (consumed_principal_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS memory_pending_invitation ON memory_invitations (repository_id, email) WHERE state = 'pending';
CREATE TABLE IF NOT EXISTS memory_owner_intents (
  installation_id TEXT PRIMARY KEY NOT NULL REFERENCES memory_installation (installation_id),
  provider_id TEXT NOT NULL REFERENCES memory_providers (id),
  email TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'consumed')),
  owner_principal_id TEXT REFERENCES memory_principals (id),
  created_at INTEGER NOT NULL,
  CHECK ((state = 'consumed') = (owner_principal_id IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS memory_login_candidates (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) >= 32),
  installation_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (length(trim(subject)) > 0),
  verified_email TEXT NOT NULL,
  code_hash TEXT NOT NULL CHECK (length(code_hash) = 64 AND code_hash NOT GLOB '*[^0-9a-f]*'),
  purpose TEXT NOT NULL CHECK (purpose IN ('owner', 'recovery', 'link')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'consumed', 'expired', 'revoked')),
  consumed_principal_id TEXT REFERENCES memory_principals (id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + 600),
  FOREIGN KEY (installation_id, provider_id) REFERENCES memory_providers (installation_id, id),
  CHECK ((state = 'consumed') = (consumed_principal_id IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS memory_device_requests (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) >= 32),
  installation_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  nonce_hash TEXT NOT NULL UNIQUE CHECK (length(nonce_hash) = 64 AND nonce_hash NOT GLOB '*[^0-9a-f]*'),
  secret_hash TEXT NOT NULL CHECK (length(secret_hash) = 64 AND secret_hash NOT GLOB '*[^0-9a-f]*'),
  credential_hash TEXT NOT NULL UNIQUE CHECK (length(credential_hash) = 64 AND credential_hash NOT GLOB '*[^0-9a-f]*'),
  comparison_code TEXT NOT NULL CHECK (length(comparison_code) = 8),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 100),
  scope TEXT NOT NULL CHECK (scope IN ('memory:read', 'memory:read memory:write', 'memory:read memory:write memory:admin')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'approved', 'claimed', 'denied', 'expired', 'revoked')),
  principal_id TEXT,
  membership_revision INTEGER,
  approved_at INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + 600),
  poll_after INTEGER NOT NULL DEFAULT 0,
  early_polls INTEGER NOT NULL DEFAULT 0 CHECK (early_polls >= 0),
  FOREIGN KEY (installation_id, repository_id) REFERENCES memory_installation (installation_id, repository_id),
  FOREIGN KEY (repository_id, principal_id) REFERENCES memory_memberships (repository_id, principal_id),
  CHECK ((principal_id IS NULL) = (membership_revision IS NULL)),
  CHECK (state NOT IN ('approved', 'claimed') OR (principal_id IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS memory_requests_expiry ON memory_device_requests (expires_at);
CREATE INDEX IF NOT EXISTS memory_requests_principal ON memory_device_requests (principal_id, state);
CREATE TABLE IF NOT EXISTS memory_devices (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) >= 32),
  request_id TEXT NOT NULL UNIQUE, -- durable receipt; the request may be pruned after 24 hours
  installation_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 100),
  scope TEXT NOT NULL CHECK (scope IN ('memory:read', 'memory:read memory:write', 'memory:read memory:write memory:admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  generation INTEGER NOT NULL DEFAULT 1 CHECK (generation >= 1),
  membership_revision INTEGER NOT NULL CHECK (membership_revision >= 1),
  approved_at INTEGER NOT NULL,
  reauthorize_at INTEGER NOT NULL CHECK (reauthorize_at > approved_at AND reauthorize_at <= approved_at + 7776000),
  last_used_at INTEGER,
  revoked_at INTEGER,
  FOREIGN KEY (installation_id, repository_id) REFERENCES memory_installation (installation_id, repository_id),
  FOREIGN KEY (repository_id, principal_id) REFERENCES memory_memberships (repository_id, principal_id),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS memory_devices_principal ON memory_devices (principal_id, status);
CREATE TABLE IF NOT EXISTS memory_credentials (
  hash TEXT PRIMARY KEY NOT NULL CHECK (length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'),
  device_id TEXT NOT NULL REFERENCES memory_devices (id),
  generation INTEGER NOT NULL CHECK (generation >= 1),
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > issued_at AND expires_at <= issued_at + 2592000),
  UNIQUE (device_id, generation)
);
CREATE TABLE IF NOT EXISTS memory_csrf_proofs (
  hash TEXT PRIMARY KEY NOT NULL CHECK (length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'),
  installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id),
  provider_id TEXT NOT NULL,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (length(trim(subject)) > 0),
  binding_id TEXT REFERENCES memory_identity_bindings (id),
  session_hash TEXT NOT NULL CHECK (length(session_hash) = 64 AND session_hash NOT GLOB '*[^0-9a-f]*'),
  membership_revision INTEGER CHECK (membership_revision >= 1),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + 600),
  FOREIGN KEY (installation_id, provider_id, issuer) REFERENCES memory_providers (installation_id, id, issuer)
);
CREATE INDEX IF NOT EXISTS memory_csrf_expiry ON memory_csrf_proofs (expires_at);
CREATE TABLE IF NOT EXISTS memory_quotas (
  installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id),
  kind TEXT NOT NULL CHECK (kind IN ('start-install', 'start-ip', 'poll')),
  key_hash TEXT NOT NULL CHECK (length(key_hash) = 64 AND key_hash NOT GLOB '*[^0-9a-f]*'),
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  expires_at INTEGER NOT NULL CHECK (expires_at > window_start AND expires_at <= window_start + 1200),
  PRIMARY KEY (installation_id, kind, key_hash, window_start)
);
CREATE INDEX IF NOT EXISTS memory_quotas_expiry ON memory_quotas (expires_at);
-- Structured audit fields only: no request bodies, credentials, cookies, codes or transcripts.
CREATE TABLE IF NOT EXISTS memory_audit (
  id TEXT PRIMARY KEY NOT NULL,
  installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id),
  actor_principal_id TEXT REFERENCES memory_principals (id),
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'operator', 'machine', 'system')),
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('allowed', 'denied', 'failed')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS memory_audit_created ON memory_audit (created_at);

-- Tombstones and consumed grants never reopen; binding identities never retarget.
CREATE TRIGGER IF NOT EXISTS memory_binding_replacement BEFORE INSERT ON memory_identity_bindings
WHEN (EXISTS (
  SELECT 1 FROM memory_identity_bindings previous WHERE previous.installation_id = NEW.installation_id
    AND previous.provider_id = NEW.provider_id AND previous.issuer = NEW.issuer AND previous.subject = NEW.subject
) AND NEW.replaces_binding_id IS NULL) OR (NEW.replaces_binding_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM memory_identity_bindings previous WHERE previous.id = NEW.replaces_binding_id
    AND previous.status = 'retired' AND previous.installation_id = NEW.installation_id
    AND previous.provider_id = NEW.provider_id AND previous.issuer = NEW.issuer AND previous.subject = NEW.subject
))
BEGIN SELECT RAISE(ABORT, 'a reused login requires a reviewed retired binding replacement'); END;
CREATE TRIGGER IF NOT EXISTS memory_binding_immutable
BEFORE UPDATE ON memory_identity_bindings
WHEN NEW.principal_id IS NOT OLD.principal_id OR NEW.installation_id IS NOT OLD.installation_id
  OR NEW.provider_id IS NOT OLD.provider_id OR NEW.issuer IS NOT OLD.issuer OR NEW.subject IS NOT OLD.subject
  OR NEW.replaces_binding_id IS NOT OLD.replaces_binding_id OR NEW.evidence_ref IS NOT OLD.evidence_ref
  OR (OLD.status = 'retired' AND NEW.status != 'retired')
BEGIN SELECT RAISE(ABORT, 'identity bindings cannot be reassigned or revived'); END;
CREATE TRIGGER IF NOT EXISTS memory_binding_tombstone BEFORE DELETE ON memory_identity_bindings
BEGIN SELECT RAISE(ABORT, 'identity bindings retain tombstones'); END;
CREATE TRIGGER IF NOT EXISTS memory_membership_revision BEFORE UPDATE ON memory_memberships
WHEN NEW.revision != OLD.revision + 1 OR NEW.principal_id IS NOT OLD.principal_id
  OR NEW.repository_id IS NOT OLD.repository_id OR NEW.installation_id IS NOT OLD.installation_id
BEGIN SELECT RAISE(ABORT, 'membership changes require a new revision with the same identity'); END;
CREATE TRIGGER IF NOT EXISTS memory_membership_tombstone BEFORE DELETE ON memory_memberships
BEGIN SELECT RAISE(ABORT, 'memberships retain tombstones'); END;
CREATE TRIGGER IF NOT EXISTS memory_invitation_consumed BEFORE UPDATE ON memory_invitations
WHEN OLD.state != 'pending'
BEGIN SELECT RAISE(ABORT, 'invitation already ended'); END;
CREATE TRIGGER IF NOT EXISTS memory_owner_consumed BEFORE UPDATE ON memory_owner_intents
WHEN OLD.state = 'consumed'
BEGIN SELECT RAISE(ABORT, 'initial owner already confirmed'); END;
CREATE TRIGGER IF NOT EXISTS memory_candidate_consumed BEFORE UPDATE ON memory_login_candidates
WHEN OLD.state != 'pending'
BEGIN SELECT RAISE(ABORT, 'login candidate already ended'); END;
CREATE TRIGGER IF NOT EXISTS memory_request_transition BEFORE UPDATE ON memory_device_requests
WHEN NEW.installation_id IS NOT OLD.installation_id OR NEW.repository_id IS NOT OLD.repository_id
  OR NEW.nonce_hash IS NOT OLD.nonce_hash OR NEW.secret_hash IS NOT OLD.secret_hash OR NEW.credential_hash IS NOT OLD.credential_hash
  OR NEW.expires_at != OLD.expires_at OR NEW.scope != OLD.scope
  OR (OLD.principal_id IS NOT NULL AND (NEW.principal_id IS NOT OLD.principal_id OR NEW.membership_revision IS NOT OLD.membership_revision))
  OR (NEW.state != OLD.state AND NOT (
    (OLD.state = 'pending' AND NEW.state IN ('approved', 'denied', 'expired', 'revoked')) OR
    (OLD.state = 'approved' AND NEW.state IN ('claimed', 'denied', 'expired', 'revoked'))))
BEGIN SELECT RAISE(ABORT, 'invalid device request transition'); END;
-- Creating the device consumes its approved request in the same statement transaction.
CREATE TRIGGER IF NOT EXISTS memory_device_activation BEFORE INSERT ON memory_devices
WHEN NOT EXISTS (
  SELECT 1 FROM memory_device_requests request
  JOIN memory_memberships member ON member.repository_id = request.repository_id AND member.principal_id = request.principal_id
  JOIN memory_principals person ON person.id = member.principal_id
  WHERE request.id = NEW.request_id AND request.state = 'approved'
    AND request.installation_id = NEW.installation_id AND request.repository_id = NEW.repository_id
    AND request.principal_id = NEW.principal_id AND request.scope = NEW.scope
    AND request.approved_at = NEW.approved_at AND request.membership_revision = NEW.membership_revision
    AND member.revision = NEW.membership_revision AND member.status = 'active' AND person.status = 'active'
    AND request.expires_at > unixepoch()
) OR (SELECT count(*) FROM memory_devices WHERE principal_id = NEW.principal_id AND status = 'active') >= 10
BEGIN SELECT RAISE(ABORT, 'device approval is stale or the device limit is reached'); END;
CREATE TRIGGER IF NOT EXISTS memory_device_claim AFTER INSERT ON memory_devices
BEGIN UPDATE memory_device_requests SET state = 'claimed' WHERE id = NEW.request_id; END;
CREATE TRIGGER IF NOT EXISTS memory_first_credential BEFORE INSERT ON memory_credentials
WHEN NEW.generation = 1 AND NOT EXISTS (
  SELECT 1 FROM memory_devices device JOIN memory_device_requests request ON request.id = device.request_id
  WHERE device.id = NEW.device_id AND request.credential_hash = NEW.hash
)
BEGIN SELECT RAISE(ABORT, 'credential must match the initiating machine commitment'); END;
CREATE TRIGGER IF NOT EXISTS memory_device_immutable BEFORE UPDATE ON memory_devices
WHEN NEW.principal_id IS NOT OLD.principal_id OR NEW.repository_id IS NOT OLD.repository_id
  OR NEW.installation_id IS NOT OLD.installation_id OR NEW.request_id IS NOT OLD.request_id
  OR NEW.scope != OLD.scope OR NEW.approved_at != OLD.approved_at OR NEW.reauthorize_at != OLD.reauthorize_at
  OR NEW.generation < OLD.generation OR NEW.generation > OLD.generation + 1
  OR (OLD.status = 'revoked' AND NEW.status != 'revoked')
BEGIN SELECT RAISE(ABORT, 'device approval cannot be reassigned or widened'); END;
CREATE TRIGGER IF NOT EXISTS memory_device_tombstone BEFORE DELETE ON memory_devices
BEGIN SELECT RAISE(ABORT, 'devices retain revocation tombstones'); END;
CREATE TRIGGER IF NOT EXISTS memory_credential_immutable BEFORE UPDATE ON memory_credentials
BEGIN SELECT RAISE(ABORT, 'credential generations are immutable'); END;
CREATE TRIGGER IF NOT EXISTS memory_audit_immutable BEFORE UPDATE ON memory_audit
BEGIN SELECT RAISE(ABORT, 'audit events are immutable'); END;
-- Recorded in the same D1 transaction: interruption before the CLI's redundant marker is safe.
INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (7, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
