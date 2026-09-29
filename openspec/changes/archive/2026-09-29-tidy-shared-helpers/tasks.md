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
