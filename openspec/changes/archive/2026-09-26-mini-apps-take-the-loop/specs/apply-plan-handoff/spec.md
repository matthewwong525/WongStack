## MODIFIED Requirements

### Requirement: Apply ensures an applicable plan exists

`/apply` SHALL resolve the line of work the user intends to implement before it starts. An explicit change reference SHALL take precedence, followed by the change established in the current conversation, then a unique active change modified in the current worktree or branch diff, then a change whose recorded branch or legacy name matches the current branch. A sole active change MAY be selected only when the conversation does not establish different new work.

The plan `/apply` needs SHALL depend on the kind of work. A change to the repo's code or process, a mini app included, SHALL need an apply-ready OpenSpec change. Work that changes no repo file SHALL need the to-do in the conversation, as `work-verbs` defines.

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

- **WHEN** an explicit reference, current conversation, or current branch evidence resolves an apply-ready change
- **THEN** `/apply` delegates that change directly to the OpenSpec apply step
- **AND** it does not invoke `/plan` again

#### Scenario: Differently named change is in the worktree

- **WHEN** a feature branch has one changed active OpenSpec folder whose name differs from the branch
- **THEN** `/apply` selects that folder before considering an unrelated sole active change

#### Scenario: Explicit change has incomplete planning artifacts

- **WHEN** the user explicitly invokes `/apply` for an existing change that is not apply-ready
- **THEN** `/apply` invokes `/plan` to complete that same change's required artifacts
- **AND** it applies that change after the required artifacts are complete

#### Scenario: No intent can be resolved safely

- **WHEN** `/apply` has neither clear implementation intent nor an unambiguous applicable change
- **THEN** it asks the user to identify the work or change
- **AND** it does not plan or implement an inferred unrelated change

#### Scenario: Non-code work

- **WHEN** the conversation holds a to-do for work that changes no repo file
- **THEN** `/apply` works that to-do and creates no OpenSpec change

#### Scenario: A mini-app request

- **WHEN** the person asks for a new standalone page and no change represents it
- **THEN** `/apply` invokes `/plan` first, like any code change, and builds the page from that change

### Requirement: The shortcut preserves workflow ownership

Automatic planning SHALL NOT move artifact-authoring behavior into `/apply`, move git behavior out of `/save`, or make standalone `/plan` automatically implement its output. A completed implementation SHALL end with a preview from the agent host and SHALL NOT invoke `/save`, as `apply-completion-handoff` defines.

#### Scenario: User invokes plan by itself

- **WHEN** the user invokes `/plan` without asking to apply
- **THEN** the workflow creates the apply-ready artifacts and stops before implementation

#### Scenario: Auto-planned apply completes all tasks

- **WHEN** `/apply` planned the work automatically and completes every task
- **THEN** it uploads a preview from the agent host and asks whether to publish, without invoking `/save`
- **AND** `/save` remains the owner of branch, commit, push, pull-request, CI-preview, and CI mechanics
