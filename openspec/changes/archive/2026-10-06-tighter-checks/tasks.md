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
