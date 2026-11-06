# Tasks

## 1. Move the three tests to the test copy of the database

- [x] 1.1 Prove runtime coverage (the first plan's feasibility gate): failed; see `evidence.md`. Nothing was built on it.
- [x] 1.2 `app/worker/employee-access/policy.test.ts` (design 1–3): write its rows into `database()`, replace `answering(row)` with rows that produce each case's permission read, and make the failure cases read from a closed copy.
- [x] 1.3 `app/worker/employee-access/key-levels.test.ts`: write tool rows into `database()` for `live`, drop the `tools` table for the missing-table case, and write each broken row into the real columns.
- [x] 1.4 `app/worker/api/discovery.test.ts`: write the member, apps and key levels into `database()` for its two cases, and change them between reads with `sql`.
- [x] 1.5 Remove `fakeDatabase` from `app/tests/env.ts`.

## 2. Docs

- [x] 2.1 Add design 4's paragraph to `wiki/stack/testing.md`.
- [x] 2.2 Add `## Next (patch) — The last pretend database goes` to the top of `CHANGELOG.md`'s entries. Its **Updating.** note, in plain words: if your own tests use `fakeDatabase`, copy its one line into those tests, or move them to the `database()` test helper.

## 3. Check

- [x] 3.1 Run `npm test` in `app/`, `node .github/scripts/checks.mjs --worktree`, and `openspec validate move-pretend-database-tests --strict --no-interactive`; fix each failure this change caused.
