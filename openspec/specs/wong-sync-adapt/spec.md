# wong-sync-adapt Specification

## Purpose

The capability-adoption analysis inside `/wong-sync`. Updating a repo is **adaptation, not replication**: a repo is current when the *capability* is present in it, in whatever form fits — not when its files match upstream's byte for byte. Two independent subagents (a cartographer over the WongStack clone, a surveyor over the target) feed a gap analysis that assigns every capability exactly one verdict — split by *who decided*, so the skill's own judgment is never stored with the weight of the user's — records them all in a durable, reviewable record the user can overrule, and proposes the worthwhile ones as an OpenSpec change. It reads broadly, writes almost nothing, and never implements.

## Requirements

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

### Requirement: Two independent subagents, synthesized by the main thread

The analysis SHALL spawn exactly two subagents that run independently and share no context:

- A **cartographer** that reads only the refreshed clone and returns a map of WongStack's capabilities.
- A **surveyor** that reads only the target repo and returns what that repo already is and already does.

Neither subagent's raw output SHALL be presented to the user; the main thread SHALL perform the gap analysis and own every verdict. Neither subagent SHALL write any file.

#### Scenario: Agents are independent

- **WHEN** the analysis runs
- **THEN** the cartographer is given no information about the target repo and the surveyor is given no information about upstream

#### Scenario: Raw findings stay internal

- **WHEN** both subagents return
- **THEN** the user sees the synthesized capability gap, not either agent's report verbatim

### Requirement: The unit of analysis is a capability, not a file or a skill

The cartographer SHALL map capabilities defined as "a thing WongStack lets you do, plus what it assumes about your repo" — explicitly not one-per-file and not one-per-skill. It SHALL read the wiki and the `WONG-STACK` block as first-class sources alongside `.claude/skills/`, so that cross-cutting conventions are mapped as capabilities in their own right. Each mapped capability SHALL carry a stable kebab-case id, what it lets you do, where upstream expresses it, what it assumes about a repo, and what it depends on.

Capability ids SHALL be derived from upstream content only — never from the target — so the same upstream commit yields the same ids in every repo. The cartographer SHALL be given the ids already in the repo's ledger and SHALL reuse a matching id rather than minting a new one.

#### Scenario: A convention is a capability

- **WHEN** the cartographer maps upstream
- **THEN** conventions expressed only in the wiki or the `WONG-STACK` block — such as "CI is the gate when present, else PR review" — appear as capabilities, not merely as file contents

#### Scenario: Ids are reused across runs

- **WHEN** the analysis runs a second time in a repo whose ledger already records a capability id
- **THEN** the same capability is mapped under that same id

#### Scenario: A ledger id disappears from the map

- **WHEN** an id in the ledger has no counterpart in the new map
- **THEN** it is reported as retired rather than silently dropped from the ledger

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

### Requirement: Every verdict lands in a durable, reviewable record

Every run of the analysis SHALL write `.claude/wong-sync-verdicts.md` in the target repo, containing **every** mapped capability — not only those verdicted `adopt` — each with its id, its verdict, and its one-line reason, grouped by verdict, together with anything re-raised or retired. It SHALL be written even when no capability is `adopt`, and it SHALL be a committed file rather than an ignored one, so it travels between clones and appears in the pull request diff.

This file SHALL be the **single store** of verdicts. No verdict, reason, or judgment commit SHALL be recorded anywhere else, including `.claude/.wong-stack.json`.

A `declined` entry SHALL additionally carry the clone commit it was judged against, written on its own line, so a later run can tell whether the upstream expression has changed since the refusal.

The file SHALL carry a generated-file header stating that it is rewritten on every `/wong-sync` run and that ticked checkboxes are read before it is regenerated.

The chat report SHALL become a summary that points at this file, and SHALL NOT be the only place any verdict appears.

#### Scenario: A run with nothing to adopt still produces a record

- **WHEN** every capability is `present`, `divergent`, or `not-applicable`
- **THEN** `.claude/wong-sync-verdicts.md` is written with all of them and the report points at it

#### Scenario: Non-adopt verdicts are not chat-only

- **WHEN** a capability is verdicted `divergent`, `not-applicable`, or `declined`
- **THEN** it appears in `.claude/wong-sync-verdicts.md` with its reason, not merely in the run's chat output

#### Scenario: The record is regenerated, not appended

- **WHEN** a second run produces different verdicts
- **THEN** the file reflects the current run's verdicts rather than accumulating past ones

#### Scenario: Verdicts appear in one place only

- **WHEN** a run completes and the manifest is rewritten
- **THEN** `.claude/.wong-stack.json` contains no verdict, reason, or judgment commit
- **AND** `.claude/wong-sync-verdicts.md` is the only file a reader must open to see what was decided and why

#### Scenario: A decline records what it was judged against

- **WHEN** a capability is verdicted `declined`
- **THEN** its entry in the record carries the clone commit at which the refusal was made

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

