## ADDED Requirements

### Requirement: The change loop has six verbs

The WongStack change loop SHALL be `/explore ▶ /plan ▶ /apply ▶ /save ▶ /continue ▶ /ship`, with `/apply` a distinct verb for implementing the active change. Every payload surface that describes the loop — the `WONG-STACK` block in `CLAUDE.md`, `README.md`, `docs/development/the-change-loop.md`, and the `install-wong-stack` skill — SHALL name all six verbs and describe `/apply` as the implement stage.

#### Scenario: Doctrine names the six-verb loop

- **WHEN** a reader reviews the loop description in `CLAUDE.md` or `the-change-loop.md`
- **THEN** the text lists `/apply` as its own stage between `/plan` and `/save`

### Requirement: /apply implements the active change

There SHALL be an `/apply` skill that implements the active OpenSpec change by fronting `/opsx:apply` (invoking the `openspec-apply-change` skill): it works the `tasks.md` checklist, writes code, and checks off `- [x]` as tasks land. `/apply` SHALL NOT run git (no commit, push, branch, or PR — that is `/save`) and SHALL assume the change's branch is already checked out.

#### Scenario: Apply works the tasks without git

- **WHEN** `/apply` runs on a checked-out change branch
- **THEN** it implements pending tasks and updates `tasks.md` checkboxes
- **AND** it does not commit, push, branch, or open a PR

### Requirement: /continue is cold-resume that hands off to /apply

`/continue` SHALL resume a change from another session or machine: parse a change name / PR reference (or offer the `openspec list` menu when given none), check out the branch, load the change as context, then — absent an explicit instruction — hand off to `/apply` to work the tasks. `/continue` SHALL own the git checkout (OpenSpec never runs git); an explicit trailing instruction SHALL override the default hand-off.

#### Scenario: Continue checks out then delegates to apply

- **WHEN** `/continue <name>` runs with a clean tree and no explicit instruction
- **THEN** it checks out the branch, loads the change, and invokes the `/apply` skill to implement the tasks

#### Scenario: Explicit instruction overrides the hand-off

- **WHEN** the user runs `/continue <name> rebase onto main and fix the failing test`
- **THEN** `/continue` does that instruction instead of the default `/apply` task loop
