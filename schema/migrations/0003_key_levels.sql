-- Key levels and roles beside app grants. Additive: no existing table loses or
-- reorders a column, so a Worker from before this file keeps working.
ALTER TABLE wong_access_installation ADD COLUMN keys_enabled INTEGER NOT NULL DEFAULT 0 CHECK (keys_enabled IN (0, 1));

-- One person's own level for one saved key. No row means None.
CREATE TABLE wong_access_key_grants (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  key_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('read', 'write')),
  revision INTEGER NOT NULL CHECK (revision > 0),
  PRIMARY KEY (installation_id, email, key_id),
  FOREIGN KEY (installation_id, email) REFERENCES wong_access_members(installation_id, email)
);

-- A role is a named set of apps and key levels that several people share.
CREATE TABLE wong_access_roles (
  installation_id TEXT NOT NULL REFERENCES wong_access_installation(installation_id),
  role_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (name = trim(name) AND name != ''),
  revision INTEGER NOT NULL CHECK (revision > 0),
  PRIMARY KEY (installation_id, role_id)
);
CREATE UNIQUE INDEX wong_access_role_names ON wong_access_roles(installation_id, lower(name));

CREATE TABLE wong_access_role_apps (
  installation_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  PRIMARY KEY (installation_id, role_id, app_id),
  FOREIGN KEY (installation_id, role_id) REFERENCES wong_access_roles(installation_id, role_id),
  FOREIGN KEY (installation_id, app_id) REFERENCES wong_access_apps(installation_id, app_id)
);

CREATE TABLE wong_access_role_keys (
  installation_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  key_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('read', 'write')),
  PRIMARY KEY (installation_id, role_id, key_id),
  FOREIGN KEY (installation_id, role_id) REFERENCES wong_access_roles(installation_id, role_id)
);

-- The role a person holds. A person has a row here or their own grant rows,
-- never both. A table, not a column on members: an older Worker's inserts into
-- members name no columns, and a new column there would break them.
CREATE TABLE wong_access_member_roles (
  installation_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (installation_id, email),
  FOREIGN KEY (installation_id, email) REFERENCES wong_access_members(installation_id, email),
  FOREIGN KEY (installation_id, role_id) REFERENCES wong_access_roles(installation_id, role_id)
);
CREATE INDEX wong_access_member_roles_role ON wong_access_member_roles(installation_id, role_id);
