## ADDED Requirements

### Requirement: The Test check fails on a loosened check with no recorded reason

The core test workflow SHALL run a loosened-checks step on every run that is not cancelled: also when the main app is untouched, and after a failing suite, so one push reports every problem. The step SHALL compare the branch with the same base the untouched check uses, and SHALL flag each of these:

- an added line that turns a check off: a mutation, coverage, lint, type-check, or duplicate-code skip comment, or a skipped, focused, or to-do test;
- a deleted test file that was not moved to another test file;
- any change to a check's settings: a test runner, coverage, mutation, lint, type-check, duplicate-code, or unused-code config file, a `package.json` `test` script or a script it runs, the test workflow, or a script under `.github/scripts/`.

A flagged file SHALL count as explained when a `proposal.md` that the branch adds or changes, under `openspec/changes/` or its archive, names that file's path in a Decision-log bullet whose text after the date starts with `Check:`. The step SHALL list every flagged file in the job summary, marked explained or not, and SHALL fail when any is unexplained. Its failure message SHALL name each unexplained file and say how to pass: switch the check back on, or add a `Check:` bullet naming the file with a plain reason. When the untouched check found no base, the step SHALL say so and pass. The step SHALL skip its own script.

#### Scenario: A skip comment with no reason

- **WHEN** a branch adds a line holding a mutation-testing skip comment to `app/worker/access.ts`, and no changed proposal names that file in a `Check:` bullet
- **THEN** the `test` check fails
- **AND** the failure names `app/worker/access.ts` and says how to pass

#### Scenario: A recorded reason passes

- **WHEN** the same branch's change adds `**2026-09-27** — Check: \`app/worker/access.ts\` skips one mutant, because it changes nothing a caller can see.` to its Decision log
- **THEN** the step passes and lists the file as explained

#### Scenario: A lowered limit

- **WHEN** a branch changes a coverage threshold in `app/vitest.config.ts` from 100 to 90 with no `Check:` bullet
- **THEN** the `test` check fails and names `app/vitest.config.ts`

#### Scenario: A deleted test

- **WHEN** a branch deletes `app/src/App.test.tsx` and adds no test file in its place
- **THEN** the step flags `app/src/App.test.tsx`

#### Scenario: A moved test is not flagged

- **WHEN** a branch renames a test file to another test file name
- **THEN** the step does not flag it

#### Scenario: A skipped test in a mini app

- **WHEN** a docs-and-mini-app branch adds `test.skip(` to `mini-apps/apps/tips/api.test.mjs` with no `Check:` bullet
- **THEN** the `test` check fails, although the main app's suite does not run

#### Scenario: The reason survives the archive

- **WHEN** `/ship` archives the change before the last CI run, so the `Check:` bullet sits in `openspec/changes/archive/<date>-<name>/proposal.md`
- **THEN** the step still finds the reason and passes

#### Scenario: Nothing to compare with

- **WHEN** the untouched check reports no base
- **THEN** the step says it could not compare and passes
