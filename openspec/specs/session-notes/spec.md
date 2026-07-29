# session-notes Specification

## Purpose

Define `notes/` — the repo-committed surface that holds the raw record of what a session figured out, one note per line of work keyed by the same slug as the branch and the OpenSpec change. `/save` is the sole capture point; `/dream` consolidates from the repo (never from a transcript), so the record travels to any clone.

## Requirements

### Requirement: Session notes live in a repo-committed `notes/` surface

The payload SHALL define a top-level `notes/` directory holding one markdown note per line of work at `notes/<slug>.md`, where `<slug>` is the same kebab-case slug used for the branch and the OpenSpec change. Notes SHALL be committed to the repo so they are readable from any clone, and SHALL NOT be deleted after consolidation.

#### Scenario: A note is keyed to its line of work

- **WHEN** a session's work is tracked as change `add-po-search` on branch `add-po-search`
- **THEN** its session note is at `notes/add-po-search.md`, parallel to `openspec/changes/add-po-search/`
- **AND** the filename carries no date, so a note spanning several days is not stamped with the first

#### Scenario: A conversation-only session still gets a note

- **WHEN** a session produces understanding but no code change and no plan
- **THEN** a note is written at `notes/<topic-slug>.md`
- **AND** no OpenSpec change folder is created for it

#### Scenario: Notes survive consolidation

- **WHEN** `/dream` has consolidated a note's facts into `wiki/`
- **THEN** the note file remains in the repo for future reference

### Requirement: Note state is tracked in per-note frontmatter

Each note SHALL carry its consolidation state in its own YAML frontmatter — unconsolidated until `/dream` records a `consolidated:` date in it. The payload SHALL NOT use a central ledger file to track which notes have been consolidated.

#### Scenario: An unconsolidated note is identifiable

- **WHEN** `/dream` scans `notes/`
- **THEN** it selects notes whose frontmatter carries no `consolidated:` date

#### Scenario: Two machines consolidate without conflicting

- **WHEN** notes written on different machines are consolidated and the results merged
- **THEN** each note's state lives in its own file, so no shared ledger line conflicts

### Requirement: `/save` is the sole conversation capture point

`/save` SHALL write or update `notes/<slug>.md` from the conversation, as part of the same commit as the rest of the checkpoint. It SHALL update the existing note in place rather than creating a new file per save, and SHALL write a note only when the session produced context beyond the diff and the change's Decision log — otherwise skipping it and saying so in its report.

#### Scenario: A second save updates the same note

- **WHEN** `/save` runs again on a branch that already has `notes/<slug>.md`
- **THEN** the existing note is revised and extended in place
- **AND** no additional note file is created

#### Scenario: A save with nothing new to capture

- **WHEN** the session produced nothing beyond the diff and the Decision log
- **THEN** `/save` writes no note and reports that it skipped it

#### Scenario: The note ships with the checkpoint

- **WHEN** `/save` commits
- **THEN** `notes/<slug>.md` is staged by path alongside the code and the OpenSpec change

### Requirement: Notes are a compression of the session, not a summary or a transcript

A note SHALL preserve what the user stated, decisions with their rationale, what was ruled out and why, concrete specifics (names, repo-relative paths, numbers, versions, error strings), and open threads — such that a cold reader on another machine reaches the same understanding without the transcript. It SHALL omit tool-call mechanics, file dumps, the assistant's reasoning-out-loud, and facts already true in the repo. `/save` SHALL NOT pre-apply `/dream`'s durable-facts filter when writing the note.

#### Scenario: Rationale is preserved

- **WHEN** an option was considered and rejected during the session
- **THEN** the note records the rejected option and why it was rejected

#### Scenario: Selection is deferred to consolidation

- **WHEN** `/save` writes a note containing both durable conventions and change-specific context
- **THEN** it records both, leaving the durable-fact selection to `/dream`

### Requirement: A conversation-only session does not produce an OpenSpec change

`/save` SHALL NOT author an OpenSpec change for a session that produced no code and no plan. It SHALL write the note, and report that no change was created.

#### Scenario: No fake proposal

- **WHEN** `/save` runs after a session with no diff and no plan
- **THEN** no `openspec/changes/<name>/` folder is created
- **AND** no proposal describing nothing changing and no empty `tasks.md` are written

