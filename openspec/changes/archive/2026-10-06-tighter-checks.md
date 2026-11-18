<!-- openspec-archive v1 2026-10-06-tighter-checks -->
<!-- file proposal.md utf8 8963 -->
# Checks that can't go quiet

**Status:** ready-to-ship

**Branch:** wongstack-architecture-constraints

**Open questions:** none

## Why

You don't read the code, so the automatic checks are what you trust. Three gaps let them pass when they should not. A check can switch itself off and stay green: the repeated-code check once passed everything because its settings file held a comment. Wrong-typed code passes the required check and is only caught later, while the preview builds. And nothing stops a small app from reaching into another app's files.

## What Changes

- **A check that has stopped checking turns red.** When a change touches a check's settings, or the version of a tool behind one, each check is fed a small piece of code that is wrong on purpose. A check that lets it through is named and the change can't be published. Other changes skip this, so they take no longer.
  ```text
  settings change ─▶ bad sample ─▶ caught ─▶ ok
                         │ passed
                         ▼
                red: names the check
  ```
- **Wrong-typed code is caught before you see a preview.** Today that check runs only while the preview builds, after the required check has passed. It joins the required check, and it runs on your computer before work is saved. It also covers the server's test files, which nothing checks today; about 100 slips it finds there are fixed in this change.
  ```text
    BEFORE              AFTER
  tests ─▶ build      tests +types ─▶ build
             │              │
        found here     found here
  ```
- **The assistant's own scripts keep the testing they have.** 92 of every 100 lines are tested, but the floor that stops this from falling sits at 85. The floor moves up to 92, so a slide shows at once. No tests are added.
- **A small app keeps to its own folder.** A small app may use its own files and the shared parts. One that reaches into another app, a main page, or the server's core fails the check, which names the file. No app breaks this today.
- **After the update, your own app gets the same checks.** If one finds something in a screen your assistant built, the update's plan lists it and your assistant fixes it. Nothing needs doing by hand.

**Non-goals.** No size or branching limits on the assistant's scripts, and no type check for them: the first was offered and not chosen, the second found nothing a past bug supports. The landing page's own checks stay as they are. Running the server's tests inside Cloudflare's runtime is a separate, larger look.

## Decision log

