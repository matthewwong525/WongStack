-- A level for each area a person or a role holds: `read` looks things up,
-- `write` also changes or sends things. Additive, and the default is what an
-- app tick gave before levels, so every row written before this file reads
-- back at full reach and nobody loses anything.
ALTER TABLE wong_access_grants ADD COLUMN level TEXT NOT NULL DEFAULT 'write' CHECK (level IN ('read', 'write'));
ALTER TABLE wong_access_role_apps ADD COLUMN level TEXT NOT NULL DEFAULT 'write' CHECK (level IN ('read', 'write'));
