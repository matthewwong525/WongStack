## ADDED Requirements

### Requirement: A private link adds one tool

A private link (the password link, the key link, or a private form) SHALL be the one step that needs Cloudflare's tunnel tool, including at the computer the agent runs on. Setup SHALL offer it up front; on any other machine without it, the agent SHALL install it with the person's consent the first time a private link needs it. It SHALL add nothing to the repository.

#### Scenario: A first private link

- **WHEN** a task needs a password link on a machine where the tunnel tool is absent
- **THEN** the agent asks before installing it on the machine, and adds nothing to the repo

#### Scenario: A machine readied by setup

- **WHEN** a task needs its first private link on a computer readied by setup
- **THEN** the link opens with no install step and no question

## REMOVED Requirements

### Requirement: A remote hand-over adds one tool

**Reason**: The hand-over is removed, and every private link now goes through the tunnel, so a link at the agent's own computer needs the tool too. Replaced by *A private link adds one tool*.

**Migration**: A computer that only ever used a local link installs the tunnel tool, with the person's consent, at its next private link.
