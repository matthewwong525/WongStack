# Tasks

## 1. The worker's job list

- [x] 1.1 In `.agents/skills/daily/scripts/worker.mjs` `loadSweeps`, merge the default `sweeps` with the install's by `id` (install wins; `"off": true` removes); accept an entry with `brief` or a known `do`.
- [x] 1.2 In `makeWorker` `sweep()`, run a due `do` job through a `builtins` map in the pass, journal its failure as `Not read: job …`, and print `wouldDo` on a dry run.
- [x] 1.3 Add `"place": "copy"`: fetch `origin/main`, add a detached worktree under `<state>/copies/<runId>`, run there; remove and prune it when the run ends, is stopped, or at `boot`; journal `Not started` when the copy fails.
- [x] 1.4 Add a job's `minutes` as its run limit in `reap` (default 30); keep the item's limit on its running entry.
- [x] 1.5 Add the two entries to `.agents/skills/daily/references/sweeps.json` by the design.
- [x] 1.6 In `scripts/tests/daily-worker.test.mjs`, test: default and install jobs merge, replace and `off`; a bad `do` fails the list; a `do` job runs in the pass with no AI run and a failing one journals; a dry run starts no copy; a copy job runs in its worktree and the worktree goes after the run, after a 90-minute stop, and at boot; the 30-minute default still holds.

## 2. Wrap-up

- [x] 2.1 Add `.agents/skills/daily/scripts/wrap-up.mjs` with the five tests of the design, `wrap-up.json`, 3 tries, the 10-minute `gh` cache and the 60-day pruning; reuse `ownWorkspace`, `savedState`, `mergedAtTip` from `schedule/scripts/tidy.mjs` and `sendText`, `userAt`, `watched` from `chief.mjs`.
- [x] 2.2 Wire `wrap-up` into `serveDaily`'s `builtins` with the watch's rows of the pass and the worker's queue and running lanes.
- [x] 2.3 In `todos.mjs` `closeDone`, skip a chat `wrap-up.json` holds; in `wrap-up.mjs`, skip a to-do with `closeAsked`.
- [x] 2.4 Add `scripts/tests/daily-wrap-up.test.mjs`: merged at HEAD, clean and quiet 20 minutes → one send and a journal line; a new commit after the merge, a dirty tree, an open question, a running chat, a busy lane, the main checkout, a chat named `Daily`, a person who wrote 5 minutes ago → no send; no readable message time uses the chat's last update; a second pass sends nothing; 3 failed sends → `Not closed`; a chat Done already closed → no send, and the reverse.

## 3. Wiki tidy

- [x] 3.1 In `.agents/skills/memory/scripts/memory.mjs`, make `finish-run --kind consolidation --status ok` write `consolidated.json` in the run's state folder, keeping any `claimed` field; a failure to write never fails the command.
- [x] 3.2 Add `.agents/skills/daily/scripts/wiki-tidy-check.mjs`: read the marker, claim a newer `at`, print one `run` line; print nothing with no marker or nothing new.
- [x] 3.3 Add `.agents/skills/daily/references/briefs/wiki-tidy.md`: follow `/dream-memory --small`, the one publish it allows, and the end line of the design.
- [x] 3.4 In `.agents/skills/dream-memory/SKILL.md`, add the `--small` line and update the description; offset the added words by cuts elsewhere in the skill text until `node scripts/measure-context.mjs --check` passes.
- [x] 3.5 In `.agents/skills/dream-memory/scripts/dream.mjs`, accept `Wiki tidy ` records in `isDreamFact`, with the same date and fact-id guards.
- [x] 3.6 Tests: the marker write and claim (`scripts/tests/` memory and a new check test); `dream.test.mjs` for a tidy record counting in `since`, and a forged future tidy record ignored.

## 4. Words

- [x] 4.1 `wiki/development/daily.md`: the two default jobs, how to turn one off, `do`, `place`, `minutes` in "Your own jobs", and wrap-up beside "A to-do for each chat"; stay under 3,000 words.
- [x] 4.2 `wiki/development/wiki-dream.md`: the small tidy (when it runs, what it does and does not, where it publishes), "It runs only when you type it" for the full dream, and "When to run one" without the busy-week reason the tidy now covers.
- [x] 4.3 `wiki/development/memory.md#consolidation`: replace "Both passes tidy facts, never pages" with a line linking the small tidy.
- [x] 4.4 `wiki/development/the-change-loop.md#one-task-one-workspace`: one line that the helper wraps up a merged chat the agent left open, linking `daily.md`.
- [x] 4.5 Update the `wiki-dream` main spec's Purpose for the small tidy, in `openspec/specs/wiki-dream/spec.md`.
- [x] 4.6 `CHANGELOG.md` `## Next (minor)` entry, with the Updating note: nothing to do; how to turn a job off; remove an `off` entry before rolling back.

## 5. Verify

- [x] 5.1 Run the daily, memory and dream tests, `node .github/scripts/checks.mjs --worktree` and `openspec validate wrap-up-and-wiki-tidy --strict --no-interactive`.
- [x] 5.2 Run `daily.mjs serve --dry-run` on this computer and read its `wouldDo` and `wouldCheck` lines.
- [x] 5.3 `/save`, and check the gate passes.
