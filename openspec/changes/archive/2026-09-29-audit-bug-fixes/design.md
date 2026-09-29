# Design

## Context

Four independent fixes from the 2026-09-29 audit, each checked against the code on v27.0.0:

- `scripts/cf-build.sh:117-121` runs `wrangler d1 migrations apply` on the staging entry with no production check. `cf-preview.sh:106-111` and `reset-staging-d1.mjs:47-62` compare `database_name` only; `cf-deploy.sh` compares Worker names only.
- Four test-file rules: `test.yml`'s `find` (Node's default patterns, minus `test/` folders), `loosened-checks.mjs:68` (`.test.`, `.spec.`, `test_`), `mini-dashboard.mjs:66` (`.test.` only), `router.mjs:17` (`.test.[cm]?js` only).
- `verify/SKILL.md:53` runs `npm run db:reset:staging` from the repo root; the script is defined only in `app/package.json`, and there is no root `package.json`.
- `provision.mjs:203-206` `durableEnv` falls back to `join(dir, '.env')` when the common dir does not end in `/.git`, which the secrets convention forbids.

## Goals / Non-Goals

**Goals:** close each bug with one shared rule where there were several; tests pin each.

**Non-Goals:** deduplicating the shell guards generally, the `isMain` copies, or the config lookup. The "Tidy the code" workspace owns those, and it will reuse the new D1 check.

## Decisions

### One staging-database check in `lib-wrangler-config.mjs`

Add `stagingDatabase(config)`:

- Returns `null` when neither production nor staging binds an app D1.
- Throws `WranglerConfigError` when production binds one and staging doesn't (today's "needs its own d1_databases entry" message).
- Throws when staging's first app entry matches production's by `database_name` or by `database_id`. The id comparison applies only when both ids are set.
- Otherwise returns staging's `database_name`.

The CLI gains `staging-database`, which prints the name or an empty line and exits 1 on the error.

The callers:

- **`cf-build.sh`** reads `DB_NAME=$(wong_config staging-database)` on the staging branch. An error stops it under `set -e`, before `wrangler`. The production branch keeps `database-name`.
- **`cf-preview.sh`** replaces its two inline blocks (lines 100-111) with the same call.
- **`cf-deploy.sh`** calls it on the staging path before `wrangler deploy`. The value is discarded; only the check matters.
- **`reset-staging-d1.mjs`**'s `stagingDatabase` becomes a thin wrapper that keeps its "Refusing to reset staging" prefix, plus one extra rule: with no staging database it refuses, since there is nothing to reset.

The alternative was a guard in each script. That is today's pattern, and the copies drifted.

### One test-file rule in `mini-apps/is-test-file.mjs`

The module exports:

- **`TEST_FILE`**: the union of Node's defaults (`*.test.*`, `*-test.*`, `*_test.*`, `test-*`, `test.*`, and anything under a `test/` folder) with `*.spec.*` and `test_*`. It is extension-agnostic, so a `.ts` test counts too.
- **`isTestFile(path)`**.
- **A CLI**, `node mini-apps/is-test-file.mjs <dir>`, which prints each test file Node can run (skipping `node_modules`), so CI runs exactly that list; it exits 0 when there is one and 1 when there is none.

The users:

- **`router.mjs`**'s `SOURCE` becomes `.ts` sources, plus `api.mjs`, plus `isTestFile`.
- **`mini-dashboard.mjs`**'s copy filter tests the path relative to the app folder, so a `test/` folder is dropped whole.
- **`loosened-checks.mjs`** imports `TEST_FILE`.
- **`test.yml`**'s `find` becomes the CLI call, and `node --test` runs the files it prints.

The module is plain JavaScript with no Node imports at the top level (the CLI part loads `node:fs` dynamically), so the Worker bundle stays free of Node built-ins.

Placement alternative: `.github/scripts/is-test-file.mjs`. It sits beside the core check, but the Worker would then import from `.github/`.

### `/verify` runs the reset script directly

`node "$ROOT/scripts/reset-staging-d1.mjs"`, with `ROOT` already set at step 1. It needs no npm and works whether the app is at the root or in `app/`.

### Setup finds the primary through `primaryRoot()`

`durableEnv` imports `primaryRoot` from `../../memory/scripts/lib/primary-root.mjs`, as `ship/scripts/worktree-secrets.mjs` does, and returns `join(primary, '.env')`. A `PrimaryRootError` becomes `ProvisionError('repo', …)` naming the cause.

`commonDir` stays for the provisioning state file, which belongs in the shared git folder.

## Risks / Trade-offs

- **A repo that deleted `mini-apps/`** would break the core loosened-check import. Every install takes the scaffold (payload manifest), and the scaffold ships `is-test-file.mjs`, so this needs a deliberate deletion; the failure is a loud import error, not a silent pass.
- **Staging entries without a `database_id`** (a hand-written config before provisioning) skip the id comparison, since two missing ids are not a match. The name comparison still runs.
- **`primaryRoot()` is synchronous** and uses real git, not provision's injectable `exec`. The provision tests already use a real git repository, so they cover it.
