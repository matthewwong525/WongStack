# Testing the app

This page says which test checks what in the app, and how to run, extend and trust the tests. AI can write a mistake as easily as any developer. A test keeps the behavior you rely on visible and repeatable: a successful manual run is useful evidence, but only an automatic check keeps working on the next change. Write each test to [pass at any speed](#tests-that-pass-at-any-speed).

## Who checks what

Each kind of behavior has one owner, so no check is done twice and nothing falls between two.

| What | Checked by | When |
|---|---|---|
| Rules, edge cases and failures | Unit and screen tests | Every check; blocks publishing |
| Database reads and saves | [The real-database tests](#the-real-database-tests) | Every check; blocks publishing |
| Outside services | Local tests | Every check; blocks publishing |
| Screens and real sign-in | [`/verify`](../../.agents/skills/verify/SKILL.md) and [kept checks](../development/kept-checks.md) | On the preview |
| A bug `/verify` finds | A new failing local test | Before the fix |

Local tests block a mistake before it is published: the automatic checks are [the publishing gate](../development/the-change-loop.md#the-gate). Local runs can not show the hosted sign-in policy, a live provider, or a screen in a real browser, so the [preview walk](../development/staging-walkthrough.md) keeps those. When the walk finds a bug, first write a local test that fails on it, then fix the bug: the test keeps the bug from coming back.

## Local checks

Run `npm run lint` from `app/` for the code checks alone. [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) loads [shadcn/lint](https://github.com/shadcn-ui/lint) through `jsPlugins` in `app/.oxlintrc.json`. The plugin is available for design rules, but no new design rules are enabled. Add selected rules to that file's `rules` section after agreeing on the design policy.

The app's `npm test` runs the unit and screen tests with their coverage limits, then the real-database tests, then the check that [every app has its own](#add-an-apps-tests). It adds no dependency, browser download or service login.

## The real-database tests

`npm run test:runtime` from `app/` runs the app's real server code in Cloudflare's local Workers runtime, on a real local database. One entry, `app/tests/runtime/runtime.test.ts`, builds the Worker and starts it once per run, however many apps it tests. Then it runs each app's file in `app/tests/runtime/apps/` in its own group, named for the app.

- **The database holds staging's sample rows.** The setup applies the project's real migrations, then [`schema/seed.sql`](d1-pipeline.md#seeded-staging-production-untouched) as the last one, so a test sees the people, inbox items and schedules a preview shows.
- **A test that changes the rows puts them back.** `resetToSeed(db)` from `setup.ts` restores every seeded row and removes a trigger a test made. Each app's group calls it before its first case; a case that needs a clean start calls it again.
- **Access starts empty.** Its cases clear the Access tables first, because they prove a fresh install's first start. Access runs first; the next app resets to the seed.
- **People sign in with test keys.** The suite signs tokens for the owner and for three seeded people: Fay (an Admin), Dana (holds Hello) and Eli (holds no app). Only the signing-key answer is a stand-in: sign-in rules, routing, database reads and rollbacks are the real app's.
- **Nothing leaves the computer.** An outgoing request fails the run. The app's secret files and deployed resources are never used.

The runtime suite's lines do not count toward the 100% coverage limit. The local runtime, workerd, answers the profiler itself and refuses line-by-line coverage; its best-effort coverage counts a whole function once it runs, a `throw` that no case reaches included. So server logic keeps its unit tests, on the test copy of the database that [`database()`](../../app/tests/employee-access/connections.ts) builds from the real migrations.

Setup prints how long the build, start and migrations took, and the run prints each app's time. The suite closes the runtime and removes its temporary files, also after a failing case.

### Run one app's tests

While you work on one app, run only its tests, then the full set once at the end:

```bash
npm run test:runtime -- -t inbox
```

The runtime still starts once. The other apps' tests show as skipped.

### The 30-second limit

The full set must finish in 30 seconds, the build included: that is what a person waits for. Over the limit, the run fails and names the three slowest apps:

```text
Error: The real-database tests took 34.2 s; the limit is 30 s. Slowest:
  inbox      9.8 s
  access     4.1 s
  knowledge  1.2 s
```

A run that skips an app, as `-t` does, is not held to the limit. The limit is `BUDGET_MS` in `app/tests/runtime/budget.ts`. Make the slowest app faster before you raise it, and give a raise [its reason](../development/the-change-loop.md#a-loosened-check-needs-a-reason).

### Add an app's tests

Each app with server code, an `app/worker/apps/<name>/api.ts`, needs its own file. `npm test` fails until it has one, and names the file to add:

```text
✗ Each app part with server code needs its own real-database test:
    reports  (add tests/runtime/apps/reports.ts)
```

1. Write `app/tests/runtime/apps/<name>.ts`. Copy [`hello.ts`](../../app/tests/runtime/apps/hello.ts): it exports one function that registers the app's cases and resets to the seed first.
2. Import it in `runtime.test.ts` and add it to the `APPS` list.
3. In each case, read the seeded row you expect first, then call the app and read the result back from the database. A changed seed then fails at that first read, by name.

Add the sample rows a new feature needs to `schema/seed.sql` in the same change: the preview and these tests both start from them.

An app that reads from a service the local runtime does not have tests only what a preview has. For example, Knowledge reads the knowledge store, which previews turn off. So its file checks who may open it and its *not set up* answer, and the unit tests check its pages with a stand-in store.

## Service examples

An app whose server code calls an outside service tests on that service's saved examples, never the live service. The examples are the files `record` saves in `schema/services/<key>/examples/`: [each service's definition](service-catalogue.md#each-services-definition) says how to save one. The [services skill](../../.agents/skills/services/SKILL.md) walks a chat through it.

- **Type the answer from the definition.** `app/worker/services/<key>.ts` is built from `openapi.json`, one type per call: `const answer = body as NotionSearchAnswer`. Never edit it: `node .claude/skills/access/scripts/check-definitions.mjs --types` rebuilds it, and `npm test` fails on a stale one.
- **Play the examples back in a real-database test.** In the app's file, call `context().services.serve("<key>")` first. Each request the Worker sends to that service's address then gets the saved answer whose method, path, query and body match. A request no example matches fails the test, and names the closest example: `No example for GET notion/serch (closest: notion/search)`. A request to any other outside address fails too.
- **A tool added in the app, not in `app/worker/keys.ts`,** loads only on the live app, and the shared test runtime runs as staging. Start a second runtime as production, insert the tool's `tools` row in its database, then pass that database: `serve("<key>", { db: live.env.DB })`. [`access.ts`](../../app/tests/runtime/apps/access.ts) shows each step.

**Remove a private value already saved.** The check fails on a value that looks private, such as a real email, an ID, or a token, and names its file and field. Run `record` again for that example, or replace the value by hand with one the scrubber makes: `person1@example.com`, `Sample text 1`, or the ID with its digits and letters as zeros. A value that reached a saved commit stays in the history: tell the owner, and change the key if it was one.

## Proof the checks can fail

`npm run test:checks` gives each check of `npm test` a sample that is wrong on purpose, and fails when one lets it through. The real-database check gets a wrong expectation after a successful request, so a startup error can not count as catching it. The time limit gets a run that only looks slower than the limit.

## Tests that pass at any speed

A test that passes on your computer and fails now and then on the automatic checks is usually racing a clock: the checks run many test files at once on a busy machine. Each failure stops a publish until someone reruns it.

- **End a wait by its state, not by time.** Wait until two reads match or the server answers, with a cap long enough never to end it. A short cap on a busy machine ends the wait early, and the test counts too few reads.
- **Use a short cap only in the test of the cap.** That test sets its own cap and checks that the cap ended the wait. WongStack's browser tests show both: their pretend browser sets long waits for every test, and only the test of a page that never settles sets a 300 ms one.
- **A pretend server writes a shared file whole.** Write to a file beside it, then rename it into place; a test reading mid-write otherwise sees half a file.
- **A pretend server keeps its own error.** Write a crash's stack to a file the failing test prints, so the next failure names its cause instead of only *did not start*.
- **Give a start that fails at once another try.** A free port picked before a server listens can be taken in between. Pick a fresh port and start again, a few times at most; a slow start is not retried.

Part of the [Cloudflare stack](README.md).
