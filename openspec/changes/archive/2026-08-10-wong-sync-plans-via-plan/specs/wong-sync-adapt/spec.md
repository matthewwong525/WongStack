# wong-sync-adapt Delta

## MODIFIED Requirements

### Requirement: The analysis proposes and never implements

The analysis SHALL write `.claude/wong-sync-verdicts.md` itself, and SHALL produce an OpenSpec change **by invoking the repo's plan skill with one fully composed instruction** — the plan skill itself is not modified and needs no knowledge of the sync — whenever the run **has anything to do** — that is, when it plans a copy or an update, plans to install its own newer version, or verdicts at least one capability `adopt`.

The instruction SHALL carry everything already resolved, so the plan skill has nothing left to ask:

- the **exact change name**. The sync SHALL resolve the name itself before invoking: `sync-wongstack-<YYYY-MM-DD>`, already suffixed `-2`, `-3` when a folder for today exists — so the plan skill never faces a collision and an existing, possibly mid-flight sync change is left untouched;
- the **composed `proposal.md` body**, with the instruction to use it **verbatim** — the after-picture specified by the `wong-sync-after-picture` capability (After, Gain, Lose, Resolution), carrying the version span synced, the files to be copied and updated, and a pointer to `.claude/wong-sync-verdicts.md`. Because nothing has landed when it is written, planned file changes SHALL be described as tasks rather than as landed — **except on a seed manifest**, where the copy has already happened and is described as landed. Verbatim is stated because the target's own proposal rules would otherwise reshape it;
- the **composed `tasks.md` body** — the file work as **coarse tasks** (one for the copies, one for the updates, one for installing a newer `wong-sync`, and one, ordered last among them, to rewrite the manifest to reflect the files that actually landed), followed by **one task per `adopt` capability**. There SHALL NOT be a task to review files the sync landed, because no file lands unreviewed;
- the **spec scoping**: delta specs only for `adopt` grafts (below), stated explicitly because the plan skill's default is to emit them broadly; `design.md` optional as a per-run snapshot, with the verdict record remaining the only authoritative store of verdicts.

The invocation SHALL happen only after the clarification stage, so every question is already answered; the sync SHALL NOT rely on the plan skill to ask the user anything. A blocker inside the plan skill returns to the sync, which reports it and does not fall back to prompting.

**Delta specs are scoped to grafts.** A delta spec SHALL be emitted only for an `adopt` capability — behavior the target repo genuinely gains and owns. Payload copies and updates SHALL NOT produce delta specs: they are vendored files whose specifications live upstream, and a copied spec goes stale in the target the moment upstream moves.

The plan skill SHALL be resolved through the manifest's `components.skills`, so a locally renamed plan skill is found under its local name. When the target has **no plan skill**, the sync SHALL fall back to writing `proposal.md` and `tasks.md` itself at `openspec/changes/sync-wongstack-<YYYY-MM-DD>/` and SHALL name this degraded mode in the report.

The change SHALL NOT be produced when the run plans no file change and has no `adopt`. The work is performed later through the normal loop (`/apply` → `/save` → `/ship`). Each adoption task SHALL name its capability id and describe the graft in this repo's terms — which file or convention it touches and what done looks like.

Change folders written under the earlier `adopt-wongstack-<YYYY-MM-DD>` name SHALL be left as they are; no rename or migration of existing folders is performed. An existing unapplied sync folder SHALL NOT suppress a new one — a changed situation deserves a changed plan — and the report SHALL name any `sync-wongstack-*` folder the run did not write, so an unapplied plan is visible rather than quietly superseded.

#### Scenario: Nothing else is touched

- **WHEN** a run completes on an installed repo
- **THEN** the only paths written are `.claude/wong-sync-verdicts.md` and the change the plan skill authored on the sync's behalf
- **AND** the user is directed to review the change and run `/apply`

#### Scenario: Authoring is delegated

- **WHEN** the run has anything to do and the target has a plan skill
- **THEN** the sync invokes it with one instruction carrying the resolved change name, the composed proposal and tasks bodies marked verbatim, and the spec scoping
- **AND** the composed after-picture and task list land verbatim
- **AND** the plan skill itself is unmodified — the instruction works with whatever version the target has

#### Scenario: The collision is resolved before the invocation

- **WHEN** a folder for today's date already exists at invocation time
- **THEN** the sync passes the suffixed name (`-2`, `-3`) in the instruction
- **AND** the plan skill never faces a collision or asks whether to continue the existing change

#### Scenario: The after-picture survives the target's rules

- **WHEN** the target's `config.yaml` prescribes a proposal shape other than the after-picture
- **THEN** the sync's composed proposal body still lands verbatim, in the four regions

#### Scenario: Delta specs are emitted for grafts only

- **WHEN** a run plans sixty file copies and verdicts two capabilities `adopt`
- **THEN** delta specs may be emitted for the two grafts
- **AND** no delta spec is emitted for any copied or updated payload file

#### Scenario: A renamed plan skill is found

- **WHEN** the manifest's `components.skills` records the plan skill under a local name
- **THEN** the sync resolves and invokes it under that name

#### Scenario: No plan skill falls back, and says so

- **WHEN** the target has no plan skill
- **THEN** the sync writes `proposal.md` and `tasks.md` itself at `openspec/changes/sync-wongstack-<YYYY-MM-DD>/`
- **AND** the report names the degraded mode

#### Scenario: A file-only run still produces a plan

- **WHEN** a run plans copies or updates but verdicts nothing `adopt`
- **THEN** the change is produced, its proposal is the after-picture, and its tasks carry the coarse file work
- **AND** there is no task asking the user to review files that landed

#### Scenario: File work is coarse, grafts are not

- **WHEN** a run plans sixty file copies and two adoptions
- **THEN** the copies are one task naming the proposal's file list, and each adoption is its own task at the concreteness bar

#### Scenario: The manifest task is last among the file tasks

- **WHEN** the tasks list is composed
- **THEN** the manifest rewrite is ordered after the copy, update, and self-install tasks, so it records what actually landed

#### Scenario: Existing sync change is never overwritten

- **WHEN** a change folder for today's date already exists
- **THEN** a suffixed sibling (`-2`, `-3`) is created and the existing folder is left untouched

#### Scenario: An unapplied plan does not block a new one

- **WHEN** a previous run's sync folder exists and was never applied
- **THEN** this run produces its own plan anyway
- **AND** the report names the older folder so it is visible

#### Scenario: Tasks are concrete

- **WHEN** a task is written for an `adopt` capability
- **THEN** it names the capability id and states what changes in this repo, not merely the upstream feature's name

#### Scenario: A no-op run writes no folder

- **WHEN** a run plans no file change and verdicts nothing `adopt`
- **THEN** no change folder is created
- **AND** `.claude/wong-sync-verdicts.md` is still written, and the report says the repo is current and points at it

#### Scenario: Prior adopt-named folders are left alone

- **WHEN** the target contains folders named `adopt-wongstack-<date>` from earlier versions
- **THEN** they are neither renamed nor rewritten, and new runs use the `sync-wongstack-<date>` name

#### Scenario: Target without OpenSpec

- **WHEN** the target has no `openspec/changes/` directory
- **THEN** the verdict record is still written and the report explains that the change could not be written
