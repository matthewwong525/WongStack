# ci-tests

## Purpose

A core workflow runs the repository's own test suite as an ordinary check on every commit, in every
repo whether or not it took the stack pack, and the change loop grows that suite as a standing task
convention. `npm test` is the whole contract, so any runner satisfies it. Distinct from the
end-to-end evidence `/verify` produces: these tests accumulate, run on every push, and gate through CI,
while a walk is throwaway acceptance for one change and gates nothing.

## Requirements

### Requirement: A core workflow runs the test suite in every repo

The payload SHALL ship `.github/workflows/test.yml` in the **core** category, so a repo receives a test pipeline whether or not it took the stack pack. The workflow SHALL run the repo's `test` script, discovered root-first and then in each immediate subdirectory, so a repo whose application lives in a subdirectory is covered without configuration. When no `package.json` declares a `test` script, the job SHALL print why and exit green — a real check, never a permanently red one.

**A change that leaves the main app untouched runs no suite.** When every path that a feature branch changes compared with the default branch — or, on the default branch, every path the push changed — is under `wiki/`, `openspec/`, or `mini-apps/apps/`, or ends in `.md`, the job SHALL say so and SHALL NOT install or run the main app's suite. A change to a shared file under `mini-apps/` outside `mini-apps/apps/` touches the main app, because the main app's Worker imports it. When such a branch changes mini apps, the job SHALL run the tests of the changed mini apps only, as `mini-apps` defines; otherwise it SHALL exit green. The comparison SHALL cover the whole branch, never only the last commit. When the comparison can not be made, the job SHALL run the suite. One core script SHALL make this decision, and the pack's deploy workflow SHALL use the same script. The deploy workflow SHALL still build and deploy the main app when the change touches `mini-apps/apps/`, because the main app's Worker serves the mini apps. The skip SHALL happen inside the job, so a required `test` check still reports.

The workflow SHALL carry the same event condition the deploy workflow uses to collapse the `push`/`pull_request` double-fire, so one commit produces one test run.

`npm test` SHALL be the entire contract: any runner behind that script satisfies the job. Vitest SHALL be what the payload ships and configures by default, and SHALL NOT be required.

The pack's `deploy.yml` SHALL NOT contain a `test` job, so a pack repo runs its suite once rather than twice. The `deploy` job SHALL remain independent of the test result: a staging deploy of red code is harmless (staging is a fixture and the walk observes it), and red code cannot reach production because merges require green CI.

#### Scenario: A repo with no stack pack gets a test pipeline

- **WHEN** WongStack is synced into a repo whose `components.stackPack` is absent or false
- **THEN** `.github/workflows/test.yml` is among the files it receives
- **AND** the suite runs on the next push with no Cloudflare configuration present

#### Scenario: A pack repo runs its suite once

- **WHEN** a commit is pushed to a repo that has both workflows
- **THEN** exactly one job runs the test suite
- **AND** the deploy finishes no later than it would without it

#### Scenario: No test script is honest green

- **WHEN** a commit is pushed to a repo where no `package.json` declares a `test` script
- **THEN** the job states that no suite exists and exits green
- **AND** the check is not reported as a failure

#### Scenario: A different runner satisfies the job

- **WHEN** a repo's `test` script invokes a runner other than vitest
- **THEN** the job runs it unchanged
- **AND** nothing in the workflow assumes vitest

#### Scenario: A red suite holds the save, not the deploy

- **WHEN** the test job fails on a feature-branch push in a pack repo
- **THEN** the staging deploy still completes
- **AND** `/save`'s existing CI wait reports the failure and enters its auto-fix path, and `/ship` cannot merge until the check is green

#### Scenario: A docs-only branch

- **WHEN** a branch changes only `wiki/` pages and a `README.md`
- **THEN** the `test` check reports green with a note that the change is docs-only
- **AND** the suite is not installed or run

#### Scenario: A mini-app branch

