## MODIFIED Requirements

### Requirement: Completed apply automatically checkpoints

When `/apply` completes every task in the selected change, it SHALL invoke the existing `/save` skill before reporting the workflow complete. The handoff SHALL delegate all sync, git, PR, preview, and CI behavior to `/save` rather than duplicating that behavior inside `/apply`.

This SHALL hold for **every payload surface that fronts the apply step**, including `.claude/skills/apply/SKILL.md`, `.claude/skills/openspec-apply-change/SKILL.md`, and `.claude/commands/opsx/apply.md`. No surface SHALL describe a completion path that ends in anything other than this handoff — in particular, none SHALL direct the user to archive instead. Surfaces SHALL satisfy this by pointing at the one that owns the behavior rather than by each restating it, per the `payload-single-source` capability.

#### Scenario: Final pending task completes

- **WHEN** `/apply` marks the final pending task complete
- **THEN** it invokes `/save` for the completed change
- **AND** it reports completion using the checkpoint result from `/save`

#### Scenario: Apply begins with all tasks already complete

- **WHEN** `/apply` selects a change whose task list is already complete
- **THEN** it invokes `/save` so any completed but uncheckpointed work receives the normal durable handoff

#### Scenario: The raw command is used instead of the verb

- **WHEN** a user runs `/opsx:apply` and its tasks all complete
- **THEN** the completion hands off to `/save` exactly as `/apply` does
- **AND** no surface suggests archiving as the completion step

#### Scenario: A surface references a command that does not exist

- **WHEN** a payload surface directs the user to a command
- **THEN** that command exists in the payload
