## MODIFIED Requirements

### Requirement: Ship pulls in apply when there is nothing to ship

When `/ship`'s preflight finds nothing to ship — the current branch is the default branch, or the branch has no commits ahead and a clean tree — `/ship` SHALL invoke `/apply` before its own runbook, in one of two forms:

- **An argument was given.** `/ship` SHALL hand the argument to `/apply` verbatim.
- **No argument was given.** `/ship` SHALL invoke `/apply` with no argument when `/apply`'s resolve order selects a change the user named, a change created or discussed in this session, or a unique active change evidenced by the current worktree or branch diff, recorded for the branch, or matching the branch by legacy convention — or when no change exists yet and the session states clear implementation intent. Where resolution would instead fall through to the sole-active-change fallback that the conversation does not establish, or to no resolvable intent, `/ship` SHALL stop and SHALL state that it found nothing to continue.

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
- **THEN** `/ship` selects the unique change evidenced on that branch regardless of its name
- **AND** it runs its archive steps on that selected change without invoking `/apply` from the preflight

#### Scenario: A reader looks up the rule

- **WHEN** a reader opens the change loop page or the repo's verbs rule
- **THEN** the rule is stated without conditioning it on an argument
- **AND** the nesting `/ship` → `/apply` → `/plan` → `/explore` reads as one uniform rule, with the cold-session stop named as its one exception

## ADDED Requirements

### Requirement: Ship archives only the selected change

`/ship` SHALL keep the selected OpenSpec change name separate from the current branch name. It SHALL check the selected change's tasks and artifacts, archive that change, and hand its exact archive path to `/save`. If another active change is part of the branch diff, `/ship` SHALL stop before merge rather than silently ship both.

#### Scenario: Branch and change names differ

- **WHEN** branch `editor-work` carries the unique change `review-handoff`
- **THEN** `/ship` checks and archives `review-handoff`
- **AND** its archive checkpoint uses the `review-handoff` record on branch `editor-work`

#### Scenario: Branch contains two active changes

- **WHEN** the branch diff contains two active OpenSpec change folders
- **THEN** `/ship` stops before archive or merge and identifies the ambiguity
