# Design

## Context

The Test workflow ([`.github/workflows/test.yml`](../../../.github/workflows/test.yml)) runs `npm test`, which ends in `stryker run`. Since 20.1.0, Stryker's incremental mode reuses each mutant's result from `reports/stryker-incremental.json`, which the workflow restores and saves with `actions/cache`. The key is `stryker-<os>-<hash>-<run id>-<attempt>`, where the hash covers `package-lock.json`, `stryker.conf.*`, and `vitest.config.*`, and restore matches `stryker-<os>-<hash>-`. Any change to those files misses every saved file, so Stryker tests every mutant: 14-19 minutes in wongstack-cloud (proposal, Decision log). WongStack updates touch the lockfile nearly every time.

Stryker's own diff sees source and test files, not dependencies or configs. It does handle a config that un-skips mutants: `IncrementalDiffer` re-runs any mutant whose old status is `Ignored`.

## Goals / Non-Goals

**Goals:**
- A push never tests every mutant just because a dependency or config file changed.
- Results never drift for more than a day: a scheduled run re-tests everything from scratch and becomes the base for later pushes.

**Non-Goals:**
- A second workflow, a separate Stryker job, or a new `npm` script.
- Detecting which config edits are safe to reuse across.

## Decisions

**The key drops its input hash.** Key `stryker-$RUNNER_OS-<run id>-<attempt>`, restore key `stryker-$RUNNER_OS-`. The locate step still outputs `stryker-key`, now just `stryker-$RUNNER_OS`, so key and restore key cannot drift. Old entries (`stryker-Linux-<hash>-…`) match the new prefix, so the first push after the sync reuses the newest one. Rejected: keep the Stryker and Vitest configs in the hash (the user chose to leave them to the nightly run), and a version segment such as `stryker-v2-` (it would force exactly the cold run this change removes).

**The nightly run is a `schedule` trigger on `test.yml`.**

- `on.schedule`: one cron, `'17 6 * * *'` (off the hour, when GitHub's scheduler is less loaded). GitHub runs it on the default branch only.
- The job `if` adds `github.event_name == 'schedule'` explicitly. (The fork clause already passes on `schedule`, since an empty head repo differs from the repo name, but that is an accident to not rely on.)
- "Restore mutation results" adds `github.event_name != 'schedule'` to its `if`, so Stryker logs "No incremental result file found" and tests every mutant. No `--force` flag: `npm test` stays the one command, and Stryker still writes the incremental file, which "Save mutation results" stores as it does on a push.
- `app-untouched.sh` treats `schedule` as an unknown event: the suite runs and every mini app's tests run. `loosened-checks.mjs` gets an empty base and exits 0 with a note. Neither changes.
- The concurrency group is `test-schedule-<default branch>`, separate from push groups, and the default branch never cancels in progress, so a nightly run and a push to `main` never cancel each other.

Rejected: a separate `mutation.yml` (duplicates the suite-finding step; the `app-scaffold` spec says the gates need no extra workflow), and `workflow_dispatch` (a person can re-run the last nightly from the Actions tab; not needed for the goal).

**A red nightly run stops `/ship`.** GitHub attaches a scheduled run's check run to the head commit it tested, so `/ship`'s preflight query (`commits/main/check-runs`) already sees a failed nightly `test` as `failure` and stops. When a push lands on `main` after the nightly, that push restores the nightly's file and fails too, so the head commit is red either way. The only edit is the stop message in `.claude/skills/ship/SKILL.md`: when a failing check is the Test workflow's scheduled run, say the nightly full check found a weak test and that fixing it (a test that kills the mutant, pushed to `main` through the normal loop) comes first. Rejected: a full re-test before each merge (the 15-20 minute wait again), and a separate API call for the latest scheduled run (the existing query already covers it).

**Time limits.** `timeout-minutes: ${{ github.event_name == 'schedule' && 60 || 30 }}`. A push that finds no file (a new repo, or a cache GitHub evicted) runs everything; at 15 minutes wongstack-cloud's was cancelled at 83%. The nightly run always runs everything, and gets headroom to grow.

**`ignoreStatic` goes.** Removing it from `app/stryker.conf.json` tightens the gate. Because formerly `Ignored` mutants re-run, the first push after the update tests only them, not everything.

## Risks / Trade-offs

- [A Vitest config or dependency change makes a killed mutant survive, and a push reuses the stale "killed"] → the next nightly run tests it from scratch; its saved result then fails the next push that restores from `main`. The gap is at most a day, and only on `main` or a branch that restores `main`'s file.
- [A red nightly run goes unseen] → GitHub emails the person who last changed the schedule, the README's `test` badge reads the latest run on `main`, and the next push fails with the same mutant.
- [Actions minutes on private repos] → about 20 minutes a day in wongstack-cloud, within the free 2,000 a month but not small. A repo that cares can remove the `schedule` line; its pushes still work, only drift goes unchecked.
- [A long-lived branch keeps its own older file, so its own pushes pass] → restore prefers the branch's own entry, but `/ship`'s preflight reads `main`'s head commit, where the red nightly check sits, and stops the merge.
- [GitHub pauses schedules after 60 days without activity in a public repo] → pushes still run incrementally; only the drift check stops. Turning the workflow back on in the Actions tab resumes it, and the CHANGELOG entry says so.

## Migration Plan

`/wong-sync` brings `test.yml` and `stryker.conf.json`. A repo that raised its own `timeout-minutes` (wongstack-cloud: 30) takes the new expression. Its sync plan needs `Check:` bullets for both files. Rollback: revert the commit; the old hashed key then misses and the next push runs cold once.
