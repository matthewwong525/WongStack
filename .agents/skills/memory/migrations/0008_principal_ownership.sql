-- Legacy NULL ownership stays unresolved. No author/email is converted into authority.
ALTER TABLE facts ADD COLUMN owner_principal_id TEXT REFERENCES memory_principals (id);
ALTER TABLE sessions ADD COLUMN owner_principal_id TEXT REFERENCES memory_principals (id);
CREATE INDEX facts_owner ON facts (owner_principal_id, superseded_by);
CREATE INDEX sessions_owner ON sessions (owner_principal_id);
CREATE TRIGGER facts_owner_immutable BEFORE UPDATE OF owner_principal_id ON facts
WHEN OLD.owner_principal_id IS NOT NULL AND NEW.owner_principal_id IS NOT OLD.owner_principal_id
BEGIN SELECT RAISE(ABORT, 'fact ownership is immutable'); END;
CREATE TRIGGER sessions_owner_immutable BEFORE UPDATE OF owner_principal_id ON sessions
WHEN OLD.owner_principal_id IS NOT NULL AND NEW.owner_principal_id IS NOT OLD.owner_principal_id
BEGIN SELECT RAISE(ABORT, 'session ownership is immutable'); END;

-- One exact record or object per review. A correction appends a row naming its predecessor.
-- snapshot_hash identifies the reviewed bytes; evidence_ref names private operator evidence.
CREATE TABLE memory_ownership_mappings (
  id TEXT PRIMARY KEY NOT NULL,
  installation_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  actor_principal_id TEXT NOT NULL,
  fact_id INTEGER REFERENCES facts (id),
  session_id TEXT REFERENCES sessions (id),
  raw_key TEXT CHECK (raw_key IS NULL OR length(raw_key) > 0),
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('legacy-challenge', 'operator-provenance', 'correction')),
  evidence_ref TEXT NOT NULL CHECK (length(trim(evidence_ref)) > 0),
  snapshot_hash TEXT NOT NULL CHECK (length(snapshot_hash) = 64 AND snapshot_hash NOT GLOB '*[^0-9a-f]*'),
  supersedes TEXT UNIQUE REFERENCES memory_ownership_mappings (id),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (installation_id, principal_id) REFERENCES memory_principals (installation_id, id),
  FOREIGN KEY (installation_id, actor_principal_id) REFERENCES memory_principals (installation_id, id),
  CHECK ((fact_id IS NOT NULL) + (session_id IS NOT NULL) + (raw_key IS NOT NULL) = 1),
  CHECK ((evidence_type = 'correction') = (supersedes IS NOT NULL))
);
CREATE UNIQUE INDEX memory_first_fact_mapping ON memory_ownership_mappings (fact_id) WHERE supersedes IS NULL AND fact_id IS NOT NULL;
CREATE UNIQUE INDEX memory_first_session_mapping ON memory_ownership_mappings (session_id) WHERE supersedes IS NULL AND session_id IS NOT NULL;
CREATE UNIQUE INDEX memory_first_object_mapping ON memory_ownership_mappings (raw_key) WHERE supersedes IS NULL AND raw_key IS NOT NULL;
CREATE TRIGGER memory_mapping_correction BEFORE INSERT ON memory_ownership_mappings
WHEN NEW.supersedes IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM memory_ownership_mappings previous WHERE previous.id = NEW.supersedes
    AND previous.installation_id = NEW.installation_id
    AND previous.fact_id IS NEW.fact_id AND previous.session_id IS NEW.session_id AND previous.raw_key IS NEW.raw_key
)
BEGIN SELECT RAISE(ABORT, 'ownership correction must name the same exact record'); END;
CREATE TRIGGER memory_mapping_immutable BEFORE UPDATE ON memory_ownership_mappings
BEGIN SELECT RAISE(ABORT, 'ownership review history is immutable'); END;
CREATE TRIGGER memory_mapping_preserved BEFORE DELETE ON memory_ownership_mappings
BEGIN SELECT RAISE(ABORT, 'ownership review history is retained'); END;

-- The later operator cutover writes exact legacy evidence here before retiring old authority.
CREATE TABLE memory_legacy_evidence (
  id TEXT PRIMARY KEY NOT NULL,
  installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id),
  kind TEXT NOT NULL CHECK (kind IN ('key', 'admin', 'backup', 'inventory', 'cutover', 'recovery')),
  evidence_ref TEXT NOT NULL CHECK (length(trim(evidence_ref)) > 0),
  snapshot_hash TEXT NOT NULL CHECK (length(snapshot_hash) = 64 AND snapshot_hash NOT GLOB '*[^0-9a-f]*'),
  created_at INTEGER NOT NULL
);
CREATE TRIGGER memory_legacy_evidence_immutable BEFORE UPDATE ON memory_legacy_evidence
BEGIN SELECT RAISE(ABORT, 'legacy evidence is immutable'); END;
CREATE TRIGGER memory_legacy_evidence_preserved BEFORE DELETE ON memory_legacy_evidence
BEGIN SELECT RAISE(ABORT, 'legacy evidence is retained'); END;
INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (8, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
