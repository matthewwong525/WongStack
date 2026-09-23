# wong-sync Specification

## Purpose

Keep an installed repo current with WongStack by passing the latest source and local installation context into the normal exploration workflow.

## Requirements

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

### Requirement: Preflight reads a symlinked payload file through its link

The preflight SHALL read a payload file that the source tree stores as a symlink from the file that the link points at, inside the same source commit. It SHALL NOT use the link text as file content. A link to a directory SHALL NOT become a payload unit. When a real file and a link to it share one logical path, the real file SHALL win. The result SHALL be the same whichever file of a linked pair is the real file.

#### Scenario: CLAUDE.md is a symlink to AGENTS.md

- **WHEN** the source stores `CLAUDE.md` as a symlink to `AGENTS.md`, and `AGENTS.md` holds the `WONG-STACK` block markers
- **THEN** the preflight extracts the marked block from `AGENTS.md`
- **AND** it reports no `missing-block-marker` diagnostic

#### Scenario: The linked pair is reversed

- **WHEN** the source stores `AGENTS.md` as a symlink to a real `CLAUDE.md` that holds the markers
- **THEN** the preflight produces the same classification as for the forward layout

#### Scenario: WongStack is its own source

- **WHEN** the preflight runs with this repository as the source and a target whose install record names an earlier commit of it
- **THEN** the report status is `current` or `update`, never `error`

#### Scenario: A link points outside the tree or at a directory

- **WHEN** a symlink in the source tree points at a directory or at no blob in the same commit
- **THEN** the preflight does not report that link as a payload unit

### Requirement: The preflight change limit is settable from the command line

The `--max-changes` argument SHALL set the preflight's change limit. A value that is not a positive integer SHALL produce an `invalid-argument` error before any payload comparison.

#### Scenario: Raising the limit clears a change-limit error

- **WHEN** a sync would exceed the default change limit and the operator passes `--max-changes` with a larger value
- **THEN** the preflight uses the larger value and does not report `change-limit`

#### Scenario: An invalid limit is refused

- **WHEN** the operator passes `--max-changes 0`
- **THEN** the report status is `error` with an `invalid-argument` diagnostic

### Requirement: Preflight maps relocated wiki pages through the install record

The install record MAY set `components.docsPath` to a safe repo-relative folder that holds the target's WongStack wiki pages. When it is set, the preflight SHALL map each payload path under `wiki/development/` and then under `wiki/` to the same relative path under that folder, the more specific prefix first. The UI category probe SHALL look for `ux-principles.md` at its mapped path. Two payload paths that map to one target path SHALL produce an error, not an overwrite. A record without the field SHALL keep the `wiki/` paths.

#### Scenario: A relocated UI page selects the UI category

- **WHEN** the record sets `components.docsPath` to `docs/development` and the target has `docs/development/ux-principles.md`
- **THEN** the preflight selects the UI category without `components.ui`
- **AND** the `wiki/ux-principles.md` unit reports target path `docs/development/ux-principles.md`

#### Scenario: A development page maps into the same folder

- **WHEN** the record sets `components.docsPath` to `docs/development`
- **THEN** `wiki/development/the-change-loop.md` maps to `docs/development/the-change-loop.md`
- **AND** `wiki/contributing.md` maps to `docs/development/contributing.md`

#### Scenario: Two payload paths collide

- **WHEN** a mapped `wiki/<page>` and a mapped `wiki/development/<page>` resolve to one target path
- **THEN** the report status is `error` and the diagnostic names both source paths

#### Scenario: An unsafe folder is refused

- **WHEN** `components.docsPath` is absolute or escapes the target
- **THEN** the report status is `error` with an `unsafe-path` diagnostic
