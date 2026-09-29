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
