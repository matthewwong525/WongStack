-- schema/seed.sql — fixture data for the STAGING database.
--
-- HOW THIS WORKS
--   • Data only. No CREATE/ALTER here — the schema comes from
--     schema/migrations/, which `db:reset:staging` applies BEFORE this file.
--   • `npm run db:reset:staging` drops every staging object, replays the
--     migrations, then runs these INSERTs. Staging is a seeded fixture
--     database, never a copy of production.
--   • A change that alters a seeded table updates THIS file in the same
--     change, so a reset always matches the current schema.
--   • A change that adds or alters a feature adds, in the same change, the
--     made-up rows its scenarios need (sample customers, orders, records):
--     realistic in shape, never a real person's details, not a data dump.
--     The check before publishing starts from these rows.
--
-- The template includes Access practice people below. Add business samples here.

-- Example (delete this; replace with your project's fixtures):
-- INSERT INTO users (id, email, name) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'demo@example.com', 'Demo User');

-- Access practice people. A preview keeps its own list: the owner tries Access
-- here, and the real sign-in list is never touched. Permissions and key levels
-- have started, so a preview shows each person only their apps and gives each
-- only their level. Dana is a manager, so a preview shows the tick and its
-- labels. The owner is the committed WONG_OWNER_EMAIL, not this row; its
-- identifiers are made up and name nothing real.
INSERT INTO wong_access_installation
  (slot, installation_id, origin, account_id, worker_id, access_app_id, access_policy_id,
   issuer, audience, owner_subject, owner_email, repository_id, repository_name, policy_enabled, keys_enabled, activated_at)
VALUES (1, '11111111-1111-4111-8111-111111111111', 'https://access-fixture.example.invalid',
  '', 'fixture-worker', '', '', 'https://access-fixture.cloudflareaccess.com',
  'fixture-audience', 'fixture-owner', 'owner@example.invalid', 1, '', 1, 1, '2026-10-04T00:00:00Z');
INSERT INTO wong_access_apps VALUES
  ('11111111-1111-4111-8111-111111111111', 'hello'),
  ('11111111-1111-4111-8111-111111111111', 'tips'),
  ('11111111-1111-4111-8111-111111111111', 'access');
-- Ada and Bo hold the Helpers role. Dana and Eli have their own sets, and Casey was removed.
INSERT INTO wong_access_members VALUES
  ('11111111-1111-4111-8111-111111111111', 'ada@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'bo@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'casey@example.invalid', 'removed', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'dana@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'eli@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z');
-- The Helpers role: one app, and Cloudflare look-ups.
INSERT INTO wong_access_roles VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Helpers', 1);
INSERT INTO wong_access_role_apps VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'hello');
INSERT INTO wong_access_role_keys VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'cloudflare', 'read');
INSERT INTO wong_access_member_roles VALUES
  ('11111111-1111-4111-8111-111111111111', 'ada@example.invalid', '22222222-2222-4222-8222-222222222222'),
  ('11111111-1111-4111-8111-111111111111', 'bo@example.invalid', '22222222-2222-4222-8222-222222222222');
-- Dana's own set has Cloudflare at Read. Eli's has an app and no key level: None.
INSERT INTO wong_access_grants VALUES
  ('11111111-1111-4111-8111-111111111111', 'dana@example.invalid', 'hello', 1),
  ('11111111-1111-4111-8111-111111111111', 'dana@example.invalid', 'tips', 1),
  ('11111111-1111-4111-8111-111111111111', 'eli@example.invalid', 'tips', 1);
INSERT INTO wong_access_key_grants VALUES
  ('11111111-1111-4111-8111-111111111111', 'dana@example.invalid', 'cloudflare', 'read', 1);
-- Dana also manages Access. It gives her no app and no key: her set above is unchanged.
INSERT INTO wong_access_managers VALUES
  ('11111111-1111-4111-8111-111111111111', 'dana@example.invalid');
