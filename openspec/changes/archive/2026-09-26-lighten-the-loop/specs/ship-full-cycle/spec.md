## ADDED Requirements

### Requirement: A one-go ship checkpoints once

When `/ship` pulls in `/apply`, `/apply` SHALL return to `/ship` on completion without invoking `/save`. `/ship` SHALL then archive the change in the working tree and invoke ordinary `/save` exactly once, which creates the feature branch when the work is still on the default branch. A one-go run SHALL therefore have one checkpoint and one CI run before its walk. The ship-time `/verify` SHALL still run once before the merge, and its `FAILURE` pause SHALL still ask the user. The pulled-in stage SHALL otherwise change nothing in the `apply-plan-handoff` and `delivery-gate` contracts. The change loop page SHALL state the one rule every verb follows: when its precondition is missing, invoke the verb before it to produce it.

#### Scenario: One checkpoint in a one-go run

- **WHEN** `/ship <intent>` runs the full chain to merge
- **THEN** only the `/save` after the archive runs, and CI runs once
- **AND** `/ship` merges only on that checkpoint's `SUCCESS` or `NONE`

#### Scenario: A red walk still pauses

- **WHEN** the ship-time `/verify` returns `FAILURE` inside a one-go run
- **THEN** `/ship` stops and asks the user whether to fix or merge anyway

#### Scenario: Standalone apply still saves

- **WHEN** the person invokes `/apply` directly and every task completes
- **THEN** `/apply` invokes `/save` as `apply-completion-handoff` defines

#### Scenario: A reader looks up the chain rule

- **WHEN** a reader opens the change loop page
- **THEN** it states that each verb invokes the verb before it when its precondition is missing
- **AND** it shows the nesting `/ship` → `/apply` → `/plan` → `/explore`

### Requirement: A mini-app pull request ships without a change record

When `/ship` runs on a branch whose pull request came from a mini-app save — the session says so, or the body is in the renderer's mini-app mode — and whose diff stays under `mini-apps/` and `schema/migrations/`, it SHALL NOT look for, write, or archive an OpenSpec change. It SHALL invoke `/save` once in its mini-app pull-request form, which updates the pull request and waits for CI, SHALL NOT invoke `/verify`, and SHALL merge on that result. On any other branch with no change record, `/ship` SHALL stop and report it as before.

#### Scenario: Merge a mini-app pull request

- **WHEN** the person asks to ship a mini-app pull request that added a migration
- **THEN** `/ship` runs one `/save` and merges on its gate result
- **AND** no OpenSpec change is created or archived, and no walk runs

#### Scenario: An unknown branch without a record

- **WHEN** `/ship` runs on a branch with commits, no change record, and no mini-app pull request
- **THEN** `/ship` stops and reports that the branch has no change record

## MODIFIED Requirements

### Requirement: Ship pulls in apply when there is nothing to ship

When `/ship`'s preflight finds nothing to ship — the current branch is the default branch, or the branch has no commits ahead and a clean tree — `/ship` SHALL invoke `/apply` before its own runbook, in one of two forms:

- **An argument was given.** `/ship` SHALL hand the argument to `/apply` verbatim.
- **No argument was given.** `/ship` SHALL invoke `/apply` with no argument when `/apply`'s resolve order selects a change the user named, a change created or discussed in this session, or a unique active change evidenced by the current worktree or branch diff, recorded for the branch, or matching the branch by legacy convention — or when no change exists yet and the session states clear implementation intent. Where resolution would instead fall through to the sole-active-change fallback that the conversation does not establish, or to no resolvable intent, `/ship` SHALL stop and SHALL state that it found nothing to continue.

`/ship` SHALL resolve nothing itself: the test is a question about which item of `/apply`'s existing resolve order applies, and `/ship` SHALL NOT implement a second intent resolver or override `/apply`'s ordering. `/apply` SHALL resolve the work under its existing rules, invoking `/plan` when no apply-ready change exists and implementing the tasks, and SHALL return to `/ship` on completion without a checkpoint. `/ship` SHALL then continue to its archive step in the same working tree. The `/ship` invocation SHALL authorize the whole chain — explore, plan, implement, archive, save, merge — with no re-prompt between stages, whether or not an argument was given.

