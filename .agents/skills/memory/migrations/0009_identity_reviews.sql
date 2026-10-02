-- Separate review evidence supports new subjects/issuers without repurposing the
-- same-login replacement chain. Candidate IDs remain after short-lived rows are pruned.
CREATE TABLE IF NOT EXISTS memory_identity_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  installation_id TEXT NOT NULL REFERENCES memory_installation (installation_id),
  actor_principal_id TEXT NOT NULL,
  target_principal_id TEXT NOT NULL,
  binding_id TEXT NOT NULL UNIQUE REFERENCES memory_identity_bindings (id),
  candidate_id TEXT NOT NULL UNIQUE,
  outcome TEXT NOT NULL CHECK (outcome IN ('continuity', 'new-person')),
  evidence_ref TEXT NOT NULL CHECK (length(evidence_ref) BETWEEN 1 AND 200),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (installation_id, actor_principal_id) REFERENCES memory_principals (installation_id, id),
  FOREIGN KEY (installation_id, target_principal_id) REFERENCES memory_principals (installation_id, id)
);
CREATE TRIGGER IF NOT EXISTS memory_identity_review_binding BEFORE INSERT ON memory_identity_reviews
WHEN NOT EXISTS (SELECT 1 FROM memory_identity_bindings b WHERE b.id = NEW.binding_id
  AND b.installation_id = NEW.installation_id AND b.principal_id = NEW.target_principal_id)
BEGIN SELECT RAISE(ABORT, 'identity review must match the exact installation and principal binding'); END;
CREATE TRIGGER IF NOT EXISTS memory_identity_review_immutable BEFORE UPDATE ON memory_identity_reviews
BEGIN SELECT RAISE(ABORT, 'identity review evidence is immutable'); END;
CREATE TRIGGER IF NOT EXISTS memory_identity_review_retained BEFORE DELETE ON memory_identity_reviews
BEGIN SELECT RAISE(ABORT, 'identity review evidence is retained'); END;
INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (9, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
