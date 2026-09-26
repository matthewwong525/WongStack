## MODIFIED Requirements

### Requirement: The Cloudflare stack pack ships in the core payload

The payload SHALL include a Cloudflare stack pack — the D1 pipeline and deploy scripts, a seed template, guided config fragments, and pipeline docs — as part of the core payload. Every install SHALL receive the pack and the app scaffold. Setup SHALL NOT ask the user whether to take either, and the install record SHALL carry no flag that gates them.

#### Scenario: A new install receives the pack

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives the pack scripts, the seed template, the workflow, and the pipeline docs
- **AND** its install record has no `components.stackPack` or `components.appScaffold` flag

#### Scenario: Sync always selects the pack

- **WHEN** `/wong-sync` runs in an installed repo
- **THEN** its preflight selects the pack and scaffold files with the rest of the core payload

#### Scenario: A legacy repo that declined the pack is unaffected

- **WHEN** an install record carries `components.stackPack: false` from an earlier release
- **THEN** the flag is ignored, and the repo is not supported until it is set up again

#### Scenario: A legacy repo keeps its own app

- **WHEN** an install record carries `components.appScaffold: false` from an earlier release
- **THEN** the flag is ignored, and the repo is not supported until it is set up again

## REMOVED Requirements

### Requirement: The pack documents its adoption path for repos on the previous model

**Reason**: No supported install runs the previous staging model. WongStack starts fresh with 19.0.0.
**Migration**: None. Set up the repo again in an empty folder.
