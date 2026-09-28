## ADDED Requirements

### Requirement: A remote hand-over adds one tool

A hand-over through a private link SHALL be the one step that adds Cloudflare's tunnel tool, installed on the machine with the person's consent the first time a remote hand-over needs it. It SHALL add nothing to the repository, and a hand-over at the computer SHALL NOT need it.

#### Scenario: A first remote hand-over

- **WHEN** the person takes over from another device and the tunnel tool is absent
- **THEN** the agent asks before installing it on the machine, and adds nothing to the repo
