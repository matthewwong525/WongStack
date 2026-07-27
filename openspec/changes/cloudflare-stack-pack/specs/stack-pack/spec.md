## ADDED Requirements

### Requirement: An opt-in Cloudflare stack pack ships in the payload

The payload SHALL include a Cloudflare stack pack — three D1 pipeline scripts, a seed template, guided config fragments, and pipeline docs — that a repo installs only by opting in. A repo that does not opt in SHALL receive none of the pack's files and SHALL remain stack-agnostic. Opt-in state SHALL be recorded as `components.stackPack` (boolean) in `.claude/.wong-stack.json`; absent or false means the repo never took the pack.

#### Scenario: A repo that declines the pack is unaffected

- **WHEN** a repo installs or syncs WongStack without opting into the pack
- **THEN** no pack script, seed file, config fragment, or pipeline doc is written to it
- **AND** `components.stackPack` is absent or false

#### Scenario: A repo that opts in receives the pack

- **WHEN** a repo opts into the pack
- **THEN** it receives the three scripts, the seed template, and the pipeline docs, and is guided through the config fragments
- **AND** `components.stackPack` is true

### Requirement: The pack scripts are zero-config and byte-identical across repos

Every pack script SHALL be identical in every repo that installs it — no per-repo value SHALL be baked into a pack file. A script that needs the database name or a database id SHALL read it from the target-owned `wrangler.jsonc`; a script that needs a secret SHALL read it from the environment (`.env`). `scripts/swap-d1-id.js` SHALL NOT hardcode a production database id; it SHALL read both ids from `wrangler.jsonc` and swap them by regex, preserving the file's comments.

#### Scenario: Two repos install the identical script

- **WHEN** two different repos both take the pack
- **THEN** their copies of each pack script are byte-for-byte identical
- **AND** each script resolves repo-specific values from `wrangler.jsonc` or `.env`, not from a constant in the script

#### Scenario: The swap reads ids from wrangler.jsonc

- **WHEN** `swap-d1-id.js` runs on a preview branch
- **THEN** it reads `database_id` and `preview_database_id` from `wrangler.jsonc` and swaps them so the deploy binds the staging database
- **AND** it contains no hardcoded production database id

### Requirement: Migrations auto-apply on deploy, forward-only, by timestamp prefix

The pack SHALL apply D1 migrations automatically as part of the deploy build: on the default branch to the production database, on any other branch to the staging database (then swap the binding so the preview runs on staging). Migrations SHALL be forward-only (no down scripts), and their filenames SHALL use a timestamp prefix (`YYYYMMDDHHMMSS_name.sql`) so that filename order matches author order and two branches cannot collide on a prefix. The pack SHALL NOT carry a duplicate-prefix guard — the timestamp scheme makes collisions structurally impossible.

#### Scenario: Preview branch migrates staging

- **WHEN** the build runs on a non-default branch in CI
- **THEN** pending migrations apply to the staging database and the binding is swapped so the preview runs against staging
- **AND** the production database is not touched

#### Scenario: Default branch migrates production

- **WHEN** the build runs on the default branch in CI
- **THEN** pending migrations apply to the production database as part of the same deploy

#### Scenario: Two branches add migrations without colliding

- **WHEN** two branches each add a new migration file
- **THEN** each filename carries a distinct timestamp prefix and both apply in timestamp order with no prefix collision

### Requirement: Staging is a seeded fixture database, never a prod mirror

The staging reset script SHALL rebuild staging from a checked-in seed, not from production data: it SHALL drop every object, apply the migrations, then apply `schema/seed.sql` (data-only INSERTs). It SHALL NOT read, export, or copy production data, and SHALL NOT touch the production database. `schema/seed.sql` SHALL ship as a commented, empty template. A change that alters a seeded table SHALL update `schema/seed.sql` in the same change.

#### Scenario: Reset rebuilds staging from the seed

- **WHEN** the staging reset script runs
- **THEN** it drops all objects, applies migrations, and applies `schema/seed.sql`
- **AND** it issues no read or export against the production database

#### Scenario: The seed ships empty

- **WHEN** a repo first takes the pack
- **THEN** `schema/seed.sql` is present as a commented, data-only template with no rows assumed

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` `d1_databases` block, `.env.example` variables, and the `.gitignore` `.dev.vars` entry — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build` and `db:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

### Requirement: The pack ships the D1 pipeline and prod-recovery docs

The `wiki/stack/` section SHALL gain a core-stack page and D1 pipeline documentation covering the two-database model, auto-migrate-on-deploy, timestamp migrations, the seeded-staging model and reset, and the production-recovery runbooks — recovery via `wrangler d1 time-travel`, the rule never to hand-apply schema to production, and how to reconcile `d1_migrations` when production drifts. These pages SHALL follow the progressive-disclosure rulebook and link from the existing `wiki/stack/` hub. They SHALL install only with the pack.

#### Scenario: Pipeline docs are reachable from the hub

- **WHEN** a reader opens the `wiki/stack/` hub in a repo that took the pack
- **THEN** it links the core-stack page and the D1 pipeline pages
- **AND** the pipeline pages cover the two-database model, timestamp migrations, seeded staging, and both prod-recovery runbooks

#### Scenario: Docs are absent without the pack

- **WHEN** a repo did not take the pack
- **THEN** the pack's pipeline docs are not installed
