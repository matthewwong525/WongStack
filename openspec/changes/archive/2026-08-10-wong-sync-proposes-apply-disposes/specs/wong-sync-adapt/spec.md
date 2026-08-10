# wong-sync-adapt Specification (delta)

## RENAMED Requirements

- FROM: `### Requirement: The user can overrule any non-adopt verdict by ticking a box`
- TO: `### Requirement: The user can overrule any verdict by ticking a box`

## ADDED Requirements

### Requirement: A bounded clarification stage precedes verdict assignment

After the subagent reports return and before verdicts are assigned, `/wong-sync` MAY ask the user clarifying questions. The stage SHALL be bounded as follows.

**Permitted questions** are only those the evidence cannot settle because the missing fact is the user's intent:

- whether a local difference the skill can see is **deliberate**, which is what `divergent` requires and what the repo cannot show;
- whether an unmet `assumes` is a **gap or a choice**, which decides `not-applicable`;
- **which of two materially different shapes** a graft should take in this repo, where the alternative is a task that says to shape it with `/plan`.

**Forbidden questions.** The skill SHALL NOT ask whether the user wants a capability, SHALL NOT ask for approval of the plan or of any part of it, and SHALL NOT ask anything answerable by reading the repo. Approval SHALL remain the review of the written change.

**Bounds.** There SHALL NOT be a fixed limit on the number of questions, because genuine ambiguity scales with what is being adopted: a one-file update and a first sync over the whole payload do not warrant the same count. Each question SHALL instead qualify on its own by meeting all three of:

1. its answer changes the plan — a different verdict, or a concrete graft where the alternative is a task saying to shape it with `/plan`;
2. the repo cannot answer it by being read;
3. it concerns intent, per the permitted kinds above.

Questions SHALL be asked in one batch rather than serially, ordered by how much the answer changes, so that answering the first few and stopping is a supported outcome. Each SHALL state what happens if it is not answered.

**Unanswered resolves toward `adopt`.** Where the run is non-interactive, or the user declines to answer, the run SHALL proceed and each unanswered question SHALL resolve to the verdict the adopt-bias would give. A run SHALL always complete and write its plan without any answer.

**Answers are durable and attributed.** An answer SHALL become the reason line of the verdict it produced, recorded as the user's word rather than the skill's reading, carrying the clone commit it was answered against. The same question SHALL NOT be asked again while that commit is unchanged; if the capability's upstream expression has since changed, it MAY be asked again. The verdict itself SHALL still be recomputed every run, per the re-evaluation rule.

#### Scenario: A deliberate local alternative is confirmed

- **WHEN** the skill finds a local mechanism that may cover a capability but cannot tell whether it is deliberate
- **THEN** it may ask, and a confirming answer yields `divergent` with the mechanism named and attributed to the user

#### Scenario: An unmet assumption is a gap, not a choice

- **WHEN** a capability assumes CI checks and the repo has none
- **THEN** the skill may ask whether that is deliberate
- **AND** an answer that it is not yields `adopt` rather than `not-applicable`

#### Scenario: Approval is never asked

- **WHEN** the clarification stage runs
- **THEN** no question asks whether the user wants a capability, or whether to proceed
- **AND** the plan is written and reviewed regardless of the answers

#### Scenario: A non-interactive run completes

- **WHEN** `/wong-sync` runs where no user can answer
- **THEN** it asks nothing, resolves every open question toward `adopt`, and writes its plan

#### Scenario: A large sync asks more than a small one

- **WHEN** a first sync over the whole payload raises many qualifying ambiguities
- **THEN** each qualifying question is asked, in one ordered batch
- **AND** no fixed limit truncates them

#### Scenario: A question that would not change the plan is not asked

- **WHEN** every possible answer to an ambiguity produces the same verdict and the same task
- **THEN** the question is not asked and the analysis proceeds

#### Scenario: The user answers some and stops

- **WHEN** the user answers the first questions in the batch and leaves the rest
- **THEN** the answered ones inform their verdicts and the unanswered ones resolve toward `adopt`
- **AND** the plan is written

