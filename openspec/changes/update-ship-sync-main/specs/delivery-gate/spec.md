## ADDED Requirements

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