### Requirement: A notes-only save commits directly to the default branch

When a `/save`'s entire diff is confined to `notes/*.md`, `/save` SHALL commit and push directly to the default branch — no feature branch, no PR, no CI wait, and no `/ship` needed. The carve-out SHALL be decided by exact path scope: any changed path outside `notes/*.md` restores the normal branch + PR flow for the whole save. `/save` SHALL NOT merge a pull request under any circumstance, and no scheduled job or other skill SHALL merge on its behalf.

#### Scenario: Conversation-only session lands in one command

- **WHEN** `/save` runs after a session whose only output is `notes/billing-tenancy.md`
- **THEN** the note is committed and pushed to the default branch
- **AND** no branch is created, no PR is opened, and the user is not asked to run `/ship`

#### Scenario: Mixed session keeps the gate

- **WHEN** a save's diff contains both `notes/<slug>.md` and a source or skill file
- **THEN** the note rides along on the change's feature branch and goes through the PR flow with it

#### Scenario: Notes-only save reports without a PR link

- **WHEN** a notes-only save completes
- **THEN** the report names the note path and states it landed on the default branch
- **AND** it omits the PR, CI, and preview sections rather than reporting them as missing

### Requirement: `/dream` consolidates from the repo only

`/dream`'s capture phase SHALL read unconsolidated notes from the repo's `notes/` directory and SHALL NOT read the current conversation, scrollback, or machine-local transcript files. After consolidating a note's qualifying facts into `wiki/`, it SHALL record the `consolidated:` date in that note's frontmatter.

#### Scenario: Consolidating on a different machine

- **WHEN** a session is captured on machine A, pushed, and `/dream` is run on machine B after pulling
- **THEN** `/dream` consolidates that session's facts from `notes/`, with no access to machine A's transcript

#### Scenario: A consumed note is marked

- **WHEN** `/dream` finishes consolidating a note
- **THEN** that note's frontmatter carries a `consolidated:` date

### Requirement: `/dream` gardens with or without new notes

`/dream`'s consolidation phase SHALL run regardless of whether any unconsolidated notes exist. "No new notes" SHALL be a normal, successful outcome rather than a reason to skip gardening.

#### Scenario: Gardening with an empty inbox

- **WHEN** `/dream` runs and every note is already consolidated
- **THEN** it still merges duplicates, prunes, repairs links, and reality-checks the wiki against the code
- **AND** reports that there was nothing new to capture

### Requirement: Sweep mode is removed from `/dream`

The `/dream` skill SHALL NOT describe or implement a mode that enumerates machine-local transcript directories. Reaching sessions the repo never consolidated SHALL be structural — committed notes make them visible to a plain `/dream` run from any clone.

#### Scenario: No transcript enumeration remains

- **WHEN** the `/dream` skill is read
- **THEN** it contains no sweep mode section and no reference to enumerating transcript folders

### Requirement: `/continue` reads the note alongside the change

When resuming a change, `/continue` SHALL read `notes/<slug>.md` if it exists and fold its context into the recap, so a cold resume inherits the session understanding that the change deliberately does not hold.

#### Scenario: Resuming with a note present

- **WHEN** `/continue add-po-search` runs and `notes/add-po-search.md` exists
- **THEN** the recap includes context from the note in addition to the proposal, its Status, and the Decision log tail

#### Scenario: Resuming with no note

- **WHEN** no note exists for the change
- **THEN** `/continue` proceeds on the change alone without error

### Requirement: `notes/` is a payload surface installed by `/wong-sync`

The payload manifest SHALL list the `notes/` directory and its `README.md`, so `/wong-sync` copies them into a target repo that lacks them. The README SHALL state the convention: the slug key, the compression bar, the frontmatter watermark, and the boundary against the change's Decision log and `wiki/`. As with every manifest file, an existing file SHALL NOT be overwritten.

#### Scenario: Target repo without notes

- **WHEN** `/wong-sync` runs in a repo that has no `notes/` directory
- **THEN** `notes/` and `notes/README.md` are copied in

#### Scenario: Target repo that already has notes

- **WHEN** a target repo already has `notes/README.md`
- **THEN** it is left untouched and handed to the adapt step
