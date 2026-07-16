# change-handoff Specification

## Purpose
TBD - created by archiving change evolve-change-loop. Update Purpose after archive.
## Requirements
### Requirement: Proposal carries a status + open-questions header

Every `proposal.md` that `/save` authors or updates SHALL carry two lines directly under its H1: `**Status:**` and `**Open questions:**`. Status vocabulary SHALL be exactly one of `in-progress`, `blocked (<on what>)`, `ready-to-ship`, or `parked`. Open questions SHALL list decisions only the user can make, or `none`. `/save` SHALL maintain both lines on every checkpoint.

#### Scenario: Save sets the status header

- **WHEN** `/save` authors or updates a change's `proposal.md`
- **THEN** the file has `**Status:**` and `**Open questions:**` lines under the H1
- **AND** the Status value is one of the four allowed states

#### Scenario: A save note sets the status

- **WHEN** the user runs `/save blocked on API key from ops`
- **THEN** the note is read as a state and the Status line is set to `blocked (API key from ops)`

### Requirement: Proposal carries an append-only decision log

Every `proposal.md` SHALL end with a `## Decision log` section that is append-only. Each `/save` SHALL append exactly one dated bullet (`- **YYYY-MM-DD** — <what landed, decided, discovered, ruled out, or blocked on>`) and SHALL NOT rewrite, reorder, or delete prior entries. Plan sections above the log MAY change; the log MAY NOT.

#### Scenario: Save appends one dated log entry

- **WHEN** `/save` runs on a change that already has a decision log
- **THEN** exactly one new dated bullet is appended and every prior entry is left byte-for-byte unchanged

#### Scenario: Plan sections update while the log is preserved

- **WHEN** the plan's What-Changes section is revised on a later save
- **THEN** the plan section is updated in place and no decision-log entry is altered

### Requirement: The PR body mirrors the change

`/save` SHALL regenerate the PR body on every run as a mirror of the change — status, condensed plan, the `tasks.md` checklist, and a resume hint (`/continue <name>`). The body SHALL be treated as generated, not curated; `/save` SHALL NOT attempt to preserve manual body edits (reviewers comment instead).

#### Scenario: Save regenerates the PR body from the change

- **WHEN** `/save` pushes to a branch with an open PR
- **THEN** the PR body is overwritten with the current status, plan summary, task checklist, and a `/continue` resume hint

### Requirement: Continue recaps the journey and checks drift

`/continue` SHALL, when loading a change, recap the last 1–3 `## Decision log` entries (the "why") alongside the plan, and SHALL run a counts-only drift check (commits ahead of main vs task-checkbox state, and unresolved review comments if a PR exists) without loading diffs. When commits appear ahead of what `tasks.md` records, `/continue` SHALL flag the drift.

#### Scenario: Continue surfaces the decision log

- **WHEN** `/continue <name>` loads a change with a populated decision log
- **THEN** the recap includes the last 1–3 log entries so the resumer inherits the why

#### Scenario: Continue flags drift

- **WHEN** the branch has more commits ahead of main than `tasks.md` checkboxes reflect
- **THEN** `/continue` reports the count mismatch and flags that work may have landed without a `/save`

