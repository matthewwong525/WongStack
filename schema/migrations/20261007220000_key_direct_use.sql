-- The owner's choice, per saved key, of whether an assistant may use the key
-- directly through the app: `read` passes on look-ups, `write` changes too.
-- No row means off, so this file turns nothing on. Additive: no existing table
-- changes, so a Worker from before this file keeps working.
CREATE TABLE wong_access_key_direct (
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  key_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('read', 'write')),
  revision INTEGER NOT NULL CHECK (revision > 0),
  PRIMARY KEY (installation_id, key_id)
);
