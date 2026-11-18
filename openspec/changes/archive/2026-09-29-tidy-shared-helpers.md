<!-- openspec-archive v1 2026-09-29-tidy-shared-helpers -->
<!-- file proposal.md utf8 8395 -->
# Tidy the shared helpers, checks, and test fakes

**Status:** ready-to-ship
**Branch:** naive-panther
**Open questions:** none

## Why

The same small pieces of code are copied across many scripts, and some copies have already drifted apart: one deploy script still loses the error text a sibling keeps. Each copy is a place a later fix can miss. This part of the audit folds the copies into one home each, and removes code nothing uses.

## What Changes

- **One copy of each shared piece.** Code that about fifteen scripts repeat now lives in one place, and each script uses it. Nothing you see changes; a later fix lands once, not fifteen times.
  ```text
     BEFORE                 AFTER
  ┌──────────┐          ┌──────────┐
  │ script A │ copy     │ script A │──┐
  ├──────────┤          ├──────────┤  │  ┌────────┐
  │ script B │ copy     │ script B │──┼─▶│ shared │
  ├──────────┤          ├──────────┤  │  └────────┘
  │ script C │ copy     │ script C │──┘
  └──────────┘          └──────────┘
  ```
- **One set of safety checks before a test upload.** The checks that stop a test copy of your app from overwriting the live one run from one shared place, so the two upload paths can not disagree. A failed upload now shows its full error.
- **One answer to "which branch is live".** Every upload script works out your live branch the same way.
- **Less repetition in the automatic checks.** The step that works out what a change touched is written once and shared by the three check runs. An out-of-date note in one of them is corrected.
- **New servers run the Node version the checks test.** Already true on main since 27.1.2, which moved new servers to Node 22 and added the check; this change only keeps the spec wording.
- **Warnings in your app's code now fail its checks**, as they already do for WongStack's own code. A sync may surface warnings you then fix.
- **One fake Cloudflare in the tests**, instead of two that copy each other's database part.
- **Unused code removed**: the cost report nothing runs, and pieces of three scripts that nothing calls.

Non-goals: no change to what the upload checks refuse (the database check comes from the "Real bugs" part), and no new features.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: the server script installs the Node major that CI's `.nvmrc` names, and a test fails when they differ.
- `app-scaffold`: the scaffold's `npm test` fails on a lint warning.
- `stack-pack`: every pack script resolves the production branch by one rule.
- `context-economy`: the billed-usage report is removed.

## Impact

- Skills: new `.agents/skills/memory/scripts/lib/cli.mjs` (`isMain`, `parseCli`, `usageError`); about 15 skill scripts, `server/install-wongstack.mjs`, and `.github/scripts/loosened-checks.mjs` import it; `scripts/lib-cli.mjs` re-exports it. `routine/scripts/lib/paseo.mjs` gains the routine scripts' argument parser and `git()`. `wong-setup/scripts/provision.mjs` imports `parseEnv` from the memory store.
- Pack: `scripts/lib-wrangler-config.{sh,mjs}`, `cf-deploy.sh`, `cf-preview.sh`, `cf-secrets.mjs`, `mini-dashboard.mjs`; `app/package.json` lint script.
- CI: new composite action `.github/actions/change-scope/action.yml` (core payload), used by `test.yml`, `deploy.yml`, and `payload.yml`.
- Server: `server/setup.sh` installs Node 22.
- Tests: new shared `scripts/tests/fixtures/d1.mjs`; `server-setup.test.mjs` imports `PIN_FILES`; removed `scripts/measure-usage.mjs` and `usage-measurement.test.mjs`.
- Release: a patch `CHANGELOG.md` entry with an **Updating.** note about lint warnings; `measure-usage.mjs` added to `scripts/retired-names.json`.
- Overlaps "Real bugs" (workspace "curvy-dog") in `scripts/cf-*.sh` and `lib-wrangler-config.*`; whichever publishes second catches up.

## Decision log

