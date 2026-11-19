<!-- openspec-archive v1 2026-09-27-fix-found-bugs -->
<!-- file proposal.md utf8 10592 -->
# Fix the bugs found in the repo check

**Status:** ready-to-ship
**Branch:** explore-bugs
**Open questions:** none

## Why

A check of the repo on 2026-09-27 found about 20 real bugs. The worst: a teammate can quietly change or hide other people's shared memory, a saved key can leak into an uploaded session record, and `/ship` can merge before the tests have run. The rest are smaller slips that give wrong answers or fail in odd cases. None of them is caught by a test today.

## What Changes

- **Teammates can add to shared memory, but never change or hide someone else's.** Today three gaps let a teammate get round that rule: marking another person's note as out of date with no new note to replace it, overwriting another person's session record, and hiding a delete command inside quote marks. After this change, each of those is refused, and a teammate's normal saves work as before.
  ```text
  teammate sends a memory write
        │
        ▼
  one of the memory script's own
  writes, under their own name? ─ no ─▶ refused
        │ yes
        ▼
  "out of date" mark with their
  own new note just before it? ─ no ─▶ refused
        │ yes
        ▼
  session record someone
  else's? ─────────────────── yes ──▶ refused
        │ no
        ▼
      saved
  ```
- **Saved keys are read correctly, so they work and stay hidden.** A key written with quote marks and then a space or a comment after it is read without the quotes. The memory key then works, and the step that blanks secrets out of uploaded session records finds the real value.
- **`/ship` waits for the real tests before it merges.** Today the wait can say "all passed" when only the instant, skipped checks have shown up. After this change it needs the same answer twice in a row, and a list of only skipped checks isn't a pass until the usual one-minute grace has run out.
  ```text
  checks so far: all skipped
        │
        ▼
  keep waiting (up to 1 min)
        │
        ▼
  tests appear ──▶ wait for them
        │
        ▼
  same result twice ──▶ pass
  ```
- **Shipping never closes other pull requests by accident.** If GitHub won't list the pull requests stacked on a branch, `/ship` keeps the branch instead of deleting it. If GitHub deletes the branch itself a moment before `/ship` does, that counts as done, not as an error.
- **Smaller fixes:**
  - Memory search finds open threads even when newer ones belong to other work.
  - The preview link always matches the latest save.
  - A release label doesn't redeploy old code to the test site.
  - Long branch names still get a preview link.
  - Deploying by hand from a laptop can't reach the live site.
  - A slow page can't stall `/verify`.
  - A malformed memory address gets a clear error.
  - Mini app tests still run when the main tests fail.
  - A new server installs the same planning tool version as CI.
  - The background memory run gets one clear instruction for its counts.
  - The maintenance scan skips the changelog.
  - The two memory helper scripts answer `--help`.

