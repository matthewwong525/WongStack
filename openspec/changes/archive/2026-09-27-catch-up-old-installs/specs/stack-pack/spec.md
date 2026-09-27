## MODIFIED Requirements

### Requirement: Every install takes the pack

The pack SHALL ship in the core payload to every new install, and no install-record flag SHALL gate it for a new install. A sync SHALL treat an earlier release's opt-out flag as the person's choice: the plan names the pack as left out until the person asks for it.

#### Scenario: A new install

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives the pack scripts, the workflow, the seed template, and the pipeline docs

#### Scenario: A legacy opt-out flag

- **WHEN** an install record carries `components.stackPack: false` from an earlier release
- **THEN** the sync plan lists the pack as left out, with that reason, and the repo still updates in place
