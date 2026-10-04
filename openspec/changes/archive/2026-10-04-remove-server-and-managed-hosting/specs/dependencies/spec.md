## MODIFIED Requirements

### Requirement: Nothing is installed without consent

No skill SHALL install a runtime or tool without the person's consent, and a skill other than `/wong-setup` SHALL install one only when a step needs it. WongStack SHALL NOT install Paseo on a person's machine.

#### Scenario: A verb finds its tool missing

- **WHEN** `/verify` needs its browser CLI and it is absent
- **THEN** it installs the tool at that step and says so

### Requirement: A remote hand-over adds one tool

A hand-over through a private link SHALL be the one step that needs Cloudflare's tunnel tool. Setup SHALL offer it up front; on any other machine without it, the agent SHALL install it with the person's consent the first time a remote hand-over needs it. It SHALL add nothing to the repository, and a hand-over at the computer SHALL NOT need it.

#### Scenario: A first remote hand-over

- **WHEN** the person takes over from another device and the tunnel tool is absent
- **THEN** the agent asks before installing it on the machine, and adds nothing to the repo

#### Scenario: A machine readied by setup

- **WHEN** the person takes over the browser for the first time on a computer readied by setup
- **THEN** the link opens with no install step and no question
