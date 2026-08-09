## RENAMED Requirements

- FROM: `### Requirement: The pack's CI runs the test suite in a parallel job`
- TO: `### Requirement: A core workflow runs the test suite in every repo`

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: The payload ships a working default suite

The payload SHALL ship a root `package.json` declaring `vitest` as a devDependency with a `test` script, copied only when the repo has no root `package.json` of its own. A repo that already has one SHALL be left untouched, and its existing `test` script SHALL be what the workflow runs. It SHALL NOT declare a browser library: the walkthrough's browser tool is installed at the machine level and is not a repository dependency.

WongStack SHALL use this suite on itself: the executable code it ships — the payload link checker's dead-versus-conditional classification, the wrangler-config helper's layout handling, and the walkthrough scripts' phase contract (verdict lines, refusal to remove a directory it did not create) — SHALL have real tests that run in its own CI. Where a shipped script is shell rather than JavaScript, the suite SHALL exercise it by invoking it, so coverage follows what is shipped rather than what is convenient to import. A toolkit that ships scripts and tests none of them cannot ask adopting repos to test theirs.

#### Scenario: A repo with no root manifest gets one

- **WHEN** WongStack is synced into a repo with no root `package.json`
- **THEN** the payload's root `package.json` is copied in, and `npm test` runs the shipped suite

#### Scenario: A repo with its own manifest keeps it

- **WHEN** WongStack is synced into a repo that already has a root `package.json`
- **THEN** that file is not modified or replaced
- **AND** the workflow runs whatever `test` script it declares

#### Scenario: WongStack tests its own shipped scripts

- **WHEN** WongStack's own CI runs
- **THEN** the suite exercises the link checker's classification, the wrangler-config helper, and the walkthrough scripts' phase contract
- **AND** a regression in any of them fails the check
