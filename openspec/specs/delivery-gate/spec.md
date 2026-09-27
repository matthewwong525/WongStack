# delivery-gate Specification

## Purpose
Decide when saved work may merge: CI when the repo has checks, else PR review, with no local build fallback. Every file edit takes a branch and a pull request, and `/ship` archives any change, checkpoints once through `/save`, and merges only on a passing gate.

## Requirements

### Requirement: Ship delegates its checkpoint and branch gate to save

`/ship` SHALL retain its shipping-only responsibilities: verify the feature branch and default-branch state, archive the change with `openspec archive`, merge the pull request, and delete the remote branch worktree-safely. After archiving and before merging, `/ship` SHALL invoke ordinary `/save` exactly once. When no active change matches the current branch and exactly one matching archive exists, `/save` SHALL use that archive as the handoff record, SHALL NOT author a replacement active change, and SHALL own secret preservation/redaction, fact capture, commit, push, pull-request creation/update, and the CI wait/auto-fix path. `/ship` SHALL consume that result and SHALL NOT duplicate those checkpoint mechanics or require a special save flag.

Between the delegated `/save` and the merge, `/ship` SHALL invoke `/verify` once as an evidence step. On `NONE`, `UNKNOWN`, or `TIMEOUT`, `/ship` SHALL report the verdict and merge on the save-gate result exactly as before. On `FAILURE` — after `/verify`'s own bounded fix loop is exhausted — `/ship` SHALL stop, present the evidence, and ask the user whether to fix or merge anyway; the user's answer, not the verdict, decides, and a merge-anyway is recorded in the ship report. When the walk's fix loop advanced HEAD, the fix's own delegated `/save` re-gated it, and `/ship` SHALL confirm the latest save-gate result is `SUCCESS` or `NONE` before merging.

The walk step SHALL check that the `verify` skill is present before invoking it. When the skill is absent, `/ship` SHALL report the walk as unavailable in one line and continue to the merge, consistent with the gate ladder's rule that a rung the repo lacks is skipped rather than failed. `/ship` SHALL NOT install, copy, or offer the skill to repair its absence.

Before deleting the merged branch from the remote, `/ship` SHALL find every open pull request that targets that branch as its base and retarget each to the default branch. Only then SHALL the branch be deleted, and the ship report SHALL name any pull request it retargeted. Deleting a base branch that an open pull request still targets closes that pull request, and the loss is unrecoverable: the forge will neither reopen a pull request whose base branch is gone nor retarget a closed one. `/ship` SHALL NOT rely on the forge retargeting dependents on its own, because that is a race with no completion signal. The merge, retarget, delete, and checkout sync SHALL run as one deterministic script.

When the forge deletes the head branch itself at merge, `/ship` SHALL still retarget every open pull request that targets the branch. It SHALL then check whether the remote still has the branch, and delete it only when it does. A branch that is already gone SHALL NOT be reported as an error; the ship report SHALL say that the forge deleted it at merge. When `/ship` cannot tell whether the branch exists, because the remote query itself fails, it SHALL stop and report that failure as for any other delete failure.

#### Scenario: Shipping checkpoints the archive through save

- **WHEN** `/ship` archives a completed change
- **THEN** it invokes ordinary `/save` once so the archive move, implementation and any safe example declaration land in the pushed checkpoint
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

#### Scenario: The walk skill is not present

- **WHEN** `/ship` reaches the walk step in a repo that does not have the `verify` skill
- **THEN** it reports the walk as unavailable in one line and proceeds to the merge
- **AND** it does not install, copy, or offer the skill

#### Scenario: A dependent pull request is retargeted before deletion

- **WHEN** `/ship` merges a branch that one open pull request uses as its base
- **THEN** that pull request is retargeted to the default branch before the branch is deleted
- **AND** the ship report names the retargeted pull request

#### Scenario: No dependent pull request exists

- **WHEN** `/ship` merges a branch that no open pull request targets
- **THEN** the branch is deleted directly with no retargeting step

#### Scenario: The forge already deleted the branch at merge

- **WHEN** `/ship` merges a pull request in a repository that deletes head branches on merge
- **THEN** it retargets any open pull request that still targets the branch, skips the delete, and prints no error
- **AND** the ship report says the branch was deleted at merge

#### Scenario: A mini-app pull request

- **WHEN** `/ship` merges the pull request of a mini app
- **THEN** it archives the app's change, runs one `/save` and the walk, and merges on the gate, like any change

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate. No skill SHALL run a compile, a unit-test suite, a linter, or a type-check as a condition of saving or shipping. A mini app's own tests run in CI like every other suite. Test suites run in CI (the `ci-tests` capability), where they are ordinary checks on the existing ladder.