**Non-goals:**
- The 11 waiting dependency updates. They're their own change, through `/update-dependencies`.
- Three unlikely edge cases: nested worktrees, the session list race, and the unused login-key cache.
- Working out background-run counts from the saved notes, rather than trusting the model.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory-store`: "A member key adds facts under its own name…" now requires a member's supersede and fact-tag writes to follow the member's own fact insert in the same batch, refuses a member upsert of another author's session, and checks reads on the raw SQL text.
- `delivery-gate`: "The gate waits for the pushed commit's checks" now needs a settled, not-all-skipped result for `SUCCESS`; "Ship deletes the branch only after a confirmed merge" keeps the branch when stacked PRs can't be listed and treats a delete that loses the race to the forge as deleted at merge.
- `preview-discovery`: the pull-request-comment method takes only the newest comment that names the head commit.
- `ci-tests`: adds that CI workflows run on branch pushes and pull requests, never on tag pushes.

## Impact

- Memory route: `.agents/skills/memory/worker/statements.mjs`, `.agents/skills/memory/worker/memory-worker.mjs`; `wiki/development/memory.md` (the member promise).
- Memory scripts: `.agents/skills/memory/scripts/lib/store.mjs` (`parseEnv`), `lib/members.mjs` (`writeEnvKey`), `memory.mjs` (`search --state`), `run.mjs` (runbook wording, `--help`), `session-start.mjs` (`--help`).
- Delivery scripts: `.agents/skills/save/scripts/wait-for-checks.sh`, `.agents/skills/save/scripts/preview-url.sh`, `.agents/skills/ship/scripts/merge.sh`, `.agents/skills/verify/scripts/verify-runner.sh`, `.agents/skills/improve/scripts/survey.mjs`.
- CI and pack: `.github/workflows/test.yml`, `deploy.yml`, `payload.yml`; `scripts/lib-wrangler-config.sh` and its callers `scripts/cf-deploy.sh`, `scripts/cf-preview.sh`; `app/package.json` (`deploy`); `server/setup.sh`.
- Tests under `scripts/tests/`: the memory Worker, `.env` parsing, member key writing, search, the check wait, merge, preview discovery, the alias helper, the survey, and the CLI conventions.
- `VERSION` 25.10.0 → 25.10.1 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Asked which of the found bugs the first fix should cover → chose all four groups: memory access, keys and secrets, ship safety, and the smaller bugs.
- **2026-09-27** — Assumed: one change and one pull request for all four groups, because the user has twice preferred one end-to-end-tested pull request over follow-ups.
- **2026-09-27** — Assumed: the 11 open dependency-update pull requests stay out, because they're already queued as their own `/update-dependencies` change.
- **2026-09-27** — Assumed: three low-likelihood findings stay out (a nested worktree's session picked as current, the session-registry rewrite race, and `access.ts`'s uncached unknown `kid`), because each needs an unusual setup and `access.ts` isn't used yet.
- **2026-09-27** — Assumed: a member may still supersede another author's fact, as long as the same batch first inserts the member's own replacing fact, because background consolidation on a teammate's machine merges facts across authors. The replacement is then always visible and credited, which is what "cannot hide a fact" protects. The wiki's member line is reworded to say so.
- **2026-09-27** — Assumed: the Worker, not the client, blocks a member's session upsert on another author's row, by looking up the row's author before the batch runs, because the write statements stay byte-identical and an older member checkout keeps working.
- **2026-09-27** — Assumed: a member's read is checked for write words and `;` on its raw SQL text, with nothing stripped, because stripping quotes is what let `[']` hide a `DELETE`, and no read the memory script sends puts those words in literals or comments.
- **2026-09-27** — Assumed: `npm run deploy` in `app/` runs `scripts/cf-deploy.sh` instead of `wrangler deploy`, rather than being deleted, because that script already refuses to deploy outside CI and says why.
- **2026-09-27** — Assumed: CI workflows keep firing on every branch push and filter out only tags (`branches: ['**']`), because that's the smallest change that stops a release label from deploying.
- **2026-09-27** — Assumed: the PR-comment preview method accepts only a comment that names the head commit's short SHA, newest first, because the other three methods already key on the commit, and deploy bots print it.
- **2026-09-27** — Assumed: a patch release, 25.8.1, because every item fixes behavior that was already meant to work.
- **2026-09-27** — Check: `.github/workflows/test.yml` changes its trigger to branch pushes only, and adds `!cancelled()` to the mini-app step so it runs after a red suite. Neither loosens a check: tag pushes test code already tested on its branch, and the mini-app step now runs in more cases, not fewer.
- **2026-09-27** — Assumed: `memberRefusal` stays a per-statement check, and a new `batchRefusal` adds the own-fact-first rule on top, because the per-statement shape test and the Worker share it and only ordering is batch-level. The session-owner lookup lives in the Worker, since it needs the database.
- **2026-09-27** — Assumed: the existing test that let a member read `LIKE '%delete%'` now expects a refusal, and its allowed-read example passes the pattern as a parameter, because the read check now looks at the whole text by design. This tightens a check, not loosens one.
- **2026-09-27** — Assumed: the preview alias is fitted after the staging-name guards in `cf-deploy.sh` and `cf-preview.sh`, by running the already-normalized alias through `wong_preview_alias` again with the Worker name, because normalizing is idempotent and the early branch-name check keeps its own message.
- **2026-09-27** — Assumed: "CI is green through `/save`" is `/ship`'s single checkpoint, not a task, because a task must be done before the archive, and `/ship` makes one save after it. Task 5.3 was removed for that reason.
- **2026-09-27** — Local checks: 355 script tests, 0 fail (9-11 skip by host); the c8 coverage floor holds; oxlint passes; the payload link, OpenSpec config, and retired-names checks pass; `loosened-checks.mjs --worktree` lists `.github/workflows/test.yml` as explained; `openspec validate fix-found-bugs --strict` passes. shellcheck isn't installed on this host, so CI runs it.

- **2026-09-27** — Distilled facts before the archive: no repeatable fact; the memory store had no facts for this change or its branch. The member rule's wiki wording changed with the code.
- **2026-09-27** — Archived by `/ship` and saved as one checkpoint on `explore-bugs`. The specs synced `memory-store` (1 modified), `delivery-gate` (2 modified), `preview-discovery` (1 modified), and `ci-tests` (1 added). At the checkpoint, `main` had shipped 25.9.0 (`eecf5a2`, dependency updates, checkout and setup-node 7), so I merged it in and this release became 25.9.1. The workflow edits merged cleanly beside the new action pins; only `VERSION` and `CHANGELOG.md` conflicted.
- **2026-09-27** — The first merge attempt was refused: `main` had shipped 25.10.0 (`8b62e62`, setup gets your computer ready first). I merged it in, and this release became 25.10.1; again only `VERSION` and `CHANGELOG.md` conflicted.

<!-- end proposal.md -->
<!-- file design.md utf8 11473 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 5188 -->
# Tasks

## 1. Memory route (member guard)

- [x] 1.1 In `.agents/skills/memory/worker/statements.mjs`, make `memberRefusal` a batch check: each write shape keeps its author check; `factTag` and `supersede` need an earlier `fact` insert in the same batch; reads must start with `SELECT`/`WITH` and have no write keyword or `;` in their unstripped text. Remove `bare()`.
- [x] 1.2 In `.agents/skills/memory/worker/memory-worker.mjs` `query()`, pass the whole batch to the new check. Before the batch runs, look up the author of each member `session` upsert's existing row, and refuse (403, `member_write`) when it isn't the key's email.
- [x] 1.3 In `memory-worker.mjs` `route()`, catch a `decodeURIComponent` failure and answer `fail(400, 'bad_path', …)`.
- [x] 1.4 Extend `scripts/tests/memory-worker.test.mjs` with one test per new spec scenario: a lone supersede, a lone fact tag, another author's session upsert, a `NULL`-author session upsert, and the `[']`-hidden `DELETE`. Add a malformed `%` path, and a test that runs every read `memory.mjs` builds through the check. Keep the existing member-supersede scenario passing.
- [x] 1.5 Reword the member line in `wiki/development/memory.md` (around line 47): a member supersedes only by writing their own replacing fact, so the replacement is always visible and credited.

## 2. Memory scripts

- [x] 2.1 Fix `parseEnv` in `.agents/skills/memory/scripts/lib/store.mjs`: trim, accept a quoted value followed by a `# comment`, and strip comments only from unquoted values. Add the design's cases to `scripts/tests/memory-store.test.mjs`.
- [x] 2.2 Make `writeEnvKey` in `lib/members.mjs` remove every `CLOUDFLARE_MEMORY_TOKEN=` line and write one where the first was. Add a test where a duplicate line is written and then read back.
- [x] 2.3 In `memory.mjs` `search`, when `--state` is set, drop the SQL `LIMIT`, filter, then slice to `--limit`. Add a test where the newest threads belong to changes and an older conversation thread is still found.
- [x] 2.4 Reword `run.mjs`'s runbook line so `finish-run --counts '{…}'` is the stated exception to "Never put JSON in a command".
- [x] 2.5 Give `run.mjs` and `session-start.mjs` a `--help` usage path (exit 0) and exit 2 on an unknown flag, with `strict` argument parsing. List both in `scripts/tests/cli-conventions.test.mjs`.

