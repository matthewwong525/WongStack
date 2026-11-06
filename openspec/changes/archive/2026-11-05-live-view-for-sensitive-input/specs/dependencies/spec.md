## MODIFIED Requirements

### Requirement: A private link adds one tool

A private link (the key link or a live view) SHALL be the one step that needs Cloudflare's tunnel tool, including at the computer the agent runs on. Setup SHALL offer it up front; on any other machine without it, the agent SHALL install it with the person's consent the first time a private link needs it. It SHALL add nothing to the repository.

#### Scenario: A first private link

- **WHEN** a task needs a key link on a machine where the tunnel tool is absent
- **THEN** the agent asks before installing it on the machine, and adds nothing to the repo

#### Scenario: A machine readied by setup

- **WHEN** a task needs its first private link on a computer readied by setup
- **THEN** the link opens with no install step and no question