- **2026-10-06** — Asked which of four tighter checks to plan → chose three: checks that prove they can fail, the type check in the required check with a higher floor for the scripts, and the small-app folder rule. Size and branching limits on the scripts were left out.
- **2026-10-06** — Asked whether to type-check the server's test files too, once measuring showed about 100 reports in 12 test files → chose to include them.
- **2026-10-06** — Assumed: the bad-sample run happens only when a change touches a check's settings or a tool's version, because a check should run only when its kind of file changed (`wiki/people/matthew-wong.md`), and this one can't fail otherwise.
- **2026-10-06** — Assumed: the scripts' floor becomes 92 lines and 89 branches, because the last run on the main branch measured 92.88 and 90.02, and a branch floor of 90 would leave room for two branches while two other workspaces are in flight.
- **2026-10-06** — Assumed: the folder rule skips test files, because a screen's test opens it inside the app's router and Home.
- **2026-10-06** — Assumed: the new checks reach an install through the normal update, because the app's checks ship with the app; the update note says what the assistant does when one finds something.
- **2026-10-06** — Assumed: this is a `minor` release, because installs gain new checks and lose nothing.
- **2026-10-06** — Asked what to do with the finished plan → chose build and publish.
- **2026-10-06** — Build: the type check runs while the test files are fixed (groups 1 and 2), because its report is the list of what to fix. Every other task's own check run moves to the one run in group 7, because the build writes all code and tests before running any; each promise those steps checked is still held by a test or by group 7.
- **2026-10-06** — Build: the look at the saved commit's checks (the proof ran, six gates caught, the build still passes) is read from the publish's one save, not from a save of its own, because one publish makes one checkpoint.
- **2026-10-06** — Build: measured on this branch, the server's test files held 105 type reports in 13 files, not 101 in 12. None showed a real slip in a test: each was a body read without a shape, a stand-in with no type, or a platform type wider than the test's own.
- **2026-10-06** — Build: the 30 casts through `unknown` those 13 files already held went too, through two small builders in `app/tests/env.ts`, because the task's search reads each changed file whole, not only its new lines.
- **2026-10-06** — Build: the proof runs each check's own step of the app's `test` script, not a fixed command, so a dropped step, or a dropped option such as `--coverage`, is caught as well.
- **2026-10-06** — Build: with a comment added to `app/.jscpd.json` by hand, `npx jscpd` printed `Found 105 clones.` and exited 0, while `npm run test:checks` printed ``repeated code: passed a bad sample (src/repeated-first.ts, worker/repeated-second.ts); `jscpd` exited 0`` and exited 1. The file was restored.
- **2026-10-06** — Build: this branch's scripts measure 92.96 lines and 90.06 branches of every 100 tested, so the floor is 92 and 89 as planned.
- **2026-10-06** — Check: `app/package.json` adds the type check to the `test` script and a script that runs the bad-sample proof; stricter, nothing removed.
- **2026-10-06** — Check: `app/tsconfig.json` and the new `app/tsconfig.tests.json` add the server's test files to the type check, which `app/tsconfig.worker.json` still leaves out of the build's own project.
- **2026-10-06** — Check: `app/.oxlintrc.json` adds the folder rule for small apps; no rule is removed or relaxed.
- **2026-10-06** — Check: `scripts/tests/.c8rc.json` raises the floor from 85 lines and 81 branches to 92 and 89.
- **2026-10-06** — Check: `.github/scripts/checks.mjs`, `.github/scripts/loosened-checks.mjs` and the new `.github/scripts/check-settings.mjs` share one list of what counts as a check's settings and run the proof when one changes; the loosened-check rule itself is unchanged.
- **2026-10-06** — Archive checkpoint: the main branch moved from 35.2.0 to 36.3.0 while this was built and merged in with no clash; this is numbered 36.4.0. The look at the saved commit's checks follows this save.
- **2026-10-06** — Archive checkpoint: the first saved run failed on the new type check alone. A test that arrived from the main branch during the build, in `app/worker/employee-access/management.test.ts`, read a response body with no shape; it now names one. The proof ran in that run and all six checks caught their samples.
- **2026-10-06** — Archive checkpoint: the second saved run failed on the instruction pages' size limit alone, once the main branch's newer text was counted with this change's. The paragraph on the proof moved from the gate page to `wiki/stack/mini-apps.md`, and the gate page keeps one sentence that links it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-scaffold`: *npm test runs absolute quality gates* adds a type error, in a test file too, to what fails `npm test`.
- `ci-tests`: a new requirement promises that a check which no longer fails on a known-bad sample turns the test check red, and that the proof runs only when a check's settings or tools change.
- `mini-apps`: a new requirement promises that a mini app's code keeps to its own folder and the shared parts.
- `payload-checks`: *Every guard is tested refusing* also covers the scripts' coverage floor.

## Impact

- `app/package.json`, `app/tsconfig.json`, new `app/tsconfig.tests.json`, `app/.oxlintrc.json`.
- `app/worker/**/*.test.ts` and `app/tests/`: about 100 type fixes, most through one shared test helper.
- New `scripts/check-app-checks.mjs` with its samples, listed in `payload-files.json`; its tests in `scripts/tests/`.
- `.github/scripts/checks.mjs`, `.github/scripts/loosened-checks.mjs`, new `.github/scripts/check-settings.mjs`.
- `scripts/tests/.c8rc.json` and a test that the floor refuses.
- `.agents/rules/code.md`, `wiki/stack/mini-apps.md`, `wiki/development/the-change-loop.md`, `CHANGELOG.md` (`minor`).
- Measured on 2026-10-06: the type check takes about 4 seconds; a trial of the server's test files reported 106 errors, 5 of them from the trial copy; the folder rule passes the app as it stands and fails a sample.

<!-- end proposal.md -->
<!-- file design.md utf8 9200 -->
# Design

## Context

See `proposal.md` for why. What exists today:

