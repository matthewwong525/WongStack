## MODIFIED Requirements

### Requirement: `/verify` adds one tool, not a toolchain

`/verify` SHALL be the one core verb that adds a tool: the browser CLI, which setup offers up front and which is otherwise installed on the machine the first time a browser journey needs it. It SHALL add nothing to the repository.

#### Scenario: A Go repo walks its app

- **WHEN** `/verify` runs a browser journey in a repo that is not JavaScript
- **THEN** the browser tool is on the machine and no package manifest, dependency entry, or runtime is added to the repo

#### Scenario: Setup already installed it

- **WHEN** `/verify` runs its first browser journey after a setup that installed the browser tool
- **THEN** it asks nothing and installs nothing

### Requirement: A remote hand-over adds one tool

A hand-over through a private link SHALL be the one step that needs Cloudflare's tunnel tool. Setup SHALL offer it up front and the server script SHALL install it; on any other machine without it, the agent SHALL install it with the person's consent the first time a remote hand-over needs it. It SHALL add nothing to the repository, and a hand-over at the computer SHALL NOT need it.

#### Scenario: A first remote hand-over

- **WHEN** the person takes over from another device and the tunnel tool is absent
- **THEN** the agent asks before installing it on the machine, and adds nothing to the repo

#### Scenario: A machine readied by setup

- **WHEN** the person takes over the browser for the first time on a computer readied by setup or a server built by the server script
- **THEN** the link opens with no install step and no question
