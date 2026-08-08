## ADDED Requirements

### Requirement: Apply ensures an applicable plan exists

`/apply` SHALL resolve the line of work the user intends to implement before delegating to the OpenSpec apply step. An explicit change reference SHALL take precedence, followed by the change established in the current conversation or matching the current branch. A sole active change MAY be selected only when the conversation does not establish different new work.

#### Scenario: Apply follows exploration without a plan

- **WHEN** the current conversation has established implementation intent through `/explore`
- **AND** no apply-ready OpenSpec change represents that intent
- **THEN** `/apply` invokes `/plan` with the established intent
- **AND** it applies the exact change produced by that planning run

#### Scenario: Unrelated active change exists

- **WHEN** the current conversation establishes new implementation intent with no plan
- **AND** `openspec list` contains an active change for a different line of work
- **THEN** `/apply` plans the current work instead of auto-selecting the unrelated change

#### Scenario: Existing applicable plan is ready

- **WHEN** an explicit reference, current conversation, or matching branch resolves an apply-ready change
- **THEN** `/apply` delegates that change directly to the OpenSpec apply step
- **AND** it does not invoke `/plan` again

#### Scenario: Explicit change has incomplete planning artifacts

- **WHEN** the user explicitly invokes `/apply` for an existing change that is not apply-ready
- **THEN** `/apply` invokes `/plan` to complete that same change's required artifacts
- **AND** it applies that change after the required artifacts are complete

#### Scenario: No intent can be resolved safely

- **WHEN** `/apply` has neither clear implementation intent nor an unambiguous applicable change
- **THEN** it asks the user to identify the work or change
- **AND** it does not plan or implement an inferred unrelated change

### Requirement: Planning and implementation remain delegated

The shortcut SHALL invoke the existing `/plan` workflow for artifact authoring and the existing OpenSpec apply workflow for implementation. It SHALL pass the planned change name explicitly into the apply workflow so another active change cannot be selected between the two stages.

#### Scenario: Automatic planning completes

- **WHEN** `/apply` invokes `/plan` and the change becomes apply-ready
- **THEN** `/apply` announces the planned change
- **AND** it invokes the OpenSpec apply workflow with that exact change name

#### Scenario: Automatic planning pauses

- **WHEN** `/plan` pauses because required intent is unclear or artifact creation is blocked
- **THEN** `/apply` does not begin implementation
- **AND** it reports the planning blocker

### Requirement: The shortcut preserves workflow ownership

Automatic planning SHALL NOT move artifact-authoring behavior into `/apply`, move git behavior out of `/save`, or make standalone `/plan` automatically implement its output. A completed implementation SHALL continue to invoke `/save` exactly once under the existing `apply-completion-handoff` contract.

#### Scenario: User invokes plan by itself

- **WHEN** the user invokes `/plan` without asking to apply
- **THEN** the workflow creates the apply-ready artifacts and stops before implementation

#### Scenario: Auto-planned apply completes all tasks

- **WHEN** `/apply` planned the work automatically and completes every task
- **THEN** it invokes `/save` exactly once
- **AND** `/save` remains the owner of branch, commit, push, pull-request, preview, and CI mechanics
