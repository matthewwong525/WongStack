# Speed up CI

**Status:** in-progress
**Branch:** plan-repo-efficiency
**Open questions:** none

## Why

The meta-only Payload checks workflow fires on both `push` and `pull_request`, so every commit on a branch with an open pull request runs its 27-second job twice. The test and deploy workflows already collapse that double fire. This one was added without it.

## What Changes

- Payload checks run once per commit. The job skips a same-repo `pull_request` event and keeps its `push` run. A concurrency group keyed on event and branch stops the two events from cancelling each other. A fork pull request, which fires no `push` here, still runs. (review.html#/once/after)
- The workflow file carries the condition, the group, and a two-line pointer to the explanation in the test workflow header. It does not copy that explanation. (review.html#/workflow)
- `VERSION` and `CHANGELOG.md` record the release. A new `payload-checks` spec states the once-per-commit rule for this workflow, beside the one `ci-tests` states for the test workflow.

**Non-goals:** Caching the Playwright browser in the test workflow (19 s per run, half of it system packages a cache does not cover, in a file every target receives). Trimming skill prose to cut agent context. Dropping `npm ci` from Payload checks (the review test needs `jsdom` from the app). Pruning archived review pages.

## Capabilities

### New Capabilities

- `payload-checks`: The meta-only workflow that checks WongStack's own payload runs once per commit and never ships to a target.

### Modified Capabilities

- (none)

## Impact

`.github/workflows/payload.yml`, `VERSION`, `CHANGELOG.md`, and one new spec. No file a target receives changes. Per commit on a pull-request branch, CI drops from four runs to three and saves about 27 seconds of runner time. The wall-clock gate is unchanged, because the three remaining workflows run in parallel.

## Decision log

- **2026-09-21** — Non-interactive session; the exit round took recommended defaults and records them as assumed. Asked what "efficient" covers → assumed CI runtime: it is measurable, and the fix is deterministic code; trimming skill prose needs judgment on behavior, so it stays a follow-up. Asked whether to drop the `pull_request` trigger → assumed no; keep it with the job-level condition so fork pull requests still run, the shape `test.yml` uses. Asked whether to cache the Playwright browser → assumed no; the measured 19 s step is half system packages, and the file ships to every target. Assumed a patch bump to 16.1.1: no target receives a changed file.
- **2026-09-21** — Implemented the workflow condition, the concurrency group, and the header pointer. The condition and `cancel-in-progress` are character-identical to `test.yml`; only the group prefix differs (`payload-` against `test-`). Bumped `VERSION` to 16.1.1 and added the changelog entry. Both release checks pass. The evidence task stays open until this push shows the skipped `pull_request` run.