- **2026-09-29** — Asked (in the 2026-09-29 audit) which findings to fix → chose all eight, each by its suggested fix; this plan carries the tidy-up part.
- **2026-09-29** — Asked whether new servers or the checks should move so their Node versions match → chose servers use 22, the version CI already tests.
- **2026-09-29** — Asked whether to delete the unused cost report, which the specs promise → chose delete it and remove the promise.
- **2026-09-29** — Assumed: every audit item is still present on main after v27.0.0, because each was rechecked at its current line; none is dropped.
- **2026-09-29** — Assumed: the shared `isMain`/`parseCli` lives in `memory/scripts/lib/cli.mjs` beside `primary-root.mjs`, and `scripts/lib-cli.mjs` re-exports it, because skills and `cf-secrets.mjs` already import that folder by path, so one copy serves skills, pack, CI, and the server installer.
- **2026-09-29** — Assumed: the unified `isMain` resolves both paths and returns false on an error, because that version survives symlinked checkouts, where the argv-only version misses a match.
- **2026-09-29** — Assumed: the routine scripts' shared parser takes each script's flags as options and throws the existing `PaseoError` with `EXIT.input`, so every error message and exit code stays the same.
- **2026-09-29** — Assumed: the deploy guards reuse the "Real bugs" part's staging-database check and add no second one, because that part owns it.
- **2026-09-29** — Assumed: the production branch rule is `CF_PRODUCTION_BRANCH`, then the remote's default branch, then `main`, because the preview script already uses it and it names the live branch correctly on Workers Builds when no variable is set.
- **2026-09-29** — Assumed: `.github/scripts/app-untouched.sh` keeps its own default-branch lookup, because it answers a different question (what to compare with) and must report "unknown" rather than guess `main`; its core script also must not depend on a pack file.
- **2026-09-29** — Assumed: the composite action shares only the "Check what the change touches" step and its summary line, because GitHub can not share a job's `if`, `concurrency`, or the checkout that must run before a local action loads.
- **2026-09-29** — Assumed: the release is a minor, because the release rule on main now calls new behavior minor and failing on a lint warning is new; the lint change gets an **Updating.** note.
- **2026-09-29** — Assumed: the one-line `isMain` edit in `verify/scripts/hand-over.mjs` needs no coordination with the "phone-sized-hand-over" plan in another workspace, because that plan is unsaved and a rebase resolves one line.
- **2026-09-29** — Assumed: the plan's own CI task is dropped and the lint task waits on no separate save, because `/ship`'s one checkpoint runs CI after the archive.
- **2026-09-29** — Assumed: the build leaves `cf-preview.sh`'s current staging-database lines as they are and adds no database check to `cf-deploy.sh`, because the "Real bugs" part's `wong_config staging-database` is not on main yet; whichever part publishes second calls it beside `wong_refuse_production_worker`.
- **2026-09-29** — Assumed: catching up with main after "Real bugs" shipped as 27.2.1, `cf-deploy.sh` and `cf-preview.sh` keep its `wong_config staging-database` call beside `wong_refuse_production_worker`, and the `stack-pack` spec keeps both new requirements.
- **2026-09-29** — Assumed: this change's own Node-version test is dropped, because 27.1.2 already moved new servers to Node 22 and added the same test.
- **2026-09-29** — Check: `.github/workflows/test.yml`, `.github/workflows/deploy.yml`, and `.github/workflows/payload.yml` move the scope step into a shared action; every check still runs as before.
- **2026-09-29** — Check: `.github/scripts/loosened-checks.mjs` imports the shared `isMain`/`parseCli`; what it flags is unchanged.
- **2026-09-29** — Check: `app/package.json` runs `oxlint --deny-warnings`, which is stricter.
- **2026-09-29** — Check: `scripts/tests/usage-measurement.test.mjs` is deleted with the script it tested.
- **2026-09-29** — Archive checkpoint: archived by `/ship` and saved as release 27.3.0, after catching up with main (27.2.2), where "Real bugs" had shipped.

<!-- end proposal.md -->
<!-- file design.md utf8 10028 -->
# Design

## Context

An `/explore` audit on 2026-09-29 listed eight tidy-ups (see proposal.md, Why). Each was rechecked against `main` at v27.0.0 (`3c7ff20`); all are still present, at these lines:

