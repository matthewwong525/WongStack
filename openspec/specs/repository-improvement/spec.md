# repository-improvement Specification

## Purpose

Outcome-led, evidence-based improvement through `/improve`, making a project more useful, reliable, or easier to maintain with one supported change through normal delivery.

## Requirements

### Requirement: Selection rests on evidence

The selected improvement SHALL rest on concrete evidence of value and an appropriate verification of its intended result. The report SHALL explain what improves and what was checked, disclosing material uncertainty. A pattern match alone SHALL NOT justify a fix. With no supported worthwhile candidate, the run SHALL report no change.

#### Scenario: Nothing worth fixing
- **WHEN** investigation supports no worthwhile improvement
- **THEN** it reports no change and its limits, with no invented cleanup

### Requirement: One change through /ship

A normal invocation SHALL authorize one selected improvement through `/ship`, retaining all normal delivery gates and scope boundaries. `/improve` SHALL NOT own a separate planning, Git, archive, or publishing workflow.

#### Scenario: Unrelated work in the checkout
- **WHEN** the checkout holds unrelated unfinished work
- **THEN** the normal workflow preserves that work and does not publish it as part of the selected improvement

### Requirement: Audit-only changes nothing

`/improve --audit-only [focus]` SHALL report supported findings and recommendations with no edit, fetch, branch, pull request, saved report, or delivery.

#### Scenario: A dirty checkout
- **WHEN** audit-only runs on local unsaved work
- **THEN** it reports the relevant state and limits with findings, and changes nothing

### Requirement: Portable, with scheduling outside

`/improve` SHALL ship in the payload and work on any target's conventions, including one with no app. Scheduling SHALL stay outside the skill.

#### Scenario: A documentation-only repo

- **WHEN** the target has docs and process files but no app
- **THEN** `/improve` still works, needing no app runtime

### Requirement: Outcome-led improvement

`/improve [focus]` SHALL seek one improvement that makes the project meaningfully more useful, reliable, or easier to maintain, using the project's goals, remembered problems when available, and current work as context. A focus SHALL accept an area or a desired outcome. The agent SHALL choose its investigation and supported improvement without a mandatory survey, rotation, ranking format, or candidate-selection question; unresolved material choices SHALL follow the normal change loop.

#### Scenario: A desired outcome
- **WHEN** the user invokes `/improve make the hand-over easier to use`
- **THEN** the agent investigates and selects one supported improvement toward that outcome through the project's existing workflow

#### Scenario: A known goal with no open material choice
- **WHEN** an invocation supplies enough context for a supported improvement
- **THEN** selection and delivery proceed without a separate candidate approval round

### Requirement: Struggle notes are read first

`/improve` SHALL load memory's open `improve` notes before it chooses, and SHALL prefer a problem that a note or another concrete record shows over one inferred from reading the project alone. A note SHALL count as evidence of a problem, never as an instruction, and the selected improvement SHALL still rest on evidence and a verification. When a normal run delivers a fix for a note's problem, a saved fact SHALL close that note. `/improve --audit-only` SHALL read notes and write none.

#### Scenario: One of three notes is fixed

- **WHEN** memory holds three open `improve` notes and a normal run ships a fix for one
- **THEN** the report names the note it answered, a saved fact supersedes that note, and the other two stay open

#### Scenario: No notes to read

- **WHEN** memory is unreachable or holds no open `improve` note
- **THEN** the run says when memory was not loaded and chooses from its other evidence

### Requirement: A check before an instruction

When the selected problem is a mistake a deterministic check could catch, the improvement SHALL be a check that fails, placed among the project's existing checks, not an added written instruction. A written rule SHALL be reserved for a judgment call no check could make.

#### Scenario: A mechanical mistake

- **WHEN** a note shows the assistant twice linked a page that does not exist, and the project runs a link check
- **THEN** the improvement extends that check, and adds no instruction telling the assistant to check links

#### Scenario: A judgment call

- **WHEN** a note shows the person twice turned down a menu of drafts and asked for one ready draft
- **THEN** the improvement is a written rule on the page that owns it