#### Scenario: An answered question is not re-asked

- **WHEN** a later run reaches the same ambiguity and the capability's upstream expression is unchanged since the answer
- **THEN** the question is not asked again and the recorded answer stands as the reason
- **AND** the verdict is still recomputed

## MODIFIED Requirements

### Requirement: Capability adaptation is the default and only analysis path

Every `/wong-sync` run SHALL, after refreshing the clone and classifying the payload files, run the capability analysis over the payload files that already exist locally. The skill SHALL take no arguments and SHALL expose no alternative mode. The analysis SHALL NOT modify any existing file in the target and SHALL NOT run any git command in the target.

On a **seed manifest** the payload files are copied before the analysis, so the analysis has nothing present to weigh them against. On every other run nothing has been written when the analysis runs, so the classification of each file — copy, update, or adapt — is an input to the plan rather than a description of what already happened.

#### Scenario: An ordinary run analyses rather than diffs

- **WHEN** the user runs `/wong-sync` in an installed repo
- **THEN** no three-way diff is performed and no file is overwritten
- **AND** the capability analysis runs over the payload surfaces the repo already has

#### Scenario: A fully-absent repo needs no analysis of what it lacks

- **WHEN** every payload file is missing locally (a seed manifest)
- **THEN** the files are copied directly and the analysis has nothing present to weigh them against

#### Scenario: The analysis runs before anything has changed

- **WHEN** a run on an installed repo reaches the analysis
- **THEN** no payload file has been written yet, and the planned copies and updates are inputs to the proposal

#### Scenario: No manifest at all

- **WHEN** `/wong-sync` runs in a repo with no `.claude/.wong-stack.json`
- **THEN** it stops and points at `/wong-setup`

### Requirement: The analysis proposes and never implements

The analysis SHALL write exactly two kinds of artifact and nothing else:

1. `.claude/wong-sync-verdicts.md` — the durable verdict record, specified below.
2. An OpenSpec change folder at `openspec/changes/sync-wongstack-<YYYY-MM-DD>/`, written whenever the run **has anything to do** — that is, when it plans a copy or an update, plans to install its own newer version, or verdicts at least one capability `adopt`.

The folder SHALL contain a proposal and a tasks list:

- **`proposal.md`** SHALL be the after-picture specified by the `wong-sync-after-picture` capability — After, Gain, Lose, Resolution — carrying the version span synced, the files to be copied and updated, and a pointer to `.claude/wong-sync-verdicts.md` for everything considered and not adopted. Because nothing has landed when it is written, planned file changes SHALL be described as tasks rather than as landed — **except on a seed manifest**, where the copy has already happened and is described as landed.
- **`tasks.md`** SHALL carry the file work as **coarse tasks** — one for the copies, one for the updates, one for installing a newer `wong-sync`, and one, ordered last among them, to rewrite the manifest to reflect the files that actually landed — followed by **one task per `adopt` capability**. There SHALL NOT be a task to review files the sync landed, because no file lands unreviewed.

The folder SHALL NOT be written when the run plans no file change and has no `adopt`. The work is performed later through the normal loop (`/apply` → `/save` → `/ship`). Each adoption task SHALL name its capability id and describe the graft in this repo's terms — which file or convention it touches and what done looks like.

Change folders written under the earlier `adopt-wongstack-<YYYY-MM-DD>` name SHALL be left as they are; no rename or migration of existing folders is performed. An existing unapplied sync folder SHALL NOT suppress a new one — a changed situation deserves a changed plan — and the report SHALL name any `sync-wongstack-*` folder the run did not write, so an unapplied plan is visible rather than quietly superseded.

#### Scenario: Nothing else is touched

- **WHEN** a run completes on an installed repo
- **THEN** the only paths written are `.claude/wong-sync-verdicts.md` and the change folder
- **AND** the user is directed to review the change and run `/apply`

#### Scenario: A file-only run still produces a plan