1. **isMain / CLI.** Argv-only `realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)`: `plan/scripts/build-review.mjs:219`, `save/scripts/checkpoint-evidence.mjs:107`, `save/scripts/render-pr-body.mjs:56`, `memory/scripts/lib/store.mjs:39` (exported `isMain`), `memory/scripts/lib/primary-root.mjs:37`, `wong-setup/scripts/provision.mjs:609`, `server/install-wongstack.mjs:265`. Both-sides-resolved: `routine/scripts/{routine:334,tidy:602,workspace:264,presets:164}.mjs`, `explore/scripts/other-work.mjs:263`, `wong-sync/scripts/{preflight:616,merge-check:117}.mjs`, `improve/scripts/survey.mjs:287`, `verify/scripts/hand-over.mjs:593`. `.github/scripts/loosened-checks.mjs:255-267` hand-writes `parseCli`. `scripts/lib-cli.mjs` has the both-sides `isMain`, `usageError`, `parseCli`.
2. **Routine parsers.** `routine.mjs:250`, `tidy.mjs:570`, `workspace.mjs:173`, `presets.mjs:112` each parse `<command> [flags]`; `tidy.mjs:174` (sync) and `workspace.mjs:123` (async) each define `git()`.
3. **.env parser.** `provision.mjs:151 readEnv` repeats `store.mjs:71 parseEnv` line for line.
4. **Deploy guards.** `cf-deploy.sh:109-127` / `cf-preview.sh:132-135` pick `STAGING_ENV`; `cf-deploy.sh:137-148` / `cf-preview.sh:84-95` refuse a staging name equal to production's. `cf-deploy.sh:98,155,161` expand possibly-empty arrays bare; `:161` pipes only stdout to `tee`. Config lookup: `lib-wrangler-config.sh:28-46` and `lib-wrangler-config.mjs:41-52`. Production branch: `lib-wrangler-config.sh:94` (`CF_PRODUCTION_BRANCH` or `main`), `cf-preview.sh:68-70` (variable, `origin/HEAD`, `main`), `app-untouched.sh:105-109` (`DEFAULT_BRANCH`, `origin/HEAD`).
5. **Pins.** `update.mjs:25 PIN_FILES` and `server-setup.test.mjs:25-29 PINS`. `server/setup.sh:27` installs `setup_24.x`; `.nvmrc` is `22`.
6. **Workflows.** `test.yml:71-76`, `payload.yml:36-48`, `deploy.yml:133-143` run the same scope step; `deploy.yml:82-98` describes a test job that moved to `test.yml`.
7. **Fakes.** `scripts/tests/fixtures/cloudflare.mjs:35` and `fixtures/memory/harness.mjs:16` share `run()` and the D1 query handler (`BEGIN`, map statements, `COMMIT`, `ROLLBACK` → code 7500).
8. **Unused.** `scripts/measure-usage.mjs` (and `usage-measurement.test.mjs`, a `cli-conventions.test.mjs` entry); `mini-dashboard.mjs` exports `readApps`, `appsJson`, `writeInto`; `lib-wrangler-config.mjs:180` exports `readDatabaseName`; `app/package.json` `"lint": "oxlint"`; `cf-secrets.mjs:506` prints `app/.dev.vars`.

Skills already import `../../memory/scripts/lib/primary-root.mjs`, and `scripts/cf-secrets.mjs` imports `../.claude/skills/memory/scripts/lib/primary-root.mjs`, so a shared file in that folder reaches every surface. Every install takes all four payload categories.

## Goals / Non-Goals

**Goals:** one copy of each helper; every changed script keeps its output, exit codes, and error text, except the deploy's kept stderr.

**Non-Goals:** the staging-database check (the "Real bugs" part adds it to `lib-wrangler-config.mjs`); sharing a job's `if`, `concurrency`, or checkout, which GitHub Actions can not factor out without a reusable workflow that renames the required checks.

## Decisions

### 1. One CLI module, in the memory skill

New `.agents/skills/memory/scripts/lib/cli.mjs` holds `isMain(url)`, `usageError(usage, message)`, and `parseCli({...})`, moved verbatim from `scripts/lib-cli.mjs`. `scripts/lib-cli.mjs` becomes `export * from '../.claude/skills/memory/scripts/lib/cli.mjs';` so the pack's existing imports stay. Every script in item 1 replaces its own check with `isMain(import.meta.url)`; `store.mjs` drops its `isMain` export and re-exports the shared one for its current importers (`run.mjs`, `memory.mjs`, `session-start.mjs`). `loosened-checks.mjs` and `primary-root.mjs` call `parseCli`. `install-wongstack.mjs` imports it by `../.agents/skills/memory/scripts/lib/cli.mjs`, the path it already uses for `provision.mjs`.

