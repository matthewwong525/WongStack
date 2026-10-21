# Spec Delta

## ADDED Requirements

### Requirement: The deploy stage runs only the main line's scripts

The check runner's deploy stage SHALL take its deploy scripts and tools from a fresh copy of the main line, fetched in that stage. It SHALL run no file the commit or the checks stage left behind, and SHALL use what the checks built only as files to send. The project's own build SHALL run in the checks stage, which holds no credential, and SHALL select staging on any branch but the main line. A change to the deploy scripts SHALL take effect once it reaches the main line.

#### Scenario: The checks stage plants a line in a deploy script

- **WHEN** a package running in the checks stage edits `scripts/cf-deploy.sh` or adds an `.npmrc` in the workspace
- **THEN** the deploy stage runs the main line's copy, and the planted line never runs with the token

#### Scenario: A branch's scripts predate the keyless build

- **WHEN** the checks stage builds a branch whose `cf-build.sh` has no `--build-only`
- **THEN** its fallback build selects the staging environment, never production's config

#### Scenario: A branch aims its build at production

- **WHEN** a branch's build names the production Worker for its preview
- **THEN** the deploy stage stops before deploying and the run fails at `deploy` with that reason

## MODIFIED Requirements

### Requirement: A passing commit is built from complete packages

The checks stage SHALL install the project's packages itself and build the files a preview or the live site serves. It SHALL never fail a commit because files carried over from an earlier stage arrived incomplete. The deploy stage SHALL install its own tools fresh from the main line with install scripts off. No project package code SHALL run while the credential that deploys is held.

#### Scenario: Carried-over files are incomplete

- **WHEN** a commit passed its checks and the files carried to the deploy stage are missing a package
- **THEN** the deploy stage still installs its own tools and the preview is published

#### Scenario: A package runs a script while installing

- **WHEN** a package's install script reads its own environment, or any other process's, in any stage
- **THEN** no Cloudflare credential is in it
