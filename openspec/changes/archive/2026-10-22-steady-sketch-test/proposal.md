# Proposal

**Status:** ready-to-ship
**Branch:** pleasant-seahorse
**Open questions:** none

## Why

One check on the plan page fails at random, then passes when run again. It held up main's checks twice and a publish once, and each time someone had to rerun it by hand.

## What Changes

- **The phone-width sketch check waits for the sketch to settle before measuring.** Opening a drawing shrinks it to fit a moment later; the check measured in that moment and saw it too wide. It now waits for the shrink, as the phone-screen check beside it already does. The page itself doesn't change.
  ```mermaid
  flowchart LR
    open["open"] --> wait["wait for the shrink"] --> measure["measure"]
    open -. was .-> measure
  ```

Non-goals: no change to the plan page, and no retry or longer timeout to hide the race.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None: test-only, so `skip_specs: true`.

## Impact

- `scripts/tests/review-browser.test.mjs`: one wait line in one test.
- Meta-only test file, not in `payload-files.json`: no release, no `CHANGELOG.md` entry.

## Decision log

- **2026-10-22** — Asked whether to fix the flaky sketch check → chose to fix it.
- **2026-10-22** — Assumed: wait in the test, not change the page, because the page's fit runs on the fold's `toggle` event, which the browser fires a task after the click; nothing a person sees is wrong.
- **2026-10-22** — Assumed: wait on the same signal the phone-screen test uses (`style.fontSize` set by `fit`), because one signal for one event keeps the two tests alike.
- **2026-10-22** — Assumed: CI is the only real check, because browser tests skip on this server; the earlier `inside: false` failures (fact #1900) and the newer `page: false` ones come from the same early measure.
- **2026-10-22** — Assumed: checkpoint before archive to see the CI browser job pass (task 2.2), because browser tests skip on this server.
- **2026-10-22** — Assumed: archived for publish after the CI browser job passed the sketch test on PR #431.