The lib-cli comment "Skill scripts keep their own copy … because a skill ships alone" is replaced by one naming the shared file. Alternative: keep `scripts/lib-cli.mjs` canonical and have skills import the pack. Rejected: a core file would lean on a pack file, the reverse of the existing `cf-secrets.mjs` → memory import.

### 2. Routine helpers in `lib/paseo.mjs`

`paseo.mjs` gains:

- `parseCommand(argv, { values = [], booleans = {} })` → `{ command, flags, positional }`. `values` are `--name <value>` flags; `booleans` maps a flag to its key (`{ '--dry-run': 'dryRun' }`). An unknown flag or a missing value throws `PaseoError(EXIT.input, …)` with each script's current message, passed in as `unknown(arg)`.
- `git(cwd, ...args)`: `execFileSync('git', ['-C', cwd, ...args])`, piped, `trimEnd()`. `workspace.mjs`'s `await git(cwd, [...])` becomes `git(cwd, ...)`; awaiting a string is harmless, and its callers already sit in async code.

`tidy.mjs` keeps its command-scoped booleans (`--discard` only for `close`, `--report` only for `sweep`) by passing a per-command `booleans` map.

### 3. `provision.mjs` imports `parseEnv`

`readEnv(file)` becomes `existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}`, importing `parseEnv` from `../../memory/scripts/lib/store.mjs`. `readEnv` stays exported for `install-wongstack.mjs`.

### 4. Deploy guards as `wong_*` functions

In `lib-wrangler-config.sh`:

- `wong_production_branch <root>` prints `CF_PRODUCTION_BRANCH`, else `git -C <root> symbolic-ref --short refs/remotes/origin/HEAD` without `origin/`, else `main`. `wong_ci_branch` sets `PRODUCTION_BRANCH` from it; `cf-preview.sh:68-70` calls it.
- `wong_staging_env_args` sets the `STAGING_ENV` array: empty when `$APP_DIR/.wrangler/deploy/config.json` exists, else `(--env staging)`. The long redirect comment moves here from `cf-deploy.sh`.
- `wong_refuse_production_worker <prefix>` reads `PROD_NAME` and `STAGING_NAME` through `wong_config`, and on a match prints one shared message (both fixes: give `env.staging` its own name; a plugin build must select it) under `<prefix>:` and returns 1. The "Real bugs" part's staging-database check is called beside it, not rewritten.
- `wong_resolve_wrangler_config` asks `node lib-wrangler-config.mjs config-path` (a new CLI answer printing `findWranglerConfigOrNull()` or exiting 3) instead of walking folders itself, so the lookup lives only in `.mjs`. Its "no config" message and return 1 stay.

Every array expansion becomes `${ARR[@]+"${ARR[@]}"}`, and `cf-deploy.sh`'s `versions upload` pipes `2>&1` into `tee`, as `cf-preview.sh` does.

`app-untouched.sh` keeps its lookup (Decision log). Alternative: source `lib-wrangler-config.sh` from it. Rejected: a core CI script would need a pack file, and its "unknown" answer must not become `main`.

### 5. Pins and Node

`server-setup.test.mjs` imports `PIN_FILES` from `update.mjs` and drops `payload.yml` (the reference) from the loop. A new test reads `setup_(\d+)\.x` from `server/setup.sh` and the major in `.nvmrc` and asserts they are equal, naming both. `setup.sh` moves to `setup_22.x`; `server/README.md` and the `install-onboarding` spec say "the Node.js major `.nvmrc` names".

### 6. One composite action for the scope step

New `.github/actions/change-scope/action.yml`, a composite action:

- runs `bash "$GITHUB_WORKSPACE/.github/scripts/app-untouched.sh"` with `DEFAULT_BRANCH` and `BEFORE_SHA` from the `github` context, tees to `$GITHUB_OUTPUT`;
- maps outputs `untouched`, `mini_apps`, `mini_changed`, `docs_only`, `base`;
- takes optional `skip-when` (newline-separated `key=value`, all must match), `skipped-note`, and `ran-note`, and appends the matching note to `$GITHUB_STEP_SUMMARY`.

