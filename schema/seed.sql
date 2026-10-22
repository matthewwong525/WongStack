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
-- only their level. Fay holds the built-in Admin role, so a preview shows what
-- an Admin sees. The owner is the committed WONG_OWNER_EMAIL, not this row; its
-- identifiers are made up and name nothing real.
--
-- wong_access_key_direct holds no row and nothing reads it: a key's level
-- alone decides direct use.
--
-- Their apps and key levels differ, so a preview shows each state. Eli and the
-- Trainees role hold rows from when an app could be held to look only: neither
-- holds the app now, and Access names both until the next save there.
INSERT INTO wong_access_installation
  (slot, installation_id, origin, account_id, worker_id, access_app_id, access_policy_id,
   issuer, audience, owner_subject, owner_email, repository_id, repository_name, policy_enabled, keys_enabled, activated_at)
VALUES (1, '11111111-1111-4111-8111-111111111111', 'https://access-fixture.example.invalid',
  '', 'fixture-worker', '', '', 'https://access-fixture.cloudflareaccess.com',
  'fixture-audience', 'fixture-owner', 'owner@example.invalid', 1, '', 1, 1, '2026-10-04T00:00:00Z');
INSERT INTO wong_access_apps VALUES
  ('11111111-1111-4111-8111-111111111111', 'hello'),
  ('11111111-1111-4111-8111-111111111111', 'access');
-- Ada and Bo hold the Helpers role. Dana and Eli have their own sets, Casey was removed, and Fay is an Admin.
INSERT INTO wong_access_members VALUES
  ('11111111-1111-4111-8111-111111111111', 'ada@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'bo@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'casey@example.invalid', 'removed', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'dana@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'eli@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'fay@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z');
-- The Helpers role: one app, Cloudflare look-ups, and the project through Connect your assistant.
-- The Trainees role, which nobody holds, could only look at Hello: it holds no app.
-- The Admin role is built in: every app and key, worked out on each request, so it has no app or key rows.
INSERT INTO wong_access_roles VALUES
  ('11111111-1111-4111-8111-111111111111', 'admin', 'Admin', 1),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Helpers', 1),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'Trainees', 1);
INSERT INTO wong_access_role_apps VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'hello', 'write'),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'hello', 'read');
INSERT INTO wong_access_role_keys VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'cloudflare', 'read'),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'code', 'read');
INSERT INTO wong_access_member_roles VALUES
  ('11111111-1111-4111-8111-111111111111', 'ada@example.invalid', '22222222-2222-4222-8222-222222222222'),
  ('11111111-1111-4111-8111-111111111111', 'bo@example.invalid', '22222222-2222-4222-8222-222222222222'),
  ('11111111-1111-4111-8111-111111111111', 'fay@example.invalid', 'admin');
-- Dana's own set holds Hello, with Cloudflare at Read and Project code with the publish tick, so
-- a preview shows one teammate who publishes beside the Helpers, who only save. Eli could only look
-- at Hello, so holds no app, and has no key level: None.
INSERT INTO wong_access_grants VALUES
  ('11111111-1111-4111-8111-111111111111', 'dana@example.invalid', 'hello', 1, 'write'),
  ('11111111-1111-4111-8111-111111111111', 'eli@example.invalid', 'hello', 1, 'read');
INSERT INTO wong_access_key_grants VALUES
  ('11111111-1111-4111-8111-111111111111', 'dana@example.invalid', 'cloudflare', 'read', 1),
  ('11111111-1111-4111-8111-111111111111', 'dana@example.invalid', 'code', 'write', 1);

-- A sample day in Fay's inbox, one agent per group: the ad brief's morning plan waits on her Go (Needs you), the
-- landing-page check is working, and Ronald's files are done with their proof. Fay, the Admin, can open the inbox.
INSERT INTO inbox_items
  (installation_id, email, id, kind, title, workspace, body, actions, version, created_at, closes_at, closed_at)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'fay@example.invalid', 'a0000000000000000000000000000001', 'agent',
   'Write the BFCM ad brief', 'bfcm-brief', '{"state":"planning"}', '[]', 'seed-1', 1792828800000, 4102444800000, NULL),
  ('11111111-1111-4111-8111-111111111111', 'fay@example.invalid', 'a0000000000000000000000000000002', 'start',
   'Write the BFCM ad brief', 'bfcm-brief',
   '{"state":"ready","plan":{"willDo":["Read last year''s ads and the VIP launch notes.","Draft the brief in the shared drive."],"needs":["Last year''s ad results."],"askFirst":["Sending the brief to the ads team."],"questions":[{"text":"Which offer leads the ads?","options":["$20 gift card","Free shipping"]}]}}',
   '["go","skip"]', 'seed-1', 1792828800000, 4102444800000, NULL),
  ('11111111-1111-4111-8111-111111111111', 'fay@example.invalid', 'a0000000000000000000000000000003', 'agent',
   'Final check of the BFCM landing page', 'landing-check',
   '{"state":"working","step":"Checking the gift card banner on a phone","action":"Kept going: Final check of the BFCM landing page"}',
   '[]', 'seed-1', 1792828800000, 4102444800000, NULL),
  ('11111111-1111-4111-8111-111111111111', 'fay@example.invalid', 'a0000000000000000000000000000004', 'agent',
   'Get Ronald''s files', 'ronald-files', '{"state":"done","proof":"Files in the shared drive: https://drive.example.invalid/ronald"}',
   '[]', 'seed-1', 1792828800000, 4102444800000, NULL);
