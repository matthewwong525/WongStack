# apply-plan-handoff Specification

## Purpose

Define how `/apply` resolves or creates the applicable OpenSpec plan before implementation while preserving the existing workflow ownership boundaries.

## Requirements

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

Automatic planning SHALL NOT move artifact-authoring behavior into `/apply`, move git behavior out of `/save`, or make standalone `/plan` automatically implement its output. A completed implementation SHALL end with a preview from the agent host and SHALL NOT invoke `/save`, as `apply-completion-handoff` defines.

#### Scenario: User invokes plan by itself

- **WHEN** the user invokes `/plan` without asking to apply
- **THEN** the workflow creates the apply-ready artifacts and stops before implementation

#### Scenario: Auto-planned apply completes all tasks

- **WHEN** `/apply` planned the work automatically and completes every task
- **THEN** it uploads a preview from the agent host and asks whether to publish, without invoking `/save`
- **AND** `/save` remains the owner of branch, commit, push, pull-request, CI-preview, and CI mechanics

### Requirement: Apply works the tasks in a fresh helper agent

Once the selected change is apply-ready, `/apply` SHALL work its pending tasks in a fresh helper agent rather than in the conversation that invoked it, when the host can start one. The parent SHALL pass the helper only the exact change name and the path of the helper's brief; the helper SHALL read the change's artifacts from disk. The helper SHALL implement tasks in order, mark each completed checkbox, and return a short report: the tasks it completed, the files it changed, and why it stopped. The helper SHALL NOT ask the person, run any git, pull-request, or CI action, invoke `/save`, upload a preview, delete caches, or run global installers.

The helper SHALL stop and return when a task is ambiguous, a blocker appears, or the next task needs the gate. The parent SHALL then ask the person, report the blocker, or invoke `/save` for the gate task, as `apply-completion-handoff` defines, and SHALL start a new helper for the tasks that remain. The parent SHALL keep plan resolution, the completion preview, the loosened-checks step, and the report. A follow-up edit after the preview SHALL run in the parent unless it adds tasks to the change, which a new helper works. A host that can not start a helper agent, or an `/apply` already running inside one, SHALL work the tasks inline.

#### Scenario: A change is built through a helper

- **WHEN** `/apply` selects an apply-ready change with pending tasks on a host that can start helper agents
- **THEN** a fresh helper agent works the tasks and returns a short report
- **AND** the parent uploads the preview and asks whether to publish

#### Scenario: The helper meets an ambiguous task

- **WHEN** the helper can not implement a task without a decision from the person
- **THEN** it stops and returns the question to the parent without asking
- **AND** the parent asks the person and starts a new helper for the remaining tasks after the answer

#### Scenario: The next task needs the gate

- **WHEN** the helper reaches a task whose done state needs CI, a CI preview, or pushed browser evidence
- **THEN** it returns without running `/save`
- **AND** the parent invokes `/save` for that task, marks it on success, and starts a new helper for the remaining tasks

#### Scenario: The host has no helper agents

- **WHEN** `/apply` runs on a host that can not start a helper agent
- **THEN** it works the tasks inline, as before

#### Scenario: A small tweak after the preview

- **WHEN** the person asks for a different color after the preview
- **THEN** the parent makes the edit itself and uploads again under the same alias