Each workflow keeps checkout (`fetch-depth: 0`) and calls `uses: ./.github/actions/change-scope` with `id: scope`, so every `steps.scope.outputs.*` reference stays. `payload.yml` passes `docs_only=true` and its two notes; `deploy.yml` passes `untouched=true` / `mini_changed=false` and its one note. The action joins `payload-files.json` core files and the payload manifest's core list. `deploy.yml:82-98` becomes a short comment on the build job alone.

### 7. One D1 fake

New `scripts/tests/fixtures/d1.mjs` exports `run(db, sql, params)` and `d1Query(db, body)` → `[status, json]`. Both fakes call it; `cloudflare.mjs` keeps its per-database map and `d1Failures`, `harness.mjs` its single database.

### 8. Removals

- Delete `scripts/measure-usage.mjs` and `scripts/tests/usage-measurement.test.mjs`; drop its entry from `cli-conventions.test.mjs`; add `measure-usage.mjs` to `scripts/retired-names.json`.
- Unexport `readApps`, `appsJson`, `writeInto` (`mini-dashboard.mjs`) and `readDatabaseName` (`lib-wrangler-config.mjs`).
- `app/package.json`: `"lint": "oxlint --deny-warnings"`.
- `cf-secrets.mjs:506` names `relative(repoRoot, resolve(secretsDir(appDir), SOURCE))`.

## Risks / Trade-offs

