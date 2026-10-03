# server-agent Specification

## Purpose

The WongStack source ships the host agent a server runs to take its control plane's jobs, so a fork owns its servers' agent the way it owns `server/setup.sh`, under a numbered contract the control plane can check.

## Requirements

### Requirement: The source ships the server agent

The source SHALL ship the host agent under `server/agent/`, with its entry at `server/agent/agent.mjs`, run as root by the host from an unpacked copy of the source. It SHALL reuse the installer's shared helpers from the same source rather than a copy of them. The source's tests SHALL cover it. It SHALL stay out of the payload, so installed repos and `/wong-sync` never receive it.

#### Scenario: The agent runs from the source it came with

- **WHEN** a host unpacks the source at a commit and starts `server/agent/agent.mjs`
- **THEN** the agent runs with no file beyond that copy of the source and the host's `/etc/wongstack/agent.env`

#### Scenario: An installed repo never gets the agent

- **WHEN** WongStack is installed into a repo or synced
- **THEN** no file under `server/agent/` is copied

### Requirement: The agent declares its contract and commit

The agent SHALL export its contract version as `CONTRACT`, an integer, now 4. Every poll SHALL send `{ contract, commit, paseo }`: that version, the source commit the host recorded for the build, and whether Paseo is up. It SHALL NOT send a features list. A change to any message's shape SHALL raise `CONTRACT`. Contract 4 SHALL retain preservation/project preparation; Artifacts support SHALL require this reviewed source rather than be inferred from the number alone.

#### Scenario: A poll names the contract and commit

- **WHEN** the agent polls on a server built at commit `abc…` (40 hex)
- **THEN** the request body is `{ contract: 4, commit: "abc…", paseo: "up" | "down" }` and nothing else

### Requirement: The contract is written down

`server/README.md` SHALL document the current contract as a host and a fork rely on it: the agent's environment, the poll request and reply, each job type with its payload and result, the job-result delivery, the private access-result delivery with both its restricted and its open shape, the host's setup report, and that the agent never changes itself. It SHALL say what changed from the contract before it. A fork that changes the agent SHALL keep to it or raise `CONTRACT`.

#### Scenario: The README and the agent agree

- **WHEN** the agent handles a job type that `server/README.md`'s contract does not list, or the README lists one the agent does not handle
- **THEN** the source's tests fail and name the job type

#### Scenario: The README names the declared contract

- **WHEN** `CONTRACT` differs from the number of the contract section in `server/README.md`
- **THEN** the source's tests fail

### Requirement: A running agent never changes itself

The agent SHALL run the source it was built from for the server's life. It SHALL NOT fetch, replace, or restart itself onto other code, and SHALL NOT act on a job that names code for it to run as itself. A rebuild SHALL be the only way a server gets a newer agent.

#### Scenario: The source's branch moves

- **WHEN** the source's default branch gains a commit after a server was built
- **THEN** the server's agent keeps running the build's commit and keeps reporting it

### Requirement: The agent keeps secrets and verification boundaries

The agent SHALL keep today's boundaries: it only calls out, runs a command only through its fixed job switch, rejects an unknown job type, runs the installer or Artifacts preparation as the workspace user with no `AGENT_TOKEN` in its environment, reports only an installer's reason word and a line matching `CLOUDFLARE_CALL`, and sends the private access result only from its exact job-derived file after checking its owner, mode, size, and recipient.

#### Scenario: An unknown job

- **WHEN** a poll reply holds a job of a type the contract does not list
- **THEN** the agent reports it `rejected` and runs nothing

#### Scenario: The installer's environment

- **WHEN** the agent runs the installer for a `cloudflare` job
- **THEN** the installer runs as the workspace user and its environment holds no `AGENT_TOKEN`

### Requirement: A contract-2 agent asks for the open finish

A contract-2 agent SHALL ask the installer to finish open when Zero Trust needs a payment method, and SHALL deliver the resulting open access result through the same checked private channel as a restricted one. An agent of an earlier contract SHALL NOT ask, so an older server keeps stopping.

#### Scenario: A cloudflare job on a contract-2 server

- **WHEN** the agent runs the installer for a `cloudflare` job
- **THEN** the installer's stdin job asks for the open finish, and still holds no `AGENT_TOKEN`

### Requirement: The agent prepares a hosted repository before setup

This reviewed contract-4 agent SHALL accept a project-scoped Artifacts preparation job pinned to a reviewed source commit. It SHALL prepare the coding agents and repository and register the actual folder in Paseo without installing the payload or provisioning the site. The result SHALL identify the verified project and source commit without exposing credentials. It SHALL preserve existing local work, refuse mismatched project, source or destination identity, and refuse a folder holding a GitHub clone without changing its origin.

#### Scenario: Empty prepared workspace

- **WHEN** this reviewed contract-4 agent receives a valid scoped Artifacts preparation job
- **THEN** the workspace opens the prepared repository with `/wong-setup` available and no payload installation yet

#### Scenario: Existing GitHub clone

- **WHEN** the destination folder already holds a clone whose origin is a GitHub repository
- **THEN** the agent reports the job refused, changes no remote, and leaves the folder and its local work untouched

### Requirement: The agent prepares projects with configured workspace identity

The source agent SHALL support a configured workspace user/home with the legacy `wong` defaults. Its preservation-aware GitHub job SHALL preserve unrelated logins, global git settings and matching local work. A fixed project-preparation job SHALL deliver a bounded, generation-bound clone/dependency/configuration/Paseo report over the authenticated host channel, without private configuration values, command output or AI credential reads. User/home selection SHALL apply to command execution, Paseo, checkout paths and private-result ownership verification together.

#### Scenario: A non-default workspace identity

- **WHEN** an authorized host configures an existing workspace account and requests project preparation
- **THEN** commands, repo registration and checked result paths all use that account's validated home, and no setup is written into a different user's home

#### Scenario: A project cannot be made ready

- **WHEN** the supported preparation job cannot finish dependencies, configuration or Paseo setup
- **THEN** its bounded report marks the incomplete step without publishing private output or pretending clone success means project readiness
