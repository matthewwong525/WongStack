# Make mutation testing incremental

**Status:** in-progress
**Branch:** stryker-incremental
**Open questions:** none.

## Why

Stryker tests every mutant again on every push, so the Test check grows with the app. In wongstack-cloud it takes about 15 minutes, and Stryker uses 14 of them for 1,610 mutants. Every `/save` and `/ship` in that repo waits on it. The scaffold ships the same config to every repo, and each repo whose app grows gets the same wait.

## What Changes

- **Stryker re-tests only what changed.** The scaffold's `app/stryker.conf.json` turns on incremental mode. Stryker keeps each mutant's result in `reports/stryker-incremental.json`, which git already ignores. It reuses a result when the mutant's code and the test that killed it did not change, and it tests all other mutants again. The break threshold stays at 100, and `npm test` stays one command, the same locally and in CI.
- **CI keeps the result file between runs.** The core `.github/workflows/test.yml` restores the file before "Test" and saves it after, also when the test fails. A branch starts from its own newest file, or from the default branch's newest file when it has none. The key holds a hash of the suite's lockfile, Stryker config, and Vitest config, so a dependency or config change starts with no file and tests every mutant. A repo whose suite has no Stryker config skips both steps. (review.html#/ci-run/after)
- **Before-and-after timings on the PR.** The PR shows this repo's Stryker time and reused-mutant count from a run with no file and from a later push that changes one source file. It cites wongstack-cloud run 36255581190 (Stryker 14m06s) as the measured reason.
- **Release 20.1.0.** `VERSION` and a newest-first `CHANGELOG.md` entry. `/wong-sync` brings both files to downstream repos.

Non-goals: moving Stryker to its own CI job, sharding mutants across runners, `ignoreStatic`, removing or caching the Playwright review test, and editing wongstack-cloud directly.

## Decision log

- **2026-09-26** — measured in wongstack-cloud: Test run 36255581190 on `main` took 15m32s. Setup and `npm ci` took 15 s, the Playwright Chromium install 29 s, lint and Vitest with coverage 21 s, `node --test` 7 s, knip and jscpd 3 s, and `stryker run` 14m06s. Stryker made 1,610 mutants in 34 files on 2 test-runner processes, because that private repo gets 2-vCPU runners. It warned that 176 static mutants (11%) take 69% of the time.
- **2026-09-26** — measured in WongStack: Test run 36256551452 on `main` took about 75 s. Stryker made 170 mutants in 3 files in about 21 s. The gain here is small; the change is for repos whose app grows.
- **2026-09-26** — history: Stryker joined the scaffold in 12.2.0 (#72, `less-code-rules-and-gates`). That design left out incremental mode because a full run on about 400 source lines took well under a minute, and it said a target that outgrows the gate retunes its own copy.
- asked: what to do with Stryker → chose keep it and the 100% gate, but make it incremental. Rejected: run it only on `main` or nightly (a weak test could merge), and remove it (tests would be held only to line coverage).
- asked: what to do with the Playwright review test → chose leave it as is. It tests WongStack's `/plan` review page, not the app, and costs about 35 s. agent-browser has no in-process test API for `node:test`, so it cannot replace Playwright there.
- asked: where to build it → chose upstream in WongStack. `test.yml` is core and `app/` is scaffold, so every repo gets it through `/wong-sync`, with no local edit to keep. Rejected: only in wongstack-cloud (each sync must keep a local `test.yml` edit, and other repos stay slow).
- checked: static mutants do not defeat incremental mode. Stryker 10's `IncrementalDiffer` reuses a killed mutant when its code did not change and the test that killed it did not change. It does not need all covering tests to be unchanged. With a 100% gate every mutant is killed, so a change to one test file re-runs only the mutants that that file killed, plus mutants in changed code.
- assumed: Stryker stays inside `npm test`, with no separate CI job. Why: it keeps one command and the existing check name. A reviewer can split it later at low cost.
- assumed: the cache key holds `hashFiles` of the suite's `package-lock.json`, `stryker.conf.*`, and `vitest.config.*`. Why: Stryker's incremental mode does not see a dependency or config change. A new key makes that run test every mutant, so a changed dependency cannot hide a surviving mutant behind an old result.
- assumed: each save uses a new key that ends in the run ID, and restore matches by prefix. Why: GitHub cache entries cannot be overwritten, and a prefix match searches the current branch first, then the default branch. That gives "own newest, else `main`'s newest" with no extra logic.
- assumed: CI saves the file even when `npm test` fails. Why: the next push, which fixes the failure, then reuses every result that is still valid.
- assumed: the default branch runs incremental too, with no scheduled full run. Why: the config-hash key already forces a full run when the inputs change, and a full run on each merge would add minutes for no new signal.
- assumed: the workflow detects Stryker by a `stryker.conf.*` or `stryker.config.*` file in the suite folder, and caches the default `reports/stryker-incremental.json` path. Why: that is the scaffold's layout. A repo that moves the file edits its own copy.
- **2026-09-26** — implemented tasks 1–3: `"incremental": true` in the scaffold config; `test.yml` restore and save steps pinned to `actions/cache` v6.1.0; release 20.1.0. Changed during apply: the locate step hashes the key inputs once with `sha256sum` and outputs `stryker-key`, so key and restore key cannot drift (rejected: two long `hashFiles()` expressions). The key ends in the run ID and the run attempt, so a re-run does not collide with the first attempt's save. `rel` is a prefix (empty at the root, `app/` below it) so one path expression works in both. Specs synced to `openspec/specs/`. Evidence tasks 4.1–4.3 wait on CI.
- **2026-09-26** — evidence, first run ([36260123214](https://github.com/matthewwong525/WongStack/actions/runs/36260123214), push of `119b2ed`): Test job 62 s. Restore found no file for `stryker-Linux-44e135fdca13e925-` (no file on `main` yet). Stryker logged "No incremental result file found … a full mutation testing run will be performed", tested all 170 mutants, and finished in 14 s. The save step stored `stryker-Linux-44e135fdca13e925-36260123214-1`. The key hash equals the one the locate snippet printed locally.

## Capabilities

### New Capabilities

### Modified Capabilities
- `ci-tests`: the test workflow keeps Stryker's incremental result file between runs, keyed on the suite's dependency and test config.
- `app-scaffold`: the mutation gate re-tests only changed mutants and still fails on any survivor.

## Impact

- `app/stryker.conf.json`: add `"incremental": true`.
- `.github/workflows/test.yml`: "Locate the test suite" also outputs the suite's repo-relative path and whether it has a Stryker config. `actions/cache/restore` runs before "Test" and `actions/cache/save` after it, pinned by SHA. The header comment explains the cache.
- `VERSION` → 20.1.0 and a `CHANGELOG.md` entry.
- Local runs: a developer's second `npm test` also reuses results. `npx stryker run --force` tests every mutant.
- Downstream: the next `/wong-sync` proposes both files. A repo that edited its own `stryker.conf.json` adapts the one-line change.
