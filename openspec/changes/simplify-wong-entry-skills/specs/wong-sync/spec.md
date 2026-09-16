## REMOVED Requirements

### Requirement: One behavior, no arguments

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Clone in the XDG cache, disposable

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: No git in the target; full git in the clone

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Single payload manifest, wong-sync included

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: The opt-in pack follows the same rules as any payload file

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Manifest schema, lazily migrated

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Installer defers updates to wong-sync

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Contributing is documented rather than prompted

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Never overwrite an existing file

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Absent payload files are copied directly

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Provably unmodified payload files are updated directly

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: A sync run writes no repo files

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: The run follows upstream's instructions without installing them

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Retired managed skills are removed without deleting local authorship

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

## ADDED Requirements

### Requirement: Sync enters the normal workflow with current source context

`/wong-sync` SHALL obtain the upstream default branch in a separate local checkout, read its version and changelog, and invoke `/explore` with the target repo, source path, source commit, installed version when known, and user intent. It SHALL preserve local work and component choices as planning inputs. It SHALL leave target writes to the normal workflow.

#### Scenario: Installed repo requests an update
- **WHEN** the user invokes `/wong-sync` in an installed repo
- **THEN** `/explore` receives the latest source context and the request to update this repo
- **AND** the entry skill writes no verdict record or payload files

#### Scenario: Source cannot be refreshed
- **WHEN** the upstream checkout cannot be brought current
- **THEN** the skill reports the failure and does not describe cached content as the latest version

#### Scenario: Source checkout contains local work
- **WHEN** an existing cache has local changes
- **THEN** retrieval preserves that work and uses a separate clean checkout

### Requirement: Sync preserves installation context

The payload inventory and install record SHALL remain available to the normal workflow. The install record SHALL advance only after implementation, preserve local skill names and component flags, and identify the source version and commit used. Both entry skills SHALL accept the legacy `.claude/.wong-framework.json` record when the current path is absent. A missing record SHALL route to setup. A seed record SHALL mean incomplete setup. Running in the WongStack source itself SHALL stop without target changes.

#### Scenario: Local installation choices
- **WHEN** the install record contains renamed skills or optional components
- **THEN** the exploration and implementation use those choices without creating duplicate skills or enabling other components

#### Scenario: Missing or incomplete installation
- **WHEN** the record is missing or has null version and commit
- **THEN** the skill routes to setup with the current context

#### Scenario: Source repo
- **WHEN** the target is the WongStack source repo
- **THEN** the skill reports that it cannot sync the source with itself

#### Scenario: Legacy installation record
- **WHEN** only `.claude/.wong-framework.json` exists with an installed version
- **THEN** sync uses that record and its local choices without routing back to setup
