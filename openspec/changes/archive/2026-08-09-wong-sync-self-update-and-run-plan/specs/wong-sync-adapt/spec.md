# wong-sync-adapt — delta

## MODIFIED Requirements

### Requirement: The analysis proposes and never implements

The analysis SHALL write exactly two kinds of artifact and nothing else:

1. `.claude/wong-sync-verdicts.md` — the durable verdict record, specified below.
2. An OpenSpec change folder at `openspec/changes/sync-wongstack-<YYYY-MM-DD>/`, written whenever the run **did or proposes anything** — that is, when it copied a file, updated a file, self-updated, or verdicted at least one capability `adopt`.

The folder SHALL contain a proposal and a tasks list:

- **`proposal.md`** SHALL enumerate the run's entire changeset: the version span synced, every file copied, every file updated with its version span, the self-update when one occurred, each proposed adoption and what it buys this repo, and a pointer to `.claude/wong-sync-verdicts.md` for everything considered and not adopted. Copies and updates are already present in the working tree when the proposal is written, so they SHALL be described as landed rather than written as tasks.
- **`tasks.md`** SHALL carry one task per `adopt` capability, preceded by a single review task when any file change landed, so that a run with no `adopt` still yields an actionable change rather than an empty folder.

The folder SHALL NOT be written when the run copied nothing, updated nothing, did not self-update, and has no `adopt`. The graft is performed later through the normal loop (`/apply` → `/save` → `/ship`). Each adoption task SHALL name its capability id and describe the graft in this repo's terms — which file or convention it touches and what done looks like.

Change folders written under the earlier `adopt-wongstack-<YYYY-MM-DD>` name SHALL be left as they are; no rename or migration of existing folders is performed.

#### Scenario: Nothing else is touched

- **WHEN** a run completes
- **THEN** the only paths written are absent payload files, provably unmodified payload files brought current, `.claude/wong-sync-verdicts.md`, the change folder, and the manifest
- **AND** the user is directed to review the change folder and the verdict record

#### Scenario: A copy-only run still produces a plan

- **WHEN** a run copies or updates files but verdicts nothing `adopt`
- **THEN** the change folder is written, its proposal enumerates every file copied and updated, and its tasks carry the review task
- **AND** the run is reviewable from one document rather than from chat output

#### Scenario: Existing sync change is never overwritten

- **WHEN** a change folder for today's date already exists
- **THEN** a suffixed sibling (`-2`, `-3`) is created and the existing folder is left untouched

#### Scenario: Tasks are concrete

- **WHEN** a task is written for an `adopt` capability
- **THEN** it names the capability id and states what changes in this repo, not merely the upstream feature's name

#### Scenario: A no-op run writes no folder

- **WHEN** a run copies nothing, updates nothing, does not self-update, and verdicts nothing `adopt`
- **THEN** no change folder is created
- **AND** `.claude/wong-sync-verdicts.md` is still written, and the report says the repo is current and points at it

#### Scenario: Prior adopt-named folders are left alone

- **WHEN** the target contains folders named `adopt-wongstack-<date>` from earlier versions
- **THEN** they are neither renamed nor rewritten, and new runs use the `sync-wongstack-<date>` name

#### Scenario: Target without OpenSpec

- **WHEN** the target has no `openspec/changes/` directory
- **THEN** the verdict record is still written and the report explains that the change could not be written
