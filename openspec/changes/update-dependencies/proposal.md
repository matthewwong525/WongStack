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
- **The two big jumps are checked together.** The test runner goes from version 4 to 5, and GitHub's setup steps from 4 to 7. The checks run on every save, so a break shows up before anything is published.
- **The ten waiting requests close** once this is live, since this change already includes them.

**Non-goals:** No new features. The Node type definitions stay on version 22 to match the Node version the app runs on.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Dependency versions change no spec-level behavior, so the change sets `skip_specs: true`.

## Impact

- `app/package.json`, `app/package-lock.json` (pack payload): react/react-dom 19.3.0, @types/react(-dom) 19.3.0, vitest and @vitest/coverage-v8 5.0.2, vite 8.3.1, @vitejs/plugin-react 6.1.1, jsdom 30.1.1, knip 6.38.0, oxlint 1.85.0, jscpd 5.3.2. `@cloudflare/vite-plugin`, `wrangler`, and `sharp` were already current on `main`.
- `scripts/tests/package.json`, `scripts/tests/package-lock.json` (meta-only): jsdom 30.1.1, oxlint 1.85.0.
- `.github/workflows/{test,deploy,payload,release}.yml`: `actions/checkout` v7.0.1, `actions/setup-node` v7.0.0, pinned by SHA.
- `VERSION` 25.8.0 → 25.9.0 and a `CHANGELOG.md` entry.
- Closes Dependabot PRs #106, #107, #108, #109, #110, #112, #113, #116, #138, #139.

## Decision log

- **2026-09-27** — Asked to work the queue now, starting with the Dependabot PRs → chose one change for all ten, per the queue set on 2026-09-27.
- **2026-09-27** — Assumed: act on Latest, including majors (vitest 5, checkout and setup-node 7), because `/update-dependencies` says so and CI runs the full suite on every save.
- **2026-09-27** — Assumed: `@types/node` stays on 22, because `.github/dependabot.yml` ties its major to `.nvmrc`, which is 22.
- **2026-09-27** — Assumed: the `qs` override stays, because `@stryker-mutator/core` 10.0.0 is still the latest and still pins `typed-rest-client` 2.3.
- **2026-09-27** — Assumed: a minor release (25.9.0), because two test-tool majors and two action majors reach installed repos through `/wong-sync`.
- **2026-09-27** — Check: `.github/workflows/test.yml` moves `actions/checkout` to v7.0.1 and `actions/setup-node` to v7.0.0; no check is loosened, and every step and setting stays the same.
- **2026-09-27** — First checkpoint on `update-dependencies`: tasks 1.1–2.2 done; release checks, `openspec validate`, and the loosened-check scan pass locally. CI decides task 2.3.
