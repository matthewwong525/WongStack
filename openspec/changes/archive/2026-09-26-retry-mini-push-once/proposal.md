# Retry a mini-app push once when main moved

**Status:** ready-to-ship
**Branch:** retry-mini-push-once
**Open questions:** none

## Why

A mini-app save pushes straight to `main`. On 2026-09-26 the tip calculator's push was rejected only because another release landed on `main` during the save, so it fell back to a pull request and needed a `/ship` to go live. A commit that touches one app's folder almost never conflicts with someone else's work, so one rebase fixes the common case.

## What Changes

- **A moved `main` gets one rebase, not a pull request.** A new script, `save/scripts/mini-app-push.sh`, runs the app's tests, pushes, and on a push rejected as not fast-forward: fetches, rebases once, runs the tests again, and pushes again. It never forces. It falls back to a pull request only when the rebase, the tests after it, or the second push fails, or when the push is refused for another reason, such as branch rules.
  ```text
  tests ── fail ──▶ stop, push nothing
    │ pass
  push ── ok ─────▶ live
    │ main moved
  rebase ── fail ─▶ PR
    │ ok
  tests ── fail ──▶ PR
    │ pass
  push ── ok ─────▶ live
    │ fail
    ▼
    PR
  ```
- **The mini-app save calls the script.** The save reference, the mini-apps page, and the loop page describe the retry.
- **Release 23.0.1.**

**Non-goals:** retrying more than once; retrying prose saves; retrying a push refused by branch rules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mini-apps`: a direct save rebases once when `main` moved, before it falls back to a pull request.

## Impact

New `.agents/skills/save/scripts/mini-app-push.sh` and `scripts/tests/mini-app-push.test.mjs`. `.agents/skills/save/references/mini-app-save.md`, `wiki/stack/mini-apps.md`, `wiki/development/the-change-loop.md`, `VERSION`, `CHANGELOG.md`. The script ships with the save skill directory, so targets get it on their next `/wong-sync`.

## Decision log

- **2026-09-26** — Asked what to do after the tip calculator's push fell back to a PR → chose **retry the push once when main moves**, as 23.0.1.
- **2026-09-26** — Assumed: the retry is a tested script, not more skill text, because it runs the same way every time.
- **2026-09-26** — Assumed: a test failure after the rebase falls back to a pull request instead of stopping, because the failure then comes from someone else's change on `main`, and a pull request shows it to a person with CI.
- **2026-09-26** — Assumed: the script refuses to push when a commit ahead of `main` touches a path outside the app's folder, so the direct route can not carry other work.
- **2026-09-26** — Wiki catch-up at ship: no repeatable fact beyond this change's own page edits.
- **2026-09-26** — Archive checkpoint: 6 of 6 tasks checked; the archive synced the modified `mini-apps` requirement. 262 script tests pass locally, including the 7 real-git push cases. The first run exposed that `node --test` exits 0 on a failure when it inherits `NODE_TEST_CONTEXT` from an outer test runner; the script now clears it.
