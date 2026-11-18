<!-- openspec-archive v1 2026-07-27-cloudflare-stack-pack -->
<!-- file proposal.md utf8 7928 -->
# cloudflare-stack-pack

**Status:** ready-to-ship
**Open questions:** none

## Why

Change 1 documented the Cloudflare *setup*; this makes the stack *runnable*. It ships the parts nobody can reproduce from prose — three hard-won scripts (auto-migrate on deploy, staging swap, seeded staging reset) and the two-database D1 pipeline they implement — as an **opt-in pack** a repo takes at install and `/wong-sync` keeps current. The scripts are drawn from a production app where they were written in blood (a main branch that sat red for 8 commits over a hand-applied migration); an adopter should inherit that, not rediscover it.

**Non-goals:** no app scaffold (no `src/`, no Worker code — the adopter owns their app); nothing becomes required (decline the pack and WongStack stays exactly as stack-agnostic as today); no `/server` skill (everything runs remote, the preview URL is the inner loop); no integration tests (a later change). This change does **not** touch `/wong-sync`'s contribute leg — that's change 3.

## What Changes

- **A new `stack-pack` payload category** in the payload manifest, gated on an opt-in flag (`components.stackPack`) in `.claude/.wong-stack.json`. Its files install and refresh **only** for a repo that took the pack — a repo that declined never sees them.
- **`/wong-setup` offers the pack** — one prompt during setup ("D1 + Workers stack pack?"). Yes writes `components.stackPack: true` and seeds the files; no leaves the repo stack-agnostic. Decline is the safe default.
- **`/wong-sync` refreshes the pack** using its existing three-way diff — pack files classify exactly like any payload file (unchanged-since-install → silent update; locally edited → shown and asked; both changed → conflict). No new refresh machinery: "detect local edits" *is* the three-way base→local comparison already in the skill.
- **Three zero-config, byte-identical scripts** (drop-in clean, seeded, target-owned after install):
  - `scripts/cf-build.sh` — the CI build wrapper: `main` branch → migrate **prod** D1; any other branch → migrate **staging** D1 then swap the binding. Reads the DB name from `wrangler.jsonc`; no per-repo constant. (Generalized from the source; the duplicate-prefix guard is **deleted** — timestamp prefixes make collisions impossible.)
  - `scripts/swap-d1-id.js` — regex-swaps `database_id` ↔ `preview_database_id` in `wrangler.jsonc` so a preview deploy binds staging. The `PROD_DB_ID` constant is **dropped** (redundant: the swap only runs on non-`main` branches from a fresh CI clone, so the file is always in prod state when it runs) — the script reads both IDs from the file it edits.
  - `scripts/reset-staging-d1.mjs` — drop every object → apply migrations → apply `schema/seed.sql`. **Never touches prod.** ~90 lines, down from ~250: the prod-export, topo-sort, and self-FK-stripping machinery is gone because staging is a seeded fixture DB, not a prod mirror.
- **Template files:** `schema/seed.sql` (a commented, empty data-only INSERT template) and `schema/migrations/.gitkeep`.
- **Guided config fragments** — printed for the agent to merge into files the target already owns (the `CLAUDE.md` WONG-STACK-block precedent: show the fragment, apply/ask, never blind-write):
  - `package.json` → `scripts`: `build` (→ `cf-build.sh`), `db:migrate:staging`, `db:migrate:prod`, `db:reset:staging`.
  - `wrangler.jsonc` → a `d1_databases` block (`database_id`, `preview_database_id`, `migrations_dir`).
  - `.env.example` → `CLOUDFLARE_USER_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` (the change-1 credentials, now with committed template lines).
  - `.gitignore` → `.dev.vars`.
- **New `wiki/stack/` pipeline docs** (linked from the existing hub): a **core-stack** page (React + Vite + Workers + D1, versions, why the combo) and the **D1 pipeline** — the two-database model, auto-migrate-on-deploy, **timestamp migration prefixes** (`YYYYMMDDHHMMSS_name.sql`; migrations are additive and order-independent), the seeded staging model + reset, and the two **prod-recovery runbooks** (`wrangler d1 time-travel`; "never hand-apply schema to prod"; reconciling `d1_migrations` when prod drifts).
- **`wiki/development/required-tools.md` gains a note:** the pack adds `node`/`npm`/`wrangler` + a Cloudflare account — allowed precisely *because* it's opt-in and runs in the target's build/CI, not in any WongStack skill. The core three-tool claim (`git`, `gh`, `openspec`) stays true for every repo that didn't take the pack.
- `CHANGELOG.md` entry + `VERSION` bump (minor — additive, opt-in).

