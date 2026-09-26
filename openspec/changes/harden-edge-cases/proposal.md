# Harden the edge cases

**Status:** ready-to-ship
**Branch:** plan-aot-opensource
**Open questions:** none

## Why

An audit on 2026-09-25 found failure paths where WongStack does the wrong thing quietly. `/ship` can delete the branch of a PR it failed to merge, and that closes the PR. The CI gate can pass on checks that GitHub has not registered yet. A config regex can let a staging deploy reach production. Session memory can outrun its hook timeout, and its background capture fails on every run. An open-source release needs these paths to fail loudly and safely first.

## What Changes

- **`/ship` merges safely.** It merges with `--match-head-commit`, confirms the PR state is `MERGED`, and only then retargets stacked PRs to the default branch and deletes the remote branch. If the merge fails, the branch and the PR stay as they were. (review.html#/failure-paths)
- **The gate waits for the pushed commit.** `wait-for-checks.sh` polls until the PR head equals local `HEAD`. It returns `NONE` only when the repo has no workflow files, or when no check appears within a grace period. A failed or empty `gh` answer in `/ship`'s preflight is `UNKNOWN` and stops the merge.
- **Preconditions are checked once, in one place.** A shared reference checks `gh auth status`, an `origin` remote, and `openspec --version`, and gives the fix for each. The git verbs link it. `gh pr view` no longer hides an auth failure as "no PR".
- **`/ship` on a default branch with uncommitted work goes to `/save`,** which creates the branch, instead of stopping with "found nothing to continue".
- **Setup creates the GitHub repository.** Before it sets any GitHub secret, `/wong-setup` checks `gh auth status`, runs `git init`, and runs `gh repo create --private --source . --remote origin`. The README already says setup does this.
- **One JSONC parser reads the wrangler config.** The pack scripts stop matching keys with regexes. Today `"name"` also matches `database_name`, so the production-name guard in `cf-deploy.sh` can pass for a staging deploy. A `"staging":` inside a comment is also read as config. Shell scripts call the parser through `node`. TOML config is refused with a clear message, because the scripts never supported it.
- **A Worker with no D1 database builds and deploys.** `cf-build.sh` skips the migration step when the config binds no D1 database.
- **The staging reset refuses the production database.** `reset-staging-d1.mjs` stops when the target name equals production's, and drops the tables in one batched command.
- **Memory stays inside its timeouts and permissions.**
  - The session-start hook exits when its output is written, not when an open socket closes. Today it runs about 10 s against a 5 s timeout when the store cannot be reached.
  - Background capture sends decisions to `memory.mjs` on stdin instead of writing files under `.git/`. That write is what the capture run is denied today.
  - `migrate` skips migrations already recorded. The run lock and `seen.json` survive concurrent runs.
- **Small correctness fixes:**
  - `verify-staging.sh` reads `.env` with the same parser as memory, so quotes, `export`, and CRLF work.
  - `verify-runner.sh` escapes the header JSON.
  - `check-openspec-config.mjs` fails on a non-zero exit.
  - `readDatabaseName` throws instead of exiting, so tests can cover it.
  - `review.test.mjs` skips when `jsdom` is missing.
- **Tooling is aligned.** `.nvmrc` pins Node 22, CI reads the version from it, `app/package.json` gains `engines`, and `@types/node` moves to `^22`. `wrangler` and `@cloudflare/vite-plugin` move past the `sharp` advisory.

**Non-goals:** No new feature. No change to the memory store's schema or tokens. No TOML support in the pack. No local build or test step added to any verb.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delivery-gate`: The gate waits for the pushed head's checks. A failed `gh` call is `UNKNOWN`. Ship deletes the branch only after a confirmed merge. Git verbs check shared preconditions.
- `install-onboarding`: Setup creates the GitHub repository and `origin` before it provisions CI.
- `stack-pack`: One JSONC parser reads the config. A Worker without D1 is supported. The staging reset refuses production.
- `memory-capture`: Background capture sends decisions on stdin. The lock and seen-set are safe across concurrent runs.
- `memory-recall`: The session-start hook exits within its timeout when the store cannot be reached.
- `memory-store`: Migrations are applied once and recorded.

## Impact

- **Skills:** `.agents/skills/ship/SKILL.md`, `save/SKILL.md`, `save/references/git-gate.md`, `save/scripts/wait-for-checks.sh`, `continue/SKILL.md`, `wong-setup/SKILL.md` and `references/cloudflare.md`, `memory/SKILL.md`, `memory/scripts/{run,session-start,memory}.mjs` and `lib/store.mjs`, `verify/scripts/verify-runner.sh`, `verify-staging.sh`. There is a new shared preconditions reference under `save/references/`.
- **Scripts:** `scripts/lib-wrangler-config.{sh,mjs}`, `cf-build.sh`, `cf-deploy.sh`, `cf-secrets.mjs`, `reset-staging-d1.mjs`, `check-openspec-config.mjs`.
- **Tests:** new and extended tests under `scripts/tests/`.
- **Config:** `.nvmrc`, `app/package.json`, `app/package-lock.json`, `.github/workflows/*.yml` (`node-version-file`).

## Decision log

- **2026-09-25** — Asked how far the fresh-repo reset goes → chose **remove legacy code only**. The 18.x history, `CHANGELOG.md`, and the archive stay. The legacy removal is in `trim-legacy-and-restatement`.
- **2026-09-25** — Asked whether Cloudflare stays mandatory → the user said it is mandatory, because memory needs it. No change here.
- **2026-09-25** — Asked the delivery shape → chose **several changes, one PR**: this change, then `trim-legacy-and-restatement`, then `open-source-surface`, on one branch, as one release, 19.0.0.
- **2026-09-25** — Asked whether the agent applies GitHub settings → chose **apply via gh**. That work is in `open-source-surface`.
- **2026-09-25** — Assumed: this change goes first, because the concision change rewrites the same skill sections. Fixing behavior first keeps the concision diff a pure reduction.
- **2026-09-25** — Assumed: TOML is refused, not supported. No install uses it, and the scripts only claim support. A clear refusal is cheaper than a second parser.
- **2026-09-25** — Assumed: Node stays on 22, not 24 or 26, because CI, the local host, and `jsdom`'s engine range all fit 22. `@types/node` follows the runtime.
- **2026-09-25** — Assumed: the gate's grace period for "no checks" is 60 s. After it, a repo with workflow files still reports `UNKNOWN`, never `NONE`.
- **2026-09-26** — Changed during apply: the local host runs Node 22.22.1, one patch below the new `engines` floor `>=22.22.2` that `jsdom@30` sets. `npm install` warns here only; CI resolves `.nvmrc` `22` to the latest 22.x. `npm audit` in `app/` went from 6 (4 high, 2 moderate) to 2 moderate: the `qs` chain under `@stryker-mutator/core`, out of scope. `worker-configuration.d.ts` was regenerated with `npm run cf-typegen`, with no credentials; it was already stale (no `DB` binding).
- **2026-09-26** — Changed during apply: the deploy guard now refuses a staging config whose `env.staging.name` equals production's, and a config the parser cannot read stops the deploy. `cf-secrets check` warns and skips a TOML config instead of failing, as it already did for unreadable configs. The batched staging drop sets both `PRAGMA foreign_keys=OFF` and `PRAGMA defer_foreign_keys=ON`, because D1's handling of the first is not confirmed.
- **2026-09-26** — Changed during apply: the capture runbook passes JSON with a quoted heredoc (`<<'EOF'`), not `echo … |`, because a pipe starts a second command that the grant does not cover. Probed with `claude -p --permission-mode dontAsk --allowedTools "Bash(node .claude/skills/memory/scripts/memory.mjs:*)"`: the heredoc `gate --file -` ran. The Write section changed too, because `run.mjs` puts it in the prompt. `writeJson` is atomic for all memory state, not only `seen.json`.
- **2026-09-26** — Changed during apply: setup's repository step is the new first sub-step of runbook Step 1 (`1a. The GitHub repository`), so the `gh` check runs before any Cloudflare call. It uses `git init -b main`. The head wait in `wait-for-checks.sh` reuses the 60 s grace.
- **2026-09-26** — Saved the implementation (22 of 22 tasks) for CI, with the deltas reconciled into `openspec/specs/`. It ships with `trim-legacy-and-restatement` and `open-source-surface` in one PR. Closed memory threads #88, #27, #39, and #58, which this change resolves.
