# wong-sync-adapt Specification

## Purpose

The capability-adoption analysis inside `/wong-sync`. Updating a repo is **adaptation, not replication**: a repo is current when the *capability* is present in it, in whatever form fits — not when its files match upstream's byte for byte. Two independent subagents (a cartographer over the WongStack clone, a surveyor over the target) feed a gap analysis that assigns every capability one of four verdicts, records them in a durable ledger, and proposes the worthwhile ones as an OpenSpec change. It reads broadly, writes almost nothing, and never implements.

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

### Requirement: Four verdicts, one per capability

The main thread SHALL assign every mapped capability exactly one verdict:

- **present** — the repo already has it, current.
- **divergent** — the repo solves it differently and the local solution is legitimate; no graft is proposed.
- **adopt** — missing, stale, or otherwise wanted here, and expressible in this repo.
- **declined** — wrong for this repo, or the user said no.

Every verdict SHALL carry a one-line reason. Only `adopt` verdicts SHALL become tasks. `divergent` findings SHALL be listed one line each in the report and SHALL NOT be proposed as work.

A payload file that exists locally, was never modified, and is behind upstream SHALL be verdicted `adopt` with a task instructing that the upstream version be taken verbatim. There SHALL NOT be a separate verdict for this case — the distinction lives in the task text, not the taxonomy.

#### Scenario: A capability solved differently is left alone

- **WHEN** the repo already achieves a capability through its own mechanism
- **THEN** the verdict is `divergent`, the local form is named, and no adoption task is written

#### Scenario: Stale unmodified file

- **WHEN** a payload file exists locally unmodified and upstream has moved on
- **THEN** the verdict is `adopt` and its task says to replace the file with the upstream version verbatim
- **AND** the file is not overwritten by the sync itself

#### Scenario: Only adopt becomes work

- **WHEN** verdicts are assigned
- **THEN** the proposed change contains one task per `adopt` capability and no task for any other verdict

### Requirement: The analysis proposes and never implements

The sole artifact the analysis writes SHALL be an OpenSpec change folder at `openspec/changes/adopt-wongstack-<YYYY-MM-DD>/`, containing a proposal (why these capabilities and what each buys this repo) and a tasks list. The graft is performed later through the normal loop (`/apply` → `/save` → `/ship`).

Each task SHALL name its capability id and describe the graft in this repo's terms — which file or convention it touches and what done looks like. A capability whose graft cannot be described concretely SHALL be verdicted `declined` rather than written as a vague task.

#### Scenario: Nothing else is touched

- **WHEN** a run completes
- **THEN** the only paths written are absent payload files, the change folder, and the manifest
- **AND** the user is directed to review the change and run `/apply`

#### Scenario: Existing adoption change is never overwritten

- **WHEN** a change folder for today's date already exists
- **THEN** a suffixed sibling (`-2`, `-3`) is created and the existing folder is left untouched

#### Scenario: Tasks are concrete

- **WHEN** a task is written for an `adopt` capability
- **THEN** it names the capability id and states what changes in this repo, not merely the upstream feature's name

#### Scenario: Nothing to adopt

- **WHEN** no capability is verdicted `adopt`
- **THEN** no change folder is created and the report says the repo is current

#### Scenario: Target without OpenSpec

- **WHEN** the target has no `openspec/changes/` directory
- **THEN** the capability gap is reported inline with an explanation that the change could not be written

### Requirement: The capability ledger makes the sync idempotent in judgment

`.claude/.wong-stack.json` SHALL gain a `capabilities` map keyed by capability id, each entry recording `verdict`, a one-line `reason`, and `asOfCommit` — the clone HEAD at which the judgment was made. The map SHALL be written last, with the rest of the manifest.

A capability whose ledger verdict is `declined` or `divergent` SHALL NOT be re-pitched on a later run **unless** its upstream expression changed since the recorded `asOfCommit`, in which case it SHALL be re-raised with what changed. An absent `capabilities` key means nothing has been judged yet and is not an error.

#### Scenario: Declines are not re-litigated

- **WHEN** the sync runs again and upstream has not changed a previously declined capability
- **THEN** that capability is not proposed again

#### Scenario: Upstream moved since the decline

- **WHEN** a declined capability's upstream expression changed after its recorded `asOfCommit`
- **THEN** it is re-raised, stating that it was declined earlier and what has changed since

#### Scenario: Older manifest

- **WHEN** the sync runs on a manifest with no `capabilities` key
- **THEN** it proceeds normally and writes the key for the first time

### Requirement: The read boundary is broad; the write boundary is narrow

With no outbound contribution path, the payload manifest SHALL bound what the skill **copies**, not what the surveyor may **read**. The surveyor SHALL read the target's process surfaces broadly — skills, wiki or docs, `CLAUDE.md`, configuration, and top-level structure — and SHALL NOT be limited to manifest files. It SHALL NOT be required to read application source. Nothing the surveyor reads SHALL leave the machine. The payload prose SHALL state this boundary change explicitly rather than leave it implied.

#### Scenario: Surveyor sees the whole repo's process surface

- **WHEN** the surveyor runs in a repo with skills and docs outside the payload manifest
- **THEN** it reads them, so that a capability already solved locally is correctly verdicted `divergent` rather than proposed as missing

#### Scenario: Nothing is sent anywhere

- **WHEN** the surveyor has read the target
- **THEN** no read content is written to the clone, pushed, or included in any outbound request
