# Install onboarding delta

## ADDED Requirements

### Requirement: All installations enable Zero Trust automatically

Both `/wong-setup` and the unattended cloud-managed installer SHALL enable Zero Trust for the workspace's production and staging sites, assets, APIs, mini apps, and previews without asking an enable-or-public question. The owner SHALL authenticate by a reachable email. Setup SHALL preserve memory-key authentication and SHALL NOT make business content public when protection is incomplete. A deliberately public surface requires a separately reviewed exception.

#### Scenario: Interactive setup

- **WHEN** a person installs WongStack through `/wong-setup`
- **THEN** setup automatically provisions protected hosting and does not ask whether to enable protection

#### Scenario: Setup cannot finish protection

- **WHEN** either installation path cannot finish its Zero Trust setup
- **THEN** setup reports the recoverable blocker without publishing public business content
