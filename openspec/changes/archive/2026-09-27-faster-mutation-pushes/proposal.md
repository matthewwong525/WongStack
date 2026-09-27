# Keep pushes fast when mutation testing starts over

**Status:** ready-to-ship
**Branch:** tender-stingray
**Open questions:** none.

## Why

Mutation testing checks that tests really test something, but when it starts over it holds up a push for 15 to 20 minutes. In wongstack-cloud a push that reuses earlier results is checked in about 2 minutes. Any dependency update or WongStack update throws those results away, so the next push waits 15 to 20 minutes, and one was cut off at the time limit.

## What Changes

- **Updates keep earlier results.** A dependency update, a WongStack update, or a test-settings change no longer throws away what mutation testing already knows. Each push still re-tests the code and tests it changes, so it is checked in minutes, not 15 to 20.
- **A full check runs every night, and nobody waits on it.** Once a day the check re-tests everything from scratch on the main branch and keeps the fresh results for the next pushes. If it finds a weak test, its run turns red, and the next push shows the same failure until a test is fixed.
  ```text
  push ──▶ reuse results ──▶ re-test
             ▲                changes
             │                (minutes)
  nightly ──▶ re-test all ──▶ save
  (no one     from scratch    results
   waits)
  ```
- **A red nightly check stops publishing.** Until a weak test the nightly check found is fixed, publishing stops and says why in plain words, so nothing else reaches the main branch on top of it.
- **Every mutant is tested again.** The setting that skipped mutants in code that runs once at start-up goes away. It saved no time in wongstack-cloud and left those mutants untested.
- **A rare full push is not cut off.** A push that has no earlier results, such as a new repo's first, gets 30 minutes instead of 15, so it finishes.

Non-goals: moving Stryker out of `npm test` or into its own job, sharding mutants across runners, lowering the 100% threshold, and editing wongstack-cloud directly; it gets this through `/wong-sync`.

## Decision log

