## RENAMED Requirements

- FROM: `### Requirement: Four verdicts, one per capability`
- TO: `### Requirement: One verdict per capability`

## MODIFIED Requirements

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

### Requirement: The capability ledger makes the sync idempotent in judgment

`.claude/.wong-stack.json` SHALL carry a `capabilities` map keyed by capability id, each entry recording `verdict`, a one-line `reason`, and `asOfCommit` — the clone HEAD at which the judgment was made. The map SHALL be written last, with the rest of the manifest.

**Only `declined` SHALL suppress re-evaluation.** A capability whose ledger verdict is `declined` SHALL NOT be re-pitched on a later run unless its upstream expression changed since the recorded `asOfCommit`, in which case it SHALL be re-raised with what changed. Every other verdict — `present`, `divergent`, `adopt`, `not-applicable` — SHALL be recomputed from scratch on each run; its ledger entry is a record of the last computed state for reporting and retirement detection, and SHALL NOT be read as authoritative. A `not-applicable` verdict in particular turns on the target's shape rather than upstream's, so pinning it to an upstream commit SHALL NOT prevent its re-evaluation.

An absent `capabilities` key means nothing has been judged yet and is not an error. A ledger written by an earlier version, in which `declined` could mean either a user refusal or the skill's own judgment, SHALL have its `declined` entries honored as user refusals — the conservative read.

#### Scenario: Declines are not re-litigated

- **WHEN** the sync runs again and upstream has not changed a previously declined capability
- **THEN** that capability is not proposed again

#### Scenario: Upstream moved since the decline

- **WHEN** a declined capability's upstream expression changed after its recorded `asOfCommit`
- **THEN** it is re-raised, stating that it was declined earlier and what has changed since

#### Scenario: A divergent capability is recomputed

- **WHEN** the local mechanism that justified a `divergent` verdict has since been deleted
- **THEN** the next run recomputes the capability and verdicts it `adopt`, rather than honoring the stale `divergent`

#### Scenario: A not-applicable verdict follows the repo, not the clone

- **WHEN** a capability was `not-applicable` because the repo had no CI, and the repo has since added CI
- **THEN** the next run re-evaluates it and may verdict it `adopt`, even though the upstream expression is unchanged

#### Scenario: Older manifest

- **WHEN** the sync runs on a manifest with no `capabilities` key
- **THEN** it proceeds normally and writes the key for the first time

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

## ADDED Requirements

### Requirement: Every verdict lands in a durable, reviewable record

Every run of the analysis SHALL write `.claude/wong-sync-verdicts.md` in the target repo, containing **every** mapped capability — not only those verdicted `adopt` — each with its id, its verdict, and its one-line reason, grouped by verdict, together with anything re-raised or retired. It SHALL be written even when no capability is `adopt`, and it SHALL be a committed file rather than an ignored one, so it travels between clones and appears in the pull request diff.

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

### Requirement: The user can overrule any non-adopt verdict by ticking a box

In `.claude/wong-sync-verdicts.md`, every capability **not** verdicted `adopt` SHALL be written as an unticked Markdown checkbox line carrying its capability id. Ticking a box SHALL be the supported way to overrule the skill's verdict, and SHALL be the only edit to the file the skill honors.

Before regenerating the file, each run SHALL read the existing one and collect every ticked capability id. Each such capability SHALL be force-verdicted `adopt` for that run and written as a task in the change folder, regardless of what the analysis would otherwise have assigned. Where a ticked capability had a `declined` ledger entry, that entry SHALL be cleared — asking for the capability is how a previous refusal is reversed.

The regenerated file SHALL show each promoted capability under the adopted group, so a tick is visibly acted on rather than silently consumed. The run's report SHALL name every capability promoted this way.

#### Scenario: Ticking promotes a not-applicable capability

- **WHEN** the user ticks a `not-applicable` entry and runs `/wong-sync` again
- **THEN** that capability is verdicted `adopt` and gets a task in the change folder

#### Scenario: Ticking reverses a decline

- **WHEN** the user ticks a `declined` entry and runs `/wong-sync` again
- **THEN** the capability is verdicted `adopt`, its `declined` ledger entry is cleared, and it is no longer suppressed

#### Scenario: A tick is visibly acted on

- **WHEN** a ticked capability has been promoted
- **THEN** it appears under the adopted group in the regenerated file and is named in the report

#### Scenario: Untouched file changes nothing

- **WHEN** the user ticks nothing between runs
- **THEN** no capability is force-adopted and the analysis's own verdicts stand
