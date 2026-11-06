# Test every part of the app on a real local database with staging's sample data

**Status:** ready-to-ship
**Branch:** zealous-jaguar
**Open questions:** none.

## Why

The tests that run the app's real server code on a real local database cover only sign-in, Access and one week-board case. Hello, Inbox and Knowledge have no such test, and nothing stops a new app part from having none. The database starts empty, so a test never sees the sample rows staging shows you. This change is the base of two later ones: answers from outside services, and moving the pretend-database tests here.

## What Changes

- **Each test run starts the app once, on a fresh database that holds staging's sample rows.** The database is built from your real setup, then gets the same sample people, inbox items and schedules a preview shows. Each app part's tests start from those rows, and a test that changes them can put them back.
  ```mermaid
  flowchart TD
    A["Build and start the app once"] --> B["Fresh database"]
    B --> C["Add staging's sample rows"]
    C --> D["Access tests"]
    C --> E["Hello tests"]
    C --> F["Inbox tests"]
    C --> G["Knowledge tests"]
  ```
- **Every app part with server code gets its own tests, and a check blocks one with none.** Hello gets a greeting test. Inbox gets item and schedule tests beside its week board. Knowledge gets tests for what a preview has: who may open it, and its *not set up* answer. Its page list, search and page reading stay in the fast tests, which already use sample pages. Your own app parts with server code need a test too: the update tells you which.
  ```text
  $ npm test
  ✗ Each app part with server code needs
    its own real-database test:
      reports  (add tests/runtime/apps/reports.ts)
  ```
- **The full set stays under 30 seconds, or the check fails and names the three slowest parts.** Every check runs all of the tests. While the AI works on one part, it runs only that part's tests, then the full set once.
  ```text
  ✗ The real-database tests took 34.2 s;
    the limit is 30 s. Slowest:
      inbox      9.8 s
      access     4.1 s
      knowledge  1.2 s
  ```
- **The testing guide says who checks what.** Local tests cover the database and outside services, and block a mistake before it is published. `/verify` and its kept checks cover screens and real sign-in on the preview. A bug `/verify` finds first becomes a failing local test, then gets fixed.
  | What | Checked by | When |
  |---|---|---|
  | Database reads and saves | Local tests | Every check; blocks publishing |
  | Outside services | Local tests | Every check; blocks publishing |
  | Screens and real sign-in | `/verify` and kept checks | On the preview |
  | A bug `/verify` finds | A new failing local test | Before the fix |

Non-goals: moving the pretend-database tests (part 3), counting these tests toward the every-line rule (part 3), answers from outside services (part 2), a stand-in knowledge store, browser tests in the local run, and a separate feature map.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-scaffold`: the runtime suite loads the staging seed, starts once for one file per server app, requires a file for each server app folder, and fails over a 30-second budget naming the slowest apps.

## Impact

- `app/tests/runtime/`: `setup.ts` copies the migrations plus `schema/seed.sql` as the last migration and adds `resetToSeed`; `runtime.test.ts` becomes the one entry that starts and stops the runtime, times each app and enforces the budget; new `apps/access.ts`, `apps/hello.ts`, `apps/inbox.ts`, `apps/knowledge.ts`.
- New `scripts/check-runtime-tests.mjs`, run from the app's `npm test`, with `scripts/tests/check-runtime-tests.test.mjs`.
- `scripts/check-app-checks.mjs` and its test: the runtime bad sample under the new layout, and a budget bad sample.
- `wiki/stack/testing.md`; one line in `.agents/skills/verify/references/walkthrough.md` § e, with an offsetting cut for `measure-context.mjs --check`.
- No new spec, so `areas.json` is unchanged. A `## Next (minor)` `CHANGELOG.md` entry; installs with their own server apps add a runtime test file for each.
- Parts 2 (`service-definitions`) and 3 (*Move the pretend-database tests to the real database*) build on this layout.

## Decision log

- **2026-11-06** — Asked whether a check should block an app part with server code and no local test → chose block it, and add the missing tests for Hello, Inbox and Knowledge.
- **2026-11-06** — Asked, after research on Lauren Tan, Simon Willison and Anthropic's guide, how automatic tests and `/verify` share the work → chose split the jobs: local tests block mistakes, `/verify` covers screens and sign-in, a found bug becomes a local test; no separate feature map.
- **2026-11-06** — Asked whether to run only tests near a change → chose all tests on every check, with a 30-second limit; touched-only runs while the AI works.
- **2026-11-06** — Asked how to split the larger request → chose three plans; this one is the base, and moving the pretend-database tests and coverage merging belong to part 3, outside-service answers to part 2.
- **2026-11-06** — Asked what Knowledge's local test should check, since its pages come from the knowledge store, which previews turn off and the local setup can't reach → chose what a preview has: who may open it and its *not set up* answer; page content stays in the fast tests.
- **2026-11-06** — Assumed: build on the existing local Workers runtime suite, not a new SQLite setup, because it already runs the real migrations on SQLite through D1 and measured a 10-second median.
- **2026-11-06** — Assumed: load the seed as the last migration and reset by a snapshot taken after it, because Wrangler's migration runner parses the seed's comments and multi-line inserts as staging does, and D1 `exec` does not.
- **2026-11-06** — Assumed: one test entry starts the runtime and calls a file per app, not many Vitest files sharing a start, because the entry keeps one clear owner for start and stop, and a stray second start would double the time unseen.
- **2026-11-06** — Assumed: the Access cases keep clearing the Access tables first, because they prove a fresh install's first start, which the seed's practice installation would hide.
- **2026-11-06** — Assumed: the 30-second limit includes the build and is skipped when one app runs alone, because the full run is what a person waits for and one app's run is not.
- **2026-11-06** — Assumed: the time limit is skipped when any app's group did not run, not by reading Vitest's `testNamePattern`, because `-t` skips the other groups' hooks and this needs no Vitest internals; a `-t` that matches a case in every app is held to the limit, which a shorter run always meets.
- **2026-11-06** — Assumed: the limit's bad sample in `npm run test:checks` stands in for the clock, not a 30-second wait, because the proof runs on every settings change and the real wait was proven once by hand (evidence.md).
- **2026-11-06** — Assumed: the every-app check runs right after the real-database tests in `npm test`, and only `wiki/stack/testing.md` describes it, because `wiki/stack/d1-pipeline.md` sits at its 3,000-word cap.
- **2026-11-06** — Assumed: keep the walkthrough's instruction to inspect the failure cause, revision and check identity, and cut other words instead, because removing it would loosen a check.
- **2026-11-06** — Check: `app/package.json` gains one step in `npm test`, `check-runtime-tests.mjs`, and loses none, because each app with server code now needs its own real-database test.
- **2026-11-06** — Assumed: archive checkpoint for publishing as 50.2.0 on branch `zealous-jaguar`; the second look's two findings (the walkthrough check line and the seed reset on other table shapes) are fixed and reread.
