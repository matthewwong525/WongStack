## MODIFIED Requirements

### Requirement: Sync preserves installation context

The payload inventory and install record SHALL remain available to the normal workflow. The install record SHALL advance only after implementation, preserve local skill names and the relocated docs path, and identify the source version and commit used. Both entry skills SHALL read only `.claude/.wong-stack.json`. A missing record SHALL route to setup. A seed record SHALL mean incomplete setup. Running in the WongStack source itself SHALL stop without target changes.

#### Scenario: Local installation choices
- **WHEN** the install record contains renamed skills or a relocated docs path
- **THEN** the exploration and implementation use those choices without creating duplicate skills

#### Scenario: Missing or incomplete installation
- **WHEN** the record is missing or has null version and commit
- **THEN** the skill routes to setup with the current context

#### Scenario: Source repo
- **WHEN** the target is the WongStack source repo
- **THEN** the skill reports that it cannot sync the source with itself

#### Scenario: Legacy installation record
- **WHEN** only `.claude/.wong-framework.json` exists
- **THEN** the skill treats the record as missing and routes to setup

## REMOVED Requirements

### Requirement: Sync plans the move of notes into the memory store

**Reason**: WongStack starts fresh with 19.0.0. No supported install has a `notes/` directory.
**Migration**: None. An install from before 17.0.0 is not supported. Set it up again in an empty folder.

### Requirement: Sync migrates repos installed before 18.0.0

**Reason**: WongStack starts fresh with 19.0.0. Every supported install already has the `.agents/` layout and the deploy token.
**Migration**: None. An install from before 18.0.0 is not supported. Set it up again in an empty folder.
