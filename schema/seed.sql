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
-- The template includes isolated Access fixtures below. Add business samples here.

-- Example (delete this; replace with your project's fixtures):
-- INSERT INTO users (id, email, name) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'demo@example.com', 'Demo User');

-- Isolated Access scenarios. Enforcement stays disabled; these public fixture
-- pins are never production activation or provider credentials.
INSERT INTO wong_access_installation
  (slot, installation_id, origin, account_id, worker_id, access_app_id, access_policy_id,
   issuer, audience, owner_subject, owner_email, repository_id, repository_name, activated_at)
VALUES (1, '11111111-1111-4111-8111-111111111111', 'https://access-fixture.example.invalid',
  '11111111111111111111111111111111', 'fixture-worker', '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333', 'https://access-fixture.cloudflareaccess.com',
  'fixture-audience', 'fixture-owner', 'owner@example.invalid', 1, '', '2026-10-04T00:00:00Z');
INSERT INTO wong_access_apps VALUES
  ('11111111-1111-4111-8111-111111111111', 'hello'),
  ('11111111-1111-4111-8111-111111111111', 'access');
INSERT INTO wong_access_members VALUES
  ('11111111-1111-4111-8111-111111111111', 'ada@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'bo@example.invalid', 'active', 0, 1, '2026-10-04T00:00:00Z'),
  ('11111111-1111-4111-8111-111111111111', 'casey@example.invalid', 'removed', 0, 1, '2026-10-04T00:00:00Z');
INSERT INTO wong_access_grants VALUES
  ('11111111-1111-4111-8111-111111111111', 'ada@example.invalid', 'hello', 1);
INSERT INTO wong_access_work (installation_id, kind, generation, status, error_code, outcome) VALUES
  ('11111111-1111-4111-8111-111111111111', 'policy', 1, 'failed', 'provider_unavailable', NULL),
  ('11111111-1111-4111-8111-111111111111', 'sessions', 1, 'ready', NULL, 'session_revocation_accepted_propagation_unverified');
