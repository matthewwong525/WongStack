# delivery-gate Specification

## Purpose
TBD - created by archiving change optional-ci-gate. Update Purpose after archive.
## Requirements

### Requirement: Ship delegates its checkpoint and branch gate to save

`/ship` SHALL retain its shipping-only responsibilities: verify the feature branch and default-branch state, invoke `openspec-archive-change`, merge the pull request, and delete the remote branch worktree-safely. After archiving and before merging, `/ship` SHALL invoke ordinary `/save` exactly once. When no active change matches the current branch and exactly one matching archive exists, `/save` SHALL use that archive as the handoff record, SHALL NOT author a replacement active change, and SHALL own secret preservation/redaction, session-note capture, commit, push, pull-request creation/update, and the CI wait/auto-fix path. `/ship` SHALL consume that result and SHALL NOT duplicate those checkpoint mechanics or require a special save flag.

Between the delegated `/save` and the merge, `/ship` SHALL invoke `/walk` once as an evidence step. On `NONE`, `UNKNOWN`, or `TIMEOUT`, `/ship` SHALL report the verdict and merge on the save-gate result exactly as before. On `FAILURE` — after `/walk`'s own bounded fix loop is exhausted — `/ship` SHALL stop, present the evidence, and ask the user whether to fix or merge anyway; the user's answer, not the verdict, decides, and a merge-anyway is recorded in the ship report. When the walk's fix loop advanced HEAD, the fix's own delegated `/save` re-gated it, and `/ship` SHALL confirm the latest save-gate result is `SUCCESS` or `NONE` before merging.

#### Scenario: Shipping checkpoints the archive through save

- **WHEN** `/ship` archives a completed change
- **THEN** it invokes ordinary `/save` once so the archive move, implementation, note, and any safe example declaration land in the pushed checkpoint
- **AND** the commit tested by the resulting CI run is the commit `/ship` will merge

#### Scenario: Save recognizes the archived branch change

- **WHEN** `/save` runs for `/ship` after `openspec/changes/<name>/` moved into the archive
- **THEN** it resolves and mirrors the single archived record matching the current branch
- **AND** it does not invoke fallback planning or create a new active `openspec/changes/<name>/`

#### Scenario: Save returns a mergeable gate result

- **WHEN** the delegated save finishes with `SUCCESS` or `NONE`
- **THEN** `/ship` proceeds through the walk evidence step and, absent a walk `FAILURE`, merges without reopening the PR or waiting on the same checks itself

#### Scenario: Save returns an unmergeable result

- **WHEN** the delegated ordinary save returns `UNKNOWN`, `TIMEOUT`, or a checkpoint failure
- **THEN** `/ship` stops before merge and reports that result
- **AND** it does not bypass, repeat, or reinterpret the gate

#### Scenario: A failed ship-time walk pauses for the user

- **WHEN** the ship-time walk returns `FAILURE` with its fix attempts exhausted
- **THEN** `/ship` stops before merging, presents the evidence, and asks whether to fix or merge anyway
- **AND** merging anyway remains available and is recorded in the report

#### Scenario: An unrunnable ship-time walk never blocks

- **WHEN** the ship-time walk returns `UNKNOWN` or `TIMEOUT`
- **THEN** `/ship` reports the walk as unverified and merges on the save-gate result alone

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

This doctrine SHALL have **one owning file** — `wiki/development/the-change-loop.md` — which states the gate ladder (CI when present → merge, a skipped rung never being a failure), the scope of the direct-to-default-branch carve-out, and the prose allowlist (`notes/**` + `wiki/**`) with its rationale. Other payload surfaces SHALL link to that owner rather than restate it, per the `payload-single-source` capability.

Two bounded exceptions, each because the reader must act without leaving the page:

- `AGENTS.md`/`CLAUDE.md` MAY carry one summarizing line per doctrine, naming and linking the owner.
- `.claude/skills/save/SKILL.md` SHALL state the allowlist's two path prefixes inline **once**, as the operational routing test the skill performs. Its other sections SHALL link to that single statement rather than repeat it.

No payload surface SHALL assert CI as the sole or required gate, state the carve-out as `notes/*.md` alone, or say that wiki edits require a pull request. No payload surface SHALL describe the staging walkthrough as a rung of the gate ladder or as a condition on the merge. Where a surface links to the owner instead of restating it, that link SHALL satisfy this requirement.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

#### Scenario: No surface describes the walkthrough as a gate

- **WHEN** a reader reviews `wiki/development/the-change-loop.md`, the `ship` skill, or the stack section
- **THEN** no surface presents the staging walkthrough as a rung of the ladder or as a condition on the merge
- **AND** the walkthrough is described as something `/walk` produces on request

#### Scenario: The carve-out has one owner

- **WHEN** a reader reviews `CLAUDE.md`, `notes/README.md`, and the `save` and `dream` skills
- **THEN** each either links to `wiki/development/the-change-loop.md` or carries one summarizing line naming it
- **AND** no surface other than `save/SKILL.md`'s single operational statement reproduces the allowlist's scope, exceptions, or rationale

#### Scenario: The save skill can route without leaving its runbook

