# wong-sync — delta

## ADDED Requirements

### Requirement: Fresh-install mode via seed manifest

`/wong-sync` SHALL treat a manifest whose `commit` is null as a fresh install handed off by `wong-setup`, and SHALL classify every payload file three-way against the **empty tree** as base: files absent locally classify as upstream updates (the pull, batch-approvable, is the install); files present locally that differ classify as conflicts, resolved keep-local / take-upstream / **keep under another name** — a rename recorded in the manifest's `components.skills`. On a fresh run the contribute leg SHALL be idle (no contribution candidates exist against an empty base) and the changelog walk SHALL be skipped (there is no prior version); the sync SHALL report the version being installed instead. Pulled files land in the working tree for `/save`, and the real manifest — actual `version`, `commit`, components — is written last, exactly as on any sync. A manifest with a real `commit` SHALL behave exactly as before; fresh behavior triggers only on `commit: null`.

#### Scenario: Fresh repo pull

- **WHEN** `/wong-sync` runs on a seed manifest in a repo with no payload files
- **THEN** every manifest file is offered as one batch-approvable pull, the contribute leg does nothing, and the manifest is rewritten with the real version and commit afterward

#### Scenario: Collision during fresh install

- **WHEN** the target already has a skill named `save` that differs from WongStack's
- **THEN** the file surfaces as a conflict with keep / take-upstream / keep-under-another-name, and a rename is recorded in `components.skills`

#### Scenario: Installed repo unaffected

- **WHEN** the manifest carries a real `commit`
- **THEN** classification, changelog walk, and the contribute leg behave exactly as before this change

### Requirement: CLAUDE.md block insertion when no markers exist

On a fresh-mode sync, when the target's `CLAUDE.md` lacks `WONG-STACK:BEGIN/END` markers (or the file does not exist), `/wong-sync` SHALL insert the block (markers included) without modifying any content outside it — creating the file if needed. On every sync, content outside the markers SHALL remain untouched, as today.

#### Scenario: CLAUDE.md exists without markers

- **WHEN** a fresh-mode sync meets a `CLAUDE.md` with the user's own content and no markers
- **THEN** the block is appended with its markers and the user's content is byte-identical outside them

## MODIFIED Requirements

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list (which files sync) SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else installs through the fresh-mode pull. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages, and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup` (and the retired `install-wong-stack` tombstone), `VERSION`, and `CHANGELOG.md`. Files outside the manifest MUST never be read or copied in either direction. A payload skill installed under a different local name SHALL be diffed under that name via the manifest's skills mapping.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill
- **THEN** the sync's pull leg offers the update like any other payload file

#### Scenario: App files cannot leak

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never reads them and they cannot appear in the clone or the PR

### Requirement: Installer defers updates to wong-sync

`wong-setup` SHALL handle fresh integrations only. When a manifest with a real `commit` already exists, it skips the consultation, installs/updates nothing except ensuring the `wong-sync` skill is present, then directs the user to run `/wong-sync`. Its legacy-traces step SHALL offer to remove an installed or symlinked `contribute-wong-stack` (superseded by `/wong-sync`). `wong-sync`'s source-repo detection SHALL identify a WongStack source by `VERSION` alongside `.claude/skills/wong-setup/`.

#### Scenario: Re-run on an installed repo

- **WHEN** `/wong-setup` runs in a repo whose `.claude/.wong-stack.json` has a real `commit`
- **THEN** it skips the pitch, ensures `wong-sync` is installed (bootstrapping older installs), makes no other changes, and says to run `/wong-sync` for updates

#### Scenario: Leftover contribute-wong-stack

- **WHEN** the skill or sync finds an installed/symlinked `contribute-wong-stack`
- **THEN** it offers to remove it, noting `/wong-sync` supersedes it

#### Scenario: No manifest during sync

- **WHEN** `/wong-sync` runs in a repo with no `.claude/.wong-stack.json` at all
- **THEN** it stops and points at `/wong-setup` for the fresh integration — a missing manifest means "not installed"; only a seed manifest (`commit: null`) means "install now"
