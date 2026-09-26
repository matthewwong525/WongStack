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

WongStack SHALL use the suite on **its own application** — the Worker code the scaffold ships, whose identity module is the file an adopter is most likely to reimplement incorrectly. It SHALL NOT be required to test its own toolkit scripts; whether those deserve a suite of their own is a separate question this capability does not answer.

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

### Requirement: Workflows are pinned, bounded, and kept current

Every workflow step that uses an action SHALL pin it to a full commit SHA with the version in a comment. Every job SHALL set `timeout-minutes`. Workflows SHALL read the Node version from `.nvmrc`. A Dependabot configuration SHALL propose updates for the app's npm dependencies and for GitHub Actions.

#### Scenario: A tag is moved upstream

- **WHEN** an action's `v4` tag is moved to a new commit
- **THEN** the workflows keep running the pinned commit until a Dependabot PR updates it

#### Scenario: A step hangs

- **WHEN** a browser install hangs in CI
- **THEN** the job stops at its timeout instead of running for six hours

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