## Capabilities

### New Capabilities
- `stack-pack`: An opt-in Cloudflare stack pack in the payload — three zero-config D1 pipeline scripts, a seed template, guided config fragments, and the pipeline docs — installed and refreshed only for repos that accept it, leaving WongStack stack-agnostic for those that don't.

### Modified Capabilities
- `install-onboarding`: `/wong-setup` gains a pack opt-in prompt and writes `components.stackPack`.
- `wong-sync`: `/wong-sync` pull leg refreshes the opt-in pack category (same three-way diff; no contribute-leg change here).
- `toolchain-dependencies`: the required-tools page records the pack's extra tools as an opt-in-only addition that doesn't break the core three-tool guarantee.

## Impact

- **Payload:** new `scripts/` (3 files), `schema/seed.sql` + `schema/migrations/.gitkeep`, config-fragment references (shipped as skill/reference content, applied by the agent), new `wiki/stack/` pages, edits to `payload-manifest.md`, `wong-setup`, `wong-sync`, `required-tools.md`.
- **Manifest schema:** `.claude/.wong-stack.json` gains `components.stackPack` (boolean; absent = false = never had the pack).
- **Root payload:** `CHANGELOG.md` + `VERSION`.
- **A repo that declines the pack:** zero change — no files, no manifest flag, no new tools.
- **Follow-on:** change 3 `wong-sync-pull-only` (contribute-leg removal + contributing page); later, integration tests (the change-1 service token + this change's seeded DB are the groundwork).

## Decision log

- **2026-07-27** — Implemented all 17 tasks; change complete and ready to ship. **Scripts:** the three generalized scripts carry zero repo-specific literals (verified by grep — no `claymoo`/prod-id/`D1_DATABASE_ID`), reading the DB name/ids from `wrangler.jsonc` and secrets from `.env`. `cf-build.sh` reads `database_name` via a `grep`/`sed` regex (no new dependency) and defaults the production branch to `main` with a `CF_PRODUCTION_BRANCH` override, so the file stays byte-identical across repos. `swap-d1-id.js` dropped the `PROD_DB_ID` constant and the Claymoo container-var swap; kept the identical-ids and no-match/no-change guards, documenting honestly that it's a one-shot swap from a fresh CI clone (not a general toggle) per design decision 4. `reset-staging-d1.mjs` shrank from ~250 → ~90 lines — all prod-export/topo-sort/self-FK/`OR IGNORE` machinery deleted; new body is drop → migrate → apply seed, never touching prod. **Fragments:** the four config fragments live as installer reference content at `wong-sync/references/stack-pack-fragments.md` (parallel to the payload manifest), applied as guided edits — *not* manifest pull-files — since they merge into target-owned files. The `package.json` fragment renames the repo's existing build to `build:app` (what `cf-build.sh` delegates to). **Docs:** the whole `wiki/stack/` section (including change 1's Access + credentials pages) now installs with the pack, so "docs absent without the pack" holds. **Wiring:** gating is one boolean (`components.stackPack`) read in wong-sync Step 0/2 and written by wong-setup Step 6/7; `required-tools.md` states the core-vs-pack tool split. `VERSION` → 6.6.0 (minor, additive/opt-in). `openspec validate` passes; every new `wiki/stack/` link resolves.

<!-- end proposal.md -->
<!-- file design.md utf8 8392 -->
## Context

Change 2 of the three-change arc. Change 1 shipped the `wiki/stack/` Access + credentials docs; this ships the runnable pack. The source is a production app (`~/ClaymooApp`) whose three D1 scripts and pipeline docs encode real operational scar tissue — a `main` branch that sat red for 8 commits after a hand-applied migration, a topo-sorting reset written to work around D1 ignoring `defer_foreign_keys`. Two of our settled decisions *shrink* that source dramatically: seeded staging deletes the entire prod-export/topo-sort/self-FK machinery (~250 lines → ~90), and timestamp migrations delete the duplicate-prefix guard. The pack ships the distilled, generalized result.

The hard constraint that shapes everything: WongStack must stay stack-agnostic for repos that don't want this. So the pack is **opt-in and gated**, and it reuses the existing install/sync engine rather than bolting on a parallel one.

## Goals / Non-Goals

**Goals:**
- Ship three zero-config, byte-identical scripts + a seed template + pipeline docs, installed and refreshed only for repos that opt in.
- Reuse the one copy engine: pack drop-in files are manifest files gated on `components.stackPack`; refresh is the existing three-way diff.
- Keep the core three-tool guarantee (`git`/`gh`/`openspec`) literally true for every repo that declines.
- Generalize, not copy — nothing app-specific survives.

**Non-Goals:**
- No app scaffold (no `src/`, no Worker code). The adopter owns their app.
- No `/server` skill — everything remote, preview URL is the inner loop.
- No change to `/wong-sync`'s contribute leg (change 3).
- No integration tests (later change; this change's seed DB + change 1's service token are its groundwork).

## Decisions

**1. Two file kinds, two delivery mechanisms.** The pack splits cleanly:
- **Drop-in files** (`scripts/cf-build.sh`, `scripts/swap-d1-id.js`, `scripts/reset-staging-d1.mjs`, `schema/seed.sql`, `schema/migrations/.gitkeep`, the `wiki/stack/` pipeline docs) are whole files the target owns after install. These go in the **manifest**, gated on `components.stackPack`, and pull/refresh through the existing three-way diff unchanged.
- **Config fragments** (`package.json` scripts, `wrangler.jsonc` `d1_databases`, `.env.example` vars, `.gitignore` `.dev.vars`) must *merge* into files the target already owns. These are **not** manifest pull-files; they're applied as guided edits at install, following the `CLAUDE.md` WONG-STACK-block precedent (show fragment → apply with confirmation → never blind-write). They live as reference content the installer applies.

*Alternative — put fragments in the manifest too:* rejected; you can't three-way-diff a fragment against a whole file the user owns without a marker convention, and `package.json`/`wrangler.jsonc` don't take comment markers cleanly.

**2. Gate on `components.stackPack`, reuse three-way for everything else.** The manifest gets one boolean. `/wong-setup` writes it (Decision 3); `/wong-sync` reads it and, only when true, includes the pack's drop-in files in the file list it classifies. Everything downstream — classification, batch-approve, conflict resolution, "locally edited → ask" — is the machinery already specified in the `wong-sync` capability. **"Detect local edits on refresh" is not new work; it is the base→local half of the three-way diff.** This is why the pack is cheap to add: one flag + one conditional file list, no new refresh engine.

**3. Opt-in happens once, at setup; install rides fresh-mode.** `/wong-setup` adds a single prompt and, on yes, writes `components.stackPack: true` into the seed manifest. Then its normal hand-off to `/wong-sync` fresh mode pulls the pack's drop-in files with the rest of the payload — no separate seeding path — and applies the config fragments as guided edits. Decline is the default and never gates the rest of setup. A repo can also add the pack later by setting the flag and re-syncing.

**4. Zero-config by reading target-owned files.** No pack file carries a per-repo value, so every copy is byte-identical and refresh is frictionless. `cf-build.sh` reads the database name from `wrangler.jsonc`; `swap-d1-id.js` reads both ids from `wrangler.jsonc` and drops the `PROD_DB_ID` constant (redundant — the swap only runs on non-`main` branches, which in CI always start from a fresh clone with the file in prod state). Secrets come from `.env`. This is the single most important property for the "pull the new version" experience: identical files never conflict.

**5. Timestamp migrations, guard deleted.** Filenames become `YYYYMMDDHHMMSS_name.sql`. Filename (lexical) order equals author order equals apply order, so two parallel branches structurally cannot collide — the source's duplicate-prefix guard (and its documented blind spot) is deleted, not generalized. The companion doc rule: **migrations are additive and order-independent**, because a slow branch can merge an older timestamp after a newer one, and a fresh-DB replay then applies them in a different order than prod did. Additive migrations make that reordering harmless.

**6. Seeded staging, prod untouched.** `reset-staging-d1.mjs` becomes: drop all objects → apply migrations → apply `schema/seed.sql`. Gone: `wrangler d1 export` against prod, the FK-edge parser, the topo-sort, the self-FK stripper, the `INSERT OR IGNORE` reorder. The reset never reads prod, so it's safe, fast, and deterministic — which promotes it from "heavyweight" to the routine escape hatch when a shared staging DB gets wedged. Cost, stated in the docs: fixtures won't catch a migration that only breaks on prod-scale data shapes; the mitigation is forward-only prod migrations + Time Travel.

**7. Canonize the recovery runbooks verbatim in spirit.** The two hardest-won source docs — "never hand-apply schema to prod" and "reconcile `d1_migrations` when prod drifts" — generalize with almost no change; they're the highest-value prose in the pack. Ship them in the pipeline docs.

**8. Required-tools split, stated out loud.** The pack adds `node`/`npm`/`wrangler` + a Cloudflare account. The required-tools page currently guarantees exactly `git`/`gh`/`openspec` and is proud of it. Rather than quietly break that, the page states the split: core = three tools always; the opt-in pack may need more, but only in a repo that took it and only in that repo's build/CI, never in a WongStack skill. The guarantee stays literally true for every non-pack repo.

## Risks / Trade-offs

- **Config-fragment refresh is weaker than drop-in refresh.** A three-way diff can't cleanly re-merge a changed `package.json` fragment. *Mitigation:* fragments change rarely (they're structural); on the rare upstream fragment change, `/wong-sync` re-offers it as a guided edit rather than auto-merging. Documented as a known limit, not hidden.
- **Shared staging DB races between parallel branches.** Every branch preview binds the same staging D1; concurrent resets/migrations stomp each other. *Accepted, per the /explore decision* — the nature of a shared staging; the docs state it and lean on seeded reset as the recovery. The later integration-tests change inherits this constraint.
- **Seeded staging misses prod-scale surprises.** A migration that chokes on 400k rows or an unexpected NULL won't show in fixtures. *Mitigation:* forward-only prod migrations run against prod for the first time at merge with Time Travel behind them; the docs name this trade explicitly.
- **Generalizing scripts we can't run here.** This environment has no Cloudflare account or D1. *Mitigation:* the scripts are mechanical generalizations of working source (drop constants, read from `wrangler.jsonc`, delete the mirror machinery); the pipeline docs carry the "verify against your account" burden, and the scripts are small enough to review by inspection.
- **`.mjs`/`.sh` in a "no-node payload" toolkit.** Could read as violating the toolchain guarantee. *Mitigation:* Decision 8 — these run in the *target's* build, not in any skill; the spec and the docs draw that line explicitly.

## Open Questions

- None blocking. The config-fragment refresh limit (Risk 1) is the one spot where behavior is "re-offer, don't auto-merge"; if that proves annoying in practice a marker convention for `wrangler.jsonc` could be added later, but it's not worth the complexity now.

<!-- end design.md -->
<!-- file tasks.md utf8 4973 -->
## 1. The three zero-config scripts

- [x] 1.1 `scripts/cf-build.sh` — generalize from `~/ClaymooApp/scripts/cf-build.sh`: keep the branch→prod/staging migrate + swap logic; **delete** the duplicate-prefix guard (timestamp prefixes make it unnecessary); read the D1 database name from `wrangler.jsonc` (no hardcoded name); strip all Claymoo container / `D1_DATABASE_ID` swap specifics. Local (non-CI) runs skip migrate/swap and just build.
- [x] 1.2 `scripts/swap-d1-id.js` — generalize from source: **drop the `PROD_DB_ID` constant**; read `database_id` and `preview_database_id` from `wrangler.jsonc` and regex-swap them (comments preserved); keep the idempotency/error-on-no-match guards. No per-repo value in the file.
- [x] 1.3 `scripts/reset-staging-d1.mjs` — gut the prod-export / topo-sort / self-FK-strip / `INSERT OR IGNORE` machinery. New body: drop all staging objects → apply migrations to staging → apply `schema/seed.sql` to staging. **Never** reads or touches prod. Reads DB name from `wrangler.jsonc`.
- [x] 1.4 Confirm all three scripts are byte-identical-across-repos (no repo-specific literal) and resolve every repo value from `wrangler.jsonc` / `.env`.

## 2. Template files + config fragments

- [x] 2.1 `schema/seed.sql` — a commented, empty data-only INSERT template, with a header note: data-only, applied after migrations; a change that alters a seeded table updates this file in the same change.
- [x] 2.2 `schema/migrations/.gitkeep` — plus a one-line README note (in the pipeline doc) on the `YYYYMMDDHHMMSS_name.sql` naming.
- [x] 2.3 Author the guided config fragments as installer-applied reference content (not manifest pull-files): `package.json` scripts (`build` → `cf-build.sh`, `db:migrate:staging`, `db:migrate:prod`, `db:reset:staging`); `wrangler.jsonc` `d1_databases` block (`database_id`, `preview_database_id`, `migrations_dir`); `.env.example` (`CLOUDFLARE_USER_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`); `.gitignore` (`.dev.vars`). Each carries the WONG-STACK-block-style "show + apply with confirmation, never blind-write" instruction.

## 3. Stack pipeline docs (`wiki/stack/`)

- [x] 3.1 `wiki/stack/core-stack.md` — React 19 + Vite 8 (stable, no `overrides`) + Cloudflare Workers + D1, `@cloudflare/vite-plugin`, Tailwind 4; why the combo suits AI-driven dev (merge = deploy, one runtime, cheap previews). Principle-led; pin versions where the scaffold needs them.
- [x] 3.2 `wiki/stack/d1-pipeline.md` (or a small sub-hub) — the two-database model (one binding, `database_id` + `preview_database_id`), auto-migrate-on-deploy (main→prod, else→staging + swap), timestamp migrations + the additive/order-independent rule, and the seeded-staging model + `db:reset:staging`. Generalize from `~/ClaymooApp/docs/development/{staging-database,ci-and-deploy,architecture}.md`.
- [x] 3.3 Prod-recovery runbooks (in the pipeline doc): `wrangler d1 time-travel`; **never hand-apply schema to prod**; **reconcile `d1_migrations` when prod drifts**. Generalize the two source runbooks nearly verbatim in spirit.
- [x] 3.4 Link all new pages from the existing `wiki/stack/README.md` hub; keep every page stand-alone with up/down/sideways links per `wiki/wiki-style.md` + `wiki/voice.md`.

## 4. Install/sync wiring (opt-in, gated, refreshable)

- [x] 4.1 `payload-manifest.md` — add the opt-in `stack-pack` category: the drop-in files (3 scripts, `schema/seed.sql`, `schema/migrations/.gitkeep`, the new `wiki/stack/` pipeline docs) are in-manifest **only** when `components.stackPack: true`; state the config fragments are guided-edit reference content, not pull-files.
- [x] 4.2 `wong-sync` SKILL.md — teach the pull leg to include the gated pack files in its file list only when `components.stackPack` is true, refreshed by the existing three-way diff; note the config fragments follow the CLAUDE.md-block guided-edit path. Add `components.stackPack` to the manifest schema shown in Step 6.
- [x] 4.3 `wong-setup` SKILL.md — add the single opt-in prompt (decline = default, never a gate); on yes, write `components.stackPack: true` into the seed manifest (Step 7 schema) and apply the config fragments as guided edits; on no, leave it false. Update the seed-manifest schema block.
- [x] 4.4 `wiki/development/required-tools.md` — state the core-vs-pack split: core stays exactly `git`/`gh`/`openspec`; the opt-in pack may add `node`/`npm`/`wrangler` + a Cloudflare account, only in a repo that took it, only in that repo's build/CI, never in a skill.

## 5. Release + verify

- [x] 5.1 `CHANGELOG.md` entry + `VERSION` bump (minor — additive, opt-in).
- [x] 5.2 Verify: a repo that declines the pack gets zero pack files and no new required tool; the three scripts carry no per-repo literal; timestamp-migration + additive rule and both recovery runbooks are present; every new `wiki/stack/` link resolves; `openspec validate cloudflare-stack-pack` passes.

<!-- end tasks.md -->
<!-- file specs/install-onboarding/spec.md utf8 1262 -->
## ADDED Requirements

### Requirement: wong-setup offers the stack pack as an opt-in

`wong-setup` SHALL offer the Cloudflare stack pack once during setup, as a single plain-language prompt, framed as optional with decline as the safe default. On acceptance it SHALL record `components.stackPack: true` in the seed manifest so `/wong-sync`'s fresh-mode pull installs the pack's files alongside the rest of the payload; on decline it SHALL leave `components.stackPack` false/absent and install no pack file. The offer SHALL NOT be a gate — declining never blocks or complicates the rest of setup.

#### Scenario: User accepts the pack

- **WHEN** the user accepts the stack-pack offer during `wong-setup`
- **THEN** the seed manifest records `components.stackPack: true`
- **AND** the fresh-mode `/wong-sync` pull installs the pack's files with the rest of the payload

#### Scenario: User declines the pack

- **WHEN** the user declines the offer
- **THEN** setup proceeds normally, `components.stackPack` stays false/absent, and no pack file is installed

#### Scenario: The offer is not a toll gate

- **WHEN** the user declines or ignores the pack offer
- **THEN** the rest of setup completes exactly as it would for a repo that was never offered the pack

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 6409 -->
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

<!-- end specs/stack-pack/spec.md -->
<!-- file specs/toolchain-dependencies/spec.md utf8 1699 -->
## MODIFIED Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`. No core payload script or skill SHALL invoke a standalone `jq`, `python`, `node`, or other interpreter to do work the agent or an already-required tool can do. The **opt-in Cloudflare stack pack** MAY require additional tools (`node`/`npm`, `wrangler`, and a Cloudflare account) — but only in a repo that explicitly took the pack, and only in that repo's own build/CI, never in a WongStack skill. A repo that did not take the pack SHALL still run the entire toolkit on `git`, `gh`, and `openspec` alone. The required-tools page SHALL state this split so the core three-tool guarantee stays true.

#### Scenario: Target repo has gh but not jq

- **WHEN** any core WongStack skill or script runs in a repo on a machine where `git`, `gh`, and `openspec` are installed but `jq` is not
- **THEN** every skill and script completes with correct results, invoking no command outside that set

#### Scenario: Onboarding preflight

- **WHEN** `/wong-setup` runs its readiness check
- **THEN** it checks for `git`, `gh` (installed and authenticated), a resolving `origin` remote, and `openspec`
- **AND** it does not check for or require `jq`

#### Scenario: Pack's extra tools are opt-in and repo-local

- **WHEN** a repo takes the stack pack
- **THEN** the pack's scripts run `node`/`wrangler` in that repo's own build/CI, and the required-tools page documents these as pack-only additions
- **AND** a repo that declined the pack still runs every WongStack skill on `git`, `gh`, and `openspec` alone

<!-- end specs/toolchain-dependencies/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 3128 -->
## MODIFIED Requirements

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list (which files sync) SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else installs through the fresh-mode pull. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages, and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — that is read and copied **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be read or copied. Files outside the manifest MUST never be read or copied in either direction. A payload skill installed under a different local name SHALL be diffed under that name via the manifest's skills mapping.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill
- **THEN** the sync's pull leg offers the update like any other payload file

#### Scenario: App files cannot leak

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never reads them and they cannot appear in the clone or the PR

#### Scenario: Pack files are in-manifest only for opt-in repos

- **WHEN** `/wong-sync` runs in a repo whose manifest lacks `components.stackPack: true`
- **THEN** the pack's files are treated as outside the manifest — never classified, pulled, or offered
- **AND** in a repo with `components.stackPack: true`, those same files are classified and pulled like any other payload file

## ADDED Requirements

### Requirement: The opt-in pack refreshes through the existing three-way diff

For a repo with `components.stackPack: true`, `/wong-sync` SHALL refresh the pack's drop-in files using the same three-way classification it applies to every payload file — no separate refresh mechanism. A pack file unchanged locally since install and changed upstream SHALL update silently in the batch; a pack file edited locally SHALL be shown and asked before any overwrite; a file changed on both sides SHALL surface as a three-way conflict. The pack's guided config fragments (the merges into target-owned files) SHALL follow the `CLAUDE.md`-block precedent rather than whole-file replacement.

#### Scenario: Untouched pack file updates silently

- **WHEN** a repo took the pack, has not edited `scripts/cf-build.sh`, and upstream ships a new version
- **THEN** the file classifies as an upstream update and refreshes in the batch-approvable pull

#### Scenario: Locally edited pack file is not clobbered

- **WHEN** a repo edited its copy of a pack script and upstream also changed it
- **THEN** `/wong-sync` shows the three-way view and asks before writing, never overwriting the local edit silently

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-27

~~~
<!-- end .openspec.yaml -->
