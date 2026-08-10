# apply-completion-handoff Specification

## Purpose

Define the automatic checkpoint boundary between completed `/apply` work and `/save`, while preserving intentional handling of partial work.

## Requirements

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

### Requirement: Incomplete apply does not automatically checkpoint

`/apply` MUST NOT invoke `/save` **as a way of stopping**. When implementation is paused, blocked, interrupted, fails, or simply ends with tasks still pending, `/apply` SHALL report the remaining work and SHALL tell the user that `/save` remains available for an intentional partial checkpoint.

This prohibition is scoped to the exit path. It SHALL NOT be stated as a ban on invoking `/save` while pending tasks remain, because a task may itself require the gate — see "Save is how a gate-requiring task is implemented".

#### Scenario: Implementation pauses with pending tasks

- **WHEN** `/apply` stops because of ambiguity, a blocker, interruption, or an implementation failure while tasks remain
- **THEN** it does not invoke `/save`
- **AND** it reports the remaining work and the option to run `/save` manually

#### Scenario: A gate-requiring task is not treated as an exit

- **WHEN** `/apply` invokes `/save` to implement a task that requires the gate, and tasks remain after it
- **THEN** this is not an exit checkpoint and the prohibition does not apply
- **AND** `/apply` continues with the remaining tasks rather than stopping

### Requirement: Save is how a gate-requiring task is implemented

`/apply` SHALL invoke `/save` to perform a task whose own definition of done requires something only the gate can produce — a passing CI run, a deployed preview URL, pushed browser evidence — then read the result, mark the task accordingly, and continue with the remaining tasks. Invoking `/save` this way is implementation of that task, not a partial checkpoint, because `/apply` owns no git and nothing builds locally as a prerequisite (see the `delivery-gate` capability).

Task-driven invocations SHALL be unbounded and driven by `tasks.md`. The "exactly once" constraint SHALL apply only to the automatic completion handoff.

Payload surfaces that front the apply step SHALL state this distinction by pointing at the one surface that owns it, per the `payload-single-source` capability.

#### Scenario: A mid-list task requires a passing build

- **WHEN** a pending task states that the build or CI must pass, and later tasks remain
- **THEN** `/apply` invokes `/save` to push and obtain the gate result
- **AND** marks the task complete when the gate reports success
- **AND** proceeds to the next pending task without a second completion handoff

#### Scenario: The gate reports failure on a task-driven save

- **WHEN** a task-driven `/save` returns a failing or unverifiable gate result
- **THEN** `/apply` does not mark that task complete
- **AND** it handles the failure as the ordinary blocked path — report and stop, without a further exit checkpoint

#### Scenario: The final task is itself gate-requiring

- **WHEN** the last pending task is completed by a task-driven `/save`
- **THEN** `/apply` does not invoke a second, redundant completion `/save` for the same state
- **AND** it reports completion using that checkpoint result

### Requirement: Plans name gate-requiring tasks explicitly

`/plan` SHALL author a task that can only be verified through the gate so that the task text says so — naming `/save` as how the verification happens — rather than leaving the implementer to infer it. This SHALL NOT introduce a mandatory verification task: a change whose work needs no gate result mid-list gets none, and the completion handoff covers it.

#### Scenario: A change needs a mid-list build check

- **WHEN** `/plan` writes a task whose done state depends on CI, a deployed preview, or browser evidence
- **THEN** the task text states that it is verified through `/save`

#### Scenario: A change needs no mid-list gate result

- **WHEN** no task depends on a gate result before later tasks can proceed
- **THEN** `tasks.md` contains no such verification task

### Requirement: Save remains independently invocable

The automatic completion handoff SHALL NOT remove or narrow `/save` as an independently invocable checkpoint at any point in the change loop.

#### Scenario: User wants an in-progress checkpoint

- **WHEN** the user invokes `/save` before `/apply` has completed every task
- **THEN** `/save` performs its existing checkpoint workflow without requiring `/apply` completion
