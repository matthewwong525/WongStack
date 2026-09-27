## ADDED Requirements

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

- **WHEN** a change to the review kit stops a saved note from appearing in the copied `/continue` block
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
