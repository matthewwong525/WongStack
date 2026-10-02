## MODIFIED Requirements

### Requirement: The agent declares its contract and commit

The agent SHALL export its contract version as `CONTRACT`, an integer, now 3. Every poll SHALL send `{ contract, commit, paseo }`: that version, the source commit the host recorded for the build, and whether Paseo is up. It SHALL NOT send a features list. A change to any message's shape SHALL raise `CONTRACT`.

#### Scenario: A poll names the contract and commit

- **WHEN** the agent polls on a server built at commit `abc…` (40 hex)
- **THEN** the request body is `{ contract: 3, commit: "abc…", paseo: "up" | "down" }` and nothing else


### Requirement: The agent keeps secrets and verification boundaries

The agent SHALL keep today's boundaries: it only calls out, runs a command only through its fixed job switch, rejects an unknown job type, runs the installer or Artifacts preparation as the workspace user with no `AGENT_TOKEN` in its environment, reports only an installer's reason word and a line matching `CLOUDFLARE_CALL`, and sends the private access result only from its exact job-derived file after checking its owner, mode, size, and recipient.

#### Scenario: An unknown job

- **WHEN** a poll reply holds a job of a type the contract does not list
- **THEN** the agent reports it `rejected` and runs nothing

#### Scenario: The installer's environment

- **WHEN** the agent runs the installer for a `cloudflare` job
- **THEN** the installer runs as the workspace user and its environment holds no `AGENT_TOKEN`

## ADDED Requirements

### Requirement: Contract 3 prepares a hosted repository before setup

A contract-3 agent SHALL accept a project-scoped Artifacts preparation job pinned to a reviewed source commit. It SHALL prepare the coding agents and repository and register the actual folder in Paseo without installing the payload or provisioning the site. The result SHALL identify the verified project and source commit without exposing credentials. It SHALL preserve existing local work and refuse mismatched project, source or destination identity.

#### Scenario: Empty prepared workspace

- **WHEN** a contract-3 agent receives a valid scoped Artifacts preparation job
- **THEN** the workspace opens the prepared repository with `/wong-setup` available and no payload installation yet

#### Scenario: Existing GitHub clone

- **WHEN** an owner or teammate's workspace already contains the project's legacy GitHub clone
- **THEN** preparation verifies the migrated history before changing that clone's origin, keeps its local work and GitHub backup, and registers that actual folder
