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
