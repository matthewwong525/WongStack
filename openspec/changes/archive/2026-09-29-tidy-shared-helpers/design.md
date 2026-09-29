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
