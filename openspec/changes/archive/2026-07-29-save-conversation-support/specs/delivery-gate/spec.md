# delivery-gate Specification (delta)

## MODIFIED Requirements

### Requirement: The gate is CI-when-present, else PR review

`/save` and `/ship` SHALL determine the gate by whether the repo has checks configured. When checks exist, the skills wait for them and, on failure, read-fix-repush (capped); `/ship` merges only on green. When no checks exist, the gate SHALL be PR review only — the PR plus the OpenSpec change and the in-repo record is the system, and a human approves the PR before `/ship` merges.

**Notes-only exception.** A `/save` whose entire diff is confined to `notes/*.md` SHALL bypass the branch-and-PR gate and commit directly to the default branch. This carve-out is scoped by path and is exact: if any path outside `notes/*.md` appears in the diff, the normal branch + PR flow applies in full. The gate is not weakened by this — a note is raw, unconsolidated, and non-canonical, so there is nothing to approve; the review of its claims happens one step later when `/dream` proposes wiki edits, and those edits SHALL go through the normal branch + PR gate.

#### Scenario: Repo has CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` reports checks
- **THEN** the skill waits for the checks, auto-fixes on red (cap 3 attempts), and `/ship` merges only once green

#### Scenario: Repo has no CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` returns `NONE`
- **THEN** the skill proceeds without waiting for or requiring any CI run
- **AND** `/ship` merges on the strength of PR review rather than a green CI run

#### Scenario: Notes-only save bypasses the gate

- **WHEN** `/save` runs and every changed path matches `notes/*.md`
- **THEN** it commits and pushes directly to the default branch, opening no PR and requiring no `/ship`

#### Scenario: A single non-note path restores the gate

- **WHEN** a save's diff contains `notes/<slug>.md` plus any other path
- **THEN** the normal branch + PR flow applies and the note rides along on that branch

#### Scenario: Wiki edits keep the gate

- **WHEN** `/dream` has consolidated notes into `wiki/` and `/save` runs
- **THEN** the diff includes paths outside `notes/`, so the change goes through a branch and a PR for review