- **WHEN** a branch changes only files under `mini-apps/apps/tips/`
- **THEN** the `test` check runs the tests in that folder and not the main app's suite

#### Scenario: A mini-app push to the default branch

- **WHEN** a merge brings a change under `mini-apps/apps/tips/` to the default branch
- **THEN** the `test` check on that push runs the tests in that folder

#### Scenario: A docs commit on top of code

- **WHEN** a branch's last commit changes only a `.md` file but an earlier commit on the branch changed code
- **THEN** the job runs the suite

#### Scenario: The comparison fails

- **WHEN** the job can not find the default branch to compare with
- **THEN** it runs the suite

#### Scenario: A shared mini-app file

- **WHEN** a branch changes only a file under `mini-apps/` that is outside `mini-apps/apps/`
- **THEN** the job runs the main app's suite

### Requirement: Test coverage grows in the loop, not at the checkpoint

`/plan` SHALL include a standing task in `tasks.md` — add or extend test coverage for the changed behavior — whenever the proposed change touches behavior (code a test can exercise), and SHALL omit it for prose-only changes. `/apply` SHALL implement that task while implementing the change. `/save` SHALL NOT author tests: it remains a pure checkpoint, and its only relationship to the suite is the existing CI wait and auto-fix.

#### Scenario: A behavioral change plans its tests

- **WHEN** `/plan` drafts a change whose diff will touch app behavior
- **THEN** `tasks.md` contains a task to add or extend test coverage for that behavior

#### Scenario: A prose change plans no tests

- **WHEN** `/plan` drafts a change that only touches wiki, notes, or skill prose
- **THEN** no test task is added

#### Scenario: Save never writes tests

- **WHEN** `/save` checkpoints a session whose change lacks tests
- **THEN** it commits, pushes, and gates as usual without authoring test files
- **AND** any red `test` check is handled by the existing auto-fix path, not by writing new coverage at checkpoint time

### Requirement: The default suite ships with the app, not with the repo root

The payload SHALL NOT ship a repository-root `package.json`. A repo that has no npm toolchain SHALL receive no package manifest, no lockfile, and no test runner on WongStack's behalf. This follows the same rule that governs the walkthrough's browser: a dependency entry presumes a manifest, and presuming a manifest forces a language toolchain into repos that never chose one.

The default suite SHALL instead ship **with the app scaffold**, in the app's own `package.json` — the one category where a manifest is already expected and already shipped. A repo that takes the scaffold SHALL receive a test runner and a starting suite for the code it just inherited; a repo that declines the scaffold SHALL receive neither.

The test pipeline SHALL remain able to find that suite without any root manifest, through the subdirectory discovery the workflow already performs. A repo whose application lives in a subdirectory SHALL be covered with no configuration and no file at its root.

WongStack SHALL use the suite on **its own application** — the Worker code the scaffold ships, whose identity module is the file an adopter is most likely to reimplement incorrectly. WongStack's toolkit scripts and skill files SHALL be tested by the meta-only payload checks, never by the shipped suite, so a target neither runs nor pays for tests of files it does not edit. The core test workflow SHALL NOT install a browser.

#### Scenario: A repo with no npm toolchain receives no manifest

- **WHEN** WongStack is installed or synced into a repo that has no `package.json` and no JavaScript
- **THEN** no root `package.json`, lockfile, or test runner is written to it
- **AND** the test workflow reports that no test script exists and exits green

#### Scenario: A repo with its own manifest keeps it

- **WHEN** WongStack is synced into a repo that already has a root `package.json`
- **THEN** that file is not modified or replaced
- **AND** the workflow runs whatever `test` script it declares

#### Scenario: The suite is found in a subdirectory

- **WHEN** a repo's application and its `test` script live in a subdirectory, with no root manifest
- **THEN** the workflow's discovery finds that suite and runs it
- **AND** nothing is added at the repo root to make it discoverable

#### Scenario: WongStack tests its own application

- **WHEN** WongStack's own CI runs
- **THEN** the suite exercises the Worker code the scaffold ships, including the Access identity module's rejection paths
- **AND** a regression in it fails the check

