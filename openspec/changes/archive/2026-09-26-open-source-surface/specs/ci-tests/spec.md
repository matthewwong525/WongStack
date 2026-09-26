## ADDED Requirements

### Requirement: Workflows are pinned, bounded, and kept current

Every workflow step that uses an action SHALL pin it to a full commit SHA with the version in a comment. Every job SHALL set `timeout-minutes`. Workflows SHALL read the Node version from `.nvmrc`. A Dependabot configuration SHALL propose updates for the app's npm dependencies and for GitHub Actions.

#### Scenario: A tag is moved upstream

- **WHEN** an action's `v4` tag is moved to a new commit
- **THEN** the workflows keep running the pinned commit until a Dependabot PR updates it

#### Scenario: A step hangs

- **WHEN** a browser install hangs in CI
- **THEN** the job stops at its timeout instead of running for six hours
