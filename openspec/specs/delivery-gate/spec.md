# delivery-gate Specification

## Purpose

Decide when saved work may merge and how it gets there: `/save` checkpoints and waits on CI when the repo has checks, else PR review, with every file edit taking a pull request; and `/ship` finishes, archives, checkpoints once, and merges only on a passing gate, with nothing built locally as a condition.

## Requirements

### Requirement: The gate is CI when present, else PR review

`/ship` SHALL merge only when `/save`'s gate result is `SUCCESS` (checks passed) or `NONE` (the repo has no checks, so PR review is the gate); `UNKNOWN`, `TIMEOUT`, or `FAILURE` SHALL stop the merge. `/ship` SHALL NOT bypass, repeat, or reinterpret that result, and SHALL NOT start while the default branch's own checks are failing or unreadable.

#### Scenario: Checks fail on the branch

- **WHEN** a pushed commit's checks fail
- **THEN** the skill reads the failure and pushes a fix, at most three times
- **AND** `/ship` merges only once the checks pass

#### Scenario: The repo has no checks

- **WHEN** the repo has no CI workflow
- **THEN** `/save` reports `NONE` and `/ship` merges on PR review

### Requirement: The gate reads the pushed commit

The check wait SHALL report on the commit just pushed and no other. It SHALL report `NONE` only when the repo has no workflow files or no check appears within a grace period, and `UNKNOWN` when the check state cannot be read, so `/save` finishes unverified and `/ship` does not merge.

#### Scenario: The previous commit was green

- **WHEN** the previous commit's checks passed and the new commit's checks have not started
- **THEN** the wait does not report `SUCCESS`

### Requirement: Nothing builds locally as a gate

No skill SHALL compile, run a test suite, lint, or type-check as a condition of `/save` or `/ship`; test suites run in CI (`ci-tests`). `/apply`'s preview from the agent host SHALL gate nothing and SHALL NOT deploy production.

#### Scenario: A host preview exists

- **WHEN** `/apply` uploaded a preview from the host and the person publishes the change
- **THEN** `/ship` still saves, waits on the gate, and merges on its result
- **AND** production deploys from CI on the default branch

### Requirement: The walkthrough is evidence, not a gate

`/ship` SHALL run `/verify` once before the merge and report its verdict (`staging-walkthrough`). A walk that cannot run, or a missing `verify` skill, SHALL NOT block the merge and SHALL NOT be installed; a walk `FAILURE` SHALL stop and ask the person to fix it or merge anyway, and a merge anyway SHALL be recorded in the report.

#### Scenario: The walk fails

- **WHEN** the ship-time walk returns `FAILURE` after its own fix attempts
- **THEN** `/ship` stops before merging and asks whether to fix first or merge anyway

### Requirement: The gate doctrine has one owner

`wiki/development/the-change-loop.md` SHALL state the gate and the ladder (CI when present, then merge, a skipped rung never a failure); other surfaces SHALL link to it, except one summary line in `CLAUDE.md`. No surface SHALL call CI required, present the walkthrough as a condition of the merge, or describe a save route that depends on which paths changed.

#### Scenario: A surface restates the gate differently

- **WHEN** a payload surface describes the gate in terms the owner does not, or names a path-specific save route
- **THEN** that is a defect, fixed by a link or the owner's terms

### Requirement: Save checkpoints and never merges

`/save` SHALL commit, push, open or update the pull request, and wait on the gate, and SHALL NOT merge, force-push, or bypass hooks. The pull request body SHALL show the change's current Status, its exact task checklist, and review and preview links when they exist, and no live credential value SHALL reach a commit, fact, pull request, or report.

#### Scenario: A normal save

- **WHEN** `/save` runs on a branch with an active change
- **THEN** the pull request shows the current Status and checklist, and the report ends with one gate result

### Requirement: Git verbs check their preconditions first

`/save`, `/continue`, and `/ship` SHALL check that `gh` is signed in, an `origin` remote exists, and the `openspec` CLI runs, before any git or GitHub action. A failed check SHALL stop the verb with the command that fixes it, and a sign-in failure SHALL NOT be read as "no PR".

#### Scenario: gh is signed out

- **WHEN** `/save` runs and `gh` is not signed in
- **THEN** it stops before the push and says to run `gh auth login`

### Requirement: The preview link is the real preview for this commit

Preview discovery SHALL report only a preview URL tied to the head commit, SHALL NOT report a bare provider apex such as `workers.dev` or `vercel.app`, and SHALL NOT construct a URL from a naming convention. When nothing qualifies, it SHALL report no preview.

#### Scenario: A comment links the provider logo first

- **WHEN** a comment naming the head commit links `https://workers.dev` and then `https://feature-app.example.workers.dev`
- **THEN** discovery reports `https://feature-app.example.workers.dev`

#### Scenario: Only an earlier commit's preview exists

- **WHEN** every preview comment names an earlier commit and no other source has a URL
- **THEN** discovery reports no preview

