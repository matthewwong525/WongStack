# Design

## Context

The scaffold's `npm test` ends in `stryker run` ([`app/package.json`](../../../app/package.json)), with a 100% break threshold and incremental mode ([`app/stryker.conf.json`](../../../app/stryker.conf.json)). The Test workflow ([`.github/workflows/test.yml`](../../../.github/workflows/test.yml)) restores and saves Stryker's incremental file by cache, and a nightly `schedule` run re-tests every mutant from scratch. `/ship`'s preflight already stops on any red check on `main`'s head commit; its Step 1 adds one sentence naming a red nightly run.

Stryker's incremental diff doesn't see snapshot files, dependencies, or configs, so a branch can reuse a stale "killed" result. That is how wongstack-cloud's PR #19 passed and then turned `main` red (proposal, Decision log).

## Goals / Non-Goals

**Goals:**
- `npm test` and the Test workflow carry no mutation testing, in this repo and, after `/wong-sync`, in every install.
- Every other gate is unchanged.

**Non-Goals:**
- A replacement tool, a Vitest 5 update, or edits to `loosened-checks.mjs`.

## Decisions

**Remove, don't disable.** Delete the config, the packages, the `test` script step, and every workflow step that exists only for Stryker. Rejected: `thresholds.break: null` (still 7–25 minute pushes) and scoping mutants to changed files (offered, declined).

**`test.yml` goes back to one trigger set and one limit.** Remove `schedule` from `on`, the `github.event_name == 'schedule'` clause from the job `if`, and set `timeout-minutes: 30`. Remove the `stryker` and `stryker-key` outputs from "Locate the test suite", the "Restore mutation results" and "Save mutation results" steps, and the header's "Why Stryker's result file is cached" section. The 30-minute push limit stays: it has room, and lowering it is a separate call.

**`/ship` keeps its preflight.** Only the sentence about a failing nightly Test run goes; the `failure` stop itself is unchanged.

**`loosened-checks.mjs` keeps its Stryker patterns.** It lists skip comments and config names for many tools the scaffold doesn't use, so a repo that adds Stryker back is still checked. Its tests keep their Stryker fixture, and the `ci-tests` scenario about a mutation-testing skip comment stays true.

**Lockfile by `npm uninstall`.** `npm uninstall @stryker-mutator/core @stryker-mutator/vitest-runner` in `app/` rewrites `package.json` and `package-lock.json` together, so the lockfile stays consistent for `npm ci`. It installs nothing to run; CI still runs the suite.

## Risks / Trade-offs

- A weak test that only mutation testing would catch now passes. 100% line and branch coverage remains, which catches untested code but not a test that asserts too little.
- An install that added its own `// Stryker disable` comments keeps them as dead text until someone deletes them; they change nothing.
