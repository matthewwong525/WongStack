# Design

## Context

A read-only check on 2026-09-27 (two code-reading passes plus spot checks) found the bugs below. The script suite passes today (333 tests: 322 pass, 11 skip), so none is covered. Line numbers are at `main` 25.8.0 (`027e194`).

- **Member guard.** `memory-worker.mjs` `query()` calls `memberRefusal()` (`statements.mjs:34-42`) per statement:
  - `supersede` and `factTag` have no `author` field, so any member runs them alone. Each acts on `(SELECT max(id) FROM facts)` or on ids the caller names.
  - `session` is an upsert. Its author check reads only the new row, and `ON CONFLICT DO UPDATE` rewrites any existing row.
  - `bare()` (`statements.mjs:30`) blanks `'…'` literals only. In ``SELECT 1 AS [']) DELETE … WHERE '``, the `'` inside `[']` opens a "literal" that swallows the `DELETE`. The agent reproduced this against the real schema.
  - The triggers in `migrations/0001_memory.sql` still block editing or deleting fact text. They don't cover `sessions`, `tags`, `fact_tags`, `runs`, or `facts.superseded_by`.
- **`.env` reading.** `parseEnv` (`store.mjs:83-92`): in `(.*)\s*$` the greedy `.*` keeps trailing spaces, so `^(['"]).*\1$` fails on `A="abc" # note` and `B="x y"  `, and the quotes stay. `verify-staging.sh` and the transcript redactor both read through it. `writeEnvKey` (`members.mjs:37-45`) replaces the **first** `CLOUDFLARE_MEMORY_TOKEN=` line, but `parseEnv` keeps the **last**.
- **Check wait.** `wait-for-checks.sh:127-137` prints `SUCCESS` on the first poll with nothing pending or failed. `test.yml`, `deploy.yml`, and `payload.yml` all run on `push` and `pull_request`, and skip the `pull_request` job for same-repo PRs. Those skipped checks can show up before the push run is registered.
- **Merge.** `merge.sh:47`: `for n in $(gh pr list …)` ignores a failed list. The script has no `set -e`, so it goes on to delete the branch, which closes stacked PRs. `merge.sh:57-63` runs `ls-remote` and then `push --delete`. When GitHub's auto-delete lands in between, the delete fails and the script exits 2. That happened on PR #115; memory thread #172 records it.
- **Preview discovery.** `preview-url.sh:63-65` (method 4) greps every PR comment oldest-first and takes the first URL. Methods 1-3 are keyed on the head SHA.
- **Tag pushes.** `test.yml`, `deploy.yml`, and `payload.yml` use a bare `on: push:`, which also fires for tags. `scripts/tag-releases.mjs` pushes `v*` tags with the person's login. `deploy.yml` then sets `CF_BRANCH=v25.x.y` and `cf-deploy.sh` redeploys staging.
- **Smaller items.**
  - `memory.mjs:213-217` applies `LIMIT` in SQL and `--state` in JS afterwards.
  - `wong_preview_alias` (`lib-wrangler-config.sh:103-109`) caps at 63 characters alone. Wrangler requires `<alias>-<worker>` ≤ 63 and a leading letter. `cf-deploy.sh` computes `ALIAS` (line 102) before it reads `STAGING_NAME` (line 138).
  - `app/package.json:19` has `"deploy": "npm run build && wrangler deploy"`, which bypasses `cf-deploy.sh`'s CI-only guard.
  - `verify-runner.sh:149` runs `curl` with no `--max-time`, and `-X HEAD` waits for a body.
  - `memory-worker.mjs:140`: `decodeURIComponent` throws on a malformed `%`, and nothing catches it.
  - `test.yml`'s "Test the changed mini apps" step has no `!cancelled()`, so a red suite skips it.
  - `server/setup.sh:39` installs `@fission-ai/openspec` unpinned; `payload.yml:32` pins `1.13.2`.
  - `run.mjs:64` says "Never put JSON in a command", but `SKILL.md`'s Background run requires `finish-run --counts '{…}'`.
  - `survey.mjs` `excluded()` doesn't skip `CHANGELOG.md`, though its report says historical records are excluded (memory thread #103).
  - `run.mjs` and `session-start.mjs` have no `--help` and do real work on any flag, so `cli-conventions.test.mjs` can't list them (memory thread #251).

## Goals / Non-Goals

**Goals:** close every finding above with a test that fails before the fix, and change no everyday behavior of a correct run.

**Non-Goals:** Dependabot PRs #106-#139; nested-worktree session selection (`memory.mjs:164`); the `registry.jsonl` rewrite race (`transcripts.mjs:50`); `access.ts`'s cache bypass on an unknown `kid`; deriving capture counts from the store (memory thread #169).

## Decisions

### Member guard: batch-aware, Worker-side, statements unchanged

`memberRefusal` becomes a batch check, `memberRefusal(statements, email, lookup)`, still called before `db.batch`:

1. Each statement must match a `WRITES` shape or pass the read check. A matched write with an `author` index must carry the key's email, as today.
2. **Own fact first.** `factTag` and `supersede` are allowed only after a `fact` insert earlier in the same batch; that insert has already passed the author check. The client always sends them in that order (`memory.mjs` `writeStatements`). Because D1 runs a batch as one transaction, `max(id)` is then the member's own fact.
3. **Session owner.** For each `session` upsert, the Worker runs `SELECT author FROM sessions WHERE id = ?` first. It refuses when a row exists and its author, lower-cased, isn't the key's email. A row with a `NULL` author (written before keys) is refused for members too; only the admin may adopt it.
4. **Reads on raw text.** Drop `bare()`. A member read must start with `SELECT` or `WITH`, and its **unstripped** text must contain no `WRITE_WORDS` match and no `;`. The memory script's reads pass values as parameters, so no legitimate read loses anything. A test sends every read the client builds (search with each filter, show, live, digest, pending) through the check.

*Alternatives:* changing the session SQL to `DO UPDATE … WHERE sessions.author IS excluded.author` also works. But it changes the statement shape, and a member on an older checkout would then be refused until they pull. A read-only D1 connection doesn't exist on the binding.

`wiki/development/memory.md:47` changes from "cannot … hide one by marking it superseded" to: a member supersedes only by writing their own replacing fact, so the replacement is always visible and credited.

### `.env`: one parser, trimmed, comment-aware; one writer that matches it

`parseEnv` trims the value, then reads a quoted value with `^(['"])(.*)\1(?:\s+#.*)?$` and returns the inside. It strips `\s+#.*` only from an unquoted value, as today. `writeEnvKey` removes **every** `CLOUDFLARE_MEMORY_TOKEN=` line and writes the new one where the first one was, or appends it when there was none. Tests: quoted with a trailing space, quoted with a comment, single quotes, `#` inside quotes, an unquoted value with a comment, CRLF, and a duplicate key written and then read back.

### Check wait: settled and not all-skipped

In the poll loop, when nothing is pending and nothing failed:

- If every line's state is `skipping` and `now < CHECKS_DEADLINE`, keep polling.
- Otherwise compare the sorted lines with the previous poll. On a match, print `SUCCESS`; if not, save them and poll again.

A clean run costs one extra `INTERVAL` (10 s). `FAILURE` stays immediate: a failed check is a verdict whoever else is still running. The header comment and the `RESULT: SUCCESS` line document both rules. Tests use the fake `gh` in `wait-for-checks.test.mjs`: all-skipped then a real pass; pass then a new pending check; a stable pass.

### Merge: fail closed on the stack list; delete, then re-check on failure

- `LIST=$(gh pr list … ) || { say "retargeted="; say "branch=kept"; fail "could not list PRs based on $BRANCH; the branch is kept"; exit 2; }`, then loop over `$LIST`.
- Keep the `ls-remote` first (the spec's "delete only when it exists"). When `push --delete` fails, run `ls-remote --exit-code` again: exit 2 prints `branch=deleted-at-merge` and exit 0; anything else keeps today's `branch=kept` and exit 2.

Tests in `ship-merge.test.mjs`: a failing `gh pr list`, and a fake `git` whose `push --delete` fails while the second `ls-remote` answers 2.

### Preview discovery: newest comment naming the head commit

Method 4 reads `gh pr view --json comments --jq '.comments | reverse | .[].body'`. It keeps only bodies containing `$SHA` or `${SHA:0:7}`, then applies the existing URL grep and `drop_bare_apex`, `head -1`. Deploy bots (Cloudflare, Vercel, Netlify) print the commit in their comment. A bot that doesn't falls through to "nothing", which the spec already allows and `/verify` already reports.

### CI triggers: branches only

`on: push: branches: ['**']` in `test.yml`, `deploy.yml`, and `payload.yml`. With a `branches` filter, tag pushes don't match. `release.yml` already filters on `main`. `test.yml`'s mini-app step gets `if: ${{ !cancelled() && steps.scope.outputs.mini_apps != '' }}`. The proposal's `Check:` bullet covers both `test.yml` edits for `loosened-checks.mjs`.

### Smaller fixes

- **Search:** when `--state` is set, drop the SQL `LIMIT`, filter by state, then slice to `--limit` (default 30). Stores are small (hundreds of rows), so the unbounded read is cheap.
- **Preview alias:** `wong_preview_alias <name> [worker]`. With a worker name, cap at `62 - ${#worker}`. After lower-casing and hyphenating, prefix `b-` when the first character isn't a letter, then cut and trim trailing hyphens. `cf-deploy.sh` moves the `ALIAS` line below `STAGING_NAME` and passes it; `cf-preview.sh` passes the staging name the same way. Tests go in `wrangler-config.test.mjs`.
- **`app/package.json`:** `"deploy": "bash ../scripts/cf-deploy.sh"`, which no-ops with its own message outside CI. Nothing in the repo runs `npm run deploy`; confirm with a grep before editing.
- **`verify-runner.sh`:** add `--max-time "${VERIFY_REQUEST_TIMEOUT:-30}"` to the request `curl`. Use `-I` instead of `-X HEAD` when the method is `HEAD`. Test with a fake server that never answers, in `verify-scripts.test.mjs`.
- **Worker path:** wrap `decodeURIComponent` and return `fail(400, 'bad_path', …)`.
- **`server/setup.sh`:** pin `@fission-ai/openspec@1.13.2`, the version `payload.yml` pins. `server-setup.test.mjs` asserts that the two versions match, so they can't drift apart.
- **Runbook wording:** `run.mjs:64` becomes "Never put JSON in a command, except `finish-run --counts '{…}'`, which the runbook gives in full." That keeps the working, recorded path and removes the contradiction.
- **Survey:** `excluded()` adds `(?:^|\/)CHANGELOG\.md$`. Tested in `improve-survey.test.mjs`.
- **`--help`:** `run.mjs` and `session-start.mjs` parse args with `strict: true`, print usage and exit 0 on `--help`, and exit 2 on an unknown flag, like the other scripts. Add both to `cli-conventions.test.mjs`. The session-start hook passes no flags, so the hook doesn't change.

## Risks / Trade-offs

- **Stricter member reads.** A future read that puts a write word in a literal gets refused. The refusal message names the rule, and the read-shapes test catches it in CI.
- **Session rows with no author.** A member can no longer update a pre-key session row. Such rows come only from before schema 2 and are already captured.
- **One more poll per save.** The wait adds about 10 s to every green save. That's the price of not merging on a half-registered check list.
- **Comment-based preview.** A bot that never names the commit loses method 4. Every provider in `PREVIEW_HOSTS` that comments does name it, and the deployment and status methods run first.
- **Rollout.** The Worker change takes effect when production deploys from `main`. Member clients need no update, because the statements are unchanged.
