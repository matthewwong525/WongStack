# Check the preview toward a goal

**Status:** ready-to-ship
**Branch:** improve-verify-skill
**Open questions:** none

## Why

The checking command is a seven-step script spread over three long pages that repeat each other. Give the agent the goal instead: show, with evidence from the live preview, whether a change does what it promised. Keep only the limits that protect you.

## What Changes

- **One goal, not a script.** The command states what a check must prove and what it may do on its own, and lets the agent choose how to check each promise. What you get is unchanged: pictures and answers from the live preview, a verdict, and one comment on the pull request.
  ```text
  before                  after
  ───────────────────     ───────────────────
  7 numbered steps        one goal
  heal, fix, post rules   + what it may do
  3 pages, repeated       + limits, verdicts
                          each point said once
  ```
- **The same limits.** It still pushes, fixes a failure in this change at most twice, resets the test database after a failure, and gets past the access login once, all without asking. It still never merges, never changes the project to run a check, and says plainly when something could not be checked.
- **Each point said once.** The wiki page keeps why a check works the way it does, and the how-to page keeps how to run one, with no point on both.
- **Plain checks work too.** Ask it to screenshot a page, test an address, or click through the app, and it does that on the live preview or the address you name. It shows what it saw in the chat and posts nothing unless you ask.
- **Still runs before every publish**, as today.

**Non-goals:** Moving the hand-over, key-link, and password pages out of the checking command's folder (waits until the phone-layout work in #215 is published), changing the scripts that find the preview and run the browser, or changing when publishing runs a check.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: adds plain checks with no change behind them, and keeps every existing requirement.

## Impact

Rewrites `.agents/skills/verify/SKILL.md`; trims `.agents/skills/verify/references/walkthrough.md` and `wiki/development/staging-walkthrough.md` so each point has one home; updates the payload manifest's description if it names the steps. Adds one `staging-walkthrough` requirement and a minor changelog entry. No script, app, or dependency change.

## Decision log

- **2026-09-30** — Asked how to handle the two open jobs touching the same files (#213 and #215) → chose to narrow this change: rewrite, trim the overlap, and add plain checks here, and leave the hand-over scripts in place until #215 is published.
- **2026-09-30** — Asked whether to plan these parts as one change → chose one change (the user asked to build the plan as described, via `/apply`).
- **2026-09-30** — Assumed: keep the ship-time check before every publish, because the user asked for it on 2026-09-26 (memory, operations@claymoo.com).
- **2026-09-30** — Assumed: keep the Access paragraph word for word as its own paragraph, because #213 edits only that paragraph; whichever change ships second takes #213's wording, so neither is lost.
- **2026-09-30** — Assumed: keep `verify-staging.sh` and its five commands untouched, because unlike `/improve`'s removed scanner they do real work the agent cannot do by judgment (finding the deployed preview, Access headers, the browser runs, uploads, cleanup).
- **2026-09-30** — Assumed: keep every existing `staging-walkthrough` requirement, because the rewrite shortens instructions, not behavior; only the plain-check requirement is added.
- **2026-09-30** — Assumed: a plain check uses the address the person names, else this commit's preview through the normal save and preflight, and posts no comment unless asked, because a pull-request comment reports a change's verdict and a plain check has none.
- **2026-09-30** — Assumed: record the hand-over move as an open memory thread, so it is picked up after #215 ships.
- **2026-09-30** — Assumed: accept a modest word cut (skill plus reference 2,310 → 2,137; wiki page 1,614 → 1,503), because the kept Access paragraph, verdict table, rungs, and comment template carry behavior the spec requires; the gain is a goal-led skill with no numbered runbook and one home per point.
