## ADDED Requirements

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
