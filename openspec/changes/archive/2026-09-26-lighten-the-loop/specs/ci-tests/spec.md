## MODIFIED Requirements

### Requirement: A core workflow runs the test suite in every repo

The payload SHALL ship `.github/workflows/test.yml` in the **core** category, so a repo receives a test pipeline whether or not it took the stack pack. The workflow SHALL run the repo's `test` script, discovered root-first and then in each immediate subdirectory, so a repo whose application lives in a subdirectory is covered without configuration. When no `package.json` declares a `test` script, the job SHALL print why and exit green — a real check, never a permanently red one.

**A change that leaves the main app untouched runs no suite.** When every path that a feature branch changes compared with the default branch — or, on the default branch, every path the push changed — is under `wiki/`, `openspec/`, or `mini-apps/`, or ends in `.md`, the job SHALL say so and SHALL NOT install or run the main app's suite. When such a branch changes mini apps, the job SHALL run the tests of the changed mini apps only, as `mini-apps` defines; otherwise it SHALL exit green. The comparison SHALL cover the whole branch, never only the last commit. When the comparison can not be made, the job SHALL run the suite. One core script SHALL make this decision, and the pack's deploy workflow SHALL use the same script. The skip SHALL happen inside the job, so a required `test` check still reports.

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

- **WHEN** a direct save pushes a change under `mini-apps/apps/tips/` to the default branch
- **THEN** the `test` check on that push runs the tests in that folder

#### Scenario: A docs commit on top of code

- **WHEN** a branch's last commit changes only a `.md` file but an earlier commit on the branch changed code
- **THEN** the job runs the suite

#### Scenario: The comparison fails

- **WHEN** the job can not find the default branch to compare with
- **THEN** it runs the suite
