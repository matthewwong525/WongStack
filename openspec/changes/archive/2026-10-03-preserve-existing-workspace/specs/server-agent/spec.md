# Server agent delta

## MODIFIED Requirements

### Requirement: The agent declares its contract and commit

The agent SHALL export its contract version as `CONTRACT`, an integer, now 4. Every poll SHALL send `{ contract, commit, paseo }`: that version, the source commit the host recorded for the build, and whether Paseo is up. It SHALL NOT send a features list. A change to any message's shape SHALL raise `CONTRACT`. Contract 4 SHALL identify the preservation/project-preparation contract and SHALL NOT imply implementation of separately negotiated Artifacts capabilities.

#### Scenario: A poll names the contract and commit

- **WHEN** the agent polls on a server built at commit `abc…` (40 hex)
- **THEN** the request body is `{ contract: 4, commit: "abc…", paseo: "up" | "down" }` and nothing else

## ADDED Requirements

### Requirement: The agent prepares projects with configured workspace identity

The source agent SHALL support a configured workspace user/home with the legacy `wong` defaults. Its preservation-aware GitHub job SHALL preserve unrelated logins, global git settings and matching local work. A fixed project-preparation job SHALL deliver a bounded, generation-bound clone/dependency/configuration/Paseo report over the authenticated host channel, without private configuration values, command output or AI credential reads. User/home selection SHALL apply to command execution, Paseo, checkout paths and private-result ownership verification together.

#### Scenario: A non-default workspace identity

- **WHEN** an authorized host configures an existing workspace account and requests project preparation
- **THEN** commands, repo registration and checked result paths all use that account's validated home, and no setup is written into a different user's home

#### Scenario: A project cannot be made ready

- **WHEN** the supported preparation job cannot finish dependencies, configuration or Paseo setup
- **THEN** its bounded report marks the incomplete step without publishing private output or pretending clone success means project readiness
