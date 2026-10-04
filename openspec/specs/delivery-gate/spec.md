# delivery-gate Specification

## Purpose

Decide when saved work may merge and how it gets there: `/save` checkpoints and waits on CI when the repo has checks, else PR review, with every file edit taking a pull request; and `/ship` finishes, archives, checkpoints once, and merges only on a passing gate, with nothing built locally as a condition.

## Requirements

### Requirement: The gate reads the pushed commit

The check wait SHALL report on the commit just pushed and no other. For the GitHub route it SHALL report `NONE` only when the repo has no workflow files or no check appears within a grace period, and `UNKNOWN` when the check state cannot be read, so `/save` finishes unverified and `/ship` does not merge.

#### Scenario: The previous commit was green

- **WHEN** the previous commit's checks passed and the new commit's checks have not started
- **THEN** the wait does not report `SUCCESS`

### Requirement: Nothing builds locally as a gate

No skill SHALL make a local compile, test run, lint, or type-check a condition of `/save` or `/ship`; the gate's test suites run in CI (`ci-tests`), and a local result SHALL NOT be reported as the gate's result. `/apply`'s preview from the agent host SHALL gate nothing and SHALL NOT deploy production.

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

`wiki/development/the-change-loop.md` SHALL state the gate and the ladder (CI when present, then merge, a skipped rung never a failure); other surfaces SHALL link to it, except one summary line in `AGENTS.md`. No surface SHALL call CI required, present the walkthrough as a condition of the merge, or describe a save route that depends on which paths changed.

#### Scenario: A surface restates the gate differently

- **WHEN** a payload surface describes the gate in terms the owner does not, or names a path-specific save route
- **THEN** that is a defect, fixed by a link or the owner's terms

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

After archiving, `/ship` SHALL invoke ordinary `/save` exactly once, so the commit CI tests is the commit `/ship` merges; `/save` SHALL use the archive as the change record and SHALL NOT author a new active change. The walkthrough SHALL reuse that exact checkpoint without another save or rerun of unchanged settled checks. Uncommitted work on the default branch SHALL move to a new branch through that same save, not an earlier one, and SHALL NOT be reported as nothing to ship. A repair that changes source SHALL receive fresh exact-revision checks before publication; this SHALL NOT authorize bypassing or reinterpreting a failed or unreadable gate.

#### Scenario: A one-go ship

- **WHEN** `/ship <intent>` runs from plan to merge without a repair
- **THEN** only the save after the archive runs, CI runs once before the walk, and the walk uses that saved revision without a second checkpoint

#### Scenario: Publish from the default branch

- **WHEN** `/ship` runs on the default branch with a finished, uncommitted change
- **THEN** it archives in place, saves once to a new branch, and CI runs once before the merge

### Requirement: Ship deletes the branch only after a confirmed merge

For GitHub repositories, `/ship` SHALL merge exactly the gated commit, confirm the merge, and retarget every open pull request based on the branch to the default branch before deleting it. When the merge fails, or the dependent pull requests cannot be listed, it SHALL keep the branch; a branch the forge already deleted SHALL be reported as deleted at merge, not as an error.

#### Scenario: A stacked pull request

- **WHEN** an open pull request uses the merged branch as its base
- **THEN** it is retargeted to the default branch before the delete, and the report names it

### Requirement: Ship leaves the checkout in sync

After the merge, `/ship` SHALL fast-forward the default branch of the primary checkout and prune stale remote refs. It SHALL NOT check out, switch, stash, reset, force, or delete a local branch, and a sync that cannot fast-forward SHALL be one line in the report, never a failed ship.

#### Scenario: The checkout cannot fast-forward

- **WHEN** the checkout that owns the default branch is dirty, on another branch, or diverged
- **THEN** it is left untouched and the ship still reports success with the reason

### Requirement: Every file edit takes the same route

Every save that changes a GitHub repository file SHALL take a feature branch, a pull request, and the gate, whatever paths or file types it changes. `/save` SHALL author an OpenSpec change only for code or a plan for code; a save with no change SHALL get a pull request body that describes the edit in plain words. A save whose only output is facts SHALL make no commit.

#### Scenario: A wiki-only save