- **2026-09-27** — Asked whether to keep Stryker, and how to stop it blocking for 15-20 min (in the wongstack-cloud chat) → chose keep it, drop the lockfile from the cache key, add a nightly full run that blocks nobody, and remove `ignoreStatic`.
- **2026-09-27** — Asked whether a Vitest or Stryker config change should still make the next push re-test every mutant → chose no: only the nightly full run re-tests everything, and a push after a Vitest config change may reuse stale results until that night.
- **2026-09-27** — Asked what happens when the nightly run finds a weak test, and whether to block publishing on it or run the full re-test before every merge → chose block publishing on a red nightly run; a full re-test before merge would bring back the 15-20 minute wait.
- **2026-09-27** — Assumed: `/ship`'s preflight already blocks on it, because a scheduled run's check attaches to the default branch's head commit, which the preflight's `commits/main/check-runs` query reads; a later push to `main` restores the nightly's file and fails the same way. The change only makes the stop message name the nightly run, and records the rule in the spec.
- **2026-09-27** — Assumed: the evidence stands as measured in wongstack-cloud: cold runs 36278178299 (no `ignoreStatic`, 2,184 mutants, 14.7 min), 36335218283 and 36336449936 (`ignoreStatic`, 2,060 mutants, 14.2 and 18.6 min), warm run 36337353913 (Stryker 31 s, 2,605 of 2,608 reused), because they are the runs the user cited; they belong to wongstack-cloud, not WongStack.
- **2026-09-27** — Assumed: removing `ignoreStatic` needs no forced full run, because Stryker 10's `IncrementalDiffer` re-runs a mutant whose old status is `Ignored` (checked in `@stryker-mutator/core/dist/src/mutants/incremental-differ.js`). The first push after the update tests only the formerly skipped mutants.
- **2026-09-27** — Assumed: the cache key keeps no file hash at all; it is `stryker-<os>-` plus the run ID and attempt, because the lockfile and both configs are now all left to the nightly run. Old keys (`stryker-<os>-<hash>-…`) still match the new restore prefix, so the sync that brings this change reuses the warm file instead of starting cold.
- **2026-09-27** — Assumed: the nightly run is a `schedule` trigger on the existing Test workflow, not a new workflow, because the `app-scaffold` spec says the gates need no extra workflow, and one file keeps the suite-finding logic in one place. It skips only the restore step, so Stryker finds no file and tests every mutant.
- **2026-09-27** — Assumed: the nightly runs every day, even when `main` did not change, because a daily restore-and-save keeps the cache from GitHub's 7-day eviction, so pushes after a quiet week stay warm. Rejected: skip nights with no new commit (saves Actions minutes, but lets the cache expire). A private repo spends about 20 minutes a day on it.
- **2026-09-27** — Assumed: the push time limit rises from 15 to 30 minutes and the nightly gets 60, because a cold push (a new repo, or a lost cache) must finish, not go red at 83% as it did in wongstack-cloud. Warm pushes are unaffected.
- **2026-09-27** — Assumed: the example `Check:` bullet in `wiki/development/the-change-loop.md` changes to one that is not about `ignoreStatic`, because once the setting is gone an example describing it reads as current practice.
- **2026-09-27** — Assumed: the first nightly run's evidence (no file restored, every mutant tested, a fresh key saved, its check on `main`'s head commit) is a memory thread, not a task, because it can only happen after the merge and `/ship` archives only a finished task list.
- **2026-09-27** — Check: `app/stryker.conf.json` drops `ignoreStatic`, because it saved no time in wongstack-cloud's full runs and left static mutants untested. This tightens the check.
- **2026-09-27** — Check: `.github/workflows/test.yml` drops the lockfile and config hash from the Stryker cache key, adds a nightly full run, and raises the time limit, because pushes after an update were blocked 15-20 min; the nightly run re-tests every mutant from scratch.
- **2026-09-27** — implemented tasks 1.1–4.3: `test.yml` gets the nightly `schedule` (`17 6 * * *`), a key of only `stryker-$RUNNER_OS`, no restore on `schedule`, and limits of 30 and 60 minutes; `ignoreStatic` is gone; `/ship`'s preflight stop names a red nightly run; the wiki's example `Check:` bullet now uses a coverage exclusion; a `## Next (minor)` CHANGELOG entry. Payload links, OpenSpec config, and loosened checks pass locally. Saved for task 5.1's CI evidence.
- **2026-09-27** — evidence, task 5.1 ([36342961675](https://github.com/matthewwong525/WongStack/actions/runs/36342961675), push of `5a2bba2`): Test job 35 s. Restore matched the new prefix `stryker-Linux-` and restored the old hashed entry `stryker-Linux-f1a6352d6bdfef05-36342838283-1`. Stryker reused 179 of 188 results, tested the 9 formerly static mutants, scored 100, and finished in 9 s. The save stored `stryker-Linux-36342961675-1`, with no hash.
- **2026-09-27** — ship distill: no repeatable fact. The live facts are this change's own threads and results; the cache and nightly design lives in `test.yml`'s header comment and the CHANGELOG.
- **2026-09-27** — archived for shipping; the `ci-tests` delta was already synced to `openspec/specs/` at the 5.1 save, so the archive uses `--skip-specs` after an equality check.
- **2026-09-27** — archive checkpoint: merged `origin/main` (26.8.0) with `CHANGELOG.md` as the union, this entry on top; numbered release 26.9.0.

## Capabilities

### New Capabilities

### Modified Capabilities
- `ci-tests`: mutation results survive dependency and config changes, a nightly scheduled run re-tests every mutant from scratch and saves the result, and the push time limit fits a cold run.

## Impact

- `.github/workflows/test.yml`: a `schedule` trigger; the job `if` admits it; the Stryker key loses its input hash; the restore step skips on `schedule`; `timeout-minutes` becomes an expression (30 on push, 60 on schedule); the header comment's cache section is rewritten.
- `.claude/skills/ship/SKILL.md`: the preflight's stop names a red nightly mutation run in plain words.
- `app/stryker.conf.json`: remove `"ignoreStatic": true`.
- `wiki/development/the-change-loop.md`: swap the example `Check:` bullet.
- `CHANGELOG.md`: a `## Next (minor) — …` entry; `VERSION` stays.
- Downstream: the next `/wong-sync` brings `test.yml` and `stryker.conf.json`; each needs a `Check:` bullet in that sync's plan. wongstack-cloud can drop its local 30-minute edit. Scheduled workflows run only on the default branch, and GitHub pauses them after 60 days without activity in a public repo.
