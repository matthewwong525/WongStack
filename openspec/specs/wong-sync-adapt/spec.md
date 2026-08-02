# wong-sync-adapt Specification

## Purpose

The capability-adoption analysis inside `/wong-sync`. Updating a repo is **adaptation, not replication**: a repo is current when the *capability* is present in it, in whatever form fits — not when its files match upstream's byte for byte. Two independent subagents (a cartographer over the WongStack clone, a surveyor over the target) feed a gap analysis that assigns every capability exactly one verdict — split by *who decided*, so the skill's own judgment is never stored with the weight of the user's — records them all in a durable, reviewable record the user can overrule, and proposes the worthwhile ones as an OpenSpec change. It reads broadly, writes almost nothing, and never implements.

## Requirements

### Requirement: Capability adaptation is the default and only analysis path

Every `/wong-sync` run SHALL, after refreshing the clone and copying absent payload files, run the capability analysis over the payload files that already exist locally. The skill SHALL take no arguments and SHALL expose no alternative mode. The analysis SHALL NOT modify any existing file in the target and SHALL NOT run any git command in the target.

#### Scenario: An ordinary run analyses rather than diffs

- **WHEN** the user runs `/wong-sync` in an installed repo
- **THEN** no three-way diff is performed and no file is overwritten
- **AND** the capability analysis runs over the payload surfaces the repo already has

#### Scenario: A fully-absent repo needs no analysis of what it lacks

- **WHEN** every payload file is missing locally (a fresh install)
- **THEN** the files are copied directly and the analysis has nothing present to weigh them against

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

- **present** — the repo already has it, current.
- **divergent** — the repo solves it differently and the local solution is legitimate; no graft is proposed.
- **adopt** — missing, stale, or otherwise wanted here, and expressible in this repo.
- **not-applicable** — the skill judged that it does not fit: an `assumes` this repo does not meet, or a graft it could not describe concretely.
- **declined** — the user said no.

The taxonomy SHALL be split by **who decided**. `not-applicable` SHALL be the only verdict the skill may assign on its own judgment of poor fit, and `declined` SHALL be written **only** from a decision the user actually made — never from the skill's own inference. A capability whose graft cannot be described concretely SHALL be verdicted `not-applicable` rather than written as a vague task.

Every verdict SHALL carry a one-line reason. Only `adopt` verdicts SHALL become tasks. `divergent` and `not-applicable` findings SHALL be listed one line each in the durable verdict record and SHALL NOT be proposed as work.

A payload file that exists locally, was never modified, and is behind upstream SHALL be verdicted `adopt` with a task instructing that the upstream version be taken verbatim. There SHALL NOT be a separate verdict for this case — the distinction lives in the task text, not the taxonomy.

#### Scenario: A capability solved differently is left alone

- **WHEN** the repo already achieves a capability through its own mechanism
- **THEN** the verdict is `divergent`, the local form is named, and no adoption task is written

#### Scenario: An unmet assumption is the skill's call, not the user's

- **WHEN** a capability assumes CI checks and the repo has no forge checks
- **THEN** the verdict is `not-applicable` with the assumption named
- **AND** it is not recorded as `declined`

#### Scenario: A graft that cannot be made concrete

- **WHEN** the main thread cannot describe a graft in this repo's terms
- **THEN** the verdict is `not-applicable`, not `declined` and not a vague task

#### Scenario: Declined requires an actual refusal

- **WHEN** a run completes without the user having refused anything
- **THEN** no capability is newly verdicted `declined`

#### Scenario: Stale unmodified file

- **WHEN** a payload file exists locally unmodified and upstream has moved on
- **THEN** the verdict is `adopt` and its task says to replace the file with the upstream version verbatim
- **AND** the file is not overwritten by the sync itself

#### Scenario: Only adopt becomes work

- **WHEN** verdicts are assigned
- **THEN** the proposed change contains one task per `adopt` capability and no task for any other verdict

### Requirement: The analysis proposes and never implements

The analysis SHALL write exactly two kinds of artifact and nothing else:

