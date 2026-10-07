# Spec Delta

## ADDED Requirements

### Requirement: A new install's first save and publish succeed

A newly set up Artifacts install SHALL pass its own checks, return a preview for its first save, and go live on its first publish, with no edit made by hand to any file setup put there.

#### Scenario: The first save

- **WHEN** a person saves a freshly set up Artifacts install without changing it
- **THEN** its checks pass and the save returns a private preview

#### Scenario: A project kept in Cloudflare is built

- **WHEN** the preview of an install whose project is kept in Cloudflare is built
- **THEN** the build succeeds with the connection to the project's repository in place

### Requirement: A passing commit is built from complete packages

The step that builds a preview or the live site SHALL install the project's packages itself, and SHALL never fail a commit because files carried over from the checks arrived incomplete. The credential that deploys SHALL not be readable while the packages install.

#### Scenario: Carried-over files are incomplete

- **WHEN** a commit passed its checks and the files carried to the build step are missing a package
- **THEN** the build still succeeds and the preview is published

#### Scenario: A package runs a script while installing

- **WHEN** a package's install script reads its environment in the build step
- **THEN** no Cloudflare credential is in it

### Requirement: An interrupted check run is not a failed commit

A check run that Cloudflare interrupts SHALL be tried again without the person asking. A run that still does not finish SHALL be reported as interrupted, never as the commit failing its checks, and the person's assistant SHALL be able to start that same run again.

#### Scenario: The first run of a new project is interrupted

- **WHEN** the check run of a new install's first commit is interrupted and its retries are used up
- **THEN** the result reads as interrupted, a publish says the run was cut off and can be started again, and starting it again produces a result for that same commit

#### Scenario: A run that failed its checks is started again

- **WHEN** a restart is asked for a run whose commit failed a check
- **THEN** it is refused and the failure stands
