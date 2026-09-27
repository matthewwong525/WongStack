# payload-checks Specification

## Purpose
The meta-only workflow that checks WongStack's own payload on every commit: the OpenSpec CLI contract, review assembly, migration fixtures, payload links, and OpenSpec config. It stays outside the payload manifest.

## Requirements

### Requirement: Payload checks run once per commit

The meta-repo SHALL run its payload checks in a workflow outside the payload manifest, so no target receives it. The workflow SHALL carry the same event condition and event-keyed concurrency group the test workflow uses, so one commit produces one run: the `push` event runs the job, a same-repo `pull_request` event skips it, and a fork `pull_request` event runs it. A run for one event SHALL NOT cancel a run for the other.

#### Scenario: A same-repo pull-request commit runs the checks once

- **WHEN** a commit is pushed to a branch of this repo that has an open pull request
- **THEN** the `push` run executes the checks
- **AND** the `pull_request` run is skipped, not cancelled and not failed

#### Scenario: A fork pull request still runs the checks

- **WHEN** a pull request from a fork updates
- **THEN** the `pull_request` run executes the checks

#### Scenario: A target receives no payload workflow

- **WHEN** `/wong-sync` or `/wong-setup` installs the payload into a target
- **THEN** the payload checks workflow is not among the files it receives

### Requirement: The link check rejects links through a symlink

The payload link check SHALL fail when a live Markdown link's path passes through a symbolic link in the git tree. The failure SHALL name the file, the link, and the real path to use. Code spans and shell commands SHALL NOT be checked by this rule.

#### Scenario: A wiki page links through `.claude/`

- **WHEN** a wiki page links `../.claude/skills/save/SKILL.md`
- **THEN** the link check fails and names `.agents/skills/save/SKILL.md` as the path to use

#### Scenario: A command names `.claude/`

- **WHEN** a skill's shell command runs `.claude/skills/memory/scripts/memory.mjs`
- **THEN** the link check does not report it

### Requirement: The retired-names check fails on a removed name

The payload checks SHALL include a retired-names check. A list kept beside the check SHALL name each removed or renamed thing, its replacement, and the files allowed to keep naming it. The check SHALL fail when any tracked file names a listed thing outside its allowed files, and each failure SHALL name the file, the line, the retired name, and its replacement. `CHANGELOG.md` and `openspec/changes/**` SHALL be exempt, because they record history. The check and its list SHALL be meta-repo only and SHALL NOT be in the payload manifest. Removing or renaming a payload feature SHALL add its old name to the list in the same change.

#### Scenario: A live file names a removed thing

- **WHEN** a skill page mentions a command the list retires
- **THEN** the check fails, naming the file, the line, the retired command, and its replacement

#### Scenario: An allowed file keeps its mention

- **WHEN** a spec listed as allowed for a retired name states that the removed command must stay gone
- **THEN** the check passes for that file

#### Scenario: History is exempt

- **WHEN** `CHANGELOG.md` or an archived change names a retired thing
- **THEN** the check passes

#### Scenario: A target receives no retired-names check

- **WHEN** `/wong-sync` or `/wong-setup` installs the payload into a target
- **THEN** neither the check nor its list is among the files it receives

### Requirement: The payload checks own WongStack's test dependencies

The payload checks SHALL install their test dependencies from a meta-only manifest that the core test workflow does not discover and no target receives. They SHALL NOT install the app scaffold's dependencies to run WongStack's own tests.

A test that needs a dependency SHALL fail, not skip, when the dependency is missing and the run is in CI. Outside CI it MAY skip and SHALL say why.

#### Scenario: A missing page-test dependency in CI

- **WHEN** the payload checks run in CI and the DOM library cannot be loaded
- **THEN** the page tests fail and name the missing dependency
- **AND** the check is red, not green with skipped tests

#### Scenario: A target receives no WongStack test manifest

- **WHEN** `/wong-sync` or `/wong-setup` installs the payload into a target
- **THEN** the meta-only test manifest and its lockfile are not among the files it receives

### Requirement: The review page is tested in a real browser by the payload checks

The payload checks SHALL drive the plan review page in a real browser engine: taps and drags, the note editor, copied notes, drafts across a reload, refused storage, notes whose text moved, drawing zoom and fit, touch input, and layout at phone and desktop widths. The browser SHALL be one already on the CI runner when available; a download SHALL happen only in the meta-only workflow.

