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
