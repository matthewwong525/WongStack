## MODIFIED Requirements

### Requirement: Session notes live in a repo-committed `notes/` surface

The payload SHALL define a top-level `notes/` directory holding one markdown note per line of work at `notes/<slug>.md`, where `<slug>` is the same kebab-case slug used for the branch and the OpenSpec change. Notes SHALL be committed to the repo so they are readable from any clone, and SHALL remain in the repo as permanent session context.

#### Scenario: A note is keyed to its line of work

- **WHEN** a session's work is tracked as change `add-po-search` on branch `add-po-search`
- **THEN** its session note is at `notes/add-po-search.md`, parallel to `openspec/changes/add-po-search/`
- **AND** the filename carries no date, so a note spanning several days is not stamped with the first

#### Scenario: A conversation-only session still gets a note

- **WHEN** a session produces understanding but no code change and no plan
- **THEN** a note is written at `notes/<topic-slug>.md`
- **AND** no OpenSpec change folder is created for it

#### Scenario: Notes survive consolidation

- **WHEN** later work needs the context from an earlier session, whether or not its reusable facts were also written into the wiki
- **THEN** the note remains in the repo for future reference

### Requirement: Notes are a compression of the session, not a summary or a transcript

A note SHALL preserve what the user stated, decisions with their rationale, what was ruled out and why, concrete specifics (names, repo-relative paths, numbers, versions, error strings), and open threads — such that a cold reader on another machine reaches the same understanding without the transcript. It SHALL omit tool-call mechanics, file dumps, the assistant's reasoning-out-loud, and facts already true in the repo.

#### Scenario: Rationale is preserved

- **WHEN** an option was considered and rejected during the session
- **THEN** the note records the rejected option and why it was rejected

#### Scenario: Selection is deferred to consolidation

- **WHEN** `/save` writes a note containing both durable conventions and change-specific context
- **THEN** it records both when they are needed for a cold reader to reach the same understanding, without filtering for a later consolidation command

### Requirement: A prose-only save commits directly to the default branch

When a `/save`'s entire diff falls inside the **prose allowlist** — the path prefixes `notes/**` and `wiki/**` — `/save` SHALL commit and push directly to the default branch: no feature branch, no PR, no CI wait, and no `/ship` needed. The carve-out SHALL be decided by exact path scope; any changed path outside the allowlist restores the normal branch + PR flow for the whole save. `/save` SHALL NOT route on file extension, and SHALL NOT make a judgment call about whether a prose edit is consequential enough to warrant a PR. `/save` SHALL NOT merge a pull request under any circumstance, and no scheduled job or other skill SHALL merge on its behalf.

If the direct push is rejected (protected default branch, required reviews, non-fast-forward), `/save` SHALL NOT force or retry; it SHALL fall back to the normal branch + PR flow and say why.

#### Scenario: Conversation-only session lands in one command

- **WHEN** `/save` runs after a session whose only output is `notes/billing-tenancy.md`
- **THEN** the note is committed and pushed to the default branch
- **AND** no branch is created, no PR is opened, and the user is not asked to run `/ship`

#### Scenario: A dream session lands in one command

- **WHEN** `/save` runs after explicit wiki work and every changed path is under `wiki/`
- **THEN** the whole diff is committed and pushed to the default branch
- **AND** no branch is created, no PR is opened, and the user is not asked to run `/ship`

#### Scenario: Mixed session keeps the gate

- **WHEN** a save's diff contains prose plus a source, skill, spec, or config file
- **THEN** the prose rides along on the change's feature branch and goes through the PR flow with it

#### Scenario: Markdown outside the allowlist keeps the gate

- **WHEN** a save's diff touches `.claude/skills/**/*.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`, or `openspec/**`
- **THEN** the normal branch + PR flow applies, because routing is by path prefix and not by extension

#### Scenario: Prose-only save reports without a PR link

- **WHEN** a prose-only save completes
- **THEN** the report names the changed prose paths and states they landed on the default branch
- **AND** it omits the PR, CI, and preview sections rather than reporting them as missing

#### Scenario: Protected default branch falls back

- **WHEN** a prose-only save's direct push to the default branch is rejected
- **THEN** `/save` cuts a branch, opens a PR whose body is the prose change, and states that the default branch is protected
- **AND** it never force-pushes

### Requirement: `notes/` is a payload surface installed by `/wong-sync`

The payload manifest SHALL list `notes/README.md`, so `/wong-sync` copies it into a target repo that lacks it and thereby creates the notes convention surface. The README SHALL state the slug key, compression bar, permanent lifecycle, and boundary against the change's Decision log and `wiki/`. As with every manifest file, an existing file SHALL NOT be overwritten.

#### Scenario: Target repo without notes

- **WHEN** `/wong-sync` runs in a repo that has no `notes/` directory
- **THEN** `notes/` and `notes/README.md` are copied in

#### Scenario: Target repo that already has notes

- **WHEN** a target repo already has `notes/README.md`
- **THEN** it is left untouched and handed to the adapt step

## REMOVED Requirements

### Requirement: Note state is tracked in per-note frontmatter

**Reason**: No workflow consumes consolidation state after `/dream` is retired.

**Migration**: Remove the `consolidated:` key from existing notes when convenient; notes remain valid without it.

### Requirement: `/dream` consolidates from the repo only

**Reason**: The `/dream` command and its note-to-wiki workflow are retired.

**Migration**: Keep notes for cold resumes and make wiki edits explicitly when reusable documentation work is needed.

### Requirement: `/dream` gardens with or without new notes

**Reason**: Wiki gardening is no longer a separate command.

**Migration**: Request a wiki audit or edit as explicit work governed by the wiki rules.

### Requirement: Sweep mode is removed from `/dream`

**Reason**: The parent skill no longer exists, so a negative requirement about one of its old modes has no current behavior to govern.

**Migration**: None; session notes remain repo files and `/continue` still reads them.
