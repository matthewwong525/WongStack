# Override the vulnerable qs in the app scaffold

**Status:** ready-to-ship
**Branch:** fix/qs-override
**Open questions:** none

## Why

Dependabot reports `qs` 6.15.1 in `app/package-lock.json` as vulnerable, and its security update fails on `main`, so `main`'s checks show a failure and `/ship` stops. The fix, `qs` 6.16.0, cannot arrive by a normal update: the latest `@stryker-mutator/core` (10.0.0) pins `typed-rest-client ~2.3.0`, and `typed-rest-client` 2.3.1 pins `qs` to exactly 6.15.1.

## What Changes

- **The app scaffold overrides `qs` to `^6.16.0`.** `app/package.json` gets an npm `overrides` entry, and `app/package-lock.json` resolves `qs` 6.16.0. `qs` is only a dev dependency of Stryker's dashboard reporter, so the app's runtime does not change. (review.html#/override/added)
- **Release 20.1.1.** `app/` ships as payload, so installed repos get the override through `/wong-sync`.

**Non-goals:** no other dependency updates; `/update-dependencies` owns a full survey. Remove the override when Stryker moves to `typed-rest-client` 3, which needs `qs ^6.16.0`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. A dependency pin changes no spec-level behavior, so the change sets `skip_specs: true`.

## Impact

`app/package.json`, `app/package-lock.json`, `VERSION`, and `CHANGELOG.md`.

## Decision log

- **2026-09-26** — `/ship` of PR #120 (add-team-memory) stopped: `main`'s only failed check was Dependabot's `qs` security update; `build`, `test`, and `payload` passed. Asked whether to fix `qs` first or ship anyway → the user chose **fix `qs` first**, in its own change.
- **2026-09-26** — Traced `qs`: only `typed-rest-client` 2.3.1 needs it, pinned to 6.15.1, and only `@stryker-mutator/core` 10.0.0 (latest) needs that, as `~2.3.0`. `typed-rest-client` 3.1.2 needs `qs ^6.16.0`, but Stryker does not accept 3.x. Chose an npm `overrides` entry over waiting for Stryker.
- **2026-09-26** — CI passed on PR #121. Distilled facts before the archive: no repeatable fact (the store holds none for this change or branch).
- **2026-09-26** — Archived after CI passed on PR #121; this checkpoint commits the archive move.