- `app/package.json`'s `test` script runs `oxlint --deny-warnings`, `vitest run --coverage`, `knip`, `jscpd` and `node ../scripts/check-app-keys.mjs`. It runs no type check. `tsc -b` runs only inside `build:app`, which the Deploy workflow calls; main's ruleset requires only the `test` and `payload` checks.
- `tsc -b` covers `src/` (tests included), `worker/` without its tests, and `vite.config.ts`. `tsconfig.worker.json` excludes `worker/**/*.test.ts` because that project resolves modules the Node way and Vitest resolves them the Vite way. `app/tests/` is in no project.
- `app/.jscpd.json` with a comment in it is ignored whole by jscpd, which then passes everything (35.0.1). Only a sentence in `wiki/stack/mini-apps.md` guards it.
- [`checks.mjs`](../../../.github/scripts/checks.mjs) owns the `test` check on both routes and the pre-check on this computer. [`loosened-checks.mjs`](../../../.github/scripts/loosened-checks.mjs) holds the list of what counts as a check's settings.
- `scripts/tests/.c8rc.json` sets the scripts' floor at 85 lines and 81 branches. Main's last Payload run measured 92.88 and 90.02.
- No mini app imports outside its folder, `src/lib/`, `src/components/` or `worker/api/contract.ts` today, test files aside.

Measured on 2026-10-06 in a throwaway copy: `tsc -b` takes about 4 seconds. A trial project over `worker/` and `tests/` with bundler resolution and Node types reported 106 errors: 77 are a response body read as `unknown` (TS2571, TS18046), 5 are skill modules the copy lacked, and the rest are argument and call shapes (TS2345, TS2349, TS2352, TS2554, TS7006) in 12 test files.

## Goals / Non-Goals

**Goals:**

- Each new check ships with the app, so an install gets it through the normal update.
- No change that leaves check settings alone takes longer than a few seconds more.
- No `any`, skip comment or excluded file is added to make a gate pass.

**Non-Goals:**

- No proof for the landing page's checks in `site/`, or for the payload's lint and shell checks, which read no settings file.
- No change to what the loosened-check rule flags.

## Decisions

### The type check is one more link in `npm test`

`test` becomes `npm run lint && tsc -b && vitest run --coverage && …`. It sits second: it is the fastest gate after lint and its errors explain most test failures that follow.

A fourth project, `app/tsconfig.tests.json`, covers `worker/**/*.test.ts` and `tests/`, and `tsconfig.json` references it, so one `tsc -b` checks everything and the build checks the same set. It extends `tsconfig.node.json` and sets `module: esnext`, `moduleResolution: bundler`, `resolveJsonModule`, and the types `./worker-configuration.d.ts`, `vite/client` and `node`. It includes the Worker's source too, since the tests import it; `tsconfig.worker.json` keeps its exclusion, so the Worker's own project still resolves the Node way.

*Over a separate `typecheck` step in `checks.mjs`:* `npm test` is the whole contract of the `test` check, and an install's own runner would be skipped.

*Over removing the exclusion in `tsconfig.worker.json`:* its comment gives the reason, and the two resolution modes still disagree.

### The test fixes go through one helper, with no `any`

Most reports are `(await response.json()).error.code` on an `unknown` body. One helper in `app/tests/` reads a response body as a loose tree type whose every property is the same loose type, so a test reads `body.error.code` and hands it to `expect`. The lint rule against `any` stays on in tests. The remaining reports are fixed where they are: a fake handed where `Env` is wanted gets a typed builder, not a cast to `unknown` and back. A report that shows a real slip in a test is fixed as one and named in the Decision log.

### The proof is a script that runs the real commands on samples

`scripts/check-app-checks.mjs` builds a throwaway folder in the system's temp directory, links the app's installed packages into it, copies the app's real settings files, and writes small samples. For each gate it runs the command `npm test` runs and expects a non-zero exit and output that names the sample:

