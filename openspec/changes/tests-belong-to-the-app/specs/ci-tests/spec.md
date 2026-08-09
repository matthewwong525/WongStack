## RENAMED Requirements

- FROM: `### Requirement: The payload ships a working default suite`
- TO: `### Requirement: The default suite ships with the app, not with the repo root`

## MODIFIED Requirements

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
