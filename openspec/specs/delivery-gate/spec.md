# delivery-gate Specification

## Purpose
TBD - created by archiving change optional-ci-gate. Update Purpose after archive.
## Requirements
### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. Doctrine text across the payload — `CLAUDE.md`, `README.md`, `wiki/development/the-change-loop.md`, and the `save`, `ship`, and `wong-setup` skills — MUST NOT assert CI as the sole or required gate. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

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

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate.

#### Scenario: No CI present does not trigger a local build

- **WHEN** a repo has no CI and `/ship` is invoked
- **THEN** the skill does not run a local build or test as a gate; it relies on PR review