| Gate | Settings copied | Sample |
|---|---|---|
| lint | `.oxlintrc.json` | one file per rule the settings name: an explicit `any`, a 501-line file, a function over the complexity cap, a hook in a branch, a mini app importing a sibling |
| types | `tsconfig*.json` | a wrong type in `src/`, in `worker/`, and in a Worker test |
| coverage | `vitest.config.ts` | a function with an untested branch and its test |
| unused code | `knip.jsonc`, `package.json` | an exported file nothing imports |
| repeated code | `.jscpd.json` | two files with the same 40 lines |
| saved keys | `worker/keys.ts` | a handler naming a secret its route does not list |

A gate that exits zero, or fails without naming its sample, is reported as `passed a bad sample` and the script exits 1. Each gate prints one line. The folder is removed on exit. The samples are generated by the script, so no bad file sits in the repo for the real gates to trip on.

It ships beside `check-app-keys.mjs` in the pack's file list. `app/package.json` gains `"test:checks": "node ../scripts/check-app-checks.mjs"`.

*Over a test per tool inside the app's Vitest suite:* the suite runs under coverage with a Node environment, and spawning five tools there would slow every run.

*Over asserting each tool's file count:* that catches a tool that scanned nothing, but not one that scanned and no longer applies a rule.

### The proof runs when a check's settings or tools change

A check should run only when its kind of file changed. This one can only fail when a settings file, a tool's version, or the proof itself changed, so `checks.mjs` runs `npm run test:checks` in the suite's folder when the change touches:

- a check's settings, by the list `loosened-checks.mjs` uses;
- the suite's `package.json` or `package-lock.json`, which is how a weekly dependency update moves a tool;
- `scripts/check-app-checks.mjs`.

It also runs when there is no base to compare, and it is skipped, with a line in the summary, when the suite's `package.json` has no `test:checks` script. The settings list and the changed-file list move from `loosened-checks.mjs` into a small shared module, `.github/scripts/check-settings.mjs`, so the two scripts can not drift. The pre-check gets a part named `proof` for `--only`.

*Over always running it in `npm test`:* it would add its whole time to every app change, for a check that can not fail on one.

*Over adding the lockfile to the loosened-check list:* every dependency update would then need a written reason.

### The folder rule is a lint rule with an allow-list

Two overrides in `app/.oxlintrc.json` use `no-restricted-imports` patterns, proven on oxlint 1.86.0:

- `src/apps/*/**`: restrict `../**`, `@/apps/**`, `@/pages/**`; allow `../../lib/**` and `../../components/**`. `@/components/**` and `@/lib/**` are untouched.
- `worker/apps/*/**`: restrict `../**`; allow `../../api/contract.ts` and `../../api/body.ts`.
- A last override turns the rule off for `**/*.test.ts` and `**/*.test.tsx`.

`src/apps/AppPage.tsx`, `src/apps/index.ts` and `worker/apps/index.ts` sit one level up and are core, so the globs do not reach them. The pattern matches the written import, not the resolved file, so a mini app that grows a subfolder imports upward within itself through `@/apps/<name>/…`; when the first one does, the rule gains an allow for that. No mini app has a subfolder today.

*Over a source-reading test like `style.test.ts`:* the lint rule needs no code, reports in the same run as the other rules, and the proof already covers it.

### The scripts' floor moves to 92 and 89

`scripts/tests/.c8rc.json` takes `lines: 92`, `branches: 89`, after re-measuring on this branch. A script test runs `c8` with that file on a half-tested sample and expects it to refuse, which is the proof for this gate; it lives in `scripts/tests/` because the floor is meta-only.

## Risks / Trade-offs

