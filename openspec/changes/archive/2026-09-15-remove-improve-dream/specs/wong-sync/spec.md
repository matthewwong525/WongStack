## MODIFIED Requirements

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else arrives through the sync's copy-if-absent step. The list includes the supported workflow skills plus `wong-sync` itself, the docs convention pages — **including a contributing page documenting the manual route for sending a payload improvement upstream** — and the CLAUDE.md `WONG-STACK` block; it excludes the retired `dream` and `improve` skills, `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — in scope **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be copied or analysed.

The manifest bounds what the skill **copies**. It SHALL NOT bound what the analysis's surveyor **reads**, which is specified by the `wong-sync-adapt` capability; no read content leaves the machine. A supported payload skill installed under a different local name SHALL be recognized under that name via the manifest's skills mapping, so it counts as present rather than absent.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill and the target's copy is provably unmodified
- **THEN** the self-update pass brings it current before any other payload file is considered
- **AND** where the target's copy has local edits instead, it is left untouched and the update is handled by the capability analysis

#### Scenario: Non-manifest files are never copied

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never copies over them

#### Scenario: Renamed skill counts as present

- **WHEN** a supported payload skill was installed under a different local name recorded in `components.skills`
- **THEN** it is treated as present and analysed, not copied in a second time under the default name

#### Scenario: Retired skills are not installed

- **WHEN** a fresh repository installs or syncs WongStack 14.0.0 or later
- **THEN** the payload manifest does not copy the `dream` or `improve` skill

#### Scenario: Pack files are in scope only for opt-in repos

- **WHEN** `/wong-sync` runs in a repo whose manifest lacks `components.stackPack: true`
- **THEN** the pack's files are treated as outside the manifest — never copied or analysed
- **AND** in a repo with `components.stackPack: true`, those files are copied if absent and analysed if present

#### Scenario: Target repos receive the contributing page

- **WHEN** a repo installs or syncs the payload
- **THEN** the contributing page arrives with the other copied docs, so the way to contribute is discoverable

## ADDED Requirements

### Requirement: Retired managed skills are removed without deleting local authorship

When a target manifest records `dream` or `improve` as a managed skill, `/wong-sync` SHALL plan removal of the installed skill directory only when every file in that directory is provably unmodified from an upstream release and the directory contains no extra local file. If any file has local authorship, the directory SHALL remain byte-identical and become an unmanaged local skill. In both cases, the rewritten manifest SHALL remove the retired name from `components.skills`.

#### Scenario: Unmodified retired skill is removed

- **WHEN** a target has an installed `dream` or `improve` directory whose complete contents match upstream history
- **THEN** `/wong-sync` includes its removal in the reviewable change plan
- **AND** the manifest task removes its name from `components.skills`

#### Scenario: Customized retired skill is preserved

- **WHEN** a retired skill directory contains a changed or extra file
- **THEN** `/wong-sync` leaves the directory byte-identical and reports it as a local unmanaged skill
- **AND** the manifest task removes its retired WongStack mapping
