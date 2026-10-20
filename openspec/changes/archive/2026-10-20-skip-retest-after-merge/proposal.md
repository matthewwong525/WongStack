# Proposal

**Status:** ready-to-ship
**Branch:** reduce-action-time
**Open questions:** none

## Why

GitHub bills by the minute for the checks WongStack runs, and WongOS uses about 1,200 a week, well past the free 2,000 a month. Two runs repeat work already done. After a change goes live, its tests run again on code that already passed. In WongOS, every change also runs the full test suite twice, once in the test check and once more before deploying.

## What Changes

- **Code that already passed isn't tested again after it goes live.** When a change goes live and its code is exactly what passed on its branch, the test check says so in one line and passes. It skips the 5-minute repeat. When the code differs, because other changes went live in between, or the check can't tell, the tests run as before. Going live still deploys the app every time. In WongOS, about 6 in 10 changes match, which saves about 85 minutes a week.
  ```mermaid
  flowchart TD
    live[goes live] --> same{same code passed?}
    same -->|yes| skip[skip, say why]
    same -->|no or unsure| run[tests run]
    live --> deploy[app deploys]
  ```

- **Updating removes a second test run from the deploy step.** WongStack's deploy step runs no tests, because the test check already does. WongOS still has a test run in its deploy step, left from an older version. The update's to-do asks to remove it and keeps every other local edit. That saves about 4 minutes on each change to the app, about 350 a week in WongOS.
  | Each change to the app, WongOS | Before | After |
  |-|-|-|
  | On its branch | tests twice, deploy | tests once, deploy |
  | Going live, code already passed | tests twice, deploy | deploy only |
  | Going live, code differs | tests twice, deploy | tests once, deploy |

Together, WongOS's GitHub minutes drop by about 35%, from about 1,200 a week to about 770. ClaymooApp already runs its checks on its own runner, outside GitHub, so it only needs the normal update. Wiki-only saves, such as `/close`'s, already skip tests and stay as they are.

Non-goals: speeding up the test suite itself; moving checks off GitHub; changing which files a check runs for; changing the checks on the Cloudflare-only route.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ci-tests`: a push to the default branch whose code exactly matches a branch head that already passed the test check skips the suite and says so.

## Impact

- `.github/scripts/already-passed.sh` (new): looks up the merged pull request's head, compares trees, and reads that head's `test` check result.
- `.github/workflows/test.yml`: a new step before "Run shared checks" on default-branch pushes; `checks: read` and `pull-requests: read` permissions.
- `scripts/tests/already-passed.test.mjs` (new), with a stub `gh` and a temporary git repo.
- `wiki/development/the-change-loop.md#the-gate`: one sentence on the skip.
- `CHANGELOG.md`: a `minor` entry whose **Updating.** note asks to remove a local test run from the deploy step.
- Installs: WongOS's `.github/workflows/deploy.yml` loses its local Lint and Test steps on its next sync.

## Decision log

- **2026-10-20** — Asked which fix to take on → chose a WongStack change, then a sync into each install.
- **2026-10-20** — Assumed: the suite skips only when the merged code's tree equals a branch head whose `test` check passed, and runs on any doubt, because two changes that each passed can still break together, and the gate's rule is that a guess runs the check.
- **2026-10-20** — Assumed: `/ship` still merges without first bringing `main` into the branch, because doing so would cost a branch run to save a `main` run.
- **2026-10-20** — Assumed: WongOS's deploy-step tests are a leftover, not a choice to keep, because they arrived with its WongStack 8.2.0 sync (#27), before the suite moved to its own check.
- **2026-10-20** — Assumed: the removal goes through the release's **Updating.** note, not code in `/wong-sync`, because only one install has the leftover and the note becomes a to-do on its sync plan.
- **2026-10-20** — Assumed: ClaymooApp needs nothing beyond the normal update, because GitHub Actions has been off there since 2026-10-12 and its checks run on its own runner.
- **2026-10-20** — Check: `.github/workflows/test.yml` skips "Run shared checks" on a default-branch push when the new `.github/scripts/already-passed.sh` proves the pushed tree equals a merged pull request head whose `test` check passed, because identical files give identical results; any doubt runs the suite. Run against real WongStack data with the real `gh`: `9a6f2b30` (#399) answered `passed=true pr=399`, its tree identical to head `71d2d43d`; `6fadd4bb` (#342) answered `passed=false pr=342`, its tree one wiki line off head `1d18f64e`. The same-repo `pull_request` event records a skipped `test` run newer than the real one, so the script ignores skipped runs.
- **2026-10-20** — Assumed: the second look's extra skip for a push whose commit is the branch head itself was removed, because the plan didn't ask for it and running the suite there is the safe answer. Archived for `/ship`.
- **2026-10-20** — Assumed: the summary step's `run:` became a block scalar, because the first save's Test workflow failed to load: a plain value holding `: ` is a YAML mapping error.
- **2026-10-20** — Assumed: `main` was brought in after 43.12.1 shipped, and the release stays 43.13.0, because a Cloudflare Zero Trust outage held the preview while #402 and #403 merged.
