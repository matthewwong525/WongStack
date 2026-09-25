## ADDED Requirements

### Requirement: Setup provisions the memory store

The installation plan SHALL include provisioning the memory store through `/wong-cloudflare`, and SHALL install the session-start hook and the `memory` skill. When no Cloudflare token is available yet, setup SHALL complete the rest of the install, state that session memory is off until provisioning runs, and name the command that turns it on. It SHALL NOT report the install as complete with memory working when no store exists.

#### Scenario: A token is available

- **WHEN** the installation tasks run with a Cloudflare provisioning token in `.env`
- **THEN** the memory store is provisioned and the install record lists it under `components.memory`

#### Scenario: No token yet

- **WHEN** the installation tasks run without a Cloudflare token
- **THEN** the install completes, and the report states that session memory is off and that `/wong-cloudflare` turns it on
