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