### Requirement: Only a recorded decline suppresses re-evaluation

The prior run's verdicts SHALL be read from `.claude/wong-sync-verdicts.md` before the analysis assigns new ones. **Only `declined` SHALL suppress.** A capability recorded `declined` SHALL NOT be re-pitched unless its upstream expression changed since the commit recorded with that entry, in which case it SHALL be re-raised with what changed.

Every other verdict — `present`, `divergent`, `adopt`, `not-applicable` — SHALL be recomputed from scratch on each run; the previous record is a picture of the last run, not authority to skip re-evaluating. A `not-applicable` verdict in particular turns on the target's shape rather than upstream's, so a recorded upstream commit SHALL NOT prevent its re-evaluation.

An absent record means nothing has been judged yet and is not an error. A capability present in the previous record with no counterpart in the new map SHALL be reported as **retired**, not silently dropped.

Where a manifest written by an earlier version still carries a `capabilities` map, the first run after upgrade SHALL fold its entries into the record — honoring each `declined` as a user refusal, the conservative read — and SHALL then write the manifest without that key.

#### Scenario: Declines are not re-litigated

- **WHEN** the sync runs again and upstream has not changed a previously declined capability
- **THEN** that capability is not proposed again

#### Scenario: Upstream moved since the decline

- **WHEN** a declined capability's upstream expression changed after the commit recorded with its entry
- **THEN** it is re-raised, stating that it was declined earlier and what has changed since

#### Scenario: A divergent capability is recomputed

- **WHEN** the local mechanism that justified a `divergent` verdict has since been deleted
- **THEN** the next run recomputes the capability and verdicts it `adopt`, rather than honoring the stale `divergent`

#### Scenario: A not-applicable verdict follows the repo, not the clone

- **WHEN** a capability was `not-applicable` because the repo had no CI, and the repo has since added CI
- **THEN** the next run re-evaluates it and may verdict it `adopt`, even though the upstream expression is unchanged

#### Scenario: A repo upgrading from the manifest ledger

- **WHEN** the sync runs on a manifest that still carries a `capabilities` map
- **THEN** its entries are folded into `.claude/wong-sync-verdicts.md`, each `declined` honored as a user refusal
- **AND** the manifest is rewritten without the `capabilities` key

#### Scenario: No prior record

- **WHEN** the sync runs in a repo with no `.claude/wong-sync-verdicts.md` and no manifest ledger
- **THEN** it proceeds normally and writes the record for the first time

### Requirement: Every changelog entry since the last sync is accounted for

When the manifest records a prior version (`BASE`), the analysis SHALL account for every `CHANGELOG.md` entry between `BASE` and the clone's current version. Each entry SHALL map to at least one accounting line, one of:

- **reflected here** — the entry's effect is already present locally, with the evidence named;
- **adopt** — covered by a verdict in this run, with the capability id named;
- **updated directly** — covered by a copy or direct update at the copy step, with the file named;
- **outside payload scope** — the entry touches nothing the payload delivers to targets.

The report SHALL print the per-entry accounting, so an entry with no line is a visible gap in the run's own output rather than a silent omission. The accounting SHALL live in the report; the verdict record's shape is unchanged by it.

A seed manifest (no prior version) SHALL skip the walk and the accounting, as today.

#### Scenario: A small upstream improvement cannot be silently skipped

- **WHEN** upstream shipped an entry between `BASE` and the current version whose effect is neither present locally nor covered by a copy or update
- **THEN** the run maps it to an `adopt` verdict, or the report visibly shows the entry unaccounted for

#### Scenario: An entry with no target-facing effect is accounted as such

- **WHEN** a changelog entry concerns only surfaces outside the payload manifest (such as `wong-setup` or source-repo tooling)
- **THEN** its accounting line says it is outside payload scope, rather than being omitted

#### Scenario: Seed manifest skips the accounting

- **WHEN** the manifest's `version` is null because `/wong-setup` just handed off
- **THEN** no changelog accounting is produced and the report states the version being installed

### Requirement: The read boundary is broad; the write boundary is narrow

With no outbound contribution path, the payload manifest SHALL bound what the skill **copies**, not what the surveyor may **read**. The surveyor SHALL read the target's process surfaces broadly — skills, wiki or docs, `CLAUDE.md`, configuration, and top-level structure — and SHALL NOT be limited to manifest files. It SHALL NOT be required to read application source. Nothing the surveyor reads SHALL leave the machine. The payload prose SHALL state this boundary change explicitly rather than leave it implied.

#### Scenario: Surveyor sees the whole repo's process surface

- **WHEN** the surveyor runs in a repo with skills and docs outside the payload manifest
- **THEN** it reads them, so that a capability already solved locally is correctly verdicted `divergent` rather than proposed as missing

#### Scenario: Nothing is sent anywhere

- **WHEN** the surveyor has read the target
- **THEN** no read content is written to the clone, pushed, or included in any outbound request

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