#### Scenario: Ship from the default branch with an intent

- **WHEN** the user invokes `/ship <description>` on the default branch
- **THEN** `/ship` invokes `/apply` with that description
- **AND** after `/apply` completes, `/ship` archives the change, runs one `/save` that creates the branch, and merges

#### Scenario: Ship with an existing change name

- **WHEN** the user invokes `/ship <name>` where `<name>` is an active change with no branch commits yet
- **THEN** `/apply` resolves that change under its existing rules and works its tasks
- **AND** `/ship` continues once `/apply` has completed

#### Scenario: Bare ship continues what the session explored

- **WHEN** the user invokes `/ship` with no argument on a clean branch, in a session where `/explore` or `/plan` has already established the line of work
- **THEN** `/ship` invokes `/apply` with no argument and names the intent it is continuing
- **AND** the chain runs to merge without the user restating that intent as an argument

#### Scenario: Bare ship on the default branch

- **WHEN** the user invokes `/ship` with no argument on the default branch, in a session that establishes no line of work
- **THEN** `/ship` stops as it does today
- **AND** it does not invoke `/apply`

#### Scenario: Bare ship on the default branch after exploring

- **WHEN** the user invokes `/ship` with no argument on the default branch, in a session that has established the line of work
- **THEN** `/ship` invokes `/apply`, which returns on completion without a checkpoint
- **AND** `/ship` archives the change, and its one `/save` cuts the branch

#### Scenario: Bare ship with nothing in the conversation stops

- **WHEN** the user invokes `/ship` with no argument in a session that establishes no line of work, and the repo has one or more active changes
- **THEN** `/ship` stops without invoking `/apply`
- **AND** it reports that it found nothing to continue, rather than selecting an active change

#### Scenario: Ship on a branch that already has work

- **WHEN** the user invokes `/ship` with or without an argument on a feature branch with commits ahead or a dirty tree
- **THEN** `/ship` selects the unique change evidenced on that branch regardless of its name
- **AND** it runs its archive steps on that selected change without invoking `/apply` from the preflight

#### Scenario: A reader looks up the rule

- **WHEN** a reader opens the change loop page or the repo's verbs rule
- **THEN** the rule is stated without conditioning it on an argument
- **AND** the nesting `/ship` → `/apply` → `/plan` → `/explore` reads as one uniform rule, with the cold-session stop named as its one exception

### Requirement: Ship completes an unfinished change rather than archiving it

Before archiving, `/ship` SHALL read the change's `tasks.md`. When it has unchecked tasks, `/ship` SHALL invoke `/apply` for that exact change to finish them, `/apply` SHALL return without a checkpoint, and `/ship` SHALL re-check. `/ship` SHALL NOT archive an incomplete change. `/ship`'s standing authorization SHALL NOT extend to the archive step's incomplete-task confirmation: that confirmation SHALL reach the user, or the guard SHALL have already removed the condition that raises it. When `/apply` ends with tasks still pending, `/ship` SHALL report that work and stop before the archive.

#### Scenario: A planned but unimplemented change is finished first

- **WHEN** `/ship` runs on a branch whose change has unchecked tasks
- **THEN** `/ship` invokes `/apply` for that change before its archive step
- **AND** it archives only after every task is checked

#### Scenario: The archive's confirmation is never auto-answered

- **WHEN** the archive step would warn about incomplete tasks and ask the user to confirm
- **THEN** `/ship`'s "don't re-prompt" authorization does not answer that confirmation on the user's behalf
- **AND** no archive, checkpoint, or merge occurs on the incomplete state

#### Scenario: A complete change archives unchanged

- **WHEN** `/ship` runs on a branch whose change has every task checked
- **THEN** the guard adds no step and the archive, the one checkpoint, the walk, and the merge run

## REMOVED Requirements

### Requirement: The chain composes with the existing contracts

**Reason**: A one-go run no longer has two checkpoints.
**Migration**: See "A one-go ship checkpoints once".
