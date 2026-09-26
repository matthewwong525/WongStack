## MODIFIED Requirements

### Requirement: Completed apply automatically checkpoints

When `/apply` completes every task in the selected change, it SHALL invoke the existing `/save` skill before reporting the workflow complete, except in two cases. When `/ship` invoked `/apply`, `/apply` SHALL return to `/ship` without invoking `/save`, because `/ship`'s archive checkpoint is the one save of that run. When the work changes no repo file, `/apply` SHALL report the result and SHALL NOT invoke `/save`, as `work-verbs` defines. The handoff SHALL delegate all sync, git, PR, preview, and CI behavior to `/save` rather than duplicating that behavior inside `/apply`.

This SHALL hold for **every payload surface that fronts the apply step**, including `.claude/skills/apply/SKILL.md`, `.claude/skills/openspec-apply-change/SKILL.md`, and `.claude/commands/opsx/apply.md`. No surface SHALL describe a completion path that ends in anything other than these outcomes — in particular, none SHALL direct the user to archive instead. Surfaces SHALL satisfy this by pointing at the one that owns the behavior rather than by each restating it, per the `payload-single-source` capability.

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

#### Scenario: Ship pulled apply in

- **WHEN** `/ship` invoked `/apply` and the final task completes
- **THEN** `/apply` returns to `/ship` without invoking `/save`

#### Scenario: Non-code work completes

- **WHEN** `/apply` finishes a to-do that changed no repo file
- **THEN** it reports the result and does not invoke `/save`