- [Both parts edit `cf-*.sh` and `lib-wrangler-config.*`] → whichever publishes second rebases; `wong_refuse_production_worker` calls the bugs part's D1 check by name once it exists.
- [`--deny-warnings` may turn an install's CI red after a sync] → the changelog's **Updating.** note says to fix the named warnings.
- [Deleting a covered script lowers the c8 total below the floor in `.c8rc.json`] → CI reports it; raise coverage elsewhere, never lower the floor.
- [`wong_production_branch` now reads `origin/HEAD` on Workers Builds] → it only differs from `main` when the remote's default is not `main`, where the old answer was wrong.
- [The composite action is new payload] → a target missing it fails at `uses:`; `/wong-sync` copies it with the workflows, as a core file.

## Migration Plan

A patch release. `/wong-sync` copies the action and scripts; its note covers lint warnings. Servers already built keep Node 24 until rebuilt.

<!-- end design.md -->
<!-- file tasks.md utf8 4826 -->
# Tasks

## 1. Shared CLI helpers (skills, server, CI script)

- [x] 1.1 Create `.agents/skills/memory/scripts/lib/cli.mjs` with `isMain`, `usageError`, and `parseCli` moved from `scripts/lib-cli.mjs`; make `scripts/lib-cli.mjs` re-export it and replace its "a skill ships alone" comment.
- [x] 1.2 Replace the hand-written main check with `isMain(import.meta.url)` in `plan/scripts/build-review.mjs`, `save/scripts/checkpoint-evidence.mjs`, `save/scripts/render-pr-body.mjs`, `memory/scripts/lib/primary-root.mjs`, `wong-setup/scripts/provision.mjs`, `routine/scripts/{routine,tidy,workspace,presets}.mjs`, `explore/scripts/other-work.mjs`, `wong-sync/scripts/{preflight,merge-check}.mjs`, `improve/scripts/survey.mjs`, `verify/scripts/hand-over.mjs`, and `server/install-wongstack.mjs`; drop imports left unused.
- [x] 1.3 Make `memory/scripts/lib/store.mjs` re-export the shared `isMain` in place of its own, so `run.mjs`, `memory.mjs`, and `session-start.mjs` keep their import.
- [x] 1.4 Use `parseCli` in `.github/scripts/loosened-checks.mjs` and `primary-root.mjs`, keeping each usage text and exit code.
- [x] 1.5 Move the routine scripts' four argument parsers into one `parseCommand` and the two `git()` helpers into one `git` in `routine/scripts/lib/paseo.mjs`, keeping every error message and exit code.
- [x] 1.6 Replace `provision.mjs`'s `readEnv` body with `parseEnv` imported from `memory/scripts/lib/store.mjs`.
- [x] 1.7 Extend the tests: `isMain` true through a symlinked path and false for an imported module; `parseCommand` refuses an unknown flag and a missing value with `EXIT.input`; the existing routine, provision, loosened-checks, and CLI-convention tests still pass unchanged.

## 2. Deploy pack scripts

- [x] 2.1 Add `wong_production_branch`, `wong_staging_env_args`, and `wong_refuse_production_worker` to `scripts/lib-wrangler-config.sh`; make `wong_ci_branch` and `cf-preview.sh` use the branch rule, and `cf-deploy.sh` and `cf-preview.sh` use the two guards, calling the "Real bugs" part's staging-database check beside them.
- [x] 2.2 Add a `config-path` answer to `lib-wrangler-config.mjs` and make `wong_resolve_wrangler_config` use it instead of its own folder walk.
- [x] 2.3 In `cf-deploy.sh`, guard every array expansion with `${ARR[@]+"${ARR[@]}"}` and send `versions upload`'s stderr to `tee`.
- [x] 2.4 Unexport `readDatabaseName` in `lib-wrangler-config.mjs` and `readApps`, `appsJson`, `writeInto` in `mini-dashboard.mjs`; make `cf-secrets.mjs` name the `.dev.vars` path it resolved.
- [x] 2.5 Extend the pack tests: the deploy, with no `CF_PRODUCTION_BRANCH` and an `origin/HEAD` of `trunk`, deploys production on `trunk`; the variable beats `origin/HEAD` for both scripts; the deploy's upload failure shows wrangler's stderr; both scripts still refuse a staging name equal to production's, with and without a build redirect; the config is found at the root and in a subfolder through the one lookup. Run each pack edit against a synthetic repo under `/tmp`, as the memory note on pack scripts asks.

## 3. CI workflows and payload list

- [x] 3.1 Create `.github/actions/change-scope/action.yml` (composite: run `app-untouched.sh`, map its five outputs, optional `skip-when`/`skipped-note`/`ran-note` summary).
- [x] 3.2 Replace the scope step in `test.yml`, `payload.yml`, and `deploy.yml` with `uses: ./.github/actions/change-scope` under `id: scope`; rewrite the stale comment at `deploy.yml:82-98`.
- [x] 3.3 Add the action to `payload-files.json` core files and to the core list in `payload-manifest.md`.
- [x] 3.4 Set `"lint": "oxlint --deny-warnings"` in `app/package.json`; the ship checkpoint's CI confirms no warnings.

## 4. Server and pins

- [x] 4.1 Change `server/setup.sh` to `setup_22.x` and `server/README.md`'s end state to the Node major `.nvmrc` names.
- [x] 4.2 In `scripts/tests/server-setup.test.mjs`, import `PIN_FILES` from `update-dependencies/scripts/update.mjs` in place of `PINS`, and add a test that fails, naming both, when `setup.sh`'s Node major differs from `.nvmrc`.

## 5. Test fakes and removals

- [x] 5.1 Create `scripts/tests/fixtures/d1.mjs` with `run` and `d1Query`; make `fixtures/cloudflare.mjs` and `fixtures/memory/harness.mjs` use it; the memory and provisioning suites pass unchanged.
- [x] 5.2 Delete `scripts/measure-usage.mjs` and `scripts/tests/usage-measurement.test.mjs`, drop its `cli-conventions.test.mjs` entry, and add it to `scripts/retired-names.json`.

## 6. Release

- [x] 6.1 Add a `## Next (patch) — Tidy the shared helpers, checks, and test fakes` entry to `CHANGELOG.md`, with an **Updating.** note: the app's checks now fail on a lint warning; fix any the check names.
- [x] 6.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/check-openspec-config.mjs`.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 884 -->
## MODIFIED Requirements

### Requirement: npm test runs absolute quality gates

The scaffold's `npm test` SHALL fail on any coverage below 100%, a function over the complexity cap, a file over 500 lines, an explicit `any`, a lint warning, dead code, or duplicated code. The gates SHALL be absolute, not baselined, and the scaffold SHALL pass all of them as shipped, with no extra workflow.

#### Scenario: A violation

- **WHEN** a commit adds an explicit `any` or an uncovered line to the scaffold
- **THEN** `npm test` exits non-zero and the existing test check goes red

#### Scenario: The shipped scaffold

- **WHEN** `npm test` runs on the scaffold as shipped
- **THEN** every gate passes, and none is skipped or allowed to fail

#### Scenario: A lint warning

- **WHEN** a commit adds code the linter warns about but does not call an error
- **THEN** `npm test` exits non-zero

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/context-economy/spec.md utf8 295 -->
## REMOVED Requirements

### Requirement: Billed usage is measurable per task

**Reason**: Nothing ran the report and no page told anyone to; its script and tests were upkeep with no use.
**Migration**: None. Recover `scripts/measure-usage.mjs` from Git history if a cost count is needed again.

<!-- end specs/context-economy/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 1332 -->
## MODIFIED Requirements

### Requirement: The server script builds an agent workspace

The source SHALL ship `server/setup.sh`, which, run as root with no prompt on a fresh Ubuntu 24.04 server, SHALL create the `WORKSPACE_USER` (default `wong`), install the Node.js major that CI's `.nvmrc` names, git, `gh`, OpenSpec, Paseo, the coding agents, agent-browser, and Cloudflare's tunnel tool `cloudflared`, and run Paseo as a service for that user. It SHALL NOT run `cloudflared` as a service. It SHALL be safe to run again and SHALL end by checking each promised tool, exiting non-zero and naming what is missing.

#### Scenario: A fresh server

- **WHEN** a person runs `sudo bash server/setup.sh` on a fresh server
- **THEN** it exits 0 with every promised tool installed and Paseo running

#### Scenario: A tool is missing

- **WHEN** a promised tool is absent at the end
- **THEN** the script exits non-zero and names it

#### Scenario: The check and the contract agree

- **WHEN** the script's final check and the end state in `server/README.md` name different tools
- **THEN** the source's tests fail and name the difference

#### Scenario: The server's Node and CI's Node differ

- **WHEN** `server/setup.sh` installs a Node.js major other than the one `.nvmrc` names
- **THEN** the source's tests fail and name both versions

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 744 -->
## ADDED Requirements

### Requirement: Pack scripts agree on the production branch

Every pack script that asks which branch is production SHALL answer by one rule: `CF_PRODUCTION_BRANCH` when set, else the remote's default branch when Git knows it, else `main`.

#### Scenario: Workers Builds with no variable set

- **WHEN** the deploy script runs on Workers Builds with no `CF_PRODUCTION_BRANCH`, on the branch the remote names as its default, `trunk`
- **THEN** it deploys production, and the preview script refuses to upload from `trunk`

#### Scenario: The variable wins

- **WHEN** `CF_PRODUCTION_BRANCH` names a branch other than the remote's default
- **THEN** the deploy and preview scripts both treat the named branch as production

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-29

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41388 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-29-tidy-shared-helpers</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-29-tidy-shared-helpers">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-29-tidy-shared-helpers</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The same small pieces of code are copied across many scripts, and some copies have already drifted apart: one deploy script still loses the error text a sibling keeps. Each copy is a place a later fix can miss. This part of the audit folds the copies into one home each, and removes code nothing uses.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>One copy of each shared piece.</b> Code that about fifteen scripts repeat now lives in one place, and each script uses it. Nothing you see changes; a later fix lands once, not fifteen times.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">   BEFORE                 AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌──────────┐          ┌──────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ script A │ copy     │ script A │──┐</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">├──────────┤          ├──────────┤  │  ┌────────┐</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ script B │ copy     │ script B │──┼─▶│ shared │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">├──────────┤          ├──────────┤  │  └────────┘</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│ script C │ copy     │ script C │──┘</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">└──────────┘          └──────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>One set of safety checks before a test upload.</b> The checks that stop a test copy of your app from overwriting the live one run from one shared place, so the two upload paths can not disagree. A failed upload now shows its full error.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>One answer to &quot;which branch is live&quot;.</b> Every upload script works out your live branch the same way.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Less repetition in the automatic checks.</b> The step that works out what a change touched is written once and shared by the three check runs. An out-of-date note in one of them is corrected.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>New servers run the Node version the checks test.</b> Already true on main since 27.1.2, which moved new servers to Node 22 and added the check; this change only keeps the spec wording.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Warnings in your app's code now fail its checks</b>, as they already do for WongStack's own code. A sync may surface warnings you then fix.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>One fake Cloudflare in the tests</b>, instead of two that copy each other's database part.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Unused code removed</b>: the cost report nothing runs, and pieces of three scripts that nothing calls.</div></div></li>
</ol>
<p class="aside">Non-goals: no change to what the upload checks refuse (the database check comes from the &quot;Real bugs&quot; part), and no new features.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked (in the 2026-09-29 audit) which findings to fix → chose all eight, each by its suggested fix; this plan carries the tidy-up part.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked whether new servers or the checks should move so their Node versions match → chose servers use 22, the version CI already tests.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked whether to delete the unused cost report, which the specs promise → chose delete it and remove the promise.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: every audit item is still present on main after v27.0.0, because each was rechecked at its current line; none is dropped.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the shared <code>isMain</code>/<code>parseCli</code> lives in <code>memory/scripts/lib/cli.mjs</code> beside <code>primary-root.mjs</code>, and <code>scripts/lib-cli.mjs</code> re-exports it, because skills and <code>cf-secrets.mjs</code> already import that folder by path, so one copy serves skills, pack, CI, and the server installer.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the unified <code>isMain</code> resolves both paths and returns false on an error, because that version survives symlinked checkouts, where the argv-only version misses a match.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the routine scripts' shared parser takes each script's flags as options and throws the existing <code>PaseoError</code> with <code>EXIT.input</code>, so every error message and exit code stays the same.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the deploy guards reuse the &quot;Real bugs&quot; part's staging-database check and add no second one, because that part owns it.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the production branch rule is <code>CF_PRODUCTION_BRANCH</code>, then the remote's default branch, then <code>main</code>, because the preview script already uses it and it names the live branch correctly on Workers Builds when no variable is set.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>.github/scripts/app-untouched.sh</code> keeps its own default-branch lookup, because it answers a different question (what to compare with) and must report &quot;unknown&quot; rather than guess <code>main</code>; its core script also must not depend on a pack file.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the composite action shares only the &quot;Check what the change touches&quot; step and its summary line, because GitHub can not share a job's <code>if</code>, <code>concurrency</code>, or the checkout that must run before a local action loads.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the release is a minor, because the release rule on main now calls new behavior minor and failing on a lint warning is new; the lint change gets an <b>Updating.</b> note.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the one-line <code>isMain</code> edit in <code>verify/scripts/hand-over.mjs</code> needs no coordination with the &quot;phone-sized-hand-over&quot; plan in another workspace, because that plan is unsaved and a rebase resolves one line.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the plan's own CI task is dropped and the lint task waits on no separate save, because <code>/ship</code>'s one checkpoint runs CI after the archive.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the build leaves <code>cf-preview.sh</code>'s current staging-database lines as they are and adds no database check to <code>cf-deploy.sh</code>, because the &quot;Real bugs&quot; part's <code>wong_config staging-database</code> is not on main yet; whichever part publishes second calls it beside <code>wong_refuse_production_worker</code>.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: catching up with main after &quot;Real bugs&quot; shipped as 27.2.1, <code>cf-deploy.sh</code> and <code>cf-preview.sh</code> keep its <code>wong_config staging-database</code> call beside <code>wong_refuse_production_worker</code>, and the <code>stack-pack</code> spec keeps both new requirements.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: this change's own Node-version test is dropped, because 27.1.2 already moved new servers to Node 22 and added the same test.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-29</p>Check: <code>.github/workflows/test.yml</code>, <code>.github/workflows/deploy.yml</code>, and <code>.github/workflows/payload.yml</code> move the scope step into a shared action; every check still runs as before.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-29</p>Check: <code>.github/scripts/loosened-checks.mjs</code> imports the shared <code>isMain</code>/<code>parseCli</code>; what it flags is unchanged.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-29</p>Check: <code>app/package.json</code> runs <code>oxlint --deny-warnings</code>, which is stricter.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-29</p>Check: <code>scripts/tests/usage-measurement.test.mjs</code> is deleted with the script it tested.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-29</p>Archive checkpoint: archived by <code>/ship</code> and saved as release 27.3.0, after catching up with main (27.2.2), where &quot;Real bugs&quot; had shipped.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
