## ADDED Requirements

### Requirement: Continue never builds on the wrong branch

When `/continue` cannot or should not check out the change's branch here, because other unpublished work holds this workspace or another worktree has the branch, it SHALL recap the change and stop with a next-step question, and SHALL NOT build or edit files.

#### Scenario: Branch open in another worktree

- **WHEN** `/continue add-auth` runs and `add-auth`'s branch is checked out in another worktree
- **THEN** it recaps the change, says where the branch is open, and asks what next, with nothing built here