1. `.claude/wong-sync-verdicts.md` — the durable verdict record, specified below.
2. An OpenSpec change folder at `openspec/changes/adopt-wongstack-<YYYY-MM-DD>/`, containing a proposal (why these capabilities and what each buys this repo) and a tasks list, written **only** when at least one capability is `adopt`.

The graft is performed later through the normal loop (`/apply` → `/save` → `/ship`). Each task SHALL name its capability id and describe the graft in this repo's terms — which file or convention it touches and what done looks like.

#### Scenario: Nothing else is touched

- **WHEN** a run completes
- **THEN** the only paths written are absent payload files, `.claude/wong-sync-verdicts.md`, the change folder, and the manifest
- **AND** the user is directed to review the verdict record and run `/apply`

#### Scenario: Existing adoption change is never overwritten

- **WHEN** a change folder for today's date already exists
- **THEN** a suffixed sibling (`-2`, `-3`) is created and the existing folder is left untouched

#### Scenario: Tasks are concrete

- **WHEN** a task is written for an `adopt` capability
- **THEN** it names the capability id and states what changes in this repo, not merely the upstream feature's name

#### Scenario: Nothing to adopt

- **WHEN** no capability is verdicted `adopt`
- **THEN** no change folder is created
- **AND** `.claude/wong-sync-verdicts.md` is still written, and the report says the repo is current and points at it

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

### Requirement: The user can overrule any non-adopt verdict by ticking a box

In `.claude/wong-sync-verdicts.md`, every capability **not** verdicted `adopt` SHALL be written as an unticked Markdown checkbox line carrying its capability id. Ticking a box SHALL be the supported way to overrule the skill's verdict, and SHALL be the only edit to the file the skill honors.

Before regenerating the file, each run SHALL read the existing one and collect every ticked capability id. Each such capability SHALL be force-verdicted `adopt` for that run and written as a task in the change folder, regardless of what the analysis would otherwise have assigned. Where a ticked capability was previously `declined`, that prior refusal SHALL cease to suppress it — asking for the capability is how a previous refusal is reversed.

The regenerated file SHALL show each promoted capability under the adopted group, so a tick is visibly acted on rather than silently consumed. The run's report SHALL name every capability promoted this way.

#### Scenario: Ticking promotes a not-applicable capability

- **WHEN** the user ticks a `not-applicable` entry and runs `/wong-sync` again
- **THEN** that capability is verdicted `adopt` and gets a task in the change folder

#### Scenario: Ticking reverses a decline

- **WHEN** the user ticks a `declined` entry and runs `/wong-sync` again
- **THEN** the capability is verdicted `adopt`, its prior refusal no longer suppresses it, and the regenerated record shows it as adopted

#### Scenario: A tick is visibly acted on

- **WHEN** a ticked capability has been promoted
- **THEN** it appears under the adopted group in the regenerated file and is named in the report

#### Scenario: Untouched file changes nothing

- **WHEN** the user ticks nothing between runs
- **THEN** no capability is force-adopted and the analysis's own verdicts stand

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

### Requirement: The read boundary is broad; the write boundary is narrow

With no outbound contribution path, the payload manifest SHALL bound what the skill **copies**, not what the surveyor may **read**. The surveyor SHALL read the target's process surfaces broadly — skills, wiki or docs, `CLAUDE.md`, configuration, and top-level structure — and SHALL NOT be limited to manifest files. It SHALL NOT be required to read application source. Nothing the surveyor reads SHALL leave the machine. The payload prose SHALL state this boundary change explicitly rather than leave it implied.

#### Scenario: Surveyor sees the whole repo's process surface

- **WHEN** the surveyor runs in a repo with skills and docs outside the payload manifest
- **THEN** it reads them, so that a capability already solved locally is correctly verdicted `divergent` rather than proposed as missing

#### Scenario: Nothing is sent anywhere

- **WHEN** the surveyor has read the target
- **THEN** no read content is written to the clone, pushed, or included in any outbound request
