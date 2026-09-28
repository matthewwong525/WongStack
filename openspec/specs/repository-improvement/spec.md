# repository-improvement Specification

## Purpose

Recurring, evidence-based repository spot checks through `/improve`, fixing one supported problem at a time through normal delivery.

## Requirements

### Requirement: Bounded review with disclosed coverage

`/improve` SHALL review recent changes plus one rotating area unless narrowed, and SHALL disclose exclusions and incomplete reads.

#### Scenario: A first run

- **WHEN** no prior `/improve` run is recorded
- **THEN** the run uses a stated recent-history fallback and still picks a rotation area

### Requirement: The survey is read-only

The survey SHALL NOT install tools, contact services, edit files, emit secret values, or read outside the repository. An empty result SHALL NOT be reported as the repository being safe.

#### Scenario: A path escapes the repository

- **WHEN** a scope or symlink resolves outside the repository
- **THEN** the survey refuses that read

### Requirement: Selection rests on evidence

Each candidate SHALL carry concrete evidence, impact, and a verification probe; a pattern match alone SHALL NOT justify a fix. With no supported candidate, the run SHALL report no change.

#### Scenario: Nothing worth fixing

- **WHEN** investigation supports no eligible improvement
- **THEN** it reports no change and its coverage limits, with no invented cleanup

### Requirement: Unattended only when said so

An interactive run SHALL ask material multiple-choice questions before selecting, with a follow-up group when an answer opens another material choice. A run SHALL be unattended only when its invocation says so explicitly; it then takes supported defaults, labelled assumed.

#### Scenario: No reply

- **WHEN** an interactive selection question goes unanswered
- **THEN** the run waits and does not treat silence as permission

### Requirement: One change through /ship

A normal run SHALL hand one selected change to `/ship`, keep every delivery gate, and make no git change of its own. It SHALL stop before delivery on a checkout that is not clean, current, and dedicated.

#### Scenario: Unrelated work in the checkout

- **WHEN** the checkout holds unrelated unfinished work
- **THEN** the run reports the condition and stops before `/ship`

### Requirement: Audit-only changes nothing

`/improve --audit-only` SHALL report ranked findings with no edit, fetch, branch, pull request, or saved report. Larger work SHALL split only into independently correct stages recorded in the normal change history.

#### Scenario: A dirty checkout

- **WHEN** audit-only runs on local unsaved work
- **THEN** it reports the revision and dirty state with findings, and changes nothing

### Requirement: Portable, with scheduling outside

`/improve` SHALL ship in the payload and work on any target's conventions, including one with no app. Scheduling SHALL stay outside the skill.

#### Scenario: A documentation-only repo

- **WHEN** the target has docs and process files but no app
- **THEN** `/improve` still works, needing no app runtime
