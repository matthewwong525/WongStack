# apply-completion-handoff Delta

## MODIFIED Requirements

### Requirement: Incomplete apply does not automatically checkpoint

`/apply` MUST NOT invoke `/save` **as a way of stopping**. When implementation is paused, blocked,
interrupted, fails, or simply ends with tasks still pending, `/apply` SHALL report the remaining work
and SHALL tell the user that `/save` remains available for an intentional partial checkpoint.

This prohibition is scoped to the exit path. It SHALL NOT be stated as a ban on invoking `/save`
while pending tasks remain, because a task may itself require the gate — see "Save is how a
gate-requiring task is implemented".

#### Scenario: Implementation pauses with pending tasks

- **WHEN** `/apply` stops because of ambiguity, a blocker, interruption, or an implementation failure while tasks remain
- **THEN** it does not invoke `/save`
- **AND** it reports the remaining work and the option to run `/save` manually

#### Scenario: A gate-requiring task is not treated as an exit

- **WHEN** `/apply` invokes `/save` to implement a task that requires the gate, and tasks remain after it
- **THEN** this is not an exit checkpoint and the prohibition does not apply
- **AND** `/apply` continues with the remaining tasks rather than stopping

## ADDED Requirements

### Requirement: Save is how a gate-requiring task is implemented

`/apply` SHALL invoke `/save` to perform a task whose own definition of done requires something only
the gate can produce — a passing CI run, a deployed preview URL, pushed browser evidence — then read
the result, mark the task accordingly, and continue with the remaining tasks. Invoking `/save`
this way is implementation of that task, not a partial checkpoint, because `/apply` owns no git and
nothing builds locally as a prerequisite (see the `delivery-gate` capability).

Task-driven invocations SHALL be unbounded and driven by `tasks.md`. The "exactly once" constraint
SHALL apply only to the automatic completion handoff.

Payload surfaces that front the apply step SHALL state this distinction by pointing at the one
surface that owns it, per the `payload-single-source` capability.

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

`/plan` SHALL author a task that can only be verified through the gate so that the task text says so
— naming `/save` as how the verification happens — rather than leaving the implementer to infer it.
This SHALL NOT introduce a mandatory verification task: a change whose work needs no gate result
mid-list gets none, and the completion handoff covers it.

#### Scenario: A change needs a mid-list build check

- **WHEN** `/plan` writes a task whose done state depends on CI, a deployed preview, or browser evidence
- **THEN** the task text states that it is verified through `/save`

#### Scenario: A change needs no mid-list gate result

- **WHEN** no task depends on a gate result before later tasks can proceed
- **THEN** `tasks.md` contains no such verification task
