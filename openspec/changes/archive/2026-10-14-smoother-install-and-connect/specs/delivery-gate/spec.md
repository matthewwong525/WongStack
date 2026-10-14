## MODIFIED Requirements

### Requirement: Ship leaves the checkout in sync

After the merge, `/ship` SHALL fast-forward the default branch of the primary checkout and prune stale remote refs. When no checkout holds the default branch and the primary checkout is clean and still on the merged branch, `/ship` SHALL switch it to the updated default branch. It SHALL NOT otherwise check out or switch a branch, and SHALL never stash, reset, force, or delete a local branch. A sync that cannot finish SHALL be one line in the report, never a failed ship.

#### Scenario: The checkout cannot fast-forward

- **WHEN** the checkout that owns the default branch is dirty, on another branch, or diverged
- **THEN** it is left untouched and the ship still reports success with the reason

#### Scenario: Work done straight in the project folder

- **WHEN** a person shipped from the primary checkout on the change's branch, with nothing unsaved
- **THEN** the folder is on the default branch at the merged commit when the ship reports

#### Scenario: A linked worktree on the merged branch

- **WHEN** the ship ran from a linked worktree on the change's branch
- **THEN** that worktree's branch is left as it is

## ADDED Requirements

### Requirement: Ship starts a cut-off default-branch run again

When the default branch's last check run was cut off rather than failed, `/ship` SHALL start it again once, wait for it, and continue on a pass, with no step left for the assistant. A second cut-off or a failure SHALL stop the ship with the reason.

#### Scenario: The empty first commit's run was cut off

- **WHEN** a new install publishes its first change and the default branch's only run reads cut off
- **THEN** the ship restarts it, waits, and goes on to archive and save without stopping

#### Scenario: The restarted run fails

- **WHEN** the restarted run ends failed
- **THEN** the ship stops and says the default branch's checks are failing
