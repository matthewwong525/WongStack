# Catch more mistakes when checking the preview

**Status:** ready-to-ship

**Branch:** improve-verify-skill-2

**Open questions:** none

## Why

The last 11 preview checks found nothing wrong: 6 passed, 5 had nothing to check, none failed. We can't tell whether the work was that good or the check is too easy to please, because the agent that built a change also picks what to try and grades the result. Before changing how it checks, we need a way to see whether a change helps.

## What Changes

- **A practice site with planted mistakes.** A small notes site with nine promises: five quietly broken, four that work. The checking agent sees the promises and the site, never the answers, and can be told it built the site. Each run reports mistakes caught, mistakes missed, false alarms, and how long it took.
  ```text
    HOW THE CHECK WAS MEASURED
    ══════════════════════════════════
    practice site        past real checks
    9 promises,          6 passed checks,
    5 broken             21 promises
         │                     │
         ▼                     ▼
    today's check        fresh agents read
    runs 6 times         the records and
         │               walk them again
         ▼                     │
    30 planted                 ▼
    mistakes,            20 agree, 0 differ
    0 passed             14 records thin
  ```
- **Today's check was measured, and it held.** Across six runs it passed none of 30 planted mistakes and raised no false alarm, even when told it had built the site.
- **Past real checks were checked again.** Fresh agents walked the six real checks that passed on recent publishes. They disagreed with none of 20; one could not be walked.
- **The check's instructions do not change.** The sharper bar for proof and the fresh grader were not run: with nothing missed, there was no room to show either helping.
- **The record gets the numbers.** The page that explains why the check works this way now says what was measured about a second judge.
- **You keep the practice site**, and a page on how to measure a change to a skill, for the next time the check's instructions are edited.

**Found, and left for follow-up:** 14 of the 21 passed records leave part of their promise unshown; no picture from any of the six checks can be opened today; and one walk copied its own access token into its evidence, which was caught and removed before anything was posted.

**Non-goals:** Fixing those three findings here. Checking promises that run on a person's computer or in the chat. Running several helpers at once for speed. Running the practice test on every publish. Changing when publishing runs a check, or the scripts that find the preview and drive the browser.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: adds that a change to the grading instructions is measured against planted mistakes first.

## Impact

New, meta-repo only (not in the payload): `scripts/eval-verify.mjs`, `scripts/fixtures/verify-eval/` (the practice site, its scenarios, the build notes, the answer key), `scripts/tests/verify-eval.test.mjs`, and `wiki/maintaining/measure-a-skill-change.md`. Payload: one bullet in `wiki/development/staging-walkthrough.md`, with a `CHANGELOG.md` patch entry. No skill file, app, dependency, or CI workflow change. Results are in `evidence.md`.

## Decision log

- **2026-10-03** — Asked what the improved check should do better first → chose catching more mistakes on the preview; checking promises that run off the preview waits for its own change.
- **2026-10-03** — Asked whether to build the planted-mistakes test before changing the skill → chose test first.
- **2026-10-03** — Assumed: no fan-out of helpers for speed, because a check is two to six short journeys run by one script, and the wait is the upload, not the checking.
- **2026-10-03** — Assumed: the practice site runs on the checking machine, not as a deployed preview, because the test measures how the agent writes journeys and grades evidence, and finding the preview is script work that is not changing.
- **2026-10-03** — Assumed: the test stays in this repo and does not ship to installs, because a deliberately broken site and paid agent runs are a maintainer's tool.
- **2026-10-03** — Assumed: the test runs by hand, never on every publish, because each run is a paid agent session and a check should run only when it can fail (Matthew's rule, 2026-10-01).
- **2026-10-03** — Assumed: three runs per version, nine in all, because one run can pass or fail by luck and more than three costs more than this decision is worth.
- **2026-10-03** — Assumed: an idea is kept only if it catches at least 2 more of the 15 planted mistakes than the version before it and raises false alarms by at most 1, because a smaller gap across three runs is noise.
- **2026-10-03** — Assumed: the keep rule is written down before any run, because a rule chosen after seeing the numbers bends toward the idea we like.
- **2026-10-03** — Assumed: the grader is tried on top of the sharper bar, not alone, because the bar costs nothing per publish and the grader must beat it to be worth its minutes.
- **2026-10-03** — Assumed: ask before the grader goes in even when it wins, because the wiki records "no second judging agent" as a deliberate choice and the plan critic was dropped on 2026-09-22 for costing 8 to 15 minutes.
- **2026-10-03** — Assumed: the hosted-workspaces paragraph that another open change adds at the top of the checking command is left alone, because this change edits other sections.
- **2026-10-03** — Built the practice site, the scoring test, and the wiki page (tasks 1.1 to 1.6); no paid run yet. The headless agent gets a fixed tool list (`Bash,Read,Write,Edit,Glob,Grep`), because root cannot skip permission checks. The slow "Saved" control only trips a journey that takes its picture with no wait, since the page is settled once the network is idle.
- **2026-10-03** — Baseline measured: today's check caught 15 of 15 planted mistakes with no false alarms across three runs (22 minutes, $9.74). By the rule fixed beforehand, the practice set is too easy and is made harder once.
- **2026-10-03** — Assumed: the harder set also tells the agent it built the site and believes it works, because the first runs used an agent that never built anything, so it already had fresh eyes and no version could have shown the fresh grader helping.
- **2026-10-03** — Assumed: the harder mistakes replace the first set, not sit beside it, because one practice set with one answer key is simpler to keep true.
- **2026-10-03** — Built the harder practice set and the builder's point of view (tasks 2.3 and 2.4). Changed one planted mistake from the plan: a new note loses its last character after a reload, not its capitals, because a title typed all in lower case would have hidden the mistake.
- **2026-10-03** — Harder baseline measured: 12 of 15 caught, 3 sent to a person, none missed, no false alarms ($11.31). The three were one case, a message one word off its quoted text, where asking is what the instructions say to do.
- **2026-10-03** — Asked what to do after today's check missed nothing on the practice site → chose to re-check the six past real passes with fresh agents. The two candidates are not run, and the check's instructions stay as they are.
- **2026-10-03** — Assumed: the re-check walks the old previews again as well as reading the posted records, because the pictures from those checks no longer exist and the previews still answer, so a record alone holds only the builder's own words.
- **2026-10-03** — Assumed: the re-walk changes no data on the previews, because they share a test database and a passed check is not worth disturbing it.
- **2026-10-03** — Re-check done: fresh agents agreed with all 20 past journeys they could walk, so a second judging agent stays declined, now on numbers. The posted records were thinner than their verdicts: 14 of 21 leave a claim unshown.
- **2026-10-03** — Assumed: the rule that a pass needs every part of the promise shown is taken back out of this change, because real checks do not behave that way today and a rule the check does not follow is a false record. It is left for the follow-up that fixes it.
- **2026-10-03** — Assumed: the three findings (thin records, lost pictures, a token copied into evidence) are follow-up work, because each changes how the check behaves and this change was to measure first.
- **2026-10-03** — One helper printed the access token once in its own local transcript. The value was replaced there, nothing was posted or uploaded, and a scan finds no other copy; the token was not rotated.
