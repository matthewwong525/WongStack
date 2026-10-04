## REMOVED Requirements

### Requirement: Setup and the server installer provision the same way

**Reason:** The server installer is removed, so the shared script has one caller and the taken-name-on-a-server scenario goes.
**Migration:** Use "Setup provisions through one shared script" below; what setup creates and asks is unchanged.

## ADDED Requirements

### Requirement: Setup provisions through one shared script

`/wong-setup` SHALL create its Cloudflare resources, names, app config, memory store, and deploy token through one shared script, so every install is provisioned the same way and a fix reaches all of them. Setup SHALL keep its questions: which account when there are several, and one ask before anything billable.

#### Scenario: Setup provisions

- **WHEN** a person approves provisioning during `/wong-setup`
- **THEN** setup runs the shared script and reports what it created and what it reused