- **WHEN** a run plans copies or updates but verdicts nothing `adopt`
- **THEN** the change folder is written, its proposal is the after-picture, and its tasks carry the coarse file work
- **AND** there is no task asking the user to review files that landed

#### Scenario: File work is coarse, grafts are not

- **WHEN** a run plans sixty file copies and two adoptions
- **THEN** the copies are one task naming the proposal's file list, and each adoption is its own task at the concreteness bar

#### Scenario: The manifest task is last among the file tasks

- **WHEN** the tasks list is written
- **THEN** the manifest rewrite is ordered after the copy, update, and self-install tasks, so it records what actually landed

#### Scenario: Existing sync change is never overwritten

- **WHEN** a change folder for today's date already exists
- **THEN** a suffixed sibling (`-2`, `-3`) is created and the existing folder is left untouched

#### Scenario: An unapplied plan does not block a new one

- **WHEN** a previous run's sync folder exists and was never applied
- **THEN** this run writes its own plan anyway
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

### Requirement: The user can overrule any verdict by ticking a box

In `.claude/wong-sync-verdicts.md`, **every** capability SHALL be written as an unticked Markdown checkbox line carrying its capability id, in every verdict group including `adopt`. Ticking a box SHALL be the supported way to overrule the skill's verdict, and SHALL be the only edit to the file the skill honors.

Before regenerating the file, each run SHALL read the existing one and collect every ticked capability id. Ticking SHALL be interpreted by the group the line was in:

- A ticked capability **not** verdicted `adopt` SHALL be force-verdicted `adopt` for that run and written as a task in the change folder, regardless of what the analysis would otherwise have assigned. Where it was previously `declined`, that prior refusal SHALL cease to suppress it — asking for the capability is how a previous refusal is reversed.
- A ticked capability verdicted `adopt` SHALL be recorded `declined` for that run, carrying the clone commit it was judged against, and SHALL NOT be written as a task. This is the supported way to refuse an adoption, and it is what makes `declined` reachable: deleting a task, or simply never running `/apply`, SHALL NOT be read as a refusal, because not yet done is not a refusal.

The regenerated file SHALL show each capability under the group its tick moved it to, so a tick is visibly acted on rather than silently consumed. The run's report SHALL name every capability promoted and every capability declined this way.

#### Scenario: Ticking promotes a not-applicable capability

- **WHEN** the user ticks a `not-applicable` entry and runs `/wong-sync` again
- **THEN** that capability is verdicted `adopt` and gets a task in the change folder

#### Scenario: Ticking reverses a decline

- **WHEN** the user ticks a `declined` entry and runs `/wong-sync` again
- **THEN** the capability is verdicted `adopt`, its prior refusal no longer suppresses it, and the regenerated record shows it as adopted

#### Scenario: Ticking an adopt records a decline

- **WHEN** the user ticks an `adopt` entry and runs `/wong-sync` again
- **THEN** the capability is recorded `declined` with the clone commit it was judged against, gets no task, and is named in the report

#### Scenario: An unapplied task is not a refusal

- **WHEN** a plan's adoption task is deleted or simply never applied, with no box ticked
- **THEN** no capability is recorded `declined`
- **AND** the capability is recomputed and re-proposed on the next run

#### Scenario: A tick is visibly acted on

- **WHEN** a ticked capability has been promoted or declined
- **THEN** it appears under its new group in the regenerated file and is named in the report

#### Scenario: Untouched file changes nothing

- **WHEN** the user ticks nothing between runs
- **THEN** no verdict is overruled and the analysis's own verdicts stand

### Requirement: One verdict per capability

The main thread SHALL assign every mapped capability exactly one verdict:

- **present** — the repo already has it, current, through a named local expression.
- **divergent** — the repo solves it differently through a named, deliberate local alternative; no graft is proposed.
- **adopt** — missing, stale, or otherwise wanted here.
- **not-applicable** — the skill judged that it does not fit: an `assumes` this repo does not meet.
- **declined** — the user said no.

