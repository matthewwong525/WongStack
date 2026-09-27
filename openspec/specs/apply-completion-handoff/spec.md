# apply-completion-handoff Specification

## Purpose

Define how completed `/apply` work ends — with a preview from the agent host and no automatic `/save` — and the boundary between `/apply` and `/save`, while preserving intentional handling of partial work.

## Requirements

### Requirement: Completed apply ends with a preview from the agent host

When `/apply` completes every task in the selected change, it SHALL upload a preview of the main app from the agent host, report the preview URL, and ask whether to publish the change, with saving and changing it more as the other choices. It SHALL NOT invoke `/save` on completion: the work stays in the working tree until the person saves or publishes. The upload SHALL use the pack's host preview script with the change's name as the alias, so each rebuild of one change updates the same preview. It SHALL skip the upload when the working tree leaves the main app untouched, by the same rule CI uses, and say so in one line. When the upload can not run — no stack pack or no credential — `/apply` SHALL state the reason in one line and still ask whether to publish. Two cases differ. When `/ship` invoked `/apply`, `/apply` SHALL return to `/ship` with no upload and no `/save`, because `/ship`'s archive checkpoint and its CI preview serve that run. When the work changes no repo file, `/apply` SHALL report the result with no upload and no `/save`, as `work-verbs` defines. `/apply` SHALL NOT perform any git, pull-request, or CI action itself.

This SHALL hold for **every payload surface that fronts the apply step**. No surface SHALL describe a completion path that ends in anything other than these outcomes — in particular, none SHALL direct the user to archive instead. Surfaces SHALL satisfy this by pointing at the one that owns the behavior rather than by each restating it, per the `payload-single-source` capability.

#### Scenario: Final pending task completes

- **WHEN** `/apply` marks the final pending task complete in a repo with the stack pack and a credential
- **THEN** it uploads a preview from the agent host and reports its URL
- **AND** it asks whether to publish, and does not invoke `/save`

#### Scenario: Apply begins with all tasks already complete

- **WHEN** `/apply` selects a change whose task list is already complete
- **THEN** it uploads the preview from the agent host and asks whether to publish, as on completion

#### Scenario: The raw command is used instead of the verb

- **WHEN** a payload surface other than `/apply` describes how the apply step completes
- **THEN** it points at `/apply`'s completion rule
- **AND** no surface suggests archiving as the completion step

#### Scenario: A surface references a command that does not exist

- **WHEN** a payload surface directs the user to a command
- **THEN** that command exists in the payload

#### Scenario: Ship pulled apply in

- **WHEN** `/ship` invoked `/apply` and the final task completes
- **THEN** `/apply` returns to `/ship` with no upload and no `/save`

#### Scenario: Non-code work completes

- **WHEN** `/apply` finishes a to-do that changed no repo file
- **THEN** it reports the result, uploads nothing, and does not invoke `/save`

#### Scenario: A change that leaves the app untouched

- **WHEN** `/apply` completes a change whose working tree changes only `wiki/` pages and Markdown files
- **THEN** it uploads no preview, says the app is unchanged, and asks whether to publish

#### Scenario: The upload can not run

- **WHEN** `/apply` completes a change in a repo with no Cloudflare credential
- **THEN** it states in one line that no preview was uploaded and why
- **AND** it still asks whether to publish

#### Scenario: The person asks for another change after the preview

- **WHEN** the person asks for a different color after `/apply` reported a preview
- **THEN** `/apply` makes the edit and uploads again under the same alias, with no save and no CI wait

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

`/apply` SHALL invoke `/save` to perform a task whose own definition of done requires something only the gate can produce — a passing CI run, a CI-published preview, pushed browser evidence — then read the result, mark the task accordingly, and continue with the remaining tasks. Invoking `/save` this way is implementation of that task, not a partial checkpoint, because `/apply` owns no git and nothing builds locally as a prerequisite (see the `delivery-gate` capability).

Task-driven invocations SHALL be unbounded and driven by `tasks.md`.

Payload surfaces that front the apply step SHALL state this distinction by pointing at the one surface that owns it, per the `payload-single-source` capability.

#### Scenario: A mid-list task requires a passing build

- **WHEN** a pending task states that the build or CI must pass, and later tasks remain
- **THEN** `/apply` invokes `/save` to push and obtain the gate result
- **AND** marks the task complete when the gate reports success
- **AND** proceeds to the next pending task

#### Scenario: The gate reports failure on a task-driven save

- **WHEN** a task-driven `/save` returns a failing or unverifiable gate result
- **THEN** `/apply` does not mark that task complete
- **AND** it handles the failure as the ordinary blocked path — report and stop, without a further exit checkpoint

#### Scenario: The final task is itself gate-requiring

- **WHEN** the last pending task is completed by a task-driven `/save`
- **THEN** `/apply` reports completion with that checkpoint's result and CI preview
- **AND** it uploads no second preview from the agent host

### Requirement: Plans name gate-requiring tasks explicitly

`/plan` SHALL author a task that can only be verified through the gate so that the task text says so — naming `/save` as how the verification happens — rather than leaving the implementer to infer it. This SHALL NOT introduce a mandatory verification task: a change whose work needs no gate result mid-list gets none, and the completion handoff covers it.

#### Scenario: A change needs a mid-list build check

- **WHEN** `/plan` writes a task whose done state depends on CI, a deployed preview, or browser evidence
- **THEN** the task text states that it is verified through `/save`

#### Scenario: A change needs no mid-list gate result

- **WHEN** no task depends on a gate result before later tasks can proceed
- **THEN** `tasks.md` contains no such verification task

### Requirement: Save remains independently invocable

Ending `/apply` with a host preview SHALL NOT remove or narrow `/save` as an independently invocable checkpoint at any point in the change loop.

#### Scenario: User wants an in-progress checkpoint

- **WHEN** the user invokes `/save` before `/apply` has completed every task
- **THEN** `/save` performs its existing checkpoint workflow without requiring `/apply` completion
