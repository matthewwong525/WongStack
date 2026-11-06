# Design

## Context

See proposal.md - Why. The pieces this builds on:

- `app/tests/runtime/` builds the real Worker with Vite, starts one workerd through Wrangler's `createTestHarness`, applies `schema/migrations/` to a temporary local D1, and runs 7 cases in one entry, `runtime.test.ts`. The archived change measured a 10.1 s median (`openspec/changes/archive/2026-10-10-test-workers-runtime/`). Its host `fetch` stub fails every outbound request but the Access JWKS.
- `resetDatabase` clears only the `wong_access_*` tables and the rollback trigger; the Access cases rely on that empty start to prove a fresh install's first owner request.
- `schema/seed.sql` holds staging's sample rows: the practice installation (`11111111-…`), six practice people (Fay is the Admin; Dana and the Helpers hold Hello; Eli holds nothing), three-plus inbox items, a schedule and its run. `scripts/reset-staging-d1.mjs` applies it after migrations.
- `ownerCore` reuses the one `wong_access_installation` row (`slot = 1`) whatever its origin or audience, so a seeded person signed by the suite's own key reaches the seeded installation.
- Knowledge reads the knowledge repository through the Artifacts binding, and `knowledgeSource` returns null when `WONG_ENVIRONMENT` is `staging`, as the suite runs. Miniflare has no local Artifacts. Its unit tests use a stand-in reader.
- `scripts/check-app-checks.mjs` proves each `npm test` step catches a bad sample; its runtime sample writes `tests/runtime/runtime.test.ts` into a scratch app.

## Goals / Non-Goals

**Goals:** one start per run; the seed in every run; a runtime file per server app, enforced; a 30 s budget on the full run.

**Non-Goals:** moving `fakeDatabase` tests or merging workerd coverage (part 3); service example playback (part 2); a local Artifacts stand-in; a second runtime start with other settings.

## Decisions

### 1. One entry, one start, a file per app

`runtime.test.ts` stays the only Vitest entry. It owns `startRuntime` in `beforeAll`, `close` in `afterAll`, and the outbound stub. Each app gets `app/tests/runtime/apps/<name>.ts`, exporting a function that takes a getter for the shared context (runtime, signed tokens, request helpers) and registers one `describe("<name>")`. The entry imports and calls each, in a fixed order. The existing Access and board cases move to `apps/access.ts` and `apps/inbox.ts`. Shared helpers (`request`, signed tokens for seeded people) live in `context.ts`.

*Alternative:* many Vitest files with `isolate: false` and a shared module singleton. Rejected: teardown has no reliable owner across files, and a stray second start doubles the cost silently.

Running one app while working: `npm run test:runtime -- -t <name>`. The guide documents it.

### 2. Seed as the last migration, reset by snapshot

`startRuntime` copies `schema/migrations/` into its temporary root and adds `schema/seed.sql` as a final, highest-numbered file, so Wrangler's migration runner parses it, as in staging. After migrations it snapshots every table but the migration ledger (`d1_migrations`) and SQLite's own, in one D1 batch. `resetToSeed(db)` drops test-made triggers, deletes all rows and re-inserts the snapshot in one batch, with `defer_foreign_keys` on. Each app's `describe` resets in `beforeAll`; a case that needs a clean slate resets in `beforeEach`.

The Access `describe` keeps its own reset, which clears the Access tables, because its cases prove a fresh install's first start. It runs first; the next `describe` resets to the seed.

*Alternative:* `db.exec(seed)`. Rejected: D1 `exec` splits naively, and the seed holds comments and multi-line inserts.

### 3. Seeded people sign in

`identities()` also signs tokens for seeded people (Fay, Dana, Eli) with the suite's key. The installation row already exists, so `ownerCore` uses it, and app grants come from the seed. No seed value is copied into a test: a case reads the row it expects first, so a seed edit fails at the read, by name.

### 4. What each new file checks

- **Hello:** Dana (holds Hello) gets `Hello, Ada!`; Eli (holds nothing) and an unsigned caller are refused.
- **Inbox:** the existing week-board case; Fay reads her seeded items; an item put then close, each read back from D1; a schedule save read back from D1.
- **Knowledge:** Fay (Admin) gets the `not_set_up` answer (503) for pages, a page and search; Eli is refused; the unsigned public-page address answers as with no repository. Content stays in the unit tests (proposal decision log).

### 5. Time budget in the entry

The entry records the time from the start of `startRuntime` to the end of the last `describe`, and each `describe`'s own time, from its first `beforeAll` to its last `afterAll`. Over 30 000 ms, the entry's `afterAll` throws with the total and the three slowest apps and their times. A filtered run (`-t`, read from Vitest's `testNamePattern`) skips the budget. The budget includes the build: it is what a person waits for. The limit is one constant, named in the guide.

### 6. The every-app check

`scripts/check-runtime-tests.mjs`, run from the app's `npm test` after `test:runtime`: each `app/worker/apps/<name>/` with an `api.ts` needs `app/tests/runtime/apps/<name>.ts`, and the entry must import it. It fails naming each missing app and the file to add. It reads files only, so it adds no time.

### 7. Who checks what

`wiki/stack/testing.md` owns the split: local tests for the database and outside services, the gate; `/verify` and kept checks for screens and real sign-in. One line in the walkthrough's failure step (§ e) says a bug found there gets a failing local test first, linking the guide. That line needs an offsetting cut for `measure-context.mjs --check`.

## Risks / Trade-offs

- [The seed grows and slows the snapshot and reset] → One batch each; the run's timing log prints the reset time, and the budget names the slowest app.
- [A seed edit breaks a runtime case] → Wanted: staging shows the same rows. Cases read the seeded row first, so the failure names it.
- [The Access cases see seeded rows] → Their own reset clears the Access tables first, as today.
- [An install's own server app has no runtime file after the update] → The check names it; the CHANGELOG Updating note says to add one per app, and `/wong-sync` plans it.
- [The 30 s budget fails on a slow CI machine] → The final task records three runs' median; if CI's median is above 20 s, `/apply` stops and reports before raising the limit, with a `Check:` bullet.