#### Scenario: A target's test run installs no browser

- **WHEN** the core test workflow runs the app suite in any repo
- **THEN** no step installs a browser or its system packages

### Requirement: Workflows are pinned, bounded, and kept current

Every workflow step that uses an action SHALL pin it to a full commit SHA with the version in a comment. Every job SHALL set `timeout-minutes`. Workflows SHALL read the Node version from `.nvmrc`. A Dependabot configuration SHALL propose updates for the app's npm dependencies and for GitHub Actions.

Every `npm ci` that a WongStack workflow or script runs SHALL pass `--no-audit` and `--no-fund`, so an install never waits on npm's audit service. An install a person runs by hand SHALL keep npm's defaults.

#### Scenario: A tag is moved upstream

- **WHEN** an action's `v4` tag is moved to a new commit
- **THEN** the workflows keep running the pinned commit until a Dependabot PR updates it

#### Scenario: A step hangs

- **WHEN** a browser install hangs in CI
- **THEN** the job stops at its timeout instead of running for six hours

#### Scenario: npm's audit service is slow

- **WHEN** the test workflow, the deploy workflow, or the local preview script installs the app while npm's audit service is slow or down
- **THEN** the install sends no audit request and finishes in its usual time

#### Scenario: No workflow install audits

- **WHEN** WongStack's payload checks scan `.github/workflows/` and `scripts/`
- **THEN** every `npm ci` line carries `--no-audit` and `--no-fund`

### Requirement: The test workflow keeps mutation results between runs

When the discovered suite has a Stryker config, `.github/workflows/test.yml` SHALL restore Stryker's incremental result file before it runs `npm test`, and SHALL save the file after it, also when `npm test` fails. A run SHALL restore the newest file saved on its own branch, else the newest file saved on the default branch.

The cache key SHALL hold a hash of the suite's lockfile, Stryker config, and Vitest config. A run whose hash matches no saved file SHALL start with no file, so a dependency or test-config change tests every mutant.

A suite with no Stryker config SHALL run as before: no restore step, no save step, and no new failure mode. The steps SHALL NOT change `npm test` or the check name, and a cache miss or a cache service error SHALL NOT fail the job.

#### Scenario: A later push on a branch reuses its own results

- **WHEN** a branch pushes a second commit that changes one source file, and its first run saved a result file
- **THEN** the second run restores that file before `npm test`
- **AND** Stryker reports reused mutants and tests only the rest

#### Scenario: A new branch starts from the default branch

- **WHEN** the first run on a new branch finds no file saved on that branch, and the default branch has one with the same key hash
- **THEN** the run restores the default branch's newest file

#### Scenario: A dependency change tests every mutant

- **WHEN** a push changes the suite's lockfile, Stryker config, or Vitest config
- **THEN** the run restores no file and Stryker tests every mutant
- **AND** the run saves a new file under the new hash

#### Scenario: A failed run still saves its results

- **WHEN** `npm test` fails after Stryker wrote the result file
- **THEN** the workflow saves the file
- **AND** the check stays red

#### Scenario: A repo without Stryker is unchanged

- **WHEN** the discovered suite has no Stryker config
- **THEN** the workflow runs no cache step, and the job runs `npm test` as before

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

### Requirement: CI runs on branch pushes, never on tag pushes

The core test workflow, the payload workflow, and the pack's deploy workflow SHALL run on pushes to branches and on pull requests, and SHALL NOT run on a tag push. A tag names a commit a branch push already tested and deployed; running again on the tag would deploy that commit to staging under the tag's name.

#### Scenario: A release tag is pushed

- **WHEN** a `v25.8.1` tag is pushed for a commit on `main`
- **THEN** no test, payload, or deploy workflow run starts for the tag, and staging keeps the branch it was serving

#### Scenario: A branch is pushed

- **WHEN** a commit is pushed to any branch
- **THEN** the test, payload, and deploy workflows run as before