### Requirement: Ship pulls in apply when there is nothing to ship

When the branch has nothing to ship, `/ship` SHALL invoke `/apply` (with its argument verbatim, if given) and continue to merge with no re-prompt between stages. With no argument and no line of work in the session, `/ship` SHALL stop and say there is nothing to continue, rather than pick an active change.

#### Scenario: Ship with an intent on the default branch

- **WHEN** the person runs `/ship <description>` on a clean default branch
- **THEN** `/apply` builds it, and `/ship` archives, saves once to a new branch, and merges

#### Scenario: A cold bare ship

- **WHEN** the person runs `/ship` with no argument in a session that established no work
- **THEN** `/ship` stops and says so, without invoking `/apply`

### Requirement: Ship never merges a partial change

`/ship` SHALL NOT archive, checkpoint, or merge a change with unchecked tasks; it SHALL invoke `/apply` to finish them, and stop and report when planning pauses, tasks stay pending, or a save fails. Its authorization SHALL NOT answer the archive's incomplete-task confirmation for the person.

#### Scenario: Apply stops with tasks pending

- **WHEN** `/apply` ends with work remaining
- **THEN** `/ship` reports it and stops with no archive or merge

### Requirement: Ship archives only the selected change

`/ship` SHALL keep the change name separate from the branch name and archive only the selected change. When the branch holds more than one active change, it SHALL stop before the archive and ask.

#### Scenario: Two changes on one branch

- **WHEN** the branch diff holds two active change folders
- **THEN** `/ship` stops before archive or merge and names both

### Requirement: Ship checkpoints once through save

After archiving, `/ship` SHALL invoke ordinary `/save` exactly once, so the commit CI tests is the commit `/ship` merges; `/save` SHALL use the archive as the change record and SHALL NOT author a new active change. Uncommitted work on the default branch SHALL move to a new branch through `/save`, not be reported as nothing to ship.

#### Scenario: A one-go ship

- **WHEN** `/ship <intent>` runs from plan to merge
- **THEN** only the save after the archive runs, and CI runs once before the walk

### Requirement: Ship distills the change's facts into the wiki

Before archiving, `/ship` SHALL read the facts recorded on the change and its branch, keep only repeatable knowledge, and write it into the owning wiki pages in the same pull request (`knowledge-center`), noting the pages or "no repeatable fact" in the Decision log. A private-life fact SHALL NOT move into the repo's wiki, and an unreachable store SHALL skip the step without blocking the ship.

#### Scenario: A reusable convention

- **WHEN** a change's facts record a convention for future work
- **THEN** the ship pull request edits the wiki page that owns it

### Requirement: Ship deletes the branch only after a confirmed merge

`/ship` SHALL merge exactly the gated commit, confirm the merge, and retarget every open pull request based on the branch to the default branch before deleting it. When the merge fails, or the dependent pull requests cannot be listed, it SHALL keep the branch; a branch the forge already deleted SHALL be reported as deleted at merge, not as an error.

#### Scenario: A stacked pull request

- **WHEN** an open pull request uses the merged branch as its base
- **THEN** it is retargeted to the default branch before the delete, and the report names it

### Requirement: Ship leaves the checkout in sync

After the merge, `/ship` SHALL fast-forward the default branch of the primary checkout and prune stale remote refs. It SHALL NOT check out, switch, stash, reset, force, or delete a local branch, and a sync that cannot fast-forward SHALL be one line in the report, never a failed ship.

#### Scenario: The checkout cannot fast-forward

- **WHEN** the checkout that owns the default branch is dirty, on another branch, or diverged
- **THEN** it is left untouched and the ship still reports success with the reason

### Requirement: Every file edit takes the same route

Every save that changes a repository file SHALL take a feature branch, a pull request, and the gate, whatever paths or file types it changes. `/save` SHALL author an OpenSpec change only for code or a plan for code; a save with no change SHALL get a pull request body that describes the edit in plain words. A save whose only output is facts SHALL make no commit.

#### Scenario: A wiki-only save

- **WHEN** `/save` runs and the only changed file is a wiki page
- **THEN** it opens a pull request with a plain body and waits on the gate, with no OpenSpec change
- **AND** nothing is pushed to the default branch

#### Scenario: A facts-only save

- **WHEN** the session only produced facts
- **THEN** they go to the memory store with no commit, branch, or pull request

### Requirement: Ship merges work that needed no change

When no change record selects for the branch, `/ship` SHALL apply `/save`'s test for authoring one: code or a plan for code SHALL stop with no identifiable change record; anything else SHALL skip the archive and merge on the gate like any change.

#### Scenario: Shipping a wiki-only pull request

- **WHEN** `/ship` runs on a branch whose only changes are wiki pages and that holds no change
- **THEN** it archives nothing and merges once the gate passes

#### Scenario: Code with no change record

- **WHEN** `/ship` runs on a branch that changes app code and holds no change
- **THEN** it stops and reports that the branch has no identifiable change record
