# Steady browser tests

**Status:** ready-to-ship
**Branch:** blushing-mule
**Open questions:** none

## Why

Three browser tests fail now and then on the automatic checks and pass when run again, and each failure has stopped a publish until someone reran it. Two causes sit behind them. A test counts page reads against a short clock, so a slow machine reads fewer times. And the browser's start can fail outright, which no test expects.

## What Changes

- **A page test counts reads, not time.** The test of "wait until the page stops changing" gets a clock long enough never to end it, so it ends when two reads match. Only the test of the clock itself keeps a short one.
  ```text
   BEFORE                 AFTER
  read ─▶ read ─▶ ✗      read ─▶ read ─▶ read
    0.3 s clock ends     ─▶ read: two match
   on a slow machine      ends on the page, not the clock
  ```
- **The browser tries again when its start fails at once.** The browser is told which address to listen on. If something else takes that address first, the start dies at once. It then picks a fresh address and tries again, up to three times, on your computer as in the checks.
- **A browsing task that waits on another's start takes over when that start fails.** Today it waits out the full minute and reports "the browser did not start". It now starts the browser itself.
  ```text
  task A starts ─▶ start fails
  task B waits       │
     ▲               ▼
     └──── B starts it itself ─▶ both browse
  ```
- **A failed test says why the pretend browser stopped.** The pretend browser the tests use writes down its own error, and a failing test prints it, so a new failure comes with its cause.
- **The pretend browser writes its files whole.** A test reading one mid-write saw half a file; that hit the private-link tests four times.
- **Nothing is skipped or loosened.** Every test keeps what it checks; two new tests cover the retry and the take-over.

**Non-goals:** raising the waits that real browsing uses, a test retry setting in the checks, the private-link page's own start wait (a separate open thread), or other test files' timing.

## Decision log

- **2026-10-15** — Asked make the browser tests stop failing at random, independent of runner speed, without raising timeouts or skipping tests → chose fix each cause found in the failed runs.
- **2026-10-15** — Assumed: the settle test's cause is the 300 ms settle clock, because the 2026-10-14 run (38643433007, attempt 1) shows two reads where four were expected, after about one second for the test.
- **2026-10-15** — Assumed: the "did not start" failures come from a browser start that dies at once, most likely an address taken between choosing it and listening, because the 2026-10-13 failure (run 38473968380) took 376 ms, well inside the 15 s start wait, and the started server's errors are thrown away; the exact error is an evidence gap the new error log closes.
- **2026-10-15** — Assumed: the 2026-10-11 two-sessions failure (run 38183775720, 15.1 s) is the waiting task sitting out the start wait after the other task's start failed, because the waiter never retries the start.
- **2026-10-15** — Assumed: the fix goes into the browser script, not only the tests, because the same address race can stop a real errand's start.
- **2026-10-15** — Assumed: the half-written file race in the pretend browser (memory thread #1533) is fixed here, because it is the same pretend browser and costs a few lines.
- **2026-10-15** — Assumed: the start count in the pretend browser counts only starts that came up, because a retried start would otherwise read as a second browser.
- **2026-10-15** — Assumed: a patch release, because it fixes a fault in shipped browsing without new behavior to learn.
- **2026-10-15** — Check: `scripts/tests/fixtures/fake-camofox.mjs` sets a 15 s settle clock in place of 300 ms, and `scripts/tests/browse.test.mjs` sets 300 ms only in the test of that clock. No expectation is dropped; the settle test now checks the matching reads alone.
- **2026-10-15** — Check: `scripts/tests/fixtures/fake-camofox-server.mjs` records a start in `starts.log` once it listens, not when it loads. Every count a test asserts stays the same.
- **2026-10-15** — Check: under load, `a start lock left by a dead start…` cleared its own held lock: a waiter that now looks until its 400 ms wait ends saw the lock pass the 800 ms stale age. The test dates the held lock an hour ahead, so it reads as live however slowly the waiter starts; real waits (60 s against a 120 s stale age) are unaffected.
- **2026-10-15** — Assumed: task 5.2 passes on its load runs alone, because the reverted settle change did not fail in about 80 local loaded runs, and CI's own log (run 38643433007) already shows its cause: two reads where four were expected.
- **2026-10-15** — Assumed: a port held by another browser that answers during our start (seen once under load as `BROWSE_ERROR=Forbidden`) is left for a follow-up, because it needs another server on the exact port mid-start, the old code had the same gap, and a fix adds a call to every start.

- **2026-10-15** — Archive checkpoint: built in one pass with every task ticked and the local checks green; numbered 43.1.1 and saved for the checks before publishing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: a browser start that fails at once is tried again on a new port, and a task waiting on another's start takes over when it fails.
- `ci-tests`: the browser script's tests hold at any runner speed.

## Impact

`.agents/skills/browser/scripts/browse.mjs` (`startServer`, `awaitServer`). `scripts/tests/browse.test.mjs`, `scripts/tests/fixtures/fake-camofox.mjs`, `scripts/tests/fixtures/fake-camofox-server.mjs`; `hand-over.test.mjs` and `passwords.test.mjs` share the fixture and get the longer settle clock unchanged in behavior. `wiki/stack/testing.md` gains a short section, and `CHANGELOG.md` a patch entry, since the browser script ships. No dependency, data or workflow change.