## 3. Delivery scripts

- [x] 3.1 In `.agents/skills/save/scripts/wait-for-checks.sh`, report `SUCCESS` only after two identical settled polls. Keep polling while every check is `skipping` and the grace period is still open. Update the header comment. Add the three design cases to `scripts/tests/wait-for-checks.test.mjs`.
- [x] 3.2 In `.agents/skills/ship/scripts/merge.sh`, capture `gh pr list` and keep the branch with exit 2 when it fails. After a failed `push --delete`, run `ls-remote --exit-code` again and report `deleted-at-merge` on exit 2. Add both cases to `scripts/tests/ship-merge.test.mjs`.
- [x] 3.3 In `.agents/skills/save/scripts/preview-url.sh`, make method 4 read comments newest first and keep only bodies naming the full or 7-character head SHA. Update the header's method list, and cover both new scenarios in `scripts/tests/preview-url.test.mjs`.
- [x] 3.4 In `.agents/skills/verify/scripts/verify-runner.sh`, add `--max-time "${VERIFY_REQUEST_TIMEOUT:-30}"`, and use `-I` for `HEAD`. Add a hanging-server case to `scripts/tests/verify-scripts.test.mjs`.
- [x] 3.5 Make `.agents/skills/improve/scripts/survey.mjs` `excluded()` skip `CHANGELOG.md`. Add a case to `scripts/tests/improve-survey.test.mjs`.

