## ADDED Requirements

### Requirement: Completed apply automatically checkpoints

When `/apply` completes every task in the selected change, it SHALL invoke the existing `/save` skill before reporting the workflow complete. The handoff SHALL delegate all sync, git, PR, preview, and CI behavior to `/save` rather than duplicating that behavior inside `/apply`.

#### Scenario: Final pending task completes

- **WHEN** `/apply` marks the final pending task complete
- **THEN** it invokes `/save` for the completed change
- **AND** it reports completion using the checkpoint result from `/save`

#### Scenario: Apply begins with all tasks already complete

- **WHEN** `/apply` selects a change whose task list is already complete
- **THEN** it invokes `/save` so any completed but uncheckpointed work receives the normal durable handoff

### Requirement: Incomplete apply does not automatically checkpoint

`/apply` MUST NOT automatically invoke `/save` while tasks remain pending or when implementation is paused, blocked, interrupted, or fails. It SHALL tell the user that `/save` remains available for an intentional partial checkpoint.

#### Scenario: Implementation pauses with pending tasks

- **WHEN** `/apply` stops because of ambiguity, a blocker, interruption, or an implementation failure while tasks remain
- **THEN** it does not invoke `/save`
- **AND** it reports the remaining work and the option to run `/save` manually

### Requirement: Save remains independently invocable

The automatic completion handoff SHALL NOT remove or narrow `/save` as an independently invocable checkpoint at any point in the change loop.

#### Scenario: User wants an in-progress checkpoint

- **WHEN** the user invokes `/save` before `/apply` has completed every task
- **THEN** `/save` performs its existing checkpoint workflow without requiring `/apply` completion
