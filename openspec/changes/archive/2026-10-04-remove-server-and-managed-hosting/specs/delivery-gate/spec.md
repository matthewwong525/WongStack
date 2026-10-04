## REMOVED Requirements

### Requirement: The gate is CI when present, else PR review

**Reason:** The managed Artifacts route is removed, and with it the scenario for unreadable hosted checks.
**Migration:** Use "CI is the gate when present, else PR review" below; the GitHub rule is unchanged.

### Requirement: Save checkpoints and never merges

**Reason:** The managed Artifacts route is removed, and with it the hosted checkpoint scenario.
**Migration:** Use "Save checkpoints without merging" below; the GitHub rule is unchanged.

### Requirement: Git verbs check their preconditions first

**Reason:** The managed Artifacts route is removed, and with it the private hosted handoff check.
**Migration:** Use "Git verbs check GitHub preconditions first" below; the GitHub checks are unchanged.

## ADDED Requirements

### Requirement: CI is the gate when present, else PR review

For a GitHub repository, `/ship` SHALL merge only when `/save`'s gate result is `SUCCESS` (checks passed) or `NONE` (the repo has no checks, so PR review is the gate); `UNKNOWN`, `TIMEOUT`, or `FAILURE` SHALL stop the merge. `/ship` SHALL NOT bypass, repeat, or reinterpret that result, and SHALL NOT start while the default branch's own checks are failing or unreadable.

#### Scenario: Checks fail on the branch

- **WHEN** a pushed commit's checks fail
- **THEN** the skill reads the failure and pushes a fix, at most three times
- **AND** `/ship` merges only once the checks pass

#### Scenario: The repo has no checks

- **WHEN** the repo has no CI workflow
- **THEN** `/save` reports `NONE` and `/ship` merges on PR review

### Requirement: Save checkpoints without merging

For GitHub repositories, `/save` SHALL commit, push, open or update the pull request, and wait on the gate, and SHALL NOT merge, force-push, or bypass hooks. The pull request body SHALL show the change's current Status, its exact task checklist, and review and preview links when they exist, and no live credential value SHALL reach a commit, fact, pull request, or report.

#### Scenario: A normal save

- **WHEN** `/save` runs on a branch with an active change
- **THEN** the pull request shows the current Status and checklist, and the report ends with one gate result

### Requirement: Git verbs check GitHub preconditions first

For GitHub repositories, `/save`, `/continue`, and `/ship` SHALL check that `gh` is signed in, an `origin` remote exists, and the `openspec` CLI runs, before any git or GitHub action. A failed check SHALL stop the verb with the command that fixes it, and a sign-in failure SHALL NOT be read as "no PR".

#### Scenario: gh is signed out

- **WHEN** `/save` runs and `gh` is not signed in
- **THEN** it stops before the push and says to run `gh auth login`

## MODIFIED Requirements

### Requirement: The gate reads the pushed commit

The check wait SHALL report on the commit just pushed and no other. For the GitHub route it SHALL report `NONE` only when the repo has no workflow files or no check appears within a grace period, and `UNKNOWN` when the check state cannot be read, so `/save` finishes unverified and `/ship` does not merge.

#### Scenario: The previous commit was green

- **WHEN** the previous commit's checks passed and the new commit's checks have not started
- **THEN** the wait does not report `SUCCESS`

### Requirement: Ship deletes the branch only after a confirmed merge

For GitHub repositories, `/ship` SHALL merge exactly the gated commit, confirm the merge, and retarget every open pull request based on the branch to the default branch before deleting it. When the merge fails, or the dependent pull requests cannot be listed, it SHALL keep the branch; a branch the forge already deleted SHALL be reported as deleted at merge, not as an error.

#### Scenario: A stacked pull request

- **WHEN** an open pull request uses the merged branch as its base
- **THEN** it is retargeted to the default branch before the delete, and the report names it

### Requirement: Every file edit takes the same route

Every save that changes a GitHub repository file SHALL take a feature branch, a pull request, and the gate, whatever paths or file types it changes. `/save` SHALL author an OpenSpec change only for code or a plan for code; a save with no change SHALL get a pull request body that describes the edit in plain words. A save whose only output is facts SHALL make no commit.

#### Scenario: A wiki-only save

- **WHEN** `/save` runs and the only changed file is a wiki page
- **THEN** it opens a pull request with a plain body and waits on the gate, with no OpenSpec change
- **AND** nothing is pushed to the default branch

#### Scenario: A facts-only save

- **WHEN** the session only produced facts
- **THEN** they go to the memory store with no commit, branch, or pull request
