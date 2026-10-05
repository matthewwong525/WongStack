-- The people the owner lets manage Access. Additive: a Worker from before this
-- file never reads it. A table, not a column on members, for the reason
-- 0003_key_levels.sql gives. No row means not a manager.
CREATE TABLE wong_access_managers (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  PRIMARY KEY (installation_id, email),
  FOREIGN KEY (installation_id, email) REFERENCES wong_access_members(installation_id, email)
);