- [An install's own tests hold type errors, so its `test` check goes red after the update] → The changelog's **Updating.** note says the assistant fixes what the check names; `/wong-sync`'s plan lists it.
- [A tool resolves packages differently through the linked folder, so a gate fails for the wrong reason] → A gate must name its sample to count as caught, so a wrong-reason failure shows as `passed a bad sample`. The script's own tests use stand-in commands, since the Payload job installs no app packages; the real tools run in the `test` check of this change itself, which touches settings, and of every later one that does.
- [The Skills API workspace edits the same Worker tests] → The helper is additive and each fix is local; whichever lands second takes main in and reruns the type check.
- [The floor fails a change in flight that tests less than it adds] → That is the floor working; 92 leaves 0.88 of a point and 89 a full point.

## Migration Plan

Nothing to migrate. Removing `tsc -b` from the `test` script, the `test:checks` script and the two overrides restores today's behaviour.

<!-- end design.md -->
<!-- file tasks.md utf8 6344 -->
# Tasks

## 1. Measure on this branch

- [x] 1.1 Install the app's packages (`npm ci` in `app/`) and the script tests' (`npm ci` in `scripts/tests/`). Run `npx tsc -b` in `app/`. Verify it exits 0 before any edit; if it does not, stop and report it.
- [x] 1.2 Add `app/tsconfig.tests.json` as the design gives it, run `npx tsc -p tsconfig.tests.json`, and count the reports by code and by file. Verify the count is near the 101 measured (106 less 5 from the trial copy); if it is over 150, stop and report the new figure before fixing anything.

## 2. The type check in the app

- [x] 2.1 Reference `tsconfig.tests.json` from `app/tsconfig.json`. Verify `npx tsc -b` now reports the Worker tests' errors and `tsconfig.worker.json` still excludes them from its own project.
- [x] 2.2 Add one helper under `app/tests/` that reads a response body as a loose tree type with no `any`, and use it wherever a Worker test reads a body as `unknown`. Verify the TS2571 and TS18046 reports are gone and `npm run lint` passes.
- [x] 2.3 Fix each remaining report where it is: a typed builder for a fake `Env` or request, never a cast through `unknown`, a skip comment, or an excluded file. Add a Decision log bullet for any report that showed a real slip in a test. Verify `npx tsc -b` exits 0 and a search of the changed test files finds no `as unknown as`, `@ts-`, or `oxlint-disable`.
- [x] 2.4 Put `tsc -b` second in `app/package.json`'s `test` script. Verify `npm test` passes, then that a wrong-typed argument added to one Worker test makes `npm test` exit non-zero naming that file; remove the argument.

## 3. The folder rule in the app

- [x] 3.1 Add the two `no-restricted-imports` overrides and the test-file override to `app/.oxlintrc.json`, as the design gives them. Verify `npm run lint` passes on the app as it stands, and that an import of `../tips/…` added to `src/apps/hello/App.tsx` and of `../../keys.ts` added to `worker/apps/hello/api.ts` each fail and name the file; remove both.

## 4. The proof that each check still fails

- [x] 4.1 Move the settings list and the changed-file list from `.github/scripts/loosened-checks.mjs` into `.github/scripts/check-settings.mjs`, and import them back. Verify `scripts/tests/loosened-checks.test.mjs` passes with no edit to its assertions.
- [x] 4.2 Write `scripts/check-app-checks.mjs`: the throwaway folder, the six gates of the design's table, one line per gate, exit 1 when a gate passes a bad sample or fails without naming it, and the folder removed on exit. Take the command runner as a parameter so tests can stand in for the tools. Add `"test:checks"` to `app/package.json`, list the script beside `check-app-keys.mjs` in `payload-files.json` and in the `ci` area of `areas.json`, and add it to `scripts/tests/cli-conventions.test.mjs`. Verify `npm run test:checks` in `app/` prints six caught gates and exits 0.
- [x] 4.3 Add `scripts/tests/check-app-checks.test.mjs` with stand-in commands: every gate caught passes; a gate that exits 0 is named and the script exits 1; a gate that fails without naming its sample is named too; a missing settings file is reported, not skipped; the folder is gone afterwards. Verify the tests pass and the script's lines and branches are covered.
- [x] 4.4 Prove the case that started this, once, by hand: add a comment to `app/.jscpd.json`, run `npm run test:checks`, and verify it names the repeated-code gate and exits 1 while `npx jscpd` still exits 0; restore the file. Record the two outputs in the Decision log.
- [x] 4.5 In `.github/scripts/checks.mjs`, run `npm run test:checks` in the suite's folder when the change touches a check's settings, the suite's `package.json` or `package-lock.json`, or `scripts/check-app-checks.mjs`, and when there is no base; skip with one summary line otherwise, or when the suite has no such script. Add the `proof` part to `--worktree --only`. Extend `scripts/tests/checks.test.mjs`: settings touched runs it, a screen-only change skips it and says so, no base runs it, no script skips it, a failed proof fails the check and is named in `LOCAL_CHECKS`. Verify the tests pass.

## 5. The scripts' floor

- [x] 5.1 Run the script suite under `c8` and read the totals. Set `lines: 92` and `branches: 89` in `scripts/tests/.c8rc.json`; if this branch measures under 92.5 lines or 89.5 branches, set each one whole point under what it measures and say so in the Decision log. Verify the suite passes at the new floor.
- [x] 5.2 Add `scripts/tests/coverage-floor.test.mjs`: run `c8` with the committed settings file on a half-tested sample in a temp folder, with its own temp directory and the outer run's `NODE_V8_COVERAGE` cleared, and expect a refusal that names the measured figure. Verify it passes, and fails when the sample is fully tested.

## 6. Docs and the release

- [x] 6.1 In `.agents/rules/code.md`, say in the mini-app bullet that an app imports only its own folder, the shared parts and helpers, and, on the server, the shared contract. Verify `node scripts/measure-context.mjs --check` passes.
- [x] 6.2 In `wiki/stack/mini-apps.md#the-rules`, add the folder rule, and change the sentence about comments in `app/.jscpd.json` to say the proof now catches it. In `wiki/development/the-change-loop.md#the-gate`, add what the proof is and when it runs. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 6.3 Add `## Next (minor) — Checks that can't go quiet` at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: nothing by hand; the checks now also read your app's types, test files included, and keep each small app to its own folder, and your assistant fixes whatever they name. Verify `node scripts/check-retired-names.mjs` passes.
- [x] 6.4 Match the Decision log's `Check:` bullets to the settings files this change really touched: add one for a file not named, drop one for a file left alone. Verify `node .github/scripts/loosened-checks.mjs --worktree` lists every flagged file as explained.

## 7. Verification

- [x] 7.1 From `app/`, run `npm test`, `npm run test:checks` and `npm run build:app`. Verify all three pass.
- [x] 7.2 Run `node .github/scripts/checks.mjs --worktree`. Verify every part passes and the output shows the proof ran.
- [x] 7.3 Run `openspec validate "tighter-checks" --strict --no-interactive`. Verify it reports valid.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 1732 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: npm test runs absolute quality gates

The scaffold's `npm test` SHALL fail on any coverage below 100%, a function over the complexity cap, a file over 500 lines, an explicit `any`, a type error, a lint warning, dead code, or duplicated code. The type gate SHALL cover the app's test files as well as its source. The gates SHALL be absolute, not baselined, and the scaffold SHALL pass all of them as shipped, with no extra workflow. The one folder of ready-made parts copied into the app SHALL be exempt from the coverage, dead-code, and duplicated-code gates and from the lint rule on what a component file exports, and from nothing else; no other folder SHALL be exempt.

#### Scenario: A violation

- **WHEN** a commit adds an explicit `any` or an uncovered line to the scaffold
- **THEN** `npm test` exits non-zero and the existing test check goes red

#### Scenario: The shipped scaffold

- **WHEN** `npm test` runs on the scaffold as shipped
- **THEN** every gate passes, and none is skipped or allowed to fail

#### Scenario: A lint warning

- **WHEN** a commit adds code the linter warns about but does not call an error
- **THEN** `npm test` exits non-zero

#### Scenario: A copied part is added

- **WHEN** a commit copies a ready-made part into the parts folder and a screen uses it with an uncovered line of the screen's own
- **THEN** `npm test` exits non-zero for the screen's line, and reports nothing for the copied part's own untested lines

#### Scenario: A type error in a test file

- **WHEN** a commit adds a test for the Worker that passes a value of the wrong type and still passes when run
- **THEN** `npm test` exits non-zero and names that test file

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/ci-tests/spec.md utf8 952 -->
# Spec Delta

## ADDED Requirements

### Requirement: A check that stopped checking turns the test check red

When a change touches a check's settings or the version of a tool behind one, the test check SHALL give each of the app's quality gates a known-bad sample, read through the app's own settings, and SHALL fail when a gate lets its sample pass, naming that gate. A change that touches neither SHALL skip this proof and say so, and a change with no base to compare SHALL run it.

#### Scenario: A settings file the tool no longer reads

- **WHEN** a change edits the duplicated-code gate's settings so the tool ignores them, and the app's own code still passes
- **THEN** the test check fails and names the duplicated-code gate as passing a bad sample

#### Scenario: A change to a screen

- **WHEN** a change edits one screen and no check's settings or tool version
- **THEN** the proof does not run, and the check's summary says it was skipped

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 942 -->
# Spec Delta

## ADDED Requirements

### Requirement: A mini app's code keeps to its own folder

A mini app's page and server side SHALL import only from the app's own folder, the shared parts and helpers, and installed packages; its server side SHALL also reach the shared action contract. The app's checks SHALL fail when a mini app imports another mini app's files, a main page, or the Worker's core, and SHALL name the file. An app's test files SHALL be exempt, since a test opens the app inside the main app. The supplied apps SHALL pass as shipped.

#### Scenario: One app reaches into another

- **WHEN** a change adds a mini app whose page imports a file from another mini app's folder
- **THEN** the `test` check fails and names the importing file

#### Scenario: An app built from the shared parts

- **WHEN** a mini app imports its own files, the ready-made parts, and the shared helpers
- **THEN** the folder rule reports nothing

<!-- end specs/mini-apps/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 632 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Every guard is tested refusing

Each guard script, including the OpenSpec config check, SHALL have a test that asserts its refusal. The scripts' coverage floor SHALL have one too, run through its committed settings.

#### Scenario: A refusal is removed

- **WHEN** the CI wait's `FAILURE` branch is deleted
- **THEN** at least one payload test fails

#### Scenario: The floor's settings stop being read

- **WHEN** a change leaves the coverage settings file in a form the tool ignores
- **THEN** at least one payload test fails, because a half-tested sample passed the floor

<!-- end specs/payload-checks/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-06

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41690 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-06-tighter-checks</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-06-tighter-checks">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-tighter-checks</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">You don't read the code, so the automatic checks are what you trust. Three gaps let them pass when they should not. A check can switch itself off and stay green: the repeated-code check once passed everything because its settings file held a comment. Wrong-typed code passes the required check and is only caught later, while the preview builds. And nothing stops a small app from reaching into another app's files.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A check that has stopped checking turns red.</b> When a change touches a check's settings, or the version of a tool behind one, each check is fed a small piece of code that is wrong on purpose. A check that lets it through is named and the change can't be published. Other changes skip this, so they take no longer.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">settings change ─▶ bad sample ─▶ caught ─▶ ok</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">                       │ passed</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">                       ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">              red: names the check</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Wrong-typed code is caught before you see a preview.</b> Today that check runs only while the preview builds, after the required check has passed. It joins the required check, and it runs on your computer before work is saved. It also covers the server's test files, which nothing checks today; about 100 slips it finds there are fixed in this change.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">  BEFORE              AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">tests ─▶ build      tests +types ─▶ build</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">           │              │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">      found here     found here</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The assistant's own scripts keep the testing they have.</b> 92 of every 100 lines are tested, but the floor that stops this from falling sits at 85. The floor moves up to 92, so a slide shows at once. No tests are added.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A small app keeps to its own folder.</b> A small app may use its own files and the shared parts. One that reaches into another app, a main page, or the server's core fails the check, which names the file. No app breaks this today.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>After the update, your own app gets the same checks.</b> If one finds something in a screen your assistant built, the update's plan lists it and your assistant fixes it. Nothing needs doing by hand.</div></div></li>
</ol>
<p class="aside"><b>Non-goals.</b> No size or branching limits on the assistant's scripts, and no type check for them: the first was offered and not chosen, the second found nothing a past bug supports. The landing page's own checks stay as they are. Running the server's tests inside Cloudflare's runtime is a separate, larger look.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked which of four tighter checks to plan → chose three: checks that prove they can fail, the type check in the required check with a higher floor for the scripts, and the small-app folder rule. Size and branching limits on the scripts were left out.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether to type-check the server's test files too, once measuring showed about 100 reports in 12 test files → chose to include them.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the bad-sample run happens only when a change touches a check's settings or a tool's version, because a check should run only when its kind of file changed (<code>wiki/people/matthew-wong.md</code>), and this one can't fail otherwise.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the scripts' floor becomes 92 lines and 89 branches, because the last run on the main branch measured 92.88 and 90.02, and a branch floor of 90 would leave room for two branches while two other workspaces are in flight.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the folder rule skips test files, because a screen's test opens it inside the app's router and Home.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the new checks reach an install through the normal update, because the app's checks ship with the app; the update note says what the assistant does when one finds something.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: this is a <code>minor</code> release, because installs gain new checks and lose nothing.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what to do with the finished plan → chose build and publish.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Build: the type check runs while the test files are fixed (groups 1 and 2), because its report is the list of what to fix. Every other task's own check run moves to the one run in group 7, because the build writes all code and tests before running any; each promise those steps checked is still held by a test or by group 7.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Build: the look at the saved commit's checks (the proof ran, six gates caught, the build still passes) is read from the publish's one save, not from a save of its own, because one publish makes one checkpoint.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Build: measured on this branch, the server's test files held 105 type reports in 13 files, not 101 in 12. None showed a real slip in a test: each was a body read without a shape, a stand-in with no type, or a platform type wider than the test's own.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Build: the 30 casts through <code>unknown</code> those 13 files already held went too, through two small builders in <code>app/tests/env.ts</code>, because the task's search reads each changed file whole, not only its new lines.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Build: the proof runs each check's own step of the app's <code>test</code> script, not a fixed command, so a dropped step, or a dropped option such as <code>--coverage</code>, is caught as well.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Build: with a comment added to <code>app/.jscpd.json</code> by hand, <code>npx jscpd</code> printed <code>Found 105 clones.</code> and exited 0, while <code>npm run test:checks</code> printed `<code>repeated code: passed a bad sample (src/repeated-first.ts, worker/repeated-second.ts); </code>jscpd<code> exited 0</code>` and exited 1. The file was restored.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Build: this branch's scripts measure 92.96 lines and 90.06 branches of every 100 tested, so the floor is 92 and 89 as planned.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-06</p>Check: <code>app/package.json</code> adds the type check to the <code>test</code> script and a script that runs the bad-sample proof; stricter, nothing removed.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-06</p>Check: <code>app/tsconfig.json</code> and the new <code>app/tsconfig.tests.json</code> add the server's test files to the type check, which <code>app/tsconfig.worker.json</code> still leaves out of the build's own project.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-06</p>Check: <code>app/.oxlintrc.json</code> adds the folder rule for small apps; no rule is removed or relaxed.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-06</p>Check: <code>scripts/tests/.c8rc.json</code> raises the floor from 85 lines and 81 branches to 92 and 89.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-06</p>Check: <code>.github/scripts/checks.mjs</code>, <code>.github/scripts/loosened-checks.mjs</code> and the new <code>.github/scripts/check-settings.mjs</code> share one list of what counts as a check's settings and run the proof when one changes; the loosened-check rule itself is unchanged.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: the main branch moved from 35.2.0 to 36.3.0 while this was built and merged in with no clash; this is numbered 36.4.0. The look at the saved commit's checks follows this save.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: the first saved run failed on the new type check alone. A test that arrived from the main branch during the build, in <code>app/worker/employee-access/management.test.ts</code>, read a response body with no shape; it now names one. The proof ran in that run and all six checks caught their samples.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: the second saved run failed on the instruction pages' size limit alone, once the main branch's newer text was counted with this change's. The paragraph on the proof moved from the gate page to <code>wiki/stack/mini-apps.md</code>, and the gate page keeps one sentence that links it.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
