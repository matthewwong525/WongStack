## MODIFIED Requirements

### Requirement: Real values persist in one worktree-safe local store

For a repository with linked Git worktrees, WongStack SHALL treat the primary worktree's ignored live secrets files as the durable local source of real values. This SHALL cover every live secrets file, not only the root `.env`: a stack's runtime file such as `app/.dev.vars` and per-environment variants such as `.dev.vars.staging` persist in the primary worktree at the same path relative to the repo root. It SHALL resolve the primary worktree from Git metadata rather than directory naming conventions. Before writing a value it SHALL prove the destination is ignored; if safety or the primary worktree cannot be resolved, it SHALL stop without accepting or writing the secret. Repositories with only one worktree SHALL continue using their existing live files.

A linked worktree MAY hold a **seeded branch copy** of each live file — a copy made from the primary when the worktree was created, with a recorded baseline. A seeded copy is the branch's working copy, not a duplicate to reconcile; the rules for how its edits reach the primary are in the branch-copy requirement.

#### Scenario: A secret is saved from a linked worktree

- **WHEN** a workflow receives or rotates a secret while running in a linked worktree
- **THEN** it writes the value to the primary worktree's ignored live file
- **AND** deleting the linked worktree does not delete the saved credential

#### Scenario: A Worker secret is saved from a linked worktree

- **WHEN** an agent in a linked worktree adds a value to `app/.dev.vars`
- **THEN** the value also lands in the primary worktree's `app/.dev.vars`
- **AND** the root `.env` is not used for it

#### Scenario: A normal checkout retains its existing behavior

- **WHEN** the active checkout is the primary and only worktree
- **THEN** the durable live files are the existing files in that checkout
- **AND** no alternate directory or duplicate file is introduced

#### Scenario: Destination safety cannot be proven

- **WHEN** Git does not ignore the resolved durable live file or the primary worktree cannot be resolved
- **THEN** the workflow stops before requesting or writing a real value
- **AND** it identifies the local safety condition to fix without printing a credential

#### Scenario: A linked worktree already has a separate live file

- **WHEN** the durable file and a linked worktree-local regular file with no recorded baseline both exist
- **THEN** the workflow preserves both files, prefers the durable file for WongStack consumers, and reports that reconciliation is needed
- **AND** it neither compares values in output nor silently overwrites, deletes, or bulk-merges either file

#### Scenario: Checkout-local tooling needs the conventional path

- **WHEN** a stack requires the live environment file inside a linked checkout and the worktree was not seeded
- **THEN** the guidance permits an ignored link or equivalent stack configuration pointing to the durable file after any existing duplicate is reconciled
- **AND** the link itself is never committed

## ADDED Requirements

### Requirement: A branch's secret edits reach the primary by kind

WongStack SHALL ship a worktree-secrets helper with three operations, and SHALL route each kind of edit a branch makes to a live secrets file as follows.

- **Seed.** On a new linked worktree, the helper SHALL copy each primary live secrets file (`.env`, `.env.*`, `.dev.vars`, `.dev.vars.*`, excluding `*.example`, at the repo root and in each immediate subfolder) into the worktree when the worktree has no such file, and SHALL record a baseline of key names and value hashes. The baseline SHALL be stored in the worktree's private Git directory, never in the working tree, and SHALL hold no value.
- **Add and rotate now.** An added key, or a rotated value whose old value no longer works, SHALL be written to both the worktree copy and the primary at the time of the edit, so a deleted worktree cannot lose it.
- **Defer deletion and branch-only changes.** A removed key, or a value only this branch needs, SHALL be written to the worktree copy only, so `main` and other worktrees keep working until the branch merges.
- **Promote after merge.** After a successful merge, `/ship` SHALL run the helper's promote operation. It SHALL compare the worktree copy, the primary, and the baseline three ways, and apply to the primary only what the branch changed: remove a key the branch removed, and set a value the branch changed. It SHALL skip, and name, a key the primary also changed since the baseline. With no baseline it SHALL apply adds only and name every other difference. It SHALL prove the primary file is ignored before any write, edit only the affected lines, and never regenerate the file. A promote failure SHALL NOT fail a ship whose merge already succeeded.
- **Names only.** Every operation's output SHALL carry file paths and key names, never a value.

#### Scenario: A new worktree has both files

- **WHEN** a linked worktree is created and the primary has `.env` and `app/.dev.vars`
- **THEN** after `seed` the worktree has a copy of each, and a baseline exists outside the working tree
- **AND** `git status` in the worktree shows neither the copies nor the baseline

#### Scenario: A key deleted on a branch waits for the merge

- **WHEN** a branch removes `OLD_KEY` from its `app/.dev.vars` copy
- **THEN** the primary's `app/.dev.vars` still has `OLD_KEY` until the branch merges
- **AND** after `/ship` merges the branch, `promote` removes `OLD_KEY` from the primary and names it in the report

#### Scenario: A key another branch added is kept

- **WHEN** the primary gained `NEW_KEY` after this worktree was seeded, and this branch never had it
- **THEN** `promote` leaves `NEW_KEY` in the primary

#### Scenario: Both sides changed the same key

- **WHEN** the branch and the primary each changed `SHARED_KEY` after the baseline, to different values
- **THEN** `promote` leaves the primary's value, names `SHARED_KEY` as skipped, and prints no value

#### Scenario: An abandoned branch changes nothing

- **WHEN** a worktree with deferred deletions is removed without a merge
- **THEN** the primary files are unchanged

#### Scenario: Save persists an add to both copies

- **WHEN** `/save` persists a secret the user supplied during the session, in a seeded linked worktree
- **THEN** the value is written to the primary and to the worktree copy
- **AND** `/save` does not report the seeded copy as a duplicate to reconcile
