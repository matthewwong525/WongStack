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
- **A pass says how much it showed.** When part of a promise can't be shown on the preview, the report marks that promise *partly shown* and names the part, in place of a plain pass. The overall result is still a pass when nothing was contradicted, so publishing is not held up.
  ```text
     BEFORE                AFTER
  ┌──────────────────┐  ┌──────────────────┐
  │ PASSED: Greeting │  │ PARTLY: Greeting │
  │ appears and is   │  │ Shown: appears,  │
  │ announced        │  │ keeps the name   │
  │                  │  │ Not shown:       │
  │ "Hello, Sam!"    │  │ announced (no    │
  │ shows            │  │ way to hear it)  │
  └──────────────────┘  └──────────────────┘
  ```
- **A check's evidence is scrubbed before it leaves the machine.** Saved passwords, keys, and tokens found in what a walk gathered or wrote are replaced with a placeholder before anything is posted or uploaded, and the report says so.
- **No second judge, and no fan-out.** The fresh grader was not built: with nothing missed, a second judge had nothing to add.
- **The record gets the numbers.** The page that explains why the check works this way now says what was measured about a second judge.
- **You keep the practice site**, and a page on how to measure a change to a skill, for the next time the check's instructions are edited.

**Left for its own change:** keeping a check's pictures where a reviewer can open them. None of the six past checks left one. It is planned in the workspace "Keep preview check pictures with the transcripts".

**Non-goals:** Keeping pictures. Holding up a publish over a partly shown promise. Checking promises that run on a person's computer or in the chat. Running several helpers at once for speed. Running the practice test on every publish. Changing when publishing runs a check, or the scripts that find the preview and drive the browser.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: a journey whose `THEN` is only partly shown is reported as partly shown; evidence carries no credential when it is posted; a change to the grading instructions is measured against planted mistakes first.

## Impact

New, meta-repo only (not in the payload): `scripts/eval-verify.mjs`, `scripts/fixtures/verify-eval/` (the practice site, its scenarios, the build notes, the answer key), `scripts/tests/verify-eval.test.mjs`, and `wiki/maintaining/measure-a-skill-change.md`. Payload: `.agents/skills/verify/references/walkthrough.md` (§ b, § d, § f), `.agents/skills/verify/SKILL.md`'s verdict table, `.agents/skills/verify/scripts/verify-staging.sh` (the scrub), `scripts/tests/verify-scripts.test.mjs`, `wiki/development/staging-walkthrough.md`, and a `CHANGELOG.md` minor entry. No app, dependency, or CI workflow change. Results are in `evidence.md`.

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
- **2026-10-03** — The person asked whether the check itself was fixed; it was not. Asked how to handle the three findings → chose to fix all three, then, told the pictures touch code two other open changes are rewriting, chose a new workspace for the pictures and the other two fixes here.
- **2026-10-03** — Asked what the overall result should be when part of a promise can't be shown → chose still a pass, with the gap named.
- **2026-10-03** — Asked where pictures should be kept → chose Cloudflare, with the transcripts; planned in the new workspace, not here.
- **2026-10-03** — Assumed: the partly-shown wording is measured before it goes in, on three new practice promises that each hold a part no page or address can show, because that is the rule this change set for itself.
- **2026-10-03** — Assumed: two runs per version for this measure, not three, because the expected gap is large (today's check has no word for a partly shown promise) and the person was told roughly $10 to $15; a third run is added only if the two disagree.
- **2026-10-03** — Assumed: the wording is kept if it names at least 2 more of the 6 partly-showable promises than today's check, catches no fewer than one less of the 10 planted mistakes, and raises false alarms by at most 1, counting a fully shown working promise marked "partly" as a false alarm.
- **2026-10-03** — Assumed: the scrub reuses the one that already cleans transcripts, because one list of what counts as a secret is easier to keep right than two.
- **2026-10-03** — Assumed: pictures are not scanned for secrets, because a picture's text can't be read by the scrub; the instructions tell a walk not to capture request details.
- **2026-10-03** — Agreed with the chat planning the pictures change: this change publishes first and that one builds on it. This one keeps the grading section, the report's summary line, the partly-shown example, and the scrub; that one keeps the block that uploads pictures and uploads only after the scrub has run.
- **2026-10-03** — The publishing order agreed with the pictures change (PR #249) no longer holds: the person chose to build that one now, so whichever publishes second brings the other in. The split of who edits what stands: this change keeps the grading section, the report's summary line, the partly-shown example, and the scrub at the top of the upload step; that one keeps the rest of the upload step and the picture lines.
- **2026-10-03** — Measured the partly-shown wording: today's instructions and a longer version both named all 6 unshowable parts, so the longer version is not kept. Today's check named them as soon as it had a word for it, which a real report lacks. What goes in is that word: a mark in the report and three sentences defining it.
- **2026-10-03** — Assumed: the report's mark ships though the test could not score it, because the person chose that a partly shown promise be named, real reports show the gap (14 of 21), and the test scores a verdict list, not the report a check writes. The next real check is its test.
- **2026-10-03** — Assumed: the scrub replaces every value from the secrets file of eight characters or more, secret or not, because a missed secret posted in public costs more than a placeholder where an email address was; the instructions say to read the picture when a placeholder appears.
- **2026-10-03** — Assumed: the scrub's result line sits with the run step in the instructions, not beside the upload step, so the pictures change can rewrite the upload step without a clash.
