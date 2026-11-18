<!-- openspec-archive v1 2026-09-26-harden-edge-cases -->
<!-- file proposal.md utf8 9003 -->
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
- **2026-09-26** — Distilled facts before the archive: no reusable fact. The one feedback fact (#147) is about briefing audit subagents, not about WongStack process.
- **2026-09-26** — Archived after CI passed on PR #105 (`2b82958`), with the deltas already reconciled into `openspec/specs/`, so the archive used `--skip-specs`.

<!-- end proposal.md -->
<!-- file design.md utf8 5898 -->
## Context

See [proposal.md](proposal.md) for why. The [review page](review.html#/failure-paths) draws the four worst failure paths, today and after. The code facts that shape the fixes:

- `scripts/lib-wrangler-config.sh` reads the Worker name with the regex `"?name"?\s*[:=]`, and `cf-build.sh`, `lib-wrangler-config.sh`, and `lib-wrangler-config.mjs` each find the staging block by scanning text from the first `"staging":` match. `cf-secrets.mjs` already has a JSONC stripper and `parseConfig`, but it keeps them private. It also copies `findWranglerConfigOrNull`, because an old sync rule, copy-if-absent, never updated a library that a repo already had. Sync now plans every changed payload file through `/plan`, so a script can depend on a newer library export.
- `wait-for-checks.sh` maps gh's "no checks reported" to `NONE`. It never compares the PR head to local `HEAD`.
- `ship/SKILL.md` Step 5 runs `gh pr merge --squash`, the retarget loop with `base=main`, and `git push origin --delete` as three independent lines.
- `memory/scripts/run.mjs` starts the capture model with `--permission-mode dontAsk` and allows only `Bash(<memory.mjs>:*)` and `Edit(<workDir>/**)`, where `workDir` is under `.git/`. The runbook tells the model to write decision files. `memory.mjs` already reads `--file -` from stdin.
- `session-start.mjs` sets `process.exitCode = 0` and returns, so an aborted `fetch` socket keeps Node alive for about 10 s.

## Goals / Non-Goals

**Goals:**
- Each failure path either does the right thing or stops with a named remedy. None continues on a guess.
- Each fix is in deterministic code with a test, where the behavior is code. Skill text changes only where the skill runs the command.

**Non-Goals:**
- No new command-line flags on the verbs. No retry logic beyond the gate's grace period.
- No rewrite of the memory runbook beyond the decision-writing step.

## Decisions

### The config parser lives in `lib-wrangler-config.mjs`

Move `stripJsonc` and `parseConfig` into `scripts/lib-wrangler-config.mjs` as exports, with `workerName(env)`, `databaseName(env)`, and `hasD1(env)`. The module gets a small CLI (`node lib-wrangler-config.mjs worker-name staging`), and `lib-wrangler-config.sh` becomes thin wrappers around it. `cf-secrets.mjs` and `reset-staging-d1.mjs` import it and drop their copies. Node is already required wherever the pack runs, so the shell scripts gain no new dependency.

The redirected config that wrangler writes to `.wrangler/deploy/config.json` is plain JSON and goes through the same parser. That keeps one code path.

*Alternative:* fix the regexes. Rejected: a regex cannot tell a key inside a comment or inside `d1_databases` from a key at the top of the environment, and three copies would keep drifting.

`readDatabaseName` and the new helpers throw a typed error. The CLI entry turns it into exit code 1 and a message. Tests call the functions directly with fixture configs: an env block with a database listed before the name, a comment that contains `"staging":`, no D1, and TOML.

### The gate compares heads, then waits

`wait-for-checks.sh` reads `gh pr view --json headRefOid` and polls until it equals `git rev-parse HEAD`. It then polls the checks. "No checks" becomes `NONE` at once only when `.github/workflows/` has no `*.yml` or `*.yaml` file. Otherwise it waits up to 60 s for a check to appear, then reports `UNKNOWN`. `/ship`'s preflight reads the same script's result, so an empty or failed `gh` answer is `UNKNOWN` in one place.

### Merge, confirm, retarget, delete

Step 5 becomes one guarded block. `gh pr merge --squash --match-head-commit "$SHA" || stop`, then `gh pr view --json state` must be `MERGED`, then retarget stacked PRs to the default branch read from `gh repo view --json defaultBranchRef`, then delete the remote branch. The block is short, so it stays inline in the skill. A script would add a file for four commands.

### Shared preconditions reference

New `save/references/preconditions.md` owns three checks and their fixes: `gh auth status` (fix: `gh auth login`), `git remote get-url origin` (fix: `gh repo create --source . --remote origin` or `git remote add`), and `openspec --version` (fix: `npm install -g @fission-ai/openspec@1.8.0`). `git-gate.md` links it and drops `2>/dev/null` from `gh pr view`. It separates "no PR" (exit 1 with "no pull requests found") from other failures.

### Capture pipes decisions on stdin

The runbook step becomes `memory.mjs put-facts --file - --spooled <path>` with the decisions JSON on stdin. The Claude grant keeps only `Bash(<memory.mjs>:*)`, and the `Edit` grant and the `work/` folder go. A test reads the runbook's commands and asserts that each one matches the grant pattern. That makes a drift between the two a CI failure.

### Exit when written

`session-start.mjs` and `memory.mjs` call `process.stdout.write(out, () => process.exit(code))`. Then the process ends when the output is flushed, whatever sockets are still open.

### One `.env` parser

`store.mjs` keeps the reference parser (quotes, `export`, CRLF). `verify-staging.sh` calls it through `node`, because both are skills that ship together. `cf-secrets.mjs` keeps its own names-only reader. It never reads a value, and a pack script must not import from a skill folder.

## Risks / Trade-offs

- [The 60 s grace delays `/save` on a repo with workflows that never trigger for a branch] → The result is `UNKNOWN` with the reason, and the user can see it. A silent `NONE` would be worse.
- [`--match-head-commit` fails when a bot pushes after the gate passed] → That is the intended stop: the new commit has not passed the gate.
- [Moving the parser changes pack scripts that installed repos carry] → This release is major (19.0.0), and sync plans each changed file.

## Migration Plan

None beyond the release. Installed repos pick up the scripts through `/wong-sync`.

<!-- end design.md -->
<!-- file tasks.md utf8 4779 -->
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

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 3294 -->
## ADDED Requirements

### Requirement: The gate waits for the pushed commit's checks

The check wait SHALL report a result only for the commit that was just pushed. It SHALL wait until the PR's head commit equals the local `HEAD`. It SHALL report `NONE` only when the repository has no CI workflow files, or when no check appears for that head within a grace period of 60 seconds. A repository with workflow files whose checks do not appear SHALL report `UNKNOWN`, never `NONE`. A failed or empty `gh` answer SHALL be `UNKNOWN`, and `UNKNOWN` SHALL stop a merge.

#### Scenario: Checks are not registered yet

- **WHEN** `/save` pushes a commit and GitHub has not yet registered its check runs
- **THEN** the wait continues until the checks appear, and does not report `NONE`

#### Scenario: The old head is green

- **WHEN** the previous commit's checks passed and the new commit's checks have not started
- **THEN** the wait does not report `SUCCESS` for the new commit

#### Scenario: A repository with no CI

- **WHEN** the repository has no workflow files
- **THEN** the wait reports `NONE`, and PR review is the gate

#### Scenario: gh is not authenticated

- **WHEN** `/ship`'s preflight gets an error or an empty answer from `gh`
- **THEN** it reports `UNKNOWN` and does not merge

### Requirement: Ship deletes the branch only after a confirmed merge

`/ship` SHALL merge only the head commit it verified, and SHALL confirm that the PR state is `MERGED` before it retargets stacked PRs or deletes the remote branch. Stacked PRs SHALL be retargeted to the repository's default branch, not to a fixed name. When the merge fails, `/ship` SHALL leave the branch and the PR in place and report the failure.

#### Scenario: The merge is refused

- **WHEN** `gh pr merge` fails because of a conflict, a rule, or a new head commit
- **THEN** the remote branch is not deleted and the PR stays open

#### Scenario: The default branch is not main

- **WHEN** the default branch is `trunk` and a PR is stacked on the merged branch
- **THEN** that PR is retargeted to `trunk` before the branch is deleted

### Requirement: Git verbs check shared preconditions first

`/save`, `/continue`, and `/ship` SHALL check, before any git or GitHub action, that `gh` is authenticated, that an `origin` remote exists, and that the `openspec` CLI runs. The checks SHALL be defined in one shared reference. A failed check SHALL stop the verb with the command that fixes it. An authentication failure SHALL NOT be read as "no PR".

#### Scenario: gh is signed out

- **WHEN** `/save` runs and `gh auth status` fails
- **THEN** it stops before the push and tells the user to run `gh auth login`

#### Scenario: No remote

- **WHEN** `/save` runs in a repository with no `origin`
- **THEN** it stops and gives the command that adds one

### Requirement: Ship on a dirty default branch saves first

When `/ship` runs on the default branch with uncommitted changes, it SHALL route the work to `/save`, which creates a feature branch, and then continue the cycle on that branch. It SHALL NOT report that it found nothing to ship.

#### Scenario: Uncommitted work on main

- **WHEN** a user runs `/ship` on `main` with modified files
- **THEN** `/save` moves the work to a new branch and `/ship` continues from there

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 841 -->
## ADDED Requirements

### Requirement: Setup creates the GitHub repository

Before setup sets a GitHub secret or pushes, it SHALL confirm that `gh` is authenticated, initialize git in the empty folder, and create a private GitHub repository with `origin` pointing at it. When `origin` already exists, setup SHALL use it and create nothing. When `gh` is not authenticated, setup SHALL stop with the sign-in command before it creates any Cloudflare resource.

#### Scenario: A new folder gets its repository

- **WHEN** setup runs in an empty folder and `gh` is authenticated
- **THEN** the folder is a git repository with an `origin` on GitHub before the CI secret is set

#### Scenario: gh is signed out

- **WHEN** setup runs and `gh auth status` fails
- **THEN** setup stops, names `gh auth login`, and has created no Cloudflare resource

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/memory-capture/spec.md utf8 1227 -->
## ADDED Requirements

### Requirement: Background capture writes through the memory script only

The background capture run SHALL send each decision to the memory script on standard input. It SHALL NOT need permission to create files, and the tools it is granted SHALL cover every step its runbook tells it to take. A test SHALL fail when the runbook names a step that the granted tools do not allow.

#### Scenario: Capture runs in don't-ask mode

- **WHEN** the background run processes a session under `dontAsk` permissions
- **THEN** it records its facts, and the next digest reports a successful run

#### Scenario: The runbook drifts from the grant

- **WHEN** the runbook tells the model to write a file that the grant does not allow
- **THEN** the test suite fails

### Requirement: Concurrent memory runs do not lose state

The run lock SHALL tolerate a lock file that disappears while it is checked. The record of sessions already seen SHALL be written atomically, so that a foreground command and a background run do not overwrite each other's updates.

#### Scenario: Two writers update the seen-set

- **WHEN** a foreground `strip` and the background run both update the seen-set
- **THEN** both updates are kept

<!-- end specs/memory-capture/spec.md -->
<!-- file specs/memory-recall/spec.md utf8 529 -->
## ADDED Requirements

### Requirement: The session-start hook ends inside its timeout

The session-start hook SHALL exit as soon as its output is written, and SHALL finish inside its configured timeout even when the memory store cannot be reached. An open network request SHALL NOT keep the process alive after the digest is printed.

#### Scenario: The store is unreachable

- **WHEN** a session starts and the store's address does not answer
- **THEN** the hook prints the offline digest and exits within its 5-second timeout

<!-- end specs/memory-recall/spec.md -->
<!-- file specs/memory-store/spec.md utf8 406 -->
## ADDED Requirements

### Requirement: Store migrations apply once

The memory script's `migrate` command SHALL record each applied migration and SHALL skip a migration that is already recorded. A migration that is not idempotent SHALL be safe to ship.

#### Scenario: migrate runs twice

- **WHEN** `migrate` runs on a store where every migration is recorded
- **THEN** no migration statement runs again

<!-- end specs/memory-store/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 2015 -->
## ADDED Requirements

### Requirement: The pack reads the wrangler config with a real parser

Every pack script SHALL read the wrangler config through one shared JSONC parser. The parser SHALL ignore comments and SHALL read a key only at its real position in the structure. The Worker name of an environment SHALL come from that environment's `name` key, never from a key that contains `name`, such as `database_name`. A TOML config SHALL be refused with a message that names the supported formats.

#### Scenario: A database key sits before the Worker name

- **WHEN** `env.staging` lists `d1_databases` before its `name`
- **THEN** the staging Worker name is the value of `env.staging.name`
- **AND** the production guard refuses a deploy whose staging name equals production's

#### Scenario: A comment mentions staging

- **WHEN** a comment in the config contains `"staging":`
- **THEN** the scripts read the staging block from the config, not from the comment

#### Scenario: A TOML config

- **WHEN** the app's config is `wrangler.toml`
- **THEN** the pack script stops and says that it reads `wrangler.jsonc` or `wrangler.json`

### Requirement: A Worker without D1 builds and deploys

When the config binds no D1 database, the build wrapper SHALL skip the migration step and build the Worker. It SHALL stop with its remedy only when production binds D1 and the staging environment does not.

#### Scenario: A Worker with no database

- **WHEN** CI builds a branch for a Worker whose config has no `d1_databases`
- **THEN** the build succeeds without running a migration

### Requirement: The staging reset refuses the production database

The staging database reset SHALL stop, and drop nothing, when the database it would reset has the production database's name. It SHALL drop the staging tables in one batched command.

#### Scenario: Staging points at production

- **WHEN** the staging environment's `database_name` equals production's
- **THEN** the reset stops with an error and no table is dropped

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-25

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 9766 fence=~~~ -->
~~~html
<section class="visual flow" id="failure-paths" data-kind="flow" data-states="after today">
  <p class="caption">Four failure paths: what happens after this change, and today.</p>
  <div class="frame">
    <div class="state state-after">
      <h2>After</h2>

      <h3>1. <code>/ship</code> merges a PR</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-merge-try">
          <h3>Merge the pushed head <span class="tag">Changed</span> <i class="callout">1</i></h3>
          <p><code>gh pr merge --match-head-commit</code></p>
          <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: merge only the commit it pushed. Result: a new commit on the PR makes the merge fail.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-merge-confirm">
          <h3>Confirm the state is <code>MERGED</code> <span class="tag">New</span></h3>
          <p>If not, stop. The branch and the PR stay.</p>
          <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: read the PR state. Result: any state other than <code>MERGED</code> stops the run before cleanup.</p></details>
        </div>
        <p class="flow-connector">↓ Only after <code>MERGED</code></p>
        <div class="step flow-card" data-target-id="after-merge-cleanup">
          <h3>Retarget, then delete the branch <span class="tag">Changed</span></h3>
          <p>Stacked PRs move to the default branch first.</p>
          <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: retarget stacked PRs, then delete the remote branch. Result: no open PR loses its base.</p></details>
        </div>
      </div>

      <h3>2. The CI gate reads checks</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-gate-push">
          <h3>Push, then wait for the head <span class="tag">Changed</span> <i class="callout">2</i></h3>
          <p>Poll until the PR head equals local <code>HEAD</code>.</p>
          <details><summary>Details</summary><p>Actor: <code>wait-for-checks.sh</code>. Action: compare the PR head with <code>HEAD</code>. Result: it reads checks for the pushed commit only.</p></details>
        </div>
        <p class="flow-connector">↓ No checks yet?</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-gate-none">
            <h3>No workflow files <span class="tag">Changed</span></h3>
            <p><code>NONE</code>. PR review is the gate.</p>
            <details><summary>Details</summary><p>Actor: the gate. Action: find no file under <code>.github/workflows/</code>. Result: <code>NONE</code> at once.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-gate-grace">
            <h3>Workflow files <span class="tag">New</span></h3>
            <p>Wait up to 60 s. Still none: <code>UNKNOWN</code>.</p>
            <details><summary>Details</summary><p>Actor: the gate. Action: wait the grace period for a check to appear. Result: a check appears, or <code>UNKNOWN</code> stops the merge.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-gate-gh-fail">
            <h3><code>gh</code> fails <span class="tag">New</span></h3>
            <p><code>UNKNOWN</code>. The merge stops.</p>
            <details><summary>Details</summary><p>Actor: <code>/ship</code> preflight. Action: get an error or an empty answer from <code>gh</code>. Result: <code>UNKNOWN</code>, never <code>NONE</code>.</p></details>
          </div>
        </div>
      </div>

      <h3>3. A staging deploy</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-deploy-parse">
          <h3>Parse the config as JSONC <span class="tag">Changed</span> <i class="callout">3</i></h3>
          <p>Read <code>env.staging.name</code>. Ignore comments.</p>
          <details><summary>Details</summary><p>Actor: <code>cf-deploy.sh</code> through <code>node</code>. Action: parse <code>wrangler.jsonc</code> with one parser. Result: <code>database_name</code> is never read as the Worker name. TOML config gets a clear refusal.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-deploy-guard">
          <h3>Guard refuses a production name <span class="tag">Changed</span></h3>
          <p>Staging never deploys to production.</p>
          <details><summary>Details</summary><p>Actor: the production-name guard. Action: compare the staging name with production's. Result: a match stops the deploy.</p></details>
        </div>
      </div>

      <h3>4. Background memory capture</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-capture-pipe">
          <h3>Pipe decisions on stdin <span class="tag">Changed</span> <i class="callout">4</i></h3>
          <p>Send them to <code>memory.mjs</code>. Write no file under <code>.git/</code>.</p>
          <details><summary>Details</summary><p>Actor: the background capture run. Action: pipe the decision JSON to <code>memory.mjs</code>. Result: no write that <code>dontAsk</code> mode denies.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-capture-facts">
          <h3>Facts are written <span class="tag">Changed</span></h3>
          <p>The run completes.</p>
          <details><summary>Details</summary><p>Actor: <code>memory.mjs</code>. Action: record the facts in the store. Result: the next session digest shows them.</p></details>
        </div>
      </div>
    </div>

    <div class="state state-today">
      <h2>Today</h2>

      <h3>1. <code>/ship</code> merges a PR</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-merge-fail">
          <h3><code>gh pr merge</code> fails</h3>
          <p>The failure is not checked.</p>
          <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: merge without a head check. Result: the run continues to cleanup.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-merge-delete">
          <h3>Branch deleted, PR closed</h3>
          <p>The work is not merged.</p>
          <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: delete the remote branch. Result: GitHub closes the PR.</p></details>
        </div>
      </div>

      <h3>2. The CI gate reads checks</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-gate-push">
          <h3>Push</h3>
          <p>GitHub has not registered the checks yet.</p>
          <details><summary>Details</summary><p>Actor: <code>/save</code>. Action: push and read checks at once. Result: the list is empty.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-gate-none">
          <h3><code>NONE</code>, then merge</h3>
          <p>No check ran.</p>
          <details><summary>Details</summary><p>Actor: the gate. Action: read an empty list, or a failed <code>gh</code> call, as <code>NONE</code>. Result: <code>/ship</code> merges without CI.</p></details>
        </div>
      </div>

      <h3>3. A staging deploy</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-deploy-regex">
          <h3>A regex reads <code>"name"</code></h3>
          <p>It matches <code>database_name</code>.</p>
          <details><summary>Details</summary><p>Actor: the pack scripts. Action: match keys with a regex. Result: the wrong value is the Worker name. A <code>"staging":</code> in a comment is also read.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-deploy-prod">
          <h3>Guard passes, deploy hits production</h3>
          <p>No error shows.</p>
          <details><summary>Details</summary><p>Actor: <code>cf-deploy.sh</code>. Action: compare the wrong name. Result: the staging deploy can reach production.</p></details>
        </div>
      </div>

      <h3>4. Background memory capture</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-capture-write">
          <h3>Write decision JSON under <code>.git/</code></h3>
          <p><code>dontAsk</code> mode denies the write.</p>
          <details><summary>Details</summary><p>Actor: the background capture run. Action: write a file under <code>.git/</code>. Result: permission denied.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-capture-fail">
          <h3>The run fails</h3>
          <p>No facts are written.</p>
          <details><summary>Details</summary><p>Actor: the capture run. Action: stop on the denied write. Result: this happens on every run.</p></details>
        </div>
      </div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>Cleanup is last. A failed merge leaves the branch and the PR as they were.</li>
      <li><code>NONE</code> means "this repo has no CI", not "no check yet". The 60 s grace period and a failed <code>gh</code> call give <code>UNKNOWN</code>, which stops the merge.</li>
      <li>One JSONC parser reads the config for all pack scripts. The guard compares the real Worker name.</li>
      <li>Capture uses stdin, so it needs no file write that the background permission mode denies.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 56952 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-26-harden-edge-cases</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; overflow-wrap:anywhere; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-26-harden-edge-cases</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
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
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual flow" id="failure-paths" data-kind="flow" data-states="after today">
  <p class="caption">Four failure paths: what happens after this change, and today.</p>
  <div class="frame">
    <div class="state state-after">
      <h2>After</h2>

      <h3>1. <code>/ship</code> merges a PR</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-merge-try">
          <h3>Merge the pushed head <span class="tag">Changed</span> <i class="callout">1</i></h3>
          <p><code>gh pr merge --match-head-commit</code></p>
          <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: merge only the commit it pushed. Result: a new commit on the PR makes the merge fail.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-merge-confirm">
          <h3>Confirm the state is <code>MERGED</code> <span class="tag">New</span></h3>
          <p>If not, stop. The branch and the PR stay.</p>
          <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: read the PR state. Result: any state other than <code>MERGED</code> stops the run before cleanup.</p></details>
        </div>
        <p class="flow-connector">↓ Only after <code>MERGED</code></p>
        <div class="step flow-card" data-target-id="after-merge-cleanup">
          <h3>Retarget, then delete the branch <span class="tag">Changed</span></h3>
          <p>Stacked PRs move to the default branch first.</p>
          <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: retarget stacked PRs, then delete the remote branch. Result: no open PR loses its base.</p></details>
        </div>
      </div>

      <h3>2. The CI gate reads checks</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-gate-push">
          <h3>Push, then wait for the head <span class="tag">Changed</span> <i class="callout">2</i></h3>
          <p>Poll until the PR head equals local <code>HEAD</code>.</p>
          <details><summary>Details</summary><p>Actor: <code>wait-for-checks.sh</code>. Action: compare the PR head with <code>HEAD</code>. Result: it reads checks for the pushed commit only.</p></details>
        </div>
        <p class="flow-connector">↓ No checks yet?</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-gate-none">
            <h3>No workflow files <span class="tag">Changed</span></h3>
            <p><code>NONE</code>. PR review is the gate.</p>
            <details><summary>Details</summary><p>Actor: the gate. Action: find no file under <code>.github/workflows/</code>. Result: <code>NONE</code> at once.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-gate-grace">
            <h3>Workflow files <span class="tag">New</span></h3>
            <p>Wait up to 60 s. Still none: <code>UNKNOWN</code>.</p>
            <details><summary>Details</summary><p>Actor: the gate. Action: wait the grace period for a check to appear. Result: a check appears, or <code>UNKNOWN</code> stops the merge.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-gate-gh-fail">
            <h3><code>gh</code> fails <span class="tag">New</span></h3>
            <p><code>UNKNOWN</code>. The merge stops.</p>
            <details><summary>Details</summary><p>Actor: <code>/ship</code> preflight. Action: get an error or an empty answer from <code>gh</code>. Result: <code>UNKNOWN</code>, never <code>NONE</code>.</p></details>
          </div>
        </div>
      </div>

      <h3>3. A staging deploy</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-deploy-parse">
          <h3>Parse the config as JSONC <span class="tag">Changed</span> <i class="callout">3</i></h3>
          <p>Read <code>env.staging.name</code>. Ignore comments.</p>
          <details><summary>Details</summary><p>Actor: <code>cf-deploy.sh</code> through <code>node</code>. Action: parse <code>wrangler.jsonc</code> with one parser. Result: <code>database_name</code> is never read as the Worker name. TOML config gets a clear refusal.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-deploy-guard">
          <h3>Guard refuses a production name <span class="tag">Changed</span></h3>
          <p>Staging never deploys to production.</p>
          <details><summary>Details</summary><p>Actor: the production-name guard. Action: compare the staging name with production's. Result: a match stops the deploy.</p></details>
        </div>
      </div>

      <h3>4. Background memory capture</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-capture-pipe">
          <h3>Pipe decisions on stdin <span class="tag">Changed</span> <i class="callout">4</i></h3>
          <p>Send them to <code>memory.mjs</code>. Write no file under <code>.git/</code>.</p>
          <details><summary>Details</summary><p>Actor: the background capture run. Action: pipe the decision JSON to <code>memory.mjs</code>. Result: no write that <code>dontAsk</code> mode denies.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-capture-facts">
          <h3>Facts are written <span class="tag">Changed</span></h3>
          <p>The run completes.</p>
          <details><summary>Details</summary><p>Actor: <code>memory.mjs</code>. Action: record the facts in the store. Result: the next session digest shows them.</p></details>
        </div>
      </div>
    </div>

    <div class="state state-today">
      <h2>Today</h2>

      <h3>1. <code>/ship</code> merges a PR</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-merge-fail">
          <h3><code>gh pr merge</code> fails</h3>
          <p>The failure is not checked.</p>
          <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: merge without a head check. Result: the run continues to cleanup.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-merge-delete">
          <h3>Branch deleted, PR closed</h3>
          <p>The work is not merged.</p>
          <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: delete the remote branch. Result: GitHub closes the PR.</p></details>
        </div>
      </div>

      <h3>2. The CI gate reads checks</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-gate-push">
          <h3>Push</h3>
          <p>GitHub has not registered the checks yet.</p>
          <details><summary>Details</summary><p>Actor: <code>/save</code>. Action: push and read checks at once. Result: the list is empty.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-gate-none">
          <h3><code>NONE</code>, then merge</h3>
          <p>No check ran.</p>
          <details><summary>Details</summary><p>Actor: the gate. Action: read an empty list, or a failed <code>gh</code> call, as <code>NONE</code>. Result: <code>/ship</code> merges without CI.</p></details>
        </div>
      </div>

      <h3>3. A staging deploy</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-deploy-regex">
          <h3>A regex reads <code>"name"</code></h3>
          <p>It matches <code>database_name</code>.</p>
          <details><summary>Details</summary><p>Actor: the pack scripts. Action: match keys with a regex. Result: the wrong value is the Worker name. A <code>"staging":</code> in a comment is also read.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-deploy-prod">
          <h3>Guard passes, deploy hits production</h3>
          <p>No error shows.</p>
          <details><summary>Details</summary><p>Actor: <code>cf-deploy.sh</code>. Action: compare the wrong name. Result: the staging deploy can reach production.</p></details>
        </div>
      </div>

      <h3>4. Background memory capture</h3>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-capture-write">
          <h3>Write decision JSON under <code>.git/</code></h3>
          <p><code>dontAsk</code> mode denies the write.</p>
          <details><summary>Details</summary><p>Actor: the background capture run. Action: write a file under <code>.git/</code>. Result: permission denied.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-capture-fail">
          <h3>The run fails</h3>
          <p>No facts are written.</p>
          <details><summary>Details</summary><p>Actor: the capture run. Action: stop on the denied write. Result: this happens on every run.</p></details>
        </div>
      </div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>Cleanup is last. A failed merge leaves the branch and the PR as they were.</li>
      <li><code>NONE</code> means "this repo has no CI", not "no check yet". The 60 s grace period and a failed <code>gh</code> call give <code>UNKNOWN</code>, which stops the merge.</li>
      <li>One JSONC parser reads the config for all pack scripts. The guard compares the real Worker name.</li>
      <li>Capture uses stdin, so it needs no file write that the background permission mode denies.</li>
    </ol>
  </div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