- **WHEN** `/save` runs and the only changed file is a wiki page
- **THEN** it opens a pull request with a plain body and waits on the gate, with no OpenSpec change
- **AND** nothing is pushed to the default branch

#### Scenario: A facts-only save

- **WHEN** the session only produced facts
- **THEN** they go to the memory store with no commit, branch, or pull request

### Requirement: Ship merges work that needed no change

When no change record selects for the branch, `/ship` SHALL apply `/save`'s test for authoring one: for code or a plan for code, it SHALL author the change from the session and the diff, as `/save` would, then archive and merge it like any change; anything else SHALL skip the archive and merge on the gate like any change.

#### Scenario: Shipping a wiki-only pull request

- **WHEN** `/ship` runs on a branch whose only changes are wiki pages and that holds no change
- **THEN** it archives nothing and merges once the gate passes

#### Scenario: Code with no change record

- **WHEN** `/ship` runs on a branch that changes app code and holds no change
- **THEN** it writes the change from the work, archives it, and merges on the gate

### Requirement: A failed check is diagnosed before it is fixed

On a failed gate, `/save` SHALL list every failing check with the cause its log supports before the first fix, and SHALL fix the failures the change caused in one push. A failure the change did not cause SHALL be re-run once and, if still failing, reported without a code edit. The attempt cap SHALL stay as it is.

#### Scenario: Two checks fail for different reasons

- **WHEN** a push fails a test and a link check
- **THEN** `/save` names both causes first and pushes one fix covering both

#### Scenario: A failure the change didn't cause

- **WHEN** the only failing check fails in code the change never touched
- **THEN** `/save` re-runs it once, and if it fails again stops with the error and the checks link, editing nothing

### Requirement: Ship looks at the live app once after the merge

After a merge that deploys, `/ship` SHALL wait a bounded time for the default branch's release of the merged commit and open the live app once. The look SHALL only read: it SHALL NOT save, send, purchase, or change anything on the live app. A release that failed or a live app that does not open SHALL be reported in plain words in the same chat; `/ship` SHALL then build one fix through the normal change loop and ask before publishing it, and SHALL NOT publish it unasked or try a second fix. A look that cannot run (no release recorded, no live address, no access, or the wait ran out) SHALL be one line in the report, never a failed ship. A merge that deploys nothing SHALL skip the look.

#### Scenario: The release lands

- **WHEN** the merged commit's release succeeds and the live app opens
- **THEN** the ship report says it is live and that the live app was opened

#### Scenario: The release fails

- **WHEN** the merged commit's release fails, or the live app answers with an error
- **THEN** the chat says what is not working, a fix is built and previewed, and the person is asked whether to publish it

### Requirement: A finished build is checked locally where the tools exist

Where the machine has the repo's tools, a finished build SHALL run, once and before the first push, the checks CI would run for the kinds of file the change touches, and SHALL repair what fails within the existing repair limits. A machine without the tools SHALL skip the run, say so in one line, and continue. Local runs on one machine SHALL take turns. The report SHALL name the run as local.

#### Scenario: A test fails before the first push

- **WHEN** a finished build's change fails one of its own tests on a machine that has the tools
- **THEN** the failure is repaired before the first push, and the report says the local checks passed, apart from the gate's result

#### Scenario: The machine has no tools

- **WHEN** the repo's tools are not installed and can not be installed
- **THEN** the build says in one line that nothing ran locally, and `/save` and `/ship` proceed on the gate alone

### Requirement: Delivery's mechanical steps run as single commands

Once the files are staged, a `/save` checkpoint's commit, push, pull-request update, check wait, and preview lookup SHALL run as one command. `/ship`'s preparation (archive, release number, sync with the default branch) and its finish (merge, secret promotion, live look) SHALL each run as one command. Each command's output SHALL state the result and the next action, and a failed gate's output SHALL name every failing check with the cause its log shows. Results, attempt caps, and refusals SHALL stay as they are.

#### Scenario: An ordinary save

- **WHEN** `/save` checkpoints staged work on a branch with an open pull request
- **THEN** one command returns the gate result, the preview, and the saved revision

#### Scenario: A check fails

- **WHEN** the pushed commit fails two checks
- **THEN** the same command's output lists both with their causes and the next action, with no separate log lookup before the diagnosis

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
