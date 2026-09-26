## 1. Wrangler config parser

- [x] 1.1 Move `stripJsonc` and `parseConfig` from `scripts/cf-secrets.mjs` into `scripts/lib-wrangler-config.mjs` as exports. Add `workerName(config, env)`, `databaseName(config, env)`, and `hasD1(config, env)`, and refuse `wrangler.toml` with a message that names the supported files. Make `readDatabaseName` throw instead of calling `process.exit`. Give the module a CLI entry (`worker-name`, `database-name`, `has-d1`) (review.html#/failure-paths).
- [x] 1.2 Rewrite `scripts/lib-wrangler-config.sh` as thin wrappers around the CLI entry. Remove every regex read from `lib-wrangler-config.sh`, `cf-build.sh`, and `cf-deploy.sh`. `cf-secrets.mjs` and `reset-staging-d1.mjs` import the library and drop `findWranglerConfigOrNull`, `CONFIG_NAMES`, and the copy-if-absent comment.
- [x] 1.3 `cf-build.sh`: skip the migration step when `has-d1` is false. Keep the stop only when production binds D1 and staging does not.
- [x] 1.4 `reset-staging-d1.mjs`: stop when the staging database name equals production's. Drop all tables in one `--command` with `PRAGMA foreign_keys=OFF`.
- [x] 1.5 Add `scripts/tests/wrangler-config.test.mjs`. Cover a database listed before `name` in `env.staging`, a comment that contains `"staging":`, no D1, TOML refused, the redirected `.wrangler/deploy/config.json`, and `cf-deploy.sh`'s guard refusing equal names. Cover the build wrapper's no-D1 path and the reset's production refusal.

## 2. Gate and merge

- [x] 2.1 `save/scripts/wait-for-checks.sh`: poll until `headRefOid` equals `git rev-parse HEAD`. Return `NONE` at once only when `.github/workflows/` has no workflow file. Otherwise wait up to 60 s for a check, then report `UNKNOWN` (review.html#/failure-paths).
- [x] 2.2 Add `scripts/tests/wait-for-checks.test.mjs` with a fake `gh` on `PATH`: a stale head, no checks with workflows (`UNKNOWN` after grace, with the grace shortened by an env var), no workflows (`NONE`), an auth failure (`UNKNOWN`), and success.
- [x] 2.3 `ship/SKILL.md` Step 5: `--match-head-commit`, confirm `MERGED`, retarget to the default branch from `gh repo view`, then delete. Stop and report on any failure (review.html#/failure-paths).
- [x] 2.4 `ship/SKILL.md` preflight: treat an empty or failed `gh` answer as `UNKNOWN` and stop. Send a dirty default branch to `/save` before the pull-in.
- [x] 2.5 Add `save/references/preconditions.md` (gh auth, `origin`, `openspec --version`, each with its fix). Link it from `save`, `continue`, and `ship`. In `git-gate.md`, separate "no pull requests found" from other `gh pr view` failures.

## 3. Setup

- [x] 3.1 `wong-setup/SKILL.md` and `references/cloudflare.md`: before step 4d, check `gh auth status`, run `git init` when needed, and run `gh repo create <name> --private --source . --remote origin` when no `origin` exists. Stop before any Cloudflare call when `gh` is signed out.
- [x] 3.2 Extend `scripts/tests/downstream-contract.test.mjs`: the setup runbook creates the repository and `origin` before its first `gh secret set`.

## 4. Memory

- [x] 4.1 `session-start.mjs` and `memory.mjs`: exit in the stdout write callback. Add a test that starts the hook with `WONG_MEMORY_API` set to an unroutable address and asserts it exits in under 5 s with the offline digest.
- [x] 4.2 Capture on stdin: change the runbook steps in `memory/SKILL.md` and the `put-facts` hint in `memory.mjs` to `--file -`. Remove the `Edit` grant and the `work/` folder from `run.mjs`. Add a test that every command in the runbook matches the granted `Bash(...)` pattern (review.html#/failure-paths).
- [x] 4.3 `memory.mjs migrate`: skip versions recorded in `schema_migrations`, and record each new one. Test that a second run executes nothing.
- [x] 4.4 `run.mjs` lock: `statSync(..., { throwIfNoEntry: false })`. `seen.json`: write to a temp file and rename. Test two interleaved updates.

## 5. Small fixes

- [x] 5.1 `verify-staging.sh` reads `.env` values through the memory skill's `store.mjs` parser via `node`, instead of `grep | cut`. Test quotes, `export`, and CRLF.
- [x] 5.2 `verify-runner.sh`: build the Access header JSON with `node -e 'JSON.stringify(...)'`.
- [x] 5.3 `check-openspec-config.mjs`: fail on a non-zero exit unless the output is valid JSON. Add a negative-case test.
- [x] 5.4 `scripts/tests/review.test.mjs`: skip with a message when `jsdom` cannot be resolved.

## 6. Toolchain

- [x] 6.1 Add `.nvmrc` (`22`). Point `actions/setup-node` in all three workflows at `node-version-file: .nvmrc`. Add `"engines": { "node": ">=22.22.2" }` to `app/package.json`, and set `@types/node` to `^22`.
- [x] 6.2 Raise `wrangler` and `@cloudflare/vite-plugin` past the `sharp` advisory, and update the lockfile. Record the `npm audit` result before and after in the Decision log.