**The boundary is building versus exercising.** Driving a browser — or issuing HTTP requests and existing-command state queries — against an already-deployed staging environment is not a local build: nothing is compiled, nothing is installed, and the artifact under test is the one CI itself published. The opt-in staging walkthrough (`staging-walkthrough`) is therefore permitted, and is bounded by three properties that keep it from becoming a local-verify gate by another name — it SHALL run only against a deployment CI has already published, it SHALL never install a dependency, and it SHALL be absent entirely unless the repo adopted it. It is reached by invoking `/verify`, or by `/ship`'s single evidence step. Its verdict SHALL NOT function as a gate rung: an unrunnable or absent walk never blocks anything, and a walk `FAILURE` at ship time is surfaced as a user decision (fix or merge anyway) rather than consulted as a merge condition.

**A host preview is not a gate.** A completed `/apply` builds the main app on the agent host and uploads a preview version of the staging Worker, as `apply-completion-handoff` defines. That build and upload SHALL NOT be a prerequisite or a condition of `/save` or `/ship`, SHALL NOT replace a CI check, and SHALL NOT deploy production.

The gate ladder is: **CI when present → merge.** A rung is skipped when its condition does not hold, and a skipped rung SHALL NOT be reported as a failure. Where no rung applies, PR review is the gate.

#### Scenario: No CI present does not trigger a local build

- **WHEN** a repo has no CI and `/ship` is invoked
- **THEN** the skill does not run a local build or test as a gate; it relies on PR review

#### Scenario: The walkthrough is not a local build

- **WHEN** an adopted repo runs `/verify`, whatever mix of browser journeys and non-browser probes its scenarios produce
- **THEN** it compiles nothing, installs nothing, and runs no unit-test suite
- **AND** it exercises the deployment CI already published rather than a locally produced artifact

#### Scenario: The walk verdict is not a gate rung

- **WHEN** an adopted repo ships and the ship-time walk is `UNKNOWN`, `TIMEOUT`, or `NONE`
- **THEN** `/ship` merges on green CI (or PR review) alone
- **AND** the walk is reported, never counted as a failed check

#### Scenario: A skipped rung is not a failure

- **WHEN** a repo has CI configured
- **THEN** `/ship` merges on green CI alone, reporting no gap

#### Scenario: A preview upload is not a gate

- **WHEN** `/apply` uploaded a preview from the agent host and the person publishes the change
- **THEN** `/ship` still saves, waits for CI, and merges only on the gate result
- **AND** production deploys from CI on the default branch, not from the host

### Requirement: Ship leaves the durable checkout in sync

After the merge and the remote-branch delete, and before the report, `/ship` SHALL bring the default branch of the durable checkout up to the commit it just merged, and SHALL prune the remote-tracking refs the branch delete made stale.

The durable checkout is the primary worktree. When `/ship` runs from a linked worktree, it SHALL resolve the primary worktree from Git's common directory — the same resolution the secrets convention already defines — and fast-forward the default branch there. When `/ship` runs from a plain checkout, where the default branch is checked out nowhere, it SHALL advance the local default-branch ref in place by fetching the remote branch into it.

The sync SHALL be fast-forward only. `/ship` SHALL NOT check out, switch, stash, reset, or force any branch in any checkout, and SHALL NOT delete a local branch.

The sync SHALL NOT be able to fail the ship. When the default branch cannot be fast-forwarded — the target checkout is dirty, it has another branch checked out, or its default branch has diverged — `/ship` SHALL leave that checkout untouched, report the reason in one line, and still report the ship as successful. The merge has already happened, so nothing after it is a gate.

The ship report SHALL name the outcome of the sync: the checkout that advanced, or the reason it was skipped.

#### Scenario: Shipping from a linked worktree

- **WHEN** `/ship` merges from a linked worktree and the primary worktree is clean and on the default branch
- **THEN** the primary worktree's default branch is fast-forwarded to the merged commit
- **AND** the current worktree's branch is unchanged and no branch is checked out or switched anywhere

#### Scenario: Shipping from a plain checkout

- **WHEN** `/ship` merges from a checkout that has no linked worktree, with the feature branch still checked out
- **THEN** the local default-branch ref is advanced to the merged commit without switching branches
- **AND** the user is still standing on the same branch after the ship

#### Scenario: The target checkout cannot fast-forward

- **WHEN** the checkout that owns the default branch is dirty, has another branch checked out, or its default branch has diverged
- **THEN** that checkout is left untouched, with no stash, reset, or force
- **AND** `/ship` reports the skip and its reason in one line and still reports the ship as successful

