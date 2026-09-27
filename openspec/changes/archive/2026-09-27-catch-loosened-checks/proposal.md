# Catch checks the AI loosens

**Status:** ready-to-ship
**Branch:** explore/guardrails-nontechnical-coding
**Open questions:** none

## Why

The automatic checks only protect you if they stay switched on. Today the AI can quietly turn one off, skip a test, or lower a limit, and everything still passes. You would have to read the code to notice, and a non-technical person can't. So a loosened check should never pass silently: it needs a written reason, and you should see every one before you publish.

## What Changes

- **Loosening a check stops the save until a reason is written down.** Every save compares the work with the live version. If a check got weaker and no reason is recorded, the checks fail.
  ```text
  save ──▶ compare with live
              │
        check loosened?
         │          │
         no         yes
         │          │
         ▼       reason written?
       pass       │        │
                  yes      no
                  │        │
                  ▼        ▼
                pass     fail ──▶ agent
                                  fixes
  ```
- **What counts as loosening.** Turning a check off on one line of code. Skipping or deleting a test. Any change to a check's settings: its limits, what it leaves out, the test command, or the checks themselves. A setting that gets stricter needs a one-line reason too, because a script can't reliably tell stricter from looser.
- **The agent fixes it without asking you.** It either switches the check back on, or writes a plain reason into the plan's list of decisions. It only tells you what it could not fix.
- **You see each one before you publish.** The *publish it?* question and the final "it is live" report list every loosened check in one plain line. The plan's review page tags them `check`, beside `asked` and `assumed`.
  ```text
  Built the tip calculator.
  Preview: https://…/apps/tips/

  Checks loosened (1):
  • Skipped one test for the
    rounding code, because the
    test needs a live bank feed.

  Publish it?
  ```
- **It works in every WongStack repo, across all its code.** Mini apps included: a skipped or deleted test counts wherever it is.

Non-goals: stronger checks for mini apps, an automatic second review, and scanning for pasted keys or unsafe packages. Those stay open for later.

## Capabilities

### New Capabilities

### Modified Capabilities
- `ci-tests`: the Test check fails on a loosened check that has no recorded reason.
- `apply-completion-handoff`: the publish question lists the change's loosened checks.
- `ux-wireframes`: the review page labels a `Check:` decision `check`.

## Impact

- New core payload script `.github/scripts/loosened-checks.mjs`; `.github/scripts/app-untouched.sh` prints a fourth output, `base`; `.github/workflows/test.yml` runs the new script on every run, after the suite.
- `.claude/skills/apply/SKILL.md` (finish with a preview) and `.claude/skills/ship/SKILL.md` (report) list `Check:` bullets; `.claude/rules/code.md` and `wiki/development/the-change-loop.md#the-gate` state the rule once.
- `.claude/skills/plan/scripts/build-review.mjs` and `references/review-kit.html` gain the `check` label.
- `payload-files.json`, meta test `scripts/tests/loosened-checks.test.mjs`, `scripts/tests/app-untouched.test.mjs`, `VERSION` 25.6.0, `CHANGELOG.md`.
- Installed repos: a branch that changes a check's settings, including a `/wong-sync` that updates `test.yml`, now needs a `Check:` bullet. CI's failure message says exactly what to add.

## Decision log

- **2026-09-27** — Asked which guardrail gaps to plan now → chose catching loosened checks only; stronger mini-app checks, a second review, and secret and package scanning stay open.
- **2026-09-27** — Asked what a non-technical person sees when a check catches a problem → chose the agent fixes it itself and reports only what it could not fix.
- **2026-09-27** — Assumed: any change to a check's settings counts, not only a lowered number, because the loose direction differs per setting (a higher copy-paste limit is looser, a lower coverage limit is looser) and a list of known keys misses new ones. A reason for a stricter setting costs one line.
- **2026-09-27** — Assumed: the reason lives in the change's Decision log as a `Check:` bullet that names the file, not in a code comment beside it, because JSON settings files can't hold comments and the Decision log already reaches the review page and the archive. This replaces the "reason beside it" idea from exploring.
- **2026-09-27** — Assumed: a reason counts when a `proposal.md` this branch adds or changes, active or archived, names the file in a `Check:` bullet, because `/ship` archives the change before its last CI run.
- **2026-09-27** — Assumed: the step runs inside the existing Test check, before the suite and on docs-only branches too, so no new required check is needed.
- **2026-09-27** — Assumed: `app-untouched.sh` supplies the comparison point as a fourth output, `base`, so one script decides what the branch changed.
- **2026-09-27** — Assumed: when there is nothing to compare with, the step says so and passes, because that happens only on a push to `main` whose pull request already passed.
- **2026-09-27** — Assumed: the check covers the whole repo, mini apps included, and skips its own script so its list of markers doesn't flag itself.
- **2026-09-27** — Assumed: release 25.5.0, a minor bump: new behavior, no setup step, and the failure message tells an installed repo how to pass.
- **2026-09-27** — Assumed: release 25.6.0 instead of 25.5.0, because `main` shipped 25.5.0 (memory access from GitHub) while this was planned.
- **2026-09-27** — Assumed: the step runs after the suite rather than before it, even when the suite fails, because one push then reports every problem and the auto-fix needs one round, not two.
- **2026-09-27** — Assumed: the check reads its own script for settings changes but not for skip markers, because it names every marker, and an edit that weakens it must still need a reason.
- **2026-09-27** — Check: `.github/workflows/test.yml` adds the loosened-checks step and a summary line; nothing is skipped or lowered.
- **2026-09-27** — Check: `.github/scripts/app-untouched.sh` prints a fourth line, `base`, for the new step; its three answers are unchanged.
- **2026-09-27** — Check: `.github/scripts/loosened-checks.mjs` is the new check itself.
- **2026-09-27** — Distill: no repeatable fact in memory for this change; the rule it teaches lives in `wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason`.
- **2026-09-27** — Archive checkpoint: built and archived as 25.6.0. The check, its CI step, the `base` output, the publish-list and review tag, the gate section, and the code rule landed; 318 script tests pass locally, and the check reports this branch's three `Check:` files as explained.
