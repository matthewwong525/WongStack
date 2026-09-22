## MODIFIED Requirements

### Requirement: Sync enters the normal workflow with current source context

`/wong-sync` SHALL obtain the upstream default branch in a separate clean local checkout and run a deterministic preflight against the selected payload before it invokes `/explore`. When the preflight proves that the selected payload has no upstream delta from the recorded installed commit, sync SHALL report that the selected payload is current and SHALL NOT invoke `/explore`. When an update exists, `/explore` SHALL receive the target repo, source path, source commit, installed version when known, user intent, and the complete classified set of changed payload units. Sync SHALL preserve local work and component choices as planning inputs and SHALL leave target writes to the normal workflow. A retrieval or preflight failure SHALL be explicit and SHALL NOT be reported as current.

#### Scenario: Installed repo requests an update
- **WHEN** the preflight finds one or more changes in the payload selected for an installed repo
- **THEN** `/explore` receives the latest source context and the classified changed payload units for that update
- **AND** the entry skill writes no verdict record or payload files

#### Scenario: Selected payload is current
- **WHEN** the latest source has no change to any payload unit selected for the target since its recorded commit
- **THEN** sync reports that the selected payload is current
- **AND** it does not invoke `/explore`

#### Scenario: Source cannot be refreshed
- **WHEN** the upstream checkout cannot be brought current
- **THEN** the skill reports the failure and does not describe cached content as the latest version or the target as current

#### Scenario: Source checkout contains local work
- **WHEN** an existing cache has local changes
- **THEN** retrieval preserves that work and uses a separate clean checkout for the preflight

#### Scenario: Preflight cannot prove a result
- **WHEN** the recorded base commit, manifest data, selected source path, or required target input cannot be read safely
- **THEN** sync reports the diagnostic and does not invoke `/explore` with an incomplete delta or report the target as current

## ADDED Requirements

### Requirement: Preflight classifies only the selected payload delta

The preflight SHALL use the target's component choices and recorded local skill names to compare the selected payload at the installed and latest source commits. It SHALL treat manifest changes, whole-directory entries, exclusions, skill mappings, removed paths, and the marked `CLAUDE.md` block as payload units. Its report SHALL contain complete counts and path-level classifications without file contents or diff hunks, SHALL preserve evidence of local adaptation, and SHALL make no target write. An upstream change outside the target's selected payload SHALL NOT create update work.

#### Scenario: One selected file changes upstream
- **WHEN** one selected payload file differs between the installed and latest source commits
- **THEN** the report identifies that payload unit and its mapped target path
- **AND** it classifies the target relationship to the installed and latest versions without changing the target

#### Scenario: Local adaptation overlaps an upstream change
- **WHEN** a changed payload unit also differs locally from its installed source version
- **THEN** the report marks that unit as locally adapted for later exploration
- **AND** it does not overwrite or classify the adaptation as safe to replace

#### Scenario: Manifest selection or mapping changes
- **WHEN** a manifest change adds, removes, excludes, or remaps a payload unit selected for the target
- **THEN** the report includes the affected logical unit and its source and target paths

#### Scenario: Marked root block changes
- **WHEN** the upstream `WONG-STACK` block changes while the target file contains local content outside that block
- **THEN** the preflight compares and classifies the marked block as the payload unit
- **AND** it does not treat unrelated target content as payload drift

#### Scenario: Upstream changes an unselected component
- **WHEN** all upstream changes are outside the target's selected payload categories
- **THEN** the preflight returns a current result for that target selection