## 4. CI, pack, and server

- [x] 4.1 Change `on: push:` to `push: branches: ['**']` in `.github/workflows/test.yml`, `deploy.yml`, and `payload.yml`. Update the header comments that describe the triggers.
- [x] 4.2 Add `!cancelled() &&` to the `if:` of `test.yml`'s "Test the changed mini apps" step.
- [x] 4.3 Extend `wong_preview_alias` in `scripts/lib-wrangler-config.sh` with an optional Worker name: cap the alias at `62 - len(worker)`, and prefix `b-` when it doesn't start with a letter. In `scripts/cf-deploy.sh`, compute `ALIAS` after `STAGING_NAME` and pass it; do the same in `scripts/cf-preview.sh`. Cover a long branch and a digit-first branch in `scripts/tests/wrangler-config.test.mjs`.
- [x] 4.4 Point `app/package.json`'s `deploy` script at `scripts/cf-deploy.sh`, after checking it works from `app/`'s working directory; if it doesn't, `cd ..` first. Grep that nothing else relies on the old script.
- [x] 4.5 Pin `@fission-ai/openspec@1.13.2` in `server/setup.sh`. Add an assertion to `scripts/tests/server-setup.test.mjs` that it matches the version `payload.yml` installs.

## 5. Release

- [x] 5.1 Bump `VERSION` to 25.8.1 and add a `CHANGELOG.md` entry with an **Updating** note: the Worker fix takes effect on the next production deploy, and member checkouts need no update.
- [x] 5.2 Run the script suite, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `node .github/scripts/loosened-checks.mjs` on the working tree, and `openspec validate fix-found-bugs --strict --no-interactive`. Record the counts in the Decision log.

<!-- end tasks.md -->
<!-- file specs/ci-tests/spec.md utf8 760 -->
## ADDED Requirements

### Requirement: CI runs on branch pushes, never on tag pushes

The core test workflow, the payload workflow, and the pack's deploy workflow SHALL run on pushes to branches and on pull requests, and SHALL NOT run on a tag push. A tag names a commit a branch push already tested and deployed; running again on the tag would deploy that commit to staging under the tag's name.

#### Scenario: A release tag is pushed

- **WHEN** a `v25.8.1` tag is pushed for a commit on `main`
- **THEN** no test, payload, or deploy workflow run starts for the tag, and staging keeps the branch it was serving

#### Scenario: A branch is pushed

- **WHEN** a commit is pushed to any branch
- **THEN** the test, payload, and deploy workflows run as before

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 3673 -->
## MODIFIED Requirements

### Requirement: The gate waits for the pushed commit's checks

The check wait SHALL report a result only for the commit that was just pushed. It SHALL wait until the PR's head commit equals the local `HEAD`. It SHALL report `NONE` only when the repository has no CI workflow files, or when no check appears for that head within a grace period of 60 seconds. A repository with workflow files whose checks do not appear SHALL report `UNKNOWN`, never `NONE`. A failed or empty `gh` answer SHALL be `UNKNOWN`, and `UNKNOWN` SHALL stop a merge. It SHALL report `SUCCESS` only when two polls in a row return the same finished checks with none failed. While every check reported so far is skipped, it SHALL keep waiting until the grace period ends, because a skipped check finishes before the checks that do the work are registered.

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

#### Scenario: Only skipped checks have appeared

- **WHEN** the pull-request copies of the checks show as skipped before the push-triggered test run is registered
- **THEN** the wait does not report `SUCCESS`, and keeps polling until the test run finishes or the grace period ends

#### Scenario: A check appears after the others finished

- **WHEN** one poll shows every check passed and the next poll shows a new pending check
- **THEN** the wait keeps polling and reports on the new check

### Requirement: Ship deletes the branch only after a confirmed merge

