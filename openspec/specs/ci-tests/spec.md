# ci-tests Specification

## Purpose

Every repo runs its own test suite as a check on each commit, the change loop grows that suite, and WongStack's own tests pin what installed repos rely on. `npm test` is the whole contract, so any runner satisfies it.

## Requirements

### Requirement: Every repo gets a test check

Every repo, stack pack or not, SHALL get a test check that runs the `test` script at its root or in an immediate subdirectory, with any runner, and passes with a note when no `test` script exists.

#### Scenario: A repo without the stack pack

- **WHEN** WongStack is installed in a repo that declined the stack pack
- **THEN** the suite runs on the next push with no Cloudflare setup

### Requirement: One commit runs the suite once

A push SHALL produce one test run, and the pack's deploy workflow SHALL NOT run the suite again. A red suite SHALL block the merge, not the staging deploy.

#### Scenario: A red suite on a feature branch

- **WHEN** the test check fails on a feature branch in a pack repo
- **THEN** staging still deploys and `/ship` cannot merge until the check is green

### Requirement: A change that leaves the main app untouched skips its suite

When everything a branch changes against the default branch is under `wiki/`, `openspec/`, or `mini-apps/apps/`, or ends in `.md`, the check SHALL pass without running the main app's suite, and SHALL run only the changed mini apps' tests. The comparison SHALL cover the whole branch, and when it cannot be made, the suite SHALL run.

#### Scenario: A docs-only branch

- **WHEN** a branch changes only wiki pages and a `README.md`
- **THEN** the check passes with a note that the change is docs-only

#### Scenario: A docs commit on top of code

- **WHEN** a branch's last commit changes only a `.md` file but an earlier commit changed code
- **THEN** the suite runs

### Requirement: A behaviour change plans its tests

When a change touches behaviour a test can exercise, `/plan` SHALL add a task to add or extend test coverage and `/apply` SHALL write it. `/save` SHALL NOT author tests.

#### Scenario: A behavioural change

- **WHEN** `/plan` drafts a change that touches app behaviour
- **THEN** `tasks.md` holds a task to add or extend its test coverage

### Requirement: The default suite ships with the app, not the repo root

The payload SHALL NOT ship a root `package.json`, lockfile, or test runner; the default suite SHALL ship in the app scaffold. A repo's own root `package.json` SHALL never be replaced, and the core test workflow SHALL NOT install a browser.

#### Scenario: A repo with no JavaScript

- **WHEN** WongStack is installed in a repo with no `package.json`
- **THEN** no manifest, lockfile, or runner is written

### Requirement: Workflows are pinned, bounded, and kept current

Every action SHALL be pinned to a full commit SHA, every job SHALL have a timeout, and updates for actions and app dependencies SHALL arrive as Dependabot pull requests. A workflow or script install SHALL NOT wait on npm's audit service.

#### Scenario: An upstream tag moves

- **WHEN** an action's version tag is moved to a new commit
- **THEN** the workflows keep running the pinned commit until a Dependabot pull request updates it

### Requirement: A loosened check needs a recorded reason

The test check SHALL fail when a branch turns a check off, deletes a test without moving it, or changes a check's settings, unless a proposal the branch adds or changes, active or archived, names that file in a `Check:` Decision-log bullet. Every workflow file SHALL count as a check's settings. Its failure SHALL name each unexplained file and how to pass.

#### Scenario: A skip with no reason

- **WHEN** a branch adds a mutation-testing skip comment to a source file with no `Check:` bullet naming it
- **THEN** the check fails and names the file

#### Scenario: A recorded reason passes

- **WHEN** the Decision log adds a `Check:` bullet naming that file
- **THEN** the check passes and lists the file as explained

#### Scenario: A workflow other than the test workflow

- **WHEN** a branch removes a lint step from the payload workflow with no `Check:` bullet naming it
- **THEN** the check fails and names that workflow file

### Requirement: CI runs on branch pushes, never on tag pushes

The test, payload, and deploy workflows SHALL run on branch pushes and pull requests, and SHALL NOT run on a tag push.

#### Scenario: A release tag is pushed

- **WHEN** a version tag is pushed for a commit on `main`
- **THEN** no workflow runs and staging is unchanged

### Requirement: Contract tests pin what installed repos rely on

WongStack's CI SHALL fail, naming the surface it protects, when a commit changes any of these without updating its test: the README setup path, `/wong-setup` and its provisioning runbook's location, the `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_MEMORY_TOKEN` names in `.env.example`, the secrets the deploy workflow reads, or the deploy token's permissions.

#### Scenario: A pinned name is renamed

- **WHEN** a commit renames a pinned variable, secret, path, or permission
- **THEN** the contract test fails and names what depends on it

### Requirement: Deploy branch logic is tested without Cloudflare

The deploy script SHALL be tested with no network and no credential, proving the default branch deploys production, every other branch deploys only to staging, and a non-production branch that resolves to production is refused.

#### Scenario: A feature branch deploys

- **WHEN** the deploy script runs on a non-default branch
- **THEN** every deploy call targets staging and the preview URL is printed
