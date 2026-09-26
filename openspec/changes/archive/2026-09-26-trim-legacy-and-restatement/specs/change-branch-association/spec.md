## MODIFIED Requirements

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
