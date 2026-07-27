## MODIFIED Requirements

### Requirement: One-pass round trip, pull before contribute

The `wong-sync` skill SHALL be **pull-only by default**. A bare invocation SHALL refresh the clone, classify every in-manifest payload file, pull upstream changes into the target's working tree, rewrite the manifest, and report — and SHALL NOT curate local drift or prompt about contributing.

The contribute leg SHALL run only when explicitly requested (`/wong-sync contribute`). When requested, the skill SHALL run the full round trip in a single invocation, in this order: refresh the clone → pull upstream changes into the target → identify remaining local drift as contribution candidates → open an upstream PR for approved contributions. The pull leg MUST complete before the contribute leg begins, so that drift already resolved upstream self-cancels and is never offered back up. This ordering is behavior, not a prompt: an explicit contribute run still pulls first.

#### Scenario: Bare sync never mentions contributing

- **WHEN** the user runs `/wong-sync` with no argument
- **THEN** the skill pulls upstream updates, rewrites the manifest, and reports
- **AND** it neither curates local drift nor asks whether to contribute anything

#### Scenario: Explicit contribute runs the full round trip

- **WHEN** the user runs `/wong-sync contribute`
- **THEN** the pull leg completes first, then local-only drift is curated as candidates and approved files become an upstream PR

#### Scenario: Local change already landed upstream

- **WHEN** a payload file was customized locally, an equivalent change has already been merged into WongStack upstream, and the user runs `/wong-sync contribute`
- **THEN** the pull leg brings the file into sync and the contribute leg does not offer it as a candidate

#### Scenario: Refuses to run in the WongStack source

- **WHEN** `/wong-sync` is invoked inside a WongStack clone itself (the resolved clone equals the current repo)
- **THEN** the skill stops without changing anything, explaining the source has nothing to sync with itself

### Requirement: Curation bar for contributions

When the contribute leg runs (only on explicit request), each contribution candidate SHALL carry a one-line generality rationale answering "does this belong in every WongStack repo?". Contributing is opt-in: the default disposition is skip, and drift the skill judges app-specific or marginal is presented as such. Approved candidates' rationales become the PR body. Because the leg no longer runs unprompted, a repo with local drift SHALL accumulate no prompts during ordinary syncs.

#### Scenario: App-specific drift

- **WHEN** a payload file's local change encodes something specific to this repo and the contribute leg is running
- **THEN** the skill recommends skip with its rationale, and the file moves upstream only on an explicit opt-in

#### Scenario: PR body content

- **WHEN** the upstream PR is created
- **THEN** its body lists each contributed file with its generality rationale

#### Scenario: Local drift is silent on a bare sync

- **WHEN** a repo has locally modified payload files and the user runs a bare `/wong-sync`
- **THEN** those files are not surfaced as contribution candidates and no prompt about them appears

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list (which files sync) SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else installs through the fresh-mode pull. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages — **including a contributing page documenting how to send a payload improvement upstream** — and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — that is read and copied **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be read or copied. Files outside the manifest MUST never be read or copied in either direction. A payload skill installed under a different local name SHALL be diffed under that name via the manifest's skills mapping.

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

#### Scenario: Target repos receive the contributing page

- **WHEN** a repo installs or syncs the payload
- **THEN** the contributing page arrives with the other synced docs, so the way to contribute is discoverable without the prompt

## ADDED Requirements

### Requirement: Contributing is documented rather than prompted

The payload SHALL include a contributing page at the wiki root explaining how to send a payload improvement upstream: that `/wong-sync contribute` runs the leg, what the generality bar is ("does this belong in every WongStack repo?"), that approval is opt-in per file, and that the skill opens the upstream PR itself (fork-aware, with the VERSION + CHANGELOG release ritual). Payload prose SHALL NOT describe an ordinary sync as contributing improvements back — descriptions, skill openers, the `WONG-STACK` block, and the README SHALL frame `/wong-sync` as pulling updates, with contributing named as an explicit, separate action.

#### Scenario: A reader finds how to contribute

- **WHEN** someone wants to send a workflow improvement upstream
- **THEN** the contributing page tells them to run `/wong-sync contribute` and states the generality bar and the opt-in-per-file rule

#### Scenario: No payload prose implies automatic contribution

- **WHEN** a reader reviews the `wong-sync` description and opener, the `WONG-STACK` block, the README skill table, and the wiki
- **THEN** none of them describe a plain `/wong-sync` as contributing anything upstream
