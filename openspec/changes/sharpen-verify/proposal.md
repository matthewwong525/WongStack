# Catch more mistakes when checking the preview

**Status:** in-progress

**Branch:** improve-verify-skill-2

**Open questions:** none

## Why

The last 11 preview checks found nothing wrong: 6 passed, 5 had nothing to check, none failed. We can't tell whether the work was that good or the check is too easy to please, because the agent that built a change also picks what to try and grades the result. Before changing how it checks, we need a way to see whether a change helps.

## What Changes

- **A practice site with planted mistakes.** A small notes site with nine promises: five quietly broken, four that work. The checking agent sees the promises and the site, never the answers. Each run reports mistakes caught, mistakes missed, false alarms, and how long it took.
  ```text
    PRACTICE SITE
    ══════════════════════════════
    9 promises: 5 broken, 4 fine
               │
      ┌────────┼─────────┐
      ▼        ▼         ▼
    today   sharper   sharper
             proof    + fresh
                       grader
      │        │         │
      └────────┼─────────┘
               ▼
    caught · missed · false alarm
  ```
- **Today's check is measured first.** It runs three times against the practice site, so every idea after it is compared with a real number.
- **A sharper bar for proof.** The instructions say what a pass needs: every part of the promise shown, a before and an after where the promise is about a change, and one honest try at breaking it. Today they say only that "no error" is not a pass.
- **A fresh grader, only if it earns its place.** A second helper that sees just the promise and the evidence, not the build, grades each result. It is measured against the sharper bar alone.
- **Only what wins is kept.** An idea goes into the check only if it catches clearly more planted mistakes without more false alarms. If today's check already catches everything, the planted mistakes are made harder once; if it still does, the check stays as it is and you keep the practice site.
- **You decide on the grader.** If the grader wins, you see the numbers and the extra minutes per publish before it goes in, because it reverses an earlier choice not to use a second judge.
- **The record gets the numbers.** The page that explains why the check works this way states what was measured, whichever way it goes.

**Non-goals:** Checking promises that run on a person's computer or in the chat (a later, separate change). Running several helpers at once for speed. Running the practice test on every publish. Changing when publishing runs a check, or the scripts that find the preview and drive the browser.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: a pass needs every part of the `THEN` shown; adds that a change to the grading instructions is measured against planted mistakes first.

## Impact

New, meta-repo only (not in the payload): `scripts/eval-verify.mjs`, `scripts/fixtures/verify-eval/` (the practice site, its scenarios, the answer key), `scripts/tests/verify-eval.test.mjs`, and a `wiki/maintaining/` page on measuring a skill change. Conditional on the results: `.agents/skills/verify/references/walkthrough.md` § b and § d, `.agents/skills/verify/SKILL.md` only if the grader ships, `wiki/development/staging-walkthrough.md`'s declined-options note, and a `CHANGELOG.md` entry (minor) when any payload file changes. Added skill words are offset by cuts. Nine headless agent runs, by hand. No app, dependency, or CI workflow change.

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
