# wong-sync-adapt — delta

## MODIFIED Requirements

### Requirement: One verdict per capability

The main thread SHALL assign every mapped capability exactly one verdict:

- **present** — the repo already has it, current.
- **divergent** — the repo solves it differently through a named, deliberate local alternative; no graft is proposed.
- **adopt** — missing, stale, or otherwise wanted here.
- **not-applicable** — the skill judged that it does not fit: an `assumes` this repo does not meet.
- **declined** — the user said no.

The taxonomy SHALL be split by **who decided**. `not-applicable` SHALL be the only verdict the skill may assign on its own judgment of poor fit, and `declined` SHALL be written **only** from a decision the user actually made — never from the skill's own inference.

**The bias SHALL point toward `adopt`.** When the evidence supports both `adopt` and any other verdict, the verdict SHALL be `adopt` — an `adopt` is reviewed downstream in the proposed change, while every other verdict is effectively final until someone reads the record, so the costs of a wrong call are asymmetric.

**`divergent` SHALL require a named, deliberate local alternative.** Its reason line MUST name the local mechanism — a file, convention, or tool — that covers the capability. A difference the skill cannot attribute to a local decision SHALL be verdicted `adopt`, not `divergent`.

**A graft that cannot yet be described concretely SHALL be verdicted `adopt`**, with a task that says to shape the graft with the repo's own `/plan`. It SHALL NOT be demoted to `not-applicable` — that verdict is reserved for an unmet `assumes`, a fit failure, and MUST NOT be used to record the skill's inability to express a graft.

Every verdict SHALL carry a one-line reason. Only `adopt` verdicts SHALL become tasks. `divergent` and `not-applicable` findings SHALL be listed one line each in the durable verdict record and SHALL NOT be proposed as work.

A payload file that exists locally, is behind upstream, and is **not** provably unmodified (per the `wong-sync` capability's update-if-untouched rule — e.g. a copy from a fork or an edited lineage) SHALL be verdicted `adopt` with a task instructing that the upstream version be taken verbatim. A provably unmodified stale file is updated directly at the copy step and does not reach this analysis as stale. There SHALL NOT be a separate verdict for either case — the distinction lives in the task text, not the taxonomy.

#### Scenario: A capability solved deliberately differently is left alone

- **WHEN** the repo achieves a capability through its own mechanism and the skill can name that mechanism
- **THEN** the verdict is `divergent`, the local form is named in the reason, and no adoption task is written

#### Scenario: An unattributable difference is adopted, not excused

- **WHEN** the repo's form of a capability differs from upstream and the skill cannot point at a deliberate local alternative
- **THEN** the verdict is `adopt`, not `divergent`

#### Scenario: In doubt means adopt

- **WHEN** the evidence for a capability supports both `adopt` and another verdict
- **THEN** the verdict is `adopt` and the gap surfaces in the reviewable proposal

#### Scenario: An unmet assumption is the skill's call, not the user's

- **WHEN** a capability assumes CI checks and the repo has no forge checks
- **THEN** the verdict is `not-applicable` with the assumption named
- **AND** it is not recorded as `declined`

#### Scenario: A graft that cannot be made concrete is still proposed

- **WHEN** the main thread cannot describe a graft in this repo's terms
- **THEN** the verdict is `adopt` and its task says to shape the graft with `/plan`
- **AND** it is not verdicted `not-applicable`

#### Scenario: Declined requires an actual refusal

- **WHEN** a run completes without the user having refused anything
- **THEN** no capability is newly verdicted `declined`

#### Scenario: Stale file that is not provably unmodified

- **WHEN** a payload file is behind upstream and its content matches no historical upstream version
- **THEN** the verdict is `adopt` and its task says to replace the file with the upstream version verbatim
- **AND** the file is not overwritten by the sync itself

#### Scenario: Only adopt becomes work

- **WHEN** verdicts are assigned
- **THEN** the proposed change contains one task per `adopt` capability and no task for any other verdict

## ADDED Requirements

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
