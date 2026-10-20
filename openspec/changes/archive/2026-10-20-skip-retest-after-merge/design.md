# Design

## Context

See proposal.md for why. Measured in `matthewwong525/WongOS`, Oct 13–20: Test and Deploy each run about 5 minutes on every app-touching push, branch or `main`. Docs-only pushes already take about 10 seconds each, through `.github/actions/change-scope`. Of the last 40 merged pull requests, 24 had a squash-merge tree identical to the head the branch tested; 16 differed because `main` moved first. `merge.sh` merges with `gh pr merge --squash --match-head-commit` and never requires an up-to-date branch.

`checks.mjs` is shared with the Artifacts route and has no GitHub API, so the GitHub-only lookup stays out of it.

## Goals / Non-Goals

**Goals:**

- Skip the shared checks on a default-branch push only when the exact tree already passed `test`.
- Remove WongOS's duplicate deploy-step suite through the release's sync to-do.

**Non-Goals:**

- Changing `checks.mjs`, `app-untouched.sh`, `deploy.yml`, `guard.yml`, or this repo's `payload.yml`.
- Making `/ship` bring `main` into a branch before merging.

## Decisions

**A small script, `.github/scripts/already-passed.sh`, called from `test.yml`.** It runs only when `github.event_name == 'push'` and `github.ref_name` is the default branch, before "Run shared checks". It prints `passed=true|false` and `pr=<n>` for `$GITHUB_OUTPUT`, notes go to stderr, and it always exits 0, like `app-untouched.sh`. Steps:

1. `gh api repos/$REPO/commits/$SHA/pulls` → the merged pull request whose `merge_commit_sha` is `$SHA`. None → `passed=false`.
2. Fetch its `head.sha` (`git fetch origin refs/pull/<n>/head` when missing) and compare `git rev-parse <head>^{tree}` with `$SHA^{tree}`. Different → `passed=false`.
3. `gh api repos/$REPO/commits/<head>/check-runs?check_name=test` → the newest run from the `github-actions` app. Its `conclusion` must be `success`. Anything else → `passed=false`.

Tree equality, not commit equality, is the test: a squash merge is a new commit with the same files. It is also enough on its own, since identical files give identical results, whatever else the push carried.

"Run shared checks" gains `steps.passed.outputs.passed != 'true'`. When it skips, the step summary names the pull request. The job keeps reporting, so a required `test` check still turns green.

*Alternative:* drop `push` to `main` from `test.yml`. Rejected: a direct push, or two merges that break together, would go live untested.

*Alternative:* inside `checks.mjs`. Rejected: the Artifacts route has no pull requests to look up, and the user wants one check list for both routes, not GitHub logic in it.

**Permissions.** The job adds `checks: read` and `pull-requests: read` beside `contents: read`, and passes `GH_TOKEN: ${{ github.token }}` to that step only.

**WongOS's duplicate suite goes through the changelog's Updating note.** `/wong-sync` turns the note into a to-do on the install's plan. It is worded plainly: if the deploy step runs its own lint or tests, remove them, because the test check already runs them. Other local edits stay.

## Risks / Trade-offs

- [GitHub API change or outage] → any error answers `passed=false`, so the suite runs. A wrong skip needs an identical tree and a green `test` run.
- [A re-run on an old head reports a later conclusion] → read the newest `test` run for that head; a failure there runs the suite.
- [Fork pull requests] → the head is fetched by `refs/pull/<n>/head`, which exists for forks too; when it can't be fetched, the suite runs.
- [The changed workflow is a check's settings] → `check-settings.mjs` flags `.github/workflows/*.yml`, so the change's Decision log needs a `Check:` line naming `test.yml`.

## Migration Plan

Ships as a `minor`. Installs get the new step on their next `/wong-sync`. WongOS also removes its deploy-step Lint and Test by the Updating to-do. Roll back by reverting the step: the suite then runs on every `main` push again.
