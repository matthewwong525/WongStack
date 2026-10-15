# Design

## Context

`scripts/tests/browse.test.mjs` drives `.agents/skills/browser/scripts/browse.mjs` against `scripts/tests/fixtures/fake-camofox-server.mjs`, installed per test HOME by `fixtures/fake-camofox.mjs`. `BROWSE_ENV` there shortens browse.mjs's waits for every test that uses the fake, `hand-over.test.mjs` and `passwords.test.mjs` included. The payload workflow runs all `scripts/tests/*.test.mjs` under c8 with `node --test`, files in parallel, so a runner is loaded and many processes bind ports at once.

Evidence from first attempts of reruns, read with `gh api .../actions/jobs/<id>/logs`:

| Run | Test | Result | Time |
|---|---|---|---|
| 38643433007 (10-14) | open reads the page only once it settles | 2 snapshot reads, 4 expected | 1018 ms |
| 38261937450 (10-12) | same | failed | — |
| 38473968380 (10-13) | snapshot prints the address… | `BROWSE_ERROR=the browser did not start` on the first `open` | 376 ms |
| 38183775720 (10-11) | two sessions started at once | session a: did not start | 15139 ms |

**Settle.** `settle()` reads until two reads match or `SETTLE_MS` passes. `BROWSE_ENV` sets `BROWSE_SETTLE_MS=300`. The settle test needs four reads (`loading, half, done, done`) with 10 ms gaps; a cold first read on a loaded runner passes 300 ms after two. The second-open half of the test expects exactly two reads and has the same exposure.

**Start.** `startServer()` takes `start.lock`, gets a port from `freePort()` (bind 0, close), spawns `server.mjs`, writes `server.json`, then `awaitServer(child.pid)` polls `/health` until `START_MS` or the child dies. The 376 ms failure means the child died: `START_MS` is 15 s. Its stderr is `ignore`d, so the error is lost. The likeliest cause is the port: `freePort()` closes its probe before camofox listens, and in that gap the forwarder in the same process (`startForwarder`, bind 0) or any other process can take it; the fake's `server.listen` then emits an unhandled `EADDRINUSE` and exits. The real camofox has the same gap. The 15 s failure fits the waiter path: a process that loses the lock calls `awaitServer()` with no pid and polls for the full `START_MS`; if the lock holder's start died, nothing starts the server again.

**Half-written files (#1533).** The fake writes `tabs.json` and `env.json` with `writeFileSync`, which truncates then writes; a test reading in between gets incomplete JSON (`fake-camofox.mjs`'s `json()`).

## Goals / Non-Goals

**Goals:** each failing test passes whatever the runner's speed or load; a real start survives a taken port; a future fake crash names its error.

**Non-Goals:** changing browse.mjs's default waits, a `--test-retries`-style rerun, the hand-over page's start wait (thread #786), other test files.

## Decisions

1. **The settle cap belongs to the test of the cap.** `BROWSE_ENV.BROWSE_SETTLE_MS` becomes `'15000'`, alongside the 15 s command and start waits already there. The settle test then ends by two matching reads, and the read counts are exact. `a page that never settles…` passes `BROWSE_SETTLE_MS: '300'` through `runWith` and asserts the read count stays below the 400 ticks, so it proves the cap ended the wait. Alternative rejected: making the cap a read count in browse.mjs; a real page's settling is time-bound, and that changes product behavior to suit a test.
2. **A start that dies is tried again on a new port.** `awaitServer(pid)` reports whether the child died or the wait ran out. `startServer()`, holding the lock, tries up to three starts while each child dies before answering; each try calls `freePort()` again and rewrites `server.json`. A child alive at the deadline is terminated and reported as now, with no retry: slowness is not a taken port. Alternative rejected: letting camofox pick port 0 and reporting it back; camofox takes `CAMOFOX_PORT` and has no way to report one.
3. **A waiter takes over a failed start.** `startServer()` becomes one loop until `START_MS`: return a live server; else take the lock and start (decision 2); else sleep 200 ms and look again. A waiter whose holder failed finds the lock gone and no server, and starts it. The stale-lock rule (`2 * START_MS`) is unchanged.
4. **The fake counts starts that listened.** `starts.log` is appended in `server.listen`'s callback, so a retried start counts once and `starts() === 1` still means one browser. A `die-once` control file makes the fake exit 1 before listening once, standing in for a taken port.
5. **The fake keeps its error.** An `uncaughtException` handler appends the stack to `errors.log` in the control folder and exits 1; `fakeCamofox()` gains `errors()`. `ok()` and the two-sessions assertions add it to their messages.
6. **The fake writes shared files whole.** `tabs.json` and `env.json` are written to a sibling temp file, then `renameSync`d into place.
7. **The lesson goes in the wiki.** A short section in `wiki/stack/testing.md` (tests that pass at any speed: end a wait by its state, a short cap only in the test of the cap, a fake writes files whole) is repeatable for any later test. Another workspace (frank-manatee, test-workers-runtime) has unsaved edits to that page; bring `main` in before saving and keep both.

## Risks / Trade-offs

- **The port cause is inferred.** The child's error was discarded. Decision 2 fixes a real gap either way, and decision 5 means a different cause next time arrives named.
- **Up to three starts on a broken install.** `a server that never answers…` (server.js exits 1) now spawns three times before the same error; each dies at once, so the test stays fast. Its lock-released assertion stays.
- **A real page test that never settles waits 15 s, not 300 ms.** No current test does: the fake's default page never changes. A new test of a changing page must set its own cap, which the wiki section says.
