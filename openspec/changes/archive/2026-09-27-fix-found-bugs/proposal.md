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
- `VERSION` 25.8.0 → 25.8.1 and a `CHANGELOG.md` entry.

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
