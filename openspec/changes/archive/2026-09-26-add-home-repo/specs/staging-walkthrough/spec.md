## ADDED Requirements

### Requirement: The walk uses a throwaway browser profile

Every browser journey of `/verify` SHALL run with a temporary agent-browser profile made for that run, overriding any profile in the machine's agent-browser config, and SHALL remove it when the run ends. A walk SHALL NOT use the person's saved logins, and SHALL NOT wait on the personal profile's lock.

#### Scenario: A machine with a personal profile

- **WHEN** `~/.agent-browser/config.json` sets a personal profile and `/verify` runs a browser journey
- **THEN** the journey runs in a fresh profile with no personal cookies

#### Scenario: Two walks at once

- **WHEN** two worktrees run `/verify` at the same time
- **THEN** neither waits for the other's browser profile
