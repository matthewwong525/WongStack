-- The built-in Admin role: its holder has every app and key and manages
-- Access. The Worker works out what it gives on each request, so the role has
-- no row in the role app or key tables. Holding it replaces the per-person
-- manager switch.
--
-- Reads wong_access_installation, wong_access_roles, wong_access_members and
-- wong_access_managers; its timestamp is later than the files that made them.
-- wong_access_managers and its rows stay, and nothing reads them again.

-- 1. A role the owner had named Admin, in any case, keeps its apps, key levels
-- and people under a name that says it is their own. Where that name is taken
-- too, a piece of the role's id keeps the unique name index from failing.
UPDATE wong_access_roles
SET name = CASE WHEN EXISTS (SELECT 1 FROM wong_access_roles o
    WHERE o.installation_id = wong_access_roles.installation_id AND lower(o.name) = 'admin (custom)')
  THEN 'Admin (custom ' || substr(role_id, 1, 8) || ')' ELSE 'Admin (custom)' END
WHERE lower(name) = 'admin' AND role_id <> 'admin';

-- 2. Every installation gets the Admin role.
INSERT INTO wong_access_roles (installation_id, role_id, name, revision)
SELECT installation_id, 'admin', 'Admin', revision FROM wong_access_installation WHERE true
ON CONFLICT DO NOTHING;

-- 3. Each current manager holds Admin in place of their role or own set. A
-- removed person who was a manager holds nothing.
DELETE FROM wong_access_grants WHERE EXISTS (SELECT 1 FROM wong_access_managers a
  JOIN wong_access_members m ON m.installation_id = a.installation_id AND m.email = a.email AND m.status = 'active'
  WHERE a.installation_id = wong_access_grants.installation_id AND a.email = wong_access_grants.email);
DELETE FROM wong_access_key_grants WHERE EXISTS (SELECT 1 FROM wong_access_managers a
  JOIN wong_access_members m ON m.installation_id = a.installation_id AND m.email = a.email AND m.status = 'active'
  WHERE a.installation_id = wong_access_key_grants.installation_id AND a.email = wong_access_key_grants.email);
INSERT INTO wong_access_member_roles (installation_id, email, role_id)
SELECT a.installation_id, a.email, 'admin' FROM wong_access_managers a
  JOIN wong_access_members m ON m.installation_id = a.installation_id AND m.email = a.email AND m.status = 'active'
  WHERE true
ON CONFLICT(installation_id, email) DO UPDATE SET role_id = excluded.role_id;
