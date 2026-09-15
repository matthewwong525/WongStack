## RENAMED Requirements

- FROM: `### Requirement: Ship with an argument pulls in apply`
- TO: `### Requirement: Ship pulls in apply when there is nothing to ship`

## MODIFIED Requirements

### Requirement: Ship pulls in apply when there is nothing to ship

When `/ship`'s preflight finds nothing to ship — the current branch is the default branch, or the branch has no commits ahead and a clean tree — `/ship` SHALL invoke `/apply` before its own runbook, in one of two forms:

- **An argument was given.** `/ship` SHALL hand the argument to `/apply` verbatim.
- **No argument was given.** `/ship` SHALL invoke `/apply` with no argument when `/apply`'s resolve order lands on one of its first three items — a change the user named, a change created or discussed in this session, or an active change whose name matches the current branch — or when no change exists yet and the session states clear implementation intent. Where resolution would instead fall through to item 4, a sole active change the conversation does not establish, or to no resolvable intent, `/ship` SHALL stop and SHALL state that it found nothing to continue.

`/ship` SHALL resolve nothing itself: the test is a question about which item of `/apply`'s existing resolve order applies, and `/ship` SHALL NOT implement a second intent resolver or override `/apply`'s ordering. `/apply` SHALL resolve the work under its existing rules, invoking `/plan` when no apply-ready change exists, implementing the tasks, and invoking `/save` on completion. `/ship` SHALL then continue from its preflight on the branch `/save` created. The `/ship` invocation SHALL authorize the whole chain — explore, plan, implement, save, archive, verify, merge — with no re-prompt between stages, whether or not an argument was given.

#### Scenario: Ship from the default branch with an intent

- **WHEN** the user invokes `/ship <description>` on the default branch
- **THEN** `/ship` invokes `/apply` with that description
- **AND** after `/apply` completes and `/save` has pushed the branch, `/ship` runs its archive, checkpoint, verify, and merge steps on that branch

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
- **THEN** `/ship` invokes `/apply`, which reaches `/save` and cuts the branch
- **AND** `/ship` re-runs its preflight on that branch and continues

#### Scenario: Bare ship with nothing in the conversation stops

- **WHEN** the user invokes `/ship` with no argument in a session that establishes no line of work, and the repo has one or more active changes
- **THEN** `/ship` stops without invoking `/apply`
- **AND** it reports that it found nothing to continue, rather than selecting an active change

#### Scenario: Ship on a branch that already has work

- **WHEN** the user invokes `/ship` with or without an argument on a feature branch with commits ahead or a dirty tree
- **THEN** `/ship` runs its existing runbook without invoking `/apply` from the preflight

#### Scenario: A reader looks up the rule

- **WHEN** a reader opens the change loop page or the repo's verbs rule
- **THEN** the rule is stated without conditioning it on an argument
- **AND** the nesting `/ship` → `/apply` → `/plan` → `/explore` reads as one uniform rule, with the cold-session stop named as its one exception

## ADDED Requirements

### Requirement: Ship completes an unfinished change rather than archiving it

Before archiving, `/ship` SHALL read the change's `tasks.md`. When it has unchecked tasks, `/ship` SHALL invoke `/apply` for that exact change to finish them, then re-check, and SHALL NOT archive an incomplete change. `/ship`'s standing authorization SHALL NOT extend to the archive step's incomplete-task confirmation: that confirmation SHALL reach the user, or the guard SHALL have already removed the condition that raises it. When `/apply` ends with tasks still pending, `/ship` SHALL report that work and stop before the archive.

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
- **THEN** the guard adds no step and the existing archive, checkpoint, verify, and merge run as before