#### Scenario: A review-page regression fails the payload checks

- **WHEN** a change to the review kit stops a saved note from appearing in the copied request to update the plan
- **THEN** the payload checks fail

#### Scenario: The review page test is not shipped

- **WHEN** a repo takes the app scaffold
- **THEN** it receives no review-page browser test

### Requirement: WongStack's scripts have a quality bar

The payload checks SHALL hold WongStack's own scripts to deterministic gates:

- **Coverage**: line and branch coverage of the JavaScript scripts under `scripts/` and `.agents/skills/*/scripts/`, including code run in child processes the tests spawn, SHALL be measured on every run, and the run SHALL fail when either falls below a committed floor. The floor SHALL only rise.
- **Lint**: the same JavaScript SHALL pass the linter the app scaffold uses.
- **Shell**: every shell script under `scripts/`, `.github/scripts/`, and `.agents/skills/*/scripts/` SHALL pass a static shell checker at warning severity.

#### Scenario: Coverage drops below the floor

- **WHEN** a change adds an untested branch that takes script coverage below the committed floor
- **THEN** the payload checks fail and name the measured and required figures

#### Scenario: A shell mistake is caught

- **WHEN** a shell script uses an unquoted variable in a command that removes files
- **THEN** the payload checks fail and name the script and line

### Requirement: Every guard script is tested refusing

Each script whose job is to stop unsafe or unfinished work SHALL have a test that drives its refusal path and asserts the refusal, not only its success path. This covers at least:

- the CI wait reporting `FAILURE` for a failed or cancelled check and `TIMEOUT` when checks never finish;
- the merge refusing to run on the default branch;
- the walkthrough cleanup refusing a path it did not create;
- the deploy stopping before any alias or URL is published when the deploy command fails;
- the secrets push refusing a `.dev.vars` that links to `.env` and a `--file` that names `.env`;
- the OpenSpec config check failing when the CLI cannot parse the config.

#### Scenario: Removing a refusal fails the suite

- **WHEN** the branch of the CI wait that reports `FAILURE` is deleted
- **THEN** at least one payload test fails

#### Scenario: A failed deploy publishes nothing

- **WHEN** the deploy command exits non-zero on a feature branch
- **THEN** the deploy script exits non-zero
- **AND** no alias upload and no preview URL are produced

### Requirement: WongStack's tests leave nothing behind and reach nothing live

Each payload test SHALL remove every temporary directory it creates, on success and on failure. No payload test SHALL reach a live service: a test that runs real scripts SHALL run them where the deploy and database tools resolve to stand-ins or to nothing. A payload test SHALL NOT depend on wall-clock budgets or on how the host routes an unreachable address.

#### Scenario: The memory tests clean up

- **WHEN** the memory test files run to completion
- **THEN** no directory they created remains in the system temp directory

#### Scenario: A broken argument parser reaches nothing live

- **WHEN** a script's argument parsing breaks so that `--help` falls through to its main path during the CLI convention test
- **THEN** no command reaches Cloudflare or any other live service

### Requirement: Payload checks skip script tests on a docs-only change

When every path a branch changes compared with the default branch — or, on the default branch, every path the push changed — is under `wiki/` or `openspec/`, the payload checks SHALL skip the lint, the shell check, and the script test suite with its coverage floor, and SHALL say so in the job summary. They SHALL still run the private-names test, the payload link check, the OpenSpec config and retired-names checks, strict spec validation, and the context measurement check. A change to Markdown anywhere else, including skill text under `.agents/`, SHALL run every check. When the comparison can not be made, every check SHALL run. The skip SHALL happen inside the job, so the required `payload` check still reports.

#### Scenario: A wiki-only branch

- **WHEN** a branch changes only `wiki/development/memory.md`
- **THEN** the payload job skips lint, shell checks, and the script suite
- **AND** it runs the private-names test and the release checks, and passes when they pass

#### Scenario: Skill text changes

- **WHEN** a branch changes only `.agents/skills/save/SKILL.md`
- **THEN** the payload job runs every check

#### Scenario: A new branch with no base

- **WHEN** the comparison with the default branch can not be made
- **THEN** the payload job runs every check
