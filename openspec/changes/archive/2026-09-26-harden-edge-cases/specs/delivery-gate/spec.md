## ADDED Requirements

### Requirement: The gate waits for the pushed commit's checks

The check wait SHALL report a result only for the commit that was just pushed. It SHALL wait until the PR's head commit equals the local `HEAD`. It SHALL report `NONE` only when the repository has no CI workflow files, or when no check appears for that head within a grace period of 60 seconds. A repository with workflow files whose checks do not appear SHALL report `UNKNOWN`, never `NONE`. A failed or empty `gh` answer SHALL be `UNKNOWN`, and `UNKNOWN` SHALL stop a merge.

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

### Requirement: Ship deletes the branch only after a confirmed merge

`/ship` SHALL merge only the head commit it verified, and SHALL confirm that the PR state is `MERGED` before it retargets stacked PRs or deletes the remote branch. Stacked PRs SHALL be retargeted to the repository's default branch, not to a fixed name. When the merge fails, `/ship` SHALL leave the branch and the PR in place and report the failure.

#### Scenario: The merge is refused

- **WHEN** `gh pr merge` fails because of a conflict, a rule, or a new head commit
- **THEN** the remote branch is not deleted and the PR stays open

#### Scenario: The default branch is not main

- **WHEN** the default branch is `trunk` and a PR is stacked on the merged branch
- **THEN** that PR is retargeted to `trunk` before the branch is deleted

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
