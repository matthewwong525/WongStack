# Spec Delta

## ADDED Requirements

### Requirement: A passed journey is kept as a replayable check

When a walk inside `/ship` grades a browser journey or a request probe as a pass, it SHALL keep a replayable check in the project, beside its verification recipes: the steps, what the passing evidence showed, and a reference to the scenario, never a copy of its `THEN`. A check SHALL be kept only after it replays unchanged, alone, on staging rebuilt from the seed. A journey that needs a person's login, triggers an outside service or a scheduled job, or whose steps hold a credential SHALL NOT be kept. A walk outside `/ship` SHALL keep none.

#### Scenario: A new promise passes

- **WHEN** the walk inside `/ship` passes a browser journey for a scenario that has no kept check
- **THEN** the project holds a kept check for that scenario after the publish, and it replays with no model call

#### Scenario: A recording that does not replay

- **WHEN** a passed journey's recording differs when replayed alone from the seed
- **THEN** it is not kept, the report names it, and the walk's verdict is unchanged

### Requirement: Kept checks replay before publishing without a model

The walk inside `/ship` SHALL replay the project's kept checks against the preview with no model call, within two minutes in total. Checks recorded against files the branch changed SHALL run first; the rest SHALL run in an order that differs between revisions, so every check is reached over time. A check that writes SHALL start from the seed. Every check that did not run SHALL be named with its reason and SHALL NOT count as a pass. Where staging was not rebuilt from the seed, nothing SHALL replay, the report SHALL say why, and the walk's verdict SHALL be unchanged. A walk outside `/ship` SHALL replay only when the person asks.

#### Scenario: More kept checks than the limit allows

- **WHEN** the project holds more kept checks than two minutes can replay
- **THEN** the checks for the areas the branch changed run first, the replay stops at the limit, and the report names each check that did not run

#### Scenario: A project with no disposable staging

- **WHEN** the walk inside `/ship` runs where staging can not be rebuilt from the seed
- **THEN** no kept check replays, the report says why, and the walk's verdict is what it would have been without kept checks

### Requirement: A changed replay gets one fresh walk

A kept check whose replay differs SHALL be walked fresh once and graded against its scenario's current `THEN`. A pass SHALL replace the kept check and leave the verdict unaffected. At most three kept checks SHALL be walked fresh in one walk; the rest SHALL be named unverified. A kept check whose scenario the change itself modifies SHALL NOT be replayed; the change's own walk SHALL replace it. A kept check whose scenario no longer exists SHALL be removed.

#### Scenario: A renamed button

- **WHEN** a replay differs because a control was renamed and the fresh walk shows the scenario's `THEN` still holds
- **THEN** the kept check is replaced with the new recording and the walk's verdict is unaffected

#### Scenario: The change rewrites the promise

- **WHEN** the change's own delta modifies a scenario that has a kept check
- **THEN** that check is not replayed, and the change's own passing walk replaces it

### Requirement: A change that breaks an older promise repairs it

When a fresh walk of a changed kept check contradicts its scenario's `THEN` and the cause plausibly lies in files the branch changed, the walk SHALL repair it without asking, under its existing bound of two attempts, and replay that check after each repair. A contradiction that survives the bound, or whose cause lies outside the branch's files, SHALL make the walk a `FAILURE` that names the older promise; the walk SHALL NOT edit code the branch did not change to repair it.

#### Scenario: The change broke an older feature

- **WHEN** the fresh walk contradicts an older scenario's `THEN` and the cause lies in files the branch changed
- **THEN** the walk repairs it, saves, and replays that check, and the report names the older promise and the repair

#### Scenario: A break the change did not cause

- **WHEN** the fresh walk contradicts an older scenario's `THEN` and the cause lies outside the branch's files
- **THEN** the walk is a `FAILURE` that names the older promise, with no repair

## MODIFIED Requirements

### Requirement: The walk leaves the repo as it found it

Journeys and evidence SHALL live outside the working tree and SHALL be deleted on every exit, including a stop on `UNKNOWN` or a pause to ask. The one thing a walk MAY leave in the working tree is its kept checks, and only inside `/ship`. Cleanup SHALL refuse any path the walk did not create. The evidence SHALL be screenshots, captured requests, and command output, never a video.

#### Scenario: Any verdict

- **WHEN** a walk outside `/ship` ends, whatever its verdict
- **THEN** `git status` shows the same working tree it started from

#### Scenario: A path the walk did not make

- **WHEN** cleanup is given a path outside its temp run folders
- **THEN** it removes nothing and exits non-zero

### Requirement: The walkthrough page records what was declined

The walkthrough page SHALL record the options declined and why: an in-repo test framework, a second judging agent, walking the whole spec set afresh, replaying kept checks on every walk, and walking on every `/save`. It SHALL also record why this browser engine was chosen and what replacing it costs.

#### Scenario: Why not walk on every save

- **WHEN** a reader asks why the walk does not run on every `/save`
- **THEN** the page gives the decision and its reason