`/ship` SHALL merge only the head commit it verified, and SHALL confirm that the PR state is `MERGED` before it retargets stacked PRs or deletes the remote branch. Stacked PRs SHALL be retargeted to the repository's default branch, not to a fixed name. When the merge fails, `/ship` SHALL leave the branch and the PR in place and report the failure. When the list of open pull requests based on the branch cannot be read, `/ship` SHALL keep the branch and report the failure, because a stacked pull request it could not see would close. When the branch delete fails, `/ship` SHALL ask the remote again; a branch that is now gone SHALL be reported as deleted at merge, not as an error.

#### Scenario: The merge is refused

- **WHEN** `gh pr merge` fails because of a conflict, a rule, or a new head commit
- **THEN** the remote branch is not deleted and the PR stays open

#### Scenario: The default branch is not main

- **WHEN** the default branch is `trunk` and a PR is stacked on the merged branch
- **THEN** that PR is retargeted to `trunk` before the branch is deleted

#### Scenario: Stacked pull requests cannot be listed

- **WHEN** the merge succeeds and `gh pr list --base <branch>` fails
- **THEN** the branch is kept, the report says why, and the script exits 2

#### Scenario: The forge deletes the branch mid-delete

- **WHEN** the remote still lists the branch, then the delete fails because the forge removed it in the meantime
- **THEN** the report says the branch was deleted at merge, and the script exits 0

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/memory-store/spec.md utf8 2932 -->
## MODIFIED Requirements

### Requirement: A member key adds facts under its own name but does not edit or delete them

The Worker SHALL let a `member` key run only reads and the exact write statements the memory script sends: inserts of facts, fact tags, tags, and runs, the upsert of a session row, and the update that marks a live fact as superseded. In a member's insert of a fact, a tag, or a session row, the author SHALL be the key's email. A member's fact-tag insert and supersede update SHALL each follow, earlier in the same batch, an insert of a fact under the member's own email, so a member never tags or supersedes a fact without its own new fact. A member's session upsert SHALL be refused when the store already holds that session under another author. A member's read SHALL be refused when its SQL text, taken whole with nothing stripped, contains a write keyword or a `;`, so no quoted name, string, or comment can hide a write. The Worker SHALL refuse any other statement from a `member` key with HTTP 403, and SHALL run no statement in that batch. When the memory script writes through a memory key, it SHALL write the key's email as the author, and SHALL count the key's email among the current person's emails. An `admin` key SHALL keep running any statement that does not name the key table.

#### Scenario: A member supersedes a fact

- **WHEN** a member's `/save` writes a fact that supersedes a live fact
- **THEN** the new fact is stored and the old one is marked superseded

#### Scenario: A member deletes a fact

- **WHEN** a member key sends `DELETE FROM facts WHERE id = 3`
- **THEN** the Worker answers 403, and fact 3 is unchanged

#### Scenario: A member rewrites a fact

- **WHEN** a member key sends `UPDATE facts SET body = 'x' WHERE id = 3`
- **THEN** the Worker answers 403, and fact 3 is unchanged

#### Scenario: A member writes under another name

- **WHEN** Ana's member key sends an insert of a fact whose author is `bo@example.com`
- **THEN** the Worker answers 403, and no fact is stored

#### Scenario: A member hides one bad statement in a batch

- **WHEN** a member key sends a batch with an insert of a fact followed by a `DELETE`
- **THEN** the Worker answers 403, and neither statement runs

#### Scenario: A member supersedes with no fact of their own

- **WHEN** a member key sends the memory script's supersede update for fact 3, with no fact insert before it in the batch
- **THEN** the Worker answers 403, and fact 3 stays live

#### Scenario: A member overwrites another person's session

- **WHEN** Ana's member key sends a session upsert for a session the store holds under `bo@example.com`
- **THEN** the Worker answers 403, and Bo's session row is unchanged

#### Scenario: A member hides a write inside a quoted name

