## MODIFIED Requirements

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
