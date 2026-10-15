# Tasks

## 1. Browser script

- [x] 1.1 In `.agents/skills/browser/scripts/browse.mjs`, make `awaitServer(pid)` tell a child that died before answering apart from a wait that ran out.
- [x] 1.2 Make `startServer()` one loop until `START_MS`: return a live server; else take the lock and start, trying up to three starts on a fresh `freePort()` while each child dies before answering; else wait 200 ms and look again. Terminate and report a child still alive at the deadline as now; release the lock on every path.

## 2. Pretend browser

- [x] 2.1 In `scripts/tests/fixtures/fake-camofox-server.mjs`, write `tabs.json` and `env.json` to a temp file and rename it into place.
- [x] 2.2 Append to `starts.log` once the server listens, not when it loads; add a `die-once` control file that exits 1 before listening once.
- [x] 2.3 Append an uncaught error's stack to `errors.log` in the control folder before exiting; add `errors()` to `fakeCamofox()` in `fixtures/fake-camofox.mjs`.
- [x] 2.4 Set `BROWSE_ENV.BROWSE_SETTLE_MS` to `'15000'`.

## 3. Tests

- [x] 3.1 In `scripts/tests/browse.test.mjs`, add `f.camofox.errors()` to `ok()`'s failure message and to the two-sessions status assertions.
- [x] 3.2 Give `a page that never settles…` `BROWSE_SETTLE_MS: '300'` through `runWith`, and assert its snapshot reads stay below 400.
- [x] 3.3 Add a test: with `die-once` set, `open` succeeds, `starts()` is 1, and the start lock is released.
- [x] 3.4 Add a test: hold a fresh `start.lock`, begin `open` with `f.start`, then remove the lock with no server running; the open succeeds and `starts()` is 1.
- [x] 3.5 Add `die-once` to `two sessions started at once…`: both opens succeed and `starts()` is 1.

## 4. Docs and release

- [x] 4.1 Add a short section to `wiki/stack/testing.md` on tests that pass at any speed, by design decision 7, linked from its first section.
- [x] 4.2 Add a `## Next (patch) — Steadier browser starts` entry to `CHANGELOG.md`.

## 5. Verification

- [x] 5.1 Run `node --test scripts/tests/browse.test.mjs scripts/tests/hand-over.test.mjs scripts/tests/passwords.test.mjs`; all pass.
- [x] 5.2 Run `browse.test.mjs` 20 times with four copies at once and the CPU loaded (for example a busy `node -e` loop per core); no run fails. The old settle failure is shown by CI's own log, not reproduced here (see the Decision log).
- [x] 5.3 Run `node .github/scripts/checks.mjs --worktree`; it passes.
