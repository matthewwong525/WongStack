## ADDED Requirements

### Requirement: Setup and the server installer provision the same way

`/wong-setup` and the server installer SHALL create the same Cloudflare resources, names, app config, memory store, and deploy token through one shared script, so a fix to provisioning reaches both. Setup SHALL keep its questions: which account when there are several, and one ask before anything billable. The installer SHALL take those choices from its job, and SHALL pick the first free name suffix instead of asking when a derived name is taken.

#### Scenario: Setup provisions

- **WHEN** a person approves provisioning during `/wong-setup`
- **THEN** setup runs the shared script and reports what it created and what it reused

#### Scenario: A taken name on a server

- **WHEN** the server installer finds a derived name held by another project
- **THEN** it uses the next free suffix for every name and touches nothing it did not create
