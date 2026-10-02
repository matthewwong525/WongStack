## MODIFIED Requirements

### Requirement: The gate is CI when present, else PR review

On GitHub, `/ship` SHALL merge only when `/save`'s gate result is `SUCCESS` (checks passed) or `NONE` (the repo has no checks, so PR review is the gate); `UNKNOWN`, `TIMEOUT`, or `FAILURE` SHALL stop the merge. `/ship` SHALL NOT bypass, repeat, or reinterpret that result, and SHALL NOT start while the default branch's own checks are failing or unreadable.

#### Scenario: Checks fail on the branch

- **WHEN** a pushed commit's checks fail
- **THEN** the skill reads the failure and pushes a fix, at most three times
- **AND** `/ship` merges only once the checks pass

#### Scenario: The repo has no checks

- **WHEN** the repo has no CI workflow
- **THEN** `/save` reports `NONE` and `/ship` merges on PR review


For verified Artifacts hosted context, the gate SHALL be remote checks on the saved commit and its review record. Hosted `/ship` SHALL require explicit owner approval and publish only the exact successful immutable candidate after authoritative head and production-base checks; missing, failed, stale or unreadable checks SHALL stop publication.

#### Scenario: Hosted checks are unreadable

- **WHEN** the hosted service cannot prove passing checks for the exact saved commit
- **THEN** the result is unverified and publication is refused

### Requirement: Save checkpoints and never merges

`/save` SHALL commit, push, open or update the GitHub pull request or hosted review record according to verified repository context, and wait on the gate, and SHALL NOT merge, force-push, or bypass hooks. The pull request or hosted review record SHALL show the change's current Status, its exact task checklist, and review and preview links when they exist, and no live credential value SHALL reach a commit, fact, pull request, or report.

#### Scenario: A normal save

- **WHEN** `/save` runs on a branch with an active change
- **THEN** the pull request shows the current Status and checklist, and the report ends with one gate result


### Requirement: Git verbs check their preconditions first

`/save`, `/continue`, and `/ship` SHALL detect verified hosted context before checking route-specific preconditions. Both routes SHALL require an `origin` remote and working `openspec` CLI. GitHub routes SHALL require signed-in `gh`; Artifacts hosted routes SHALL require valid scoped service access and verified repository identity without customer `gh` or Cloudflare credentials. A failed check SHALL stop the verb with the command that fixes it, and a sign-in failure SHALL NOT be read as "no PR".

#### Scenario: gh is signed out

- **WHEN** `/save` runs and `gh` is not signed in
- **THEN** it stops before the push and says to run `gh auth login`


### Requirement: Every file edit takes the same route

Every save that changes a repository file SHALL take a feature branch, a GitHub pull request or hosted review record, and the appropriate remote gate, whatever paths or file types it changes. `/save` SHALL author an OpenSpec change only for code or a plan for code; a save with no change SHALL get a pull request body that describes the edit in plain words. A save whose only output is facts SHALL make no commit.

#### Scenario: A wiki-only save

- **WHEN** `/save` runs and the only changed file is a wiki page
- **THEN** it opens a GitHub pull request or hosted review record with a plain body and waits on the remote gate, with no OpenSpec change
- **AND** nothing is pushed to the default branch

#### Scenario: A facts-only save

- **WHEN** the session only produced facts
- **THEN** they go to the memory store with no commit, branch, or pull request


### Requirement: The gate doctrine has one owner

`wiki/development/the-change-loop.md` SHALL state the gate and the ladder (CI when present, then GitHub merge or approved hosted publication, a skipped rung never a failure); other surfaces SHALL link to it, except one summary line in `AGENTS.md`. No surface SHALL call CI required, present the walkthrough as a condition of the merge, or describe a save route that depends on which paths changed.

#### Scenario: A surface restates the gate differently

- **WHEN** a payload surface describes the gate in terms the owner does not, or names a path-specific save route
- **THEN** that is a defect, fixed by a link or the owner's terms