#### Scenario: Stale remote-tracking refs are pruned

- **WHEN** `/ship` has deleted the merged branch from the remote
- **THEN** the remote-tracking refs the delete made stale are pruned
- **AND** no local branch is deleted

### Requirement: The gate waits for the pushed commit's checks

The check wait SHALL report a result only for the commit that was just pushed. It SHALL wait until the PR's head commit equals the local `HEAD`. It SHALL report `NONE` only when the repository has no CI workflow files, or when no check appears for that head within a grace period of 60 seconds. A repository with workflow files whose checks do not appear SHALL report `UNKNOWN`, never `NONE`. A failed or empty `gh` answer SHALL be `UNKNOWN`, and `UNKNOWN` SHALL stop a merge. It SHALL report `SUCCESS` only when two polls in a row return the same finished checks with none failed. While every check reported so far is skipped, it SHALL keep waiting until the grace period ends, because a skipped check finishes before the checks that do the work are registered.

#### Scenario: Checks are not registered yet

- **WHEN** `/save` pushes a commit and GitHub has not yet registered its check runs
- **THEN** the wait continues until the checks appear, and does not report `NONE`

#### Scenario: The old head is green

- **WHEN** the previous commit's checks passed and the new commit's checks have not started
- **THEN** the wait does not report `SUCCESS` for the new commit

#### Scenario: A repository with no CI

- **WHEN** the repository has no workflow files
- **THEN** the wait reports `NONE`, and PR review is the gate

#### Scenario: gh is not authenticated

- **WHEN** `/ship`'s preflight gets an error or an empty answer from `gh`
- **THEN** it reports `UNKNOWN` and does not merge

#### Scenario: Only skipped checks have appeared

- **WHEN** the pull-request copies of the checks show as skipped before the push-triggered test run is registered
- **THEN** the wait does not report `SUCCESS`, and keeps polling until the test run finishes or the grace period ends

#### Scenario: A check appears after the others finished

- **WHEN** one poll shows every check passed and the next poll shows a new pending check
- **THEN** the wait keeps polling and reports on the new check

### Requirement: Ship deletes the branch only after a confirmed merge

`/ship` SHALL merge only the head commit it verified, and SHALL confirm that the PR state is `MERGED` before it retargets stacked PRs or deletes the remote branch. Stacked PRs SHALL be retargeted to the repository's default branch, not to a fixed name. When the merge fails, `/ship` SHALL leave the branch and the PR in place and report the failure. When the list of open pull requests based on the branch cannot be read, `/ship` SHALL keep the branch and report the failure, because a stacked pull request it could not see would close. When the branch delete fails, `/ship` SHALL ask the remote again; a branch that is now gone SHALL be reported as deleted at merge, not as an error.

#### Scenario: The merge is refused

- **WHEN** `gh pr merge` fails because of a conflict, a rule, or a new head commit
- **THEN** the remote branch is not deleted and the PR stays open

#### Scenario: The default branch is not main

- **WHEN** the default branch is `trunk` and a PR is stacked on the merged branch
- **THEN** that PR is retargeted to `trunk` before the branch is deleted

#### Scenario: Stacked pull requests cannot be listed

- **WHEN** the merge succeeds and `gh pr list --base <branch>` fails
- **THEN** the branch is kept, the report says why, and the script exits 2

#### Scenario: The forge deletes the branch mid-delete

- **WHEN** the remote still lists the branch, then the delete fails because the forge removed it in the meantime
- **THEN** the report says the branch was deleted at merge, and the script exits 0

### Requirement: Git verbs check shared preconditions first

`/save`, `/continue`, and `/ship` SHALL check, before any git or GitHub action, that `gh` is authenticated, that an `origin` remote exists, and that the `openspec` CLI runs. The checks SHALL be defined in one shared reference. A failed check SHALL stop the verb with the command that fixes it. An authentication failure SHALL NOT be read as "no PR".

#### Scenario: gh is signed out

- **WHEN** `/save` runs and `gh auth status` fails
- **THEN** it stops before the push and tells the user to run `gh auth login`

#### Scenario: No remote

- **WHEN** `/save` runs in a repository with no `origin`
- **THEN** it stops and gives the command that adds one

### Requirement: Ship on a dirty default branch saves first

When `/ship` runs on the default branch with uncommitted changes, it SHALL route the work to `/save`, which creates a feature branch, and then continue the cycle on that branch. It SHALL NOT report that it found nothing to ship.

#### Scenario: Uncommitted work on main

- **WHEN** a user runs `/ship` on `main` with modified files
- **THEN** `/save` moves the work to a new branch and `/ship` continues from there

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