The taxonomy SHALL be split by **who decided**. `not-applicable` SHALL be the only verdict the skill may assign on its own judgment of poor fit, and `declined` SHALL be written **only** from a decision the user actually made — a ticked `adopt` line, or a refusal the user stated — never from the skill's own inference.

**The bias SHALL point toward `adopt`.** When the evidence supports both `adopt` and any other verdict, the verdict SHALL be `adopt` — an `adopt` is reviewed downstream in the proposed change, while every other verdict is effectively final until someone reads the record, so the costs of a wrong call are asymmetric.

**`divergent` SHALL require a named, deliberate local alternative.** Its reason line MUST name the local mechanism — a file, convention, or tool — that covers the capability. A difference the skill cannot attribute to a local decision SHALL be verdicted `adopt`, not `divergent`.

**`present` SHALL require named local evidence.** Its reason line MUST name where this repo expresses the capability — a path, a convention, or a tool. A capability the skill believes present but cannot attribute to anything in this repo SHALL be verdicted `adopt`, on the same reasoning that governs `divergent`.

**A graft that cannot yet be described concretely SHALL be verdicted `adopt`**, with a task that says to shape the graft with the repo's own `/plan`, and SHALL be named in the proposal's Resolution region. It SHALL NOT be demoted to `not-applicable` — that verdict is reserved for an unmet `assumes`, a fit failure, and MUST NOT be used to record the skill's inability to express a graft.

Every verdict SHALL carry a one-line reason. Only `adopt` verdicts SHALL become tasks. `divergent` and `not-applicable` findings SHALL be listed one line each in the durable verdict record and SHALL NOT be proposed as work.

A payload file that exists locally, is behind upstream, and is **not** provably unmodified (per the `wong-sync` capability's update-if-untouched rule — e.g. a copy from a fork or an edited lineage) SHALL be verdicted `adopt` with a task instructing that the upstream version be taken verbatim. A provably unmodified stale file is planned as a direct update and does not reach this analysis as stale. There SHALL NOT be a separate verdict for either case — the distinction lives in the task text, not the taxonomy.

#### Scenario: A capability solved deliberately differently is left alone

- **WHEN** the repo achieves a capability through its own mechanism and the skill can name that mechanism
- **THEN** the verdict is `divergent`, the local form is named in the reason, and no adoption task is written

#### Scenario: An unattributable difference is adopted, not excused

- **WHEN** the repo's form of a capability differs from upstream and the skill cannot point at a deliberate local alternative
- **THEN** the verdict is `adopt`, not `divergent`

#### Scenario: An unattributable present is adopted

- **WHEN** the skill judges a capability present but cannot name the local path, convention, or tool that expresses it
- **THEN** the verdict is `adopt`, not `present`

#### Scenario: In doubt means adopt

- **WHEN** the evidence for a capability supports both `adopt` and another verdict
- **THEN** the verdict is `adopt` and the gap surfaces in the reviewable proposal

#### Scenario: An unmet assumption is the skill's call, not the user's

- **WHEN** a capability assumes CI checks and the repo has no forge checks
- **THEN** the verdict is `not-applicable` with the assumption named
- **AND** it is not recorded as `declined`

#### Scenario: A graft that cannot be made concrete is still proposed

- **WHEN** the main thread cannot describe a graft in this repo's terms
- **THEN** the verdict is `adopt`, its task says to shape the graft with `/plan`, and it is named in the proposal's Resolution region
- **AND** it is not verdicted `not-applicable`

#### Scenario: Declined requires an actual refusal

- **WHEN** a run completes without the user having ticked an `adopt` line or refused anything
- **THEN** no capability is newly verdicted `declined`

#### Scenario: Stale file that is not provably unmodified

- **WHEN** a payload file is behind upstream and its content matches no historical upstream version
- **THEN** the verdict is `adopt` and its task says to replace the file with the upstream version verbatim
- **AND** the file is not overwritten by the sync itself

#### Scenario: Only adopt becomes work

- **WHEN** verdicts are assigned
- **THEN** the proposed change contains one task per `adopt` capability, plus the coarse file tasks, and no task for any other verdict
