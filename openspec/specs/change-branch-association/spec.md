# change-branch-association Specification

## Purpose

Keep a durable link between an OpenSpec change and its feature branch so workflow commands can checkpoint and resume work even when their names differ.
## Requirements
### Requirement: Save records the selected change's actual branch

`/save` SHALL select the change established by explicit input, current-session context, or a unique active change modified in the current worktree or branch diff. It SHALL record the actual feature branch in that change's proposal. The change folder and the session's facts SHALL use the change name as their slug. It SHALL NOT create a second change solely because the branch name differs.

#### Scenario: A unique uncommitted change has another name

- **WHEN** `/save` runs on feature branch `editor-work` with a single uncommitted active change `review-handoff`
- **THEN** it updates `review-handoff` and records `editor-work` as its branch
- **AND** it does not create `openspec/changes/editor-work/`

#### Scenario: A clean branch holds a committed change

- **WHEN** the worktree is clean and the branch diff contains one active change whose name differs from the branch
- **THEN** `/save` selects that change for its checkpoint and PR body

#### Scenario: Several changes are plausible

- **WHEN** more than one active change is modified on the current branch and no explicit or session selection resolves one
- **THEN** `/save` asks which change to update before writing another change

### Requirement: Continue resolves the branch independently of the change name

`/continue` SHALL read the branch recorded in the selected change's proposal. A PR reference SHALL use its actual head branch and resolve the change carried there. A proposal with no branch field SHALL be resumed in the current checkout or after the user names its branch. `/continue` SHALL NOT assume that a change name is a branch name.

#### Scenario: Resume a saved change by name

- **WHEN** `/continue review-handoff` reads a proposal with `Branch: editor-work`
- **THEN** it checks out `editor-work` when checkout is safe and resumes `review-handoff`

#### Scenario: Resume from a fresh clone

- **WHEN** the current checkout has no `review-handoff` folder but one fetched remote branch carries it
- **THEN** `/continue review-handoff` reads the proposal from that branch and checks out its recorded branch when safe

#### Scenario: Resume by pull request

- **WHEN** a PR head branch has a unique changed active OpenSpec folder with another name
- **THEN** `/continue` loads that folder and resumes it on the PR head branch

#### Scenario: Legacy same-name handoff

- **WHEN** a change has no recorded branch and a branch with the same name exists
- **THEN** `/continue` does not check out that branch on the name alone, and asks for the branch when the change is not in the current checkout
