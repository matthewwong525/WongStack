# Bring the building blocks up to date

**Status:** in-progress
**Branch:** update-dependencies
**Open questions:** none

## Why

Ten automatic update requests from Dependabot were waiting, one per outside building block. Reviewing them one by one means ten reviews, and some depend on each other: the test runner and its coverage tool must move together. You queued them on 2026-09-27 as one change.

## What Changes

- **Everything moves to its newest version in one go.** The app's screen library (React), the test and check tools, and the steps the automatic checks run on GitHub all update together. Nothing you see in the app changes.
  ```text
  before                after
  10 update requests    1 change
  10 reviews     ──▶    1 review
  ```
- **GitHub's setup steps jump from version 4 to 7.** The checks run on every save, so a break shows up before anything is published.
- **The test runner stays on version 4 for now.** On version 5, the tool that breaks code on purpose to prove the tests catch it stops running any tests, so every break slipped through. That is a known bug in that tool, not yet fixed. The move waits for the fix.
- **Eight of the ten waiting requests close** once this is live, since this change already includes them. The two for the test runner stay open until it can move.

**Non-goals:** No new features. No Vitest 5 until Stryker's runner supports it. The Node type definitions stay on version 22 to match the Node version the app runs on.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Dependency versions change no spec-level behavior, so the change sets `skip_specs: true`.

## Impact

- `app/package.json`, `app/package-lock.json` (pack payload): react/react-dom 19.3.0, @types/react(-dom) 19.3.0, vite 8.3.1, @vitejs/plugin-react 6.1.1, jsdom 30.1.1, knip 6.38.0, oxlint 1.85.0, jscpd 5.3.2. `@cloudflare/vite-plugin`, `wrangler`, and `sharp` were already current on `main`.
- `scripts/tests/package.json`, `scripts/tests/package-lock.json` (meta-only): jsdom 30.1.1, oxlint 1.85.0.
- `.github/workflows/{test,deploy,payload,release}.yml`: `actions/checkout` v7.0.1, `actions/setup-node` v7.0.0, pinned by SHA.
- `VERSION` 25.8.0 → 25.9.0 and a `CHANGELOG.md` entry.
- Closes Dependabot PRs #106, #107, #108, #109, #113, #116, #138, #139. #110 and #112 (Vitest 5) stay open.

## Decision log

- **2026-09-27** — Asked to work the queue now, starting with the Dependabot PRs → chose one change for all ten, per the queue set on 2026-09-27.
- **2026-09-27** — Assumed: act on Latest, including majors (checkout and setup-node 7), because `/update-dependencies` says so and CI runs the full suite on every save.
- **2026-09-27** — Assumed: `@types/node` stays on 22, because `.github/dependabot.yml` ties its major to `.nvmrc`, which is 22.
- **2026-09-27** — Assumed: the `qs` override stays, because `@stryker-mutator/core` 10.0.0 is still the latest and still pins `typed-rest-client` 2.3.
- **2026-09-27** — Assumed: a minor release (25.9.0), because two action majors reach installed repos through `/wong-sync`.
- **2026-09-27** — Check: `.github/workflows/test.yml` moves `actions/checkout` to v7.0.1 and `actions/setup-node` to v7.0.0; no check is loosened, and every step and setting stays the same.
- **2026-09-27** — First checkpoint on `update-dependencies`: tasks 1.1–2.2 done; release checks, `openspec validate`, and the loosened-check scan pass locally. CI decides task 2.3.
- **2026-09-27** — CI run 36297096801 failed Stryker at 12.85%: every `worker/` mutant survived with Vitest 5.0.2. Reproduced locally (`worker/index.ts` 0/17 killed). Cause: [stryker-js #6210](https://github.com/stryker-mutator/stryker-js/issues/6210), open and unreleased — Vitest 5 matches `testNamePattern` against the chain joined with ` > `, and `@stryker-mutator/vitest-runner` 10.0.0 joins with a space, so each per-test run matches no test.
- **2026-09-27** — Assumed: hold `vitest` and `@vitest/coverage-v8` at 4.1.11 and leave Dependabot #110 and #112 open, because the alternatives weaken or bend the gate: `coverageAnalysis: "off"` changes a check setting and slows every run, and patching the runner in `node_modules` is not reproducible. With Vitest 4, `worker/index.ts` is back to 17/17 killed.
- **2026-09-27** — CI passed on PR #147 with Vitest held at 4 (auto-fix attempt 1 of 3). Task 2.3 done; 2.4 waits for the merge.
