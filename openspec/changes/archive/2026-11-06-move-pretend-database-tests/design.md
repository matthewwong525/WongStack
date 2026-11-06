# Design

## Context

See proposal.md - Why. As found on 2026-11-06:

- `fakeDatabase` in `app/tests/env.ts` is a typed cast of hand-written D1 calls. Three files use it:
  - `app/worker/employee-access/policy.test.ts`: a `DatabaseSync` with six migrations behind a hand-made `withSession().prepare().bind().first()`; `answering(row)` gives one fixed row to every read; two cases make `withSession` throw.
  - `app/worker/employee-access/key-levels.test.ts`: `live(rows | Error)` answers `withSession().prepare().all()` with tool rows, or throws `no such table: tools`.
  - `app/worker/api/discovery.test.ts`: two cases answer the permission read with one fixed row and change it between reads.
- `database()` in `app/tests/employee-access/connections.ts` builds a Node SQLite database from every migration behind the D1 calls the Worker makes (`withSession`, `prepare`, `bind`, `first`, `all`, `run`, `batch`), and returns `sql` for direct writes. 28 Worker test files use it.
- The first plan's feasibility probe (`evidence.md`) showed workerd refuses precise coverage. That finding is repeatable, so it goes in `wiki/stack/testing.md`.

## Goals / Non-Goals

**Goals:** the three files read real rows through real queries; `fakeDatabase` goes; 100% coverage holds; no new dependency.

**Non-Goals:** moving any test to the runtime suite; changing the 28 files on `database()`; the six inline `withSession` stubs elsewhere (each answers one read in a routing test, outside this change's ask).

## Decisions

### 1. Rows through `database()`, written with `sql`

Each moved case calls `database()`, writes the rows it needs with `sql.prepare(...).run(...)` or `sql.exec`, and passes `DB` in the bindings. `policy.test.ts`'s `beforeEach` keeps its installation, role, member, app and grant rows, now written into `database()`'s copy instead of a separate `DatabaseSync`. `answering(row)` becomes a helper that writes the member, grants and key levels that produce that row, so each case states the people, not the query's output shape.

### 2. A real failure

A case that needs the read to fail calls `sql.close()` first; `database()`'s next call then throws from SQLite. `key-levels`'s "before the table exists" case drops the `tools` table instead, which gives the real `no such table: tools` error.

### 3. Rows real SQL can't produce

A malformed-data case writes the bad value into the real column (for example invalid JSON in a stored text column). If the query builds the value itself, so no stored row can make it malformed, that case keeps a stub inside its own test, and the build logs it in the Decision log. No source line changes for a test.

### 4. The guide's note

`wiki/stack/testing.md`, in *Local checks*, gains one short paragraph: the runtime suite's lines don't count toward the every-line rule, because workerd answers the profiler itself and gives only whole-function coverage; server logic keeps its unit tests on the test copy of the database.

## Risks / Trade-offs

- [A case loses a branch only the fixed row reached] → the coverage check names the line; decision 3 covers it.
- [An install's own test imports `fakeDatabase`] → its type check fails at the update; the changelog's Updating note says to copy the one-line helper into that test or use `database()`.

## Migration Plan

Patch release. Rollback: revert the release. No data or deployed state changes.
