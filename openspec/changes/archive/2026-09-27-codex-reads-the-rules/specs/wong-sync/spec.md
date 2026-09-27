## MODIFIED Requirements

### Requirement: Only payload changes create update work

Sync SHALL compare only the repo's payload between the installed and latest source commits, including files the inventory adds, removes, or remaps, and SHALL classify each changed unit against the repo's copy without reading its contents into the report. For `CLAUDE.md` only the `WONG-STACK` block SHALL count; a source file stored as a symlink SHALL be compared by the file it points at, and so SHALL a repo's `CLAUDE.md` that links to `AGENTS.md`.

#### Scenario: Local text outside the block

- **WHEN** the upstream `WONG-STACK` block changes and the repo's `CLAUDE.md` has its own text outside it
- **THEN** only the block is treated as the update

#### Scenario: The repo's rules file is a link

- **WHEN** the repo's `CLAUDE.md` links to an `AGENTS.md` whose block still equals the installed source
- **THEN** the block is classified as unchanged locally, the same as a real `CLAUDE.md`

## ADDED Requirements

### Requirement: An update moves the rules where every agent reads them

When the repo has no `CLAUDE.md` link to `AGENTS.md`, sync's plan SHALL include moving the rules into a real `AGENTS.md` with `CLAUDE.md` linking to it, keeping every line of the repo's own text, and SHALL never overwrite either file without review.

#### Scenario: Only CLAUDE.md exists

- **WHEN** the repo has a real `CLAUDE.md` and no `AGENTS.md`
- **THEN** the plan renames `CLAUDE.md` to `AGENTS.md` and links `CLAUDE.md` to it, with all its text intact

#### Scenario: Both files exist

- **WHEN** the repo has a real `CLAUDE.md` and a real `AGENTS.md`
- **THEN** the plan merges both into `AGENTS.md` for review, then links `CLAUDE.md` to it
