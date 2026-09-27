## REMOVED Requirements

### Requirement: CI is optional, not required

**Reason**: It named the prose allowlist as part of the doctrine and forbade saying wiki edits need a pull request; both are now false.
**Migration**: Replaced by "CI is optional, and every commit takes a pull request", which keeps every other clause.

### Requirement: The gate is CI-when-present, else PR review

**Reason**: Its prose exception sent wiki-only saves straight to the default branch, and seven scenarios described that route.
**Migration**: Replaced by "Every save takes the gate", which keeps the CI and no-CI rules and routes wiki-only saves through a pull request.

## ADDED Requirements

### Requirement: CI is optional, and every commit takes a pull request

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

This doctrine SHALL have **one owning file** — `wiki/development/the-change-loop.md` — which states the gate ladder (CI when present → merge, a skipped rung never being a failure). Other payload surfaces SHALL link to that owner rather than restate it, per the `payload-single-source` capability. `AGENTS.md`/`CLAUDE.md` MAY carry one summarizing line per doctrine, naming and linking the owner.

No payload surface SHALL assert CI as the sole or required gate, describe a save route chosen by path prefix or file extension, or say that any repository file reaches the default branch without a pull request. No payload surface SHALL describe the staging walkthrough as a rung of the gate ladder or as a condition on the merge. Where a surface links to the owner instead of restating it, that link SHALL satisfy this requirement.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

#### Scenario: No surface describes the walkthrough as a gate

- **WHEN** a reader reviews `wiki/development/the-change-loop.md`, the `ship` skill, or the stack section
- **THEN** no surface presents the staging walkthrough as a rung of the ladder or as a condition on the merge
- **AND** the walkthrough is described as something `/verify` produces on request

#### Scenario: No surface names a path-specific route

- **WHEN** a reader reviews `CLAUDE.md`, `wiki/README.md`, `wiki/wiki-style.md`, the change loop, and the `save` and `ship` skills
- **THEN** none describes a save or merge route for `wiki/` or any other path prefix
- **AND** none says a file edit goes straight to the default branch

#### Scenario: A surface contradicts the owner

- **WHEN** any payload surface states the gate in terms the owning file does not
- **THEN** that is a defect, resolved by correcting the surface to a link or to the owner's terms

### Requirement: Every save takes the gate

`/save` and `/ship` SHALL determine the gate by whether the repo has checks configured. When checks exist, the skills wait for them and, on failure, read-fix-repush (capped); `/ship` merges only on green. When no checks exist, the gate SHALL be PR review only — the PR plus the in-repo record is the system, and a human approves the PR before `/ship` merges.

Every save that changes a repository file SHALL take one route: a feature branch, a pull request, and the gate. The route SHALL NOT depend on which paths, file extensions, or kinds of file the save changes.

`/save` SHALL author an OpenSpec change only when the session established code or a plan for code. A save with no change SHALL open or update a pull request whose body describes the edit in plain words.

A save whose only output is facts SHALL send them to the memory store and SHALL make no commit, branch, or pull request.

#### Scenario: Repo has CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` reports checks
- **THEN** the skill waits for the checks, auto-fixes on red (cap 3 attempts), and `/ship` merges only once green

#### Scenario: Repo has no CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` returns `NONE`
- **THEN** the skill proceeds without waiting for or requiring any CI run
- **AND** `/ship` merges on the strength of PR review rather than a green CI run

#### Scenario: A wiki edit is saved like any file

- **WHEN** `/save` runs on the default branch and the only changed file is `wiki/development/memory.md`
- **THEN** it creates a feature branch, commits the file, pushes, opens a pull request with a plain body, and waits for checks
- **AND** it creates no OpenSpec change and pushes nothing to the default branch

#### Scenario: Code gets a change

- **WHEN** `/save` runs with code changed and no change selected
- **THEN** it authors an OpenSpec change before committing, and any wiki edit rides in the same pull request

#### Scenario: Facts-only save makes no commit

- **WHEN** `/save` runs and its only output is facts
- **THEN** the facts go to the memory store, and no commit, PR, or `/ship` is involved

### Requirement: Ship merges work that needed no change

When no change record selects for the branch, `/ship` SHALL apply the same test `/save` uses to author one. If the branch holds code or a plan for code, `/ship` SHALL stop and report that the branch has no identifiable change record. Otherwise it SHALL skip the archive and fact-distillation steps, invoke ordinary `/save` exactly once, and merge only on a `SUCCESS` or `NONE` gate result, then delete the branch and sync as for any change. A walk with no preview to observe is a skipped rung, not a failure.

#### Scenario: Shipping a pull request that needed no change

- **WHEN** `/ship` runs on a branch whose only changes are wiki pages and that holds no OpenSpec change
- **THEN** it archives nothing, checkpoints once through `/save`, and squash-merges once the gate passes

#### Scenario: Code with no change record

- **WHEN** `/ship` runs on a branch that changes `app/` and holds no OpenSpec change
- **THEN** it stops and reports that the branch has no identifiable change record
