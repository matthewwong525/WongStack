## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: The capability ledger makes the sync idempotent in judgment

**Reason**: The ledger was a second store of the same verdicts now held by `.claude/wong-sync-verdicts.md`, and keeping both forced a written rule that only part of the ledger was authoritative — a rule that exists only because there are two stores. Suppression and retirement detection move to the record, which is the file the user actually edits.

**Migration**: The first run after upgrade folds an existing manifest `capabilities` map into `.claude/wong-sync-verdicts.md`, honoring each `declined` as a user refusal, then rewrites the manifest without the key. No user action is required; a manifest that retains the key after migration is inert because nothing reads it. The replacement behavior is specified by "Only a recorded decline suppresses re-evaluation".
