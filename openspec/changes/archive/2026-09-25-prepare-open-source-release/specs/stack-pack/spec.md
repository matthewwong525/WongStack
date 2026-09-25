## ADDED Requirements

### Requirement: The Cloudflare stack pack ships in the core payload

The payload SHALL include a Cloudflare stack pack — the D1 pipeline and deploy scripts, a seed template, guided config fragments, and pipeline docs — as part of the core payload. Every new install SHALL receive the pack, and setup SHALL record `components.stackPack: true` and `components.appScaffold: true` in the new install record, so that a later sync selects both categories. Setup SHALL NOT ask the user whether to take either.

A repo installed before 18.0.0 MAY carry `components.stackPack` and `components.appScaffold`. `/wong-sync` SHALL continue to honor those flags for such a repo: a repo with `components.stackPack` false or absent SHALL receive none of the pack's files, and a repo with `stackPack: true` and no scaffold SHALL receive no `app/` file.

#### Scenario: A new install receives the pack

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target receives the pack scripts, the seed template, the workflow, and the pipeline docs
- **AND** its install record has `components.stackPack` and `components.appScaffold` set to `true`

#### Scenario: A legacy repo that declined the pack is unaffected

- **WHEN** `/wong-sync` runs in a repo whose install record has `components.stackPack` false
- **THEN** no pack script, seed file, config fragment, or pipeline doc is written to it

#### Scenario: A legacy repo keeps its own app

- **WHEN** `/wong-sync` runs in a repo with `components.stackPack: true` and no `components.appScaffold`
- **THEN** no `app/` file is written to it

## REMOVED Requirements

### Requirement: An opt-in Cloudflare stack pack ships in the payload

**Reason**: Setup starts from an empty folder, so every new install takes the pack.
**Migration**: See "The Cloudflare stack pack ships in the core payload", which keeps the flags for legacy repos.

### Requirement: The pack is adoptable after setup

**Reason**: Every new install receives the pack, and `/wong-cloudflare`, the late-adoption door, is removed.
**Migration**: A legacy repo that wants the pack sets `components.stackPack: true` and runs `/wong-sync`, which lands the pack files and plans provisioning from setup's provisioning runbook in the source checkout.
