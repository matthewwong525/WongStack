# ship-full-cycle Specification

## Purpose

`/ship` can carry a task from intent to merge in one invocation by pulling in `/apply` when the branch has nothing to ship, so every verb in the loop follows one rule: when its precondition is missing, invoke the verb before it.

## Requirements

### Requirement: Ship with an argument pulls in apply

When `/ship` is invoked with an argument and its preflight finds nothing to ship — the current branch is the default branch, or the branch has no commits ahead and a clean tree — `/ship` SHALL hand the argument to `/apply` verbatim before its own runbook. `/apply` SHALL resolve the argument under its existing rules, invoking `/plan` when no apply-ready change exists, implementing the tasks, and invoking `/save` on completion. `/ship` SHALL then continue from its preflight on the branch `/save` created. The `/ship` invocation SHALL authorize the whole chain — explore, plan, implement, save, archive, verify, merge — with no re-prompt between stages.

#### Scenario: Ship from the default branch with an intent

- **WHEN** the user invokes `/ship <description>` on the default branch
- **THEN** `/ship` invokes `/apply` with that description
- **AND** after `/apply` completes and `/save` has pushed the branch, `/ship` runs its archive, checkpoint, verify, and merge steps on that branch

#### Scenario: Ship with an existing change name

- **WHEN** the user invokes `/ship <name>` where `<name>` is an active change with no branch commits yet
- **THEN** `/apply` resolves that change under its existing rules and works its tasks
- **AND** `/ship` continues once `/apply` has completed

#### Scenario: Bare ship on the default branch

- **WHEN** the user invokes `/ship` with no argument on the default branch
- **THEN** `/ship` stops as it does today
- **AND** it does not invoke `/apply`

#### Scenario: Ship on a branch that already has work

- **WHEN** the user invokes `/ship` with or without an argument on a feature branch with commits ahead or a dirty tree
- **THEN** `/ship` runs its existing runbook without invoking `/apply`

### Requirement: Ship never merges as a way of stopping

When the pulled-in stage does not reach completion — `/plan` pauses on unclear intent, `/apply` ends with tasks pending, or a task-driven or completion `/save` returns a failing or unverifiable result — `/ship` SHALL report the blocker and stop before its archive step. It SHALL NOT archive, checkpoint, or merge a partial change.

#### Scenario: Planning pauses inside the chain

- **WHEN** `/plan` pauses because the intent is unclear
- **THEN** `/ship` reports the planning blocker and stops
- **AND** no archive or merge occurs

#### Scenario: Apply stops with tasks pending

- **WHEN** `/apply` reports remaining work instead of completing
- **THEN** `/ship` reports that work and stops
- **AND** it does not invoke `/save` on the partial state

### Requirement: The chain composes with the existing contracts

The pulled-in stage SHALL change nothing in the `apply-plan-handoff`, `apply-completion-handoff`, and `delivery-gate` contracts. `/apply` SHALL still invoke `/save` exactly once on completion, and `/ship` SHALL still invoke ordinary `/save` exactly once after the archive, so a one-go run has two checkpoints. The ship-time `/verify` `FAILURE` pause SHALL still ask the user. The change loop page SHALL state the one rule every verb now follows: when its precondition is missing, invoke the verb before it to produce it.

#### Scenario: Two checkpoints in a one-go run

- **WHEN** `/ship <intent>` runs the full chain to merge
- **THEN** `/apply`'s completion `/save` and `/ship`'s archive `/save` both run
- **AND** `/ship` merges only on the archive checkpoint's `SUCCESS` or `NONE`

#### Scenario: A red walk still pauses

- **WHEN** the ship-time `/verify` returns `FAILURE` inside a one-go run
- **THEN** `/ship` stops and asks the user whether to fix or merge anyway

#### Scenario: A reader looks up the chain rule

- **WHEN** a reader opens the change loop page
- **THEN** it states that each verb invokes the verb before it when its precondition is missing
- **AND** it shows the nesting `/ship` → `/apply` → `/plan` → `/explore`
