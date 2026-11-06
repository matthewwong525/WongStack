# Tasks

## 1. The runtime harness

- [x] 1.1 Seed (design 2): copy `schema/migrations/` plus `schema/seed.sql` as the last migration into the temp root; snapshot every non-ledger table after migrations; add `resetToSeed`. Verify: a runtime case reads a seeded practice person, changes the row, resets, and reads the seed value back.
- [x] 1.2 One entry, files per app (design 1, 3): add `context.ts` with the shared helpers and seeded-person tokens; move the current cases into `apps/access.ts` (keeping its Access-only reset) and `apps/inbox.ts`, each one `describe`; the entry imports and calls them. Verify: all current cases pass; setup prints one build/start per run; `npm run test:runtime -- -t access` runs only Access.
- [x] 1.3 Time budget (design 5): per-app and total timing in the entry, a 30 000 ms limit that throws naming the three slowest apps, skipped under `-t`. Verify: a test-only sleep in a scratch copy fails the run naming that app; the same sleep under `-t` passes.
- [x] 1.4 Update `scripts/check-app-checks.mjs` and its test so the runtime bad sample still fails for its intended reason under the new layout, and add a bad sample for the budget. Verify: `npm run test:checks` passes.

## 2. A runtime file for every server app

- [x] 2.1 Add `scripts/check-runtime-tests.mjs` (design 6) to the app's `npm test`, with `scripts/tests/check-runtime-tests.test.mjs` covering a missing file, a file the entry doesn't import, and a passing tree. Verify: on the tree after 1.2 it fails naming `hello` and `knowledge`.
- [x] 2.2 Author `apps/hello.ts` (design 4). Verify: passes; a scratch break of the greeting's output fails it.
- [x] 2.3 Author `apps/knowledge.ts` (design 4): who may open it, `not_set_up` for pages, page and search, and the public address with no repository. Verify: passes; the every-app check passes.
- [x] 2.4 Extend `apps/inbox.ts` (design 4): Fay's seeded items, an item put and close, and a schedule save, each read back from D1. Verify: responses and readbacks agree.

## 3. Docs and release

- [x] 3.1 Rewrite `wiki/stack/testing.md` for who checks what, the seed and reset, one app at a time with `-t`, the 30 s budget, and how to add an app's runtime file. Verify: `node scripts/check-payload-links.mjs` passes.
- [x] 3.2 Add the one-line rule to `.agents/skills/verify/references/walkthrough.md` § e: a found bug gets a failing local test first, linking the guide. Make an offsetting cut. Verify: `node scripts/measure-context.mjs --check` passes.
- [x] 3.3 Write a `## Next (minor)` CHANGELOG entry whose Updating note says, in plain words, that the update adds a real-database test for each of the install's own app parts with server code, and that the check names any still missing. Verify: the entry sits at the top of the entries.

## 4. Final checks

- [x] 4.1 Run the app's `npm test` three times; record the runtime median, the slowest apps and peak memory in `evidence.md`. Verify: each run passes and the median is under 20 s.
- [x] 4.2 Run `npm run test:checks`, `node .github/scripts/checks.mjs --worktree` and `openspec validate real-database-tests --strict --no-interactive`. Verify: all pass.

## 5. Review fixes

- [x] 5.1 Restore in `.agents/skills/verify/references/walkthrough.md` § e the condition "CI can cheaply reproduce" and "Inspect failure cause, revision and check identity.", taking the offsetting cut from other words in skill text. Verify: `node scripts/measure-context.mjs --check` passes.
- [x] 5.2 Make the seed snapshot in `app/tests/runtime/setup.ts` work for a `WITHOUT ROWID` table and a generated column: no `ORDER BY rowid`, and only stored columns (`pragma_table_xinfo`, `hidden = 0`) read and put back. Verify: a runtime case on both table shapes saves the seed, changes rows, resets, and reads the seed back.
