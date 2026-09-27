## MODIFIED Requirements

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