- **WHEN** `/save` reaches the point of deciding a save's route
- **THEN** the two path prefixes are stated inline at that point
- **AND** the skill's later sections link back to that statement rather than restating the prefixes

#### Scenario: A surface contradicts the owner

- **WHEN** any payload surface states the gate or the carve-out in terms the owning file does not
- **THEN** that is a defect, resolved by correcting the surface to a link or to the owner's terms

### Requirement: The gate is CI-when-present, else PR review

`/save` and `/ship` SHALL determine the gate by whether the repo has checks configured. When checks exist, the skills wait for them and, on failure, read-fix-repush (capped); `/ship` merges only on green. When no checks exist, the gate SHALL be PR review only — the PR plus the OpenSpec change and the in-repo record is the system, and a human approves the PR before `/ship` merges.

**Prose exception.** A `/save` whose entire diff falls inside the **prose allowlist** SHALL bypass the branch-and-PR gate and commit directly to the default branch. The allowlist is exactly two path prefixes: `notes/**` and `wiki/**`. The carve-out is decided by **path scope only** — never by file extension, and never by a judgment of how consequential the edit is. It is exact: if any path outside the allowlist appears in the diff, the normal branch + PR flow applies in full to the whole save.

Routing SHALL NOT key on file extension. Markdown outside the allowlist — `.claude/**` (the shipped payload, whose edit is a release), `openspec/**` (the specs), `AGENTS.md`/`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `VERSION`, `app/**`, and any config file — keeps the full gate.

The gate is not weakened by this. Neither surface carries behavior: a note is raw, unconsolidated, and non-canonical, and a wiki page is prose a human already reviewed in-session on the diff `/dream` produced. Nothing in either surface executes, deploys, or changes what the tooling does.

#### Scenario: Repo has CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` reports checks
- **THEN** the skill waits for the checks, auto-fixes on red (cap 3 attempts), and `/ship` merges only once green

#### Scenario: Repo has no CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` returns `NONE`
- **THEN** the skill proceeds without waiting for or requiring any CI run
- **AND** `/ship` merges on the strength of PR review rather than a green CI run

#### Scenario: Notes-only save bypasses the gate

- **WHEN** `/save` runs and every changed path is under `notes/`
- **THEN** it commits and pushes directly to the default branch, opening no PR and requiring no `/ship`

#### Scenario: Wiki-only save bypasses the gate

- **WHEN** `/dream` has consolidated notes into `wiki/` and `/save` runs with every changed path under `wiki/` (optionally alongside the `consolidated:` frontmatter updates in `notes/`)
- **THEN** it commits and pushes directly to the default branch, opening no PR and requiring no `/ship`

#### Scenario: A single non-allowlisted path restores the gate

- **WHEN** a save's diff contains `notes/<slug>.md` or `wiki/<page>.md` plus any path outside the allowlist
- **THEN** the normal branch + PR flow applies and the prose rides along on that branch

#### Scenario: Markdown payload keeps the gate

- **WHEN** a save's diff touches `.claude/skills/save/SKILL.md`, `CLAUDE.md`, or `openspec/changes/<name>/proposal.md` — markdown, but not in the allowlist
- **THEN** the normal branch + PR flow applies in full

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate. No skill SHALL run a compile, a unit-test suite, a linter, or a type-check as a condition of saving or shipping. Test suites run in CI (the `ci-tests` capability), where they are ordinary checks on the existing ladder.

**The boundary is building versus exercising.** Driving a browser against an already-deployed staging environment is not a local build: nothing is compiled, nothing is installed, and the artifact under test is the one CI itself published. The opt-in staging walkthrough (`staging-walkthrough`) is therefore permitted, and is bounded by three properties that keep it from becoming a local-verify gate by another name — it SHALL run only against a deployment CI has already published, it SHALL never install a dependency, and it SHALL be absent entirely unless the repo adopted it. It is reached by invoking `/walk`, or by `/ship`'s single evidence step. Its verdict SHALL NOT function as a gate rung: an unrunnable or absent walk never blocks anything, and a walk `FAILURE` at ship time is surfaced as a user decision (fix or merge anyway) rather than consulted as a merge condition.

The gate ladder is: **CI when present → merge.** A rung is skipped when its condition does not hold, and a skipped rung SHALL NOT be reported as a failure. Where no rung applies, PR review is the gate.

#### Scenario: No CI present does not trigger a local build

- **WHEN** a repo has no CI and `/ship` is invoked
- **THEN** the skill does not run a local build or test as a gate; it relies on PR review

#### Scenario: The walkthrough is not a local build

- **WHEN** an adopted repo runs `/walk`
- **THEN** it compiles nothing, installs nothing, and runs no unit-test suite
- **AND** it exercises the deployment CI already published rather than a locally produced artifact

#### Scenario: The walk verdict is not a gate rung

- **WHEN** an adopted repo ships and the ship-time walk is `UNKNOWN`, `TIMEOUT`, or `NONE`
- **THEN** `/ship` merges on green CI (or PR review) alone
- **AND** the walk is reported, never counted as a failed check

#### Scenario: A skipped rung is not a failure

- **WHEN** a repo has CI configured
- **THEN** `/ship` merges on green CI alone, reporting no gap

