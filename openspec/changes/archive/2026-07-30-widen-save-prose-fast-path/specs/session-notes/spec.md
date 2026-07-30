## RENAMED Requirements

- FROM: `### Requirement: A notes-only save commits directly to the default branch`
- TO: `### Requirement: A prose-only save commits directly to the default branch`

## MODIFIED Requirements

### Requirement: A prose-only save commits directly to the default branch

When a `/save`'s entire diff falls inside the **prose allowlist** — the path prefixes `notes/**` and `wiki/**` — `/save` SHALL commit and push directly to the default branch: no feature branch, no PR, no CI wait, and no `/ship` needed. The carve-out SHALL be decided by exact path scope; any changed path outside the allowlist restores the normal branch + PR flow for the whole save. `/save` SHALL NOT route on file extension, and SHALL NOT make a judgment call about whether a prose edit is consequential enough to warrant a PR. `/save` SHALL NOT merge a pull request under any circumstance, and no scheduled job or other skill SHALL merge on its behalf.

If the direct push is rejected (protected default branch, required reviews, non-fast-forward), `/save` SHALL NOT force or retry; it SHALL fall back to the normal branch + PR flow and say why.

#### Scenario: Conversation-only session lands in one command

- **WHEN** `/save` runs after a session whose only output is `notes/billing-tenancy.md`
- **THEN** the note is committed and pushed to the default branch
- **AND** no branch is created, no PR is opened, and the user is not asked to run `/ship`

#### Scenario: A dream session lands in one command

- **WHEN** `/save` runs after `/dream`, and the diff is wiki pages plus the `consolidated:` frontmatter stamps in `notes/`
- **THEN** every path is in the allowlist, so the whole diff is committed and pushed to the default branch
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

### Requirement: `/dream` consolidates from the repo only

`/dream`'s capture phase SHALL read unconsolidated notes from the repo's `notes/` directory and SHALL NOT read the current conversation, scrollback, or machine-local transcript files. After consolidating a note's qualifying facts into `wiki/`, it SHALL record the `consolidated:` date in that note's frontmatter.

`/dream` SHALL run no git itself — its edits stay in the working tree for `/save` to commit. Its stated reason SHALL be the division of labour (the git skills own git), NOT a claim that wiki edits need a pull request; under the prose allowlist a wiki-only `/save` lands on the default branch.

#### Scenario: Consolidating on a different machine

- **WHEN** a session is captured on machine A, pushed, and `/dream` is run on machine B after pulling
- **THEN** `/dream` consolidates that session's facts from `notes/`, with no access to machine A's transcript

#### Scenario: A consumed note is marked

- **WHEN** `/dream` finishes consolidating a note
- **THEN** that note's frontmatter carries a `consolidated:` date

#### Scenario: `/dream` does not claim wiki edits need a PR

- **WHEN** the `/dream` skill's no-git rule is read
- **THEN** it states that `/save` commits and `/ship` merges
- **AND** it contains no claim that a wiki edit is gated behind a branch and pull request
