# The last pretend database goes

**Status:** ready-to-ship
**Branch:** move-pretend-database-tests
**Open questions:** none.

## Why

Three server test files still answer the app's database calls with hand-written replies, so they pass whatever query the code sends. Every other server test already runs real queries on a copy of the database built from the app's real setup files. Moving the three to that copy makes a wrong query fail its test, with no new tool and no slower tests.

## What Changes

- **The three tests run real queries.** The tests for who may open what, for which keys a person holds, and for the list of actions an AI can call now read real rows from the test copy of the database. A test that checks a database failure makes the copy fail for real.
  | Test | Before | After |
  |---|---|---|
  | Who may open which app | Hand-written replies | Real rows, real queries |
  | Which keys and tools a person holds | Hand-written replies | Real rows, real queries |
  | The actions list for an AI | Hand-written replies | Real rows, real queries |
  | A database that fails | A reply that throws | A real failed read |
- **The pretend database is deleted.** Nothing uses it after the move. Every line is still tested, and the tests take no longer.
- **The testing guide says why runtime tests don't count toward the every-line rule.** The real local server can't report which lines a test ran, only which functions. So a later plan doesn't try that route again.
  ```text
  Real local server: which lines ran?
    precise (line by line)   refused
    best effort              whole functions only
  ```

If your own tests use the pretend database, the update note says how to keep them working.

Non-goals: moving server tests to the real local server, merging runtime coverage into the every-line rule, and changing the tests that already use the test copy of the database.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The tests change, not what the app does (`skip_specs: true`).

## Impact

- `app/worker/employee-access/policy.test.ts`, `key-levels.test.ts`, `app/worker/api/discovery.test.ts`: their `fakeDatabase` cases use `database()` from `app/tests/employee-access/connections.ts` with real rows.
- `app/tests/env.ts`: `fakeDatabase` removed.
- `wiki/stack/testing.md`: one paragraph on runtime coverage; `CHANGELOG.md`: a patch entry.
- An install's own test that imports `fakeDatabase` breaks at the update; the **Updating.** note says what to do.

## Decision log

- **2026-11-06** — Asked whether unit tests could go (in the original chat) → chose to replace only the tests that use a pretend database, keep fast tests for pure logic and screens, and keep the 100% rule.
- **2026-11-06** — Asked whether to move only the 3 files that use `fakeDatabase`, or also the ~28 that use the Node SQLite stand-in → chose both kinds, about 37 files.
- **2026-11-06** — The feasibility gate (task 1.1 of the first plan) failed: workerd answers `Profiler.enable` itself, so `Profiler.startPreciseCoverage` errors, and best-effort coverage counts whole functions, marking unreached `throw` lines as covered. Evidence: `evidence.md`.
- **2026-11-06** — Asked how to go on → the requester asked whether the move is needed at all. Answered: mostly not, because 28 files already run real migrations and SQL on SQLite, and *Test every part of the app on a real local database* covers the request-level gaps.
- **2026-11-06** — Asked what to do with the plan → chose to shrink it to the 3 `fakeDatabase` files, moved to the SQLite stand-in, plus a testing-guide note on runtime coverage. This replaces the full move, the merged coverage gate and the spec change.
- **2026-11-06** — Assumed: a "database fails" case closes the SQLite copy before the call, so the read throws for real, because that keeps the case without a stub.
- **2026-11-06** — Assumed: a case that feeds a malformed row writes that value into the real column the query reads; if no real row can produce it, the case keeps a stub local to that test and the build logs it here, because deleting a defensive branch is out of scope.
- **2026-11-06** — Assumed: a patch release, because only tests and one wiki paragraph change, and an install's own `fakeDatabase` use gets an Updating note.
- **2026-11-06** — Assumed (build, design 3): in `policy.test.ts`, a bad value the schema's checks refuse (`policy_enabled = 2`, `keys_enabled = 2`, `revision = 0`, `status = 'unknown'`, a key level `admin`) is written into the real column past those checks with `PRAGMA ignore_check_constraints`. A value the query builds itself (`apps` and `keys` as text that is not the right JSON, a missing column, a `held` that is not text) keeps a stub local to that test, `swapping`: it runs the real query on the real row, then swaps only that column. No stored row can give those values.
- **2026-11-06** — Assumed (build): `key-levels.test.ts`'s broken tool rows got their own ids (`notes`, `wiki`), because `tools.id` is a primary key; each row still breaks one rule.
- **2026-11-06** — Archive checkpoint at /ship: archived as 50.1.1; review findings (two overclaiming CHANGELOG lines) fixed; local `npm test` and `checks.mjs --worktree` passed before the save.
- **2026-11-06** — Renumber checkpoint at /ship: main reached 50.2.0 (real-database-tests) first; merged it, kept both testing-guide sections (the coverage note now sits in *The real-database tests*), renumbered to 50.2.1; local checks passed.
- **2026-11-06** — Second renumber at /ship: main reached 50.2.1 (#524) first; merged with no conflict, renumbered to 50.2.2; local checks passed.
