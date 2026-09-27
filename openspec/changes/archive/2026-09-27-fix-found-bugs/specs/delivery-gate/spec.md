## MODIFIED Requirements

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
