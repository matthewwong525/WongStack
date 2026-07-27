## MODIFIED Requirements

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list (which files sync) SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else installs through the fresh-mode pull. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages, and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — that is read and copied **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be read or copied. Files outside the manifest MUST never be read or copied in either direction. A payload skill installed under a different local name SHALL be diffed under that name via the manifest's skills mapping.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill
- **THEN** the sync's pull leg offers the update like any other payload file

#### Scenario: App files cannot leak

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never reads them and they cannot appear in the clone or the PR

#### Scenario: Pack files are in-manifest only for opt-in repos

- **WHEN** `/wong-sync` runs in a repo whose manifest lacks `components.stackPack: true`
- **THEN** the pack's files are treated as outside the manifest — never classified, pulled, or offered
- **AND** in a repo with `components.stackPack: true`, those same files are classified and pulled like any other payload file

## ADDED Requirements

### Requirement: The opt-in pack refreshes through the existing three-way diff

For a repo with `components.stackPack: true`, `/wong-sync` SHALL refresh the pack's drop-in files using the same three-way classification it applies to every payload file — no separate refresh mechanism. A pack file unchanged locally since install and changed upstream SHALL update silently in the batch; a pack file edited locally SHALL be shown and asked before any overwrite; a file changed on both sides SHALL surface as a three-way conflict. The pack's guided config fragments (the merges into target-owned files) SHALL follow the `CLAUDE.md`-block precedent rather than whole-file replacement.

#### Scenario: Untouched pack file updates silently

- **WHEN** a repo took the pack, has not edited `scripts/cf-build.sh`, and upstream ships a new version
- **THEN** the file classifies as an upstream update and refreshes in the batch-approvable pull

#### Scenario: Locally edited pack file is not clobbered

- **WHEN** a repo edited its copy of a pack script and upstream also changed it
- **THEN** `/wong-sync` shows the three-way view and asks before writing, never overwriting the local edit silently
