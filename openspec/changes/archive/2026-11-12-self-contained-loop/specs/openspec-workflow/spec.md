## MODIFIED Requirements

### Requirement: Continue finds the branch from the change

`/apply` SHALL pick up a saved change on the branch its proposal records, or on a pull request's head branch, and SHALL NOT assume a change name is a branch name. With no change named and none in this chat, it SHALL list the saved changes and ask which to pick up.

#### Scenario: Resume by name from a fresh clone

- **WHEN** `/apply review-handoff` runs where the folder exists only on the remote branch `editor-work`
- **THEN** it reads the proposal from that branch and checks out `editor-work` when that is safe

#### Scenario: No recorded branch

- **WHEN** a change has no recorded branch and a branch with its name exists
- **THEN** `/apply` does not check out that branch on the name alone

### Requirement: Continue never builds on the wrong branch

When `/apply` cannot or should not check out a saved change's branch here, because other unpublished work holds this workspace or another worktree has the branch, it SHALL recap the change and stop with a next-step question, and SHALL NOT build or edit files.

#### Scenario: Branch open in another worktree

- **WHEN** `/apply add-auth` runs and `add-auth`'s branch is checked out in another worktree
- **THEN** it recaps the change, says where the branch is open, and asks what next, with nothing built here