- **WHEN** a member key sends ``WITH a AS (SELECT 1 AS [']) DELETE FROM tags WHERE 'x'='x'``
- **THEN** the Worker answers 403, and no tag is deleted

<!-- end specs/memory-store/spec.md -->
<!-- file specs/preview-discovery/spec.md utf8 1856 -->
## MODIFIED Requirements

### Requirement: Preview discovery never reports a bare provider apex

Preview discovery SHALL try, in order, GitHub Deployments for the head commit, commit statuses, check runs, and pull-request comments, and SHALL print the first preview URL it finds. The pull-request-comment method SHALL read only comments that name the head commit, by its full or its seven-character short SHA, and SHALL take the newest such comment first, so a preview from an earlier commit is never reported. For the three methods that match free text, it SHALL reject any candidate whose host is exactly a known provider apex, such as `workers.dev` or `vercel.app`. It SHALL only reject candidates. It SHALL NOT construct or repair a URL. When no candidate remains, it SHALL print nothing.

#### Scenario: A bot comment links the provider logo before the preview

- **WHEN** a pull-request comment that names the head commit links `https://workers.dev` in its header and `https://feature-app.example.workers.dev` in its table
- **THEN** discovery prints `https://feature-app.example.workers.dev`

#### Scenario: Only the apex is present

- **WHEN** the only preview-looking URL in every source is `https://workers.dev`
- **THEN** discovery prints nothing

#### Scenario: A deployment URL is trusted

- **WHEN** a GitHub Deployment status for the head commit has an `environment_url`
- **THEN** discovery prints that URL before it reads any free-text source

#### Scenario: A bot posts one comment per deploy

- **WHEN** the pull request has a preview comment for an earlier commit and a newer one that names the head commit
- **THEN** discovery prints the newer comment's URL

#### Scenario: No comment names the head commit

- **WHEN** the only preview comments name earlier commits, and no other method finds a URL
- **THEN** discovery prints nothing

<!-- end specs/preview-discovery/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 43523 fence=~~~ -->
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
<title>Review · 2026-09-27-fix-found-bugs</title>
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
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-fix-found-bugs">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-fix-found-bugs</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A check of the repo on 2026-09-27 found about 20 real bugs. The worst: a teammate can quietly change or hide other people's shared memory, a saved key can leak into an uploaded session record, and <code>/ship</code> can merge before the tests have run. The rest are smaller slips that give wrong answers or fail in odd cases. None of them is caught by a test today.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Teammates can add to shared memory, but never change or hide someone else's.</b> Today three gaps let a teammate get round that rule: marking another person's note as out of date with no new note to replace it, overwriting another person's session record, and hiding a delete command inside quote marks. After this change, each of those is refused, and a teammate's normal saves work as before.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">teammate sends a memory write</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">one of the memory script's own</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">writes, under their own name? ─ no ─▶ refused</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">      │ yes</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">&quot;out of date&quot; mark with their</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">own new note just before it? ─ no ─▶ refused</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">      │ yes</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">session record someone</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">else's? ─────────────────── yes ──▶ refused</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">      │ no</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">    saved</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Saved keys are read correctly, so they work and stay hidden.</b> A key written with quote marks and then a space or a comment after it is read without the quotes. The memory key then works, and the step that blanks secrets out of uploaded session records finds the real value.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b><code>/ship</code> waits for the real tests before it merges.</b> Today the wait can say &quot;all passed&quot; when only the instant, skipped checks have shown up. After this change it needs the same answer twice in a row, and a list of only skipped checks isn't a pass until the usual one-minute grace has run out.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">checks so far: all skipped</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">      │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">      ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">keep waiting (up to 1 min)</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">      │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">      ▼</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">tests appear ──▶ wait for them</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">      │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">      ▼</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">same result twice ──▶ pass</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Shipping never closes other pull requests by accident.</b> If GitHub won't list the pull requests stacked on a branch, <code>/ship</code> keeps the branch instead of deleting it. If GitHub deletes the branch itself a moment before <code>/ship</code> does, that counts as done, not as an error.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Smaller fixes:</b> - Memory search finds open threads even when newer ones belong to other work. - The preview link always matches the latest save. - A release label doesn't redeploy old code to the test site. - Long branch names still get a preview link. - Deploying by hand from a laptop can't reach the live site. - A slow page can't stall <code>/verify</code>. - A malformed memory address gets a clear error. - Mini app tests still run when the main tests fail. - A new server installs the same planning tool version as CI. - The background memory run gets one clear instruction for its counts. - The maintenance scan skips the changelog. - The two memory helper scripts answer <code>--help</code>.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b></p>
<ol class="items">
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0">The 11 waiting dependency updates. They're their own change, through <code>/update-dependencies</code>.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0">Three unlikely edge cases: nested worktrees, the session list race, and the unused login-key cache.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0">Working out background-run counts from the saved notes, rather than trusting the model.</div></div></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked which of the found bugs the first fix should cover → chose all four groups: memory access, keys and secrets, ship safety, and the smaller bugs.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: one change and one pull request for all four groups, because the user has twice preferred one end-to-end-tested pull request over follow-ups.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the 11 open dependency-update pull requests stay out, because they're already queued as their own <code>/update-dependencies</code> change.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: three low-likelihood findings stay out (a nested worktree's session picked as current, the session-registry rewrite race, and <code>access.ts</code>'s uncached unknown <code>kid</code>), because each needs an unusual setup and <code>access.ts</code> isn't used yet.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a member may still supersede another author's fact, as long as the same batch first inserts the member's own replacing fact, because background consolidation on a teammate's machine merges facts across authors. The replacement is then always visible and credited, which is what &quot;cannot hide a fact&quot; protects. The wiki's member line is reworded to say so.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the Worker, not the client, blocks a member's session upsert on another author's row, by looking up the row's author before the batch runs, because the write statements stay byte-identical and an older member checkout keeps working.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a member's read is checked for write words and <code>;</code> on its raw SQL text, with nothing stripped, because stripping quotes is what let <code>[']</code> hide a <code>DELETE</code>, and no read the memory script sends puts those words in literals or comments.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>npm run deploy</code> in <code>app/</code> runs <code>scripts/cf-deploy.sh</code> instead of <code>wrangler deploy</code>, rather than being deleted, because that script already refuses to deploy outside CI and says why.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: CI workflows keep firing on every branch push and filter out only tags (<code>branches: ['**']</code>), because that's the smallest change that stops a release label from deploying.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the PR-comment preview method accepts only a comment that names the head commit's short SHA, newest first, because the other three methods already key on the commit, and deploy bots print it.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a patch release, 25.8.1, because every item fixes behavior that was already meant to work.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>.github/workflows/test.yml</code> changes its trigger to branch pushes only, and adds <code>!cancelled()</code> to the mini-app step so it runs after a red suite. Neither loosens a check: tag pushes test code already tested on its branch, and the mini-app step now runs in more cases, not fewer.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>memberRefusal</code> stays a per-statement check, and a new <code>batchRefusal</code> adds the own-fact-first rule on top, because the per-statement shape test and the Worker share it and only ordering is batch-level. The session-owner lookup lives in the Worker, since it needs the database.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the existing test that let a member read <code>LIKE '%delete%'</code> now expects a refusal, and its allowed-read example passes the pattern as a parameter, because the read check now looks at the whole text by design. This tightens a check, not loosens one.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the preview alias is fitted after the staging-name guards in <code>cf-deploy.sh</code> and <code>cf-preview.sh</code>, by running the already-normalized alias through <code>wong_preview_alias</code> again with the Worker name, because normalizing is idempotent and the early branch-name check keeps its own message.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: &quot;CI is green through <code>/save</code>&quot; is <code>/ship</code>'s single checkpoint, not a task, because a task must be done before the archive, and <code>/ship</code> makes one save after it. Task 5.3 was removed for that reason.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Local checks: 355 script tests, 0 fail (9-11 skip by host); the c8 coverage floor holds; oxlint passes; the payload link, OpenSpec config, and retired-names checks pass; <code>loosened-checks.mjs --worktree</code> lists <code>.github/workflows/test.yml</code> as explained; <code>openspec validate fix-found-bugs --strict</code> passes. shellcheck isn't installed on this host, so CI runs it.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled facts before the archive: no repeatable fact; the memory store had no facts for this change or its branch. The member rule's wiki wording changed with the code.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archived by <code>/ship</code> and saved as one checkpoint on <code>explore-bugs</code>. The specs synced <code>memory-store</code> (1 modified), <code>delivery-gate</code> (2 modified), <code>preview-discovery</code> (1 modified), and <code>ci-tests</code> (1 added). At the checkpoint, <code>main</code> had shipped 25.9.0 (<code>eecf5a2</code>, dependency updates, checkout and setup-node 7), so I merged it in and this release became 25.9.1. The workflow edits merged cleanly beside the new action pins; only <code>VERSION</code> and <code>CHANGELOG.md</code> conflicted.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>The first merge attempt was refused: <code>main</code> had shipped 25.10.0 (<code>8b62e62</code>, setup gets your computer ready first). I merged it in, and this release became 25.10.1; again only <code>VERSION</code> and <code>CHANGELOG.md</code> conflicted.</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
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
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
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

  // ── copy: saved notes only, as a plain request to update the plan ──
  function notesText() {
    const lines = ['Update the plan ' + CHANGE + ' with these notes from the review page. Don\'t build yet.'];
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat to update the plan.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
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
