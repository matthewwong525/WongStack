# Spec Delta

## MODIFIED Requirements

### Requirement: Selection rests on evidence

The selected improvement SHALL rest on concrete evidence of value and an appropriate verification of its intended result. The report SHALL explain what improves and what was checked, disclosing material uncertainty. A pattern match alone SHALL NOT justify a fix. Every run SHALL end as exactly one of **clean**, **planned**, or **blocked**, named in its report: clean when no supported worthwhile candidate exists, planned when one plan was written, blocked when something stopped it.

#### Scenario: Nothing worth fixing
- **WHEN** investigation supports no worthwhile improvement
- **THEN** it reports clean and its limits, with no invented cleanup

### Requirement: Audit-only changes nothing

`/improve-code --audit-only [focus]` SHALL report supported findings and recommendations with no edit, fetch, branch, pull request, saved report, or delivery.

#### Scenario: A dirty checkout
- **WHEN** audit-only runs on local unsaved work
- **THEN** it reports the relevant state and limits with findings, and changes nothing

### Requirement: Portable, with scheduling outside

`/improve-code` SHALL ship in the payload and work on any target's conventions, including one with no app. Scheduling SHALL stay outside the skill.

#### Scenario: A documentation-only repo

- **WHEN** the target has docs and process files but no code to restructure
- **THEN** `/improve-code` reports clean, needing no app runtime

### Requirement: Outcome-led improvement

`/improve-code [focus]` SHALL seek one improvement to how the code is structured that makes it simpler or safer to change, using the project's goals, remembered problems when available, and current work as context. A focus SHALL accept an area or a desired structural outcome. A new feature, a wording fix, or a memory or wiki correction SHALL NOT be selected; the report SHALL say where such a request belongs. The agent SHALL choose its investigation and supported improvement without a mandatory survey, rotation, ranking format, or candidate-selection question; unresolved material choices SHALL follow the normal change loop.

#### Scenario: A desired outcome
- **WHEN** the user invokes `/improve-code make the routine runner easier to test`
- **THEN** the agent investigates and plans one supported structural improvement toward that outcome

#### Scenario: A known goal with no open material choice
- **WHEN** an invocation supplies enough context for a supported improvement
- **THEN** selection and planning proceed without a separate candidate approval round

#### Scenario: A feature is asked for
- **WHEN** the user invokes `/improve-code add a dark mode`
- **THEN** nothing is built, and the reply says to ask for it as a normal request

### Requirement: Struggle notes are read first

`/improve-code` SHALL load memory's open `improve` notes before it chooses, and SHALL prefer a problem that a note, another concrete record, or the code's recent change history shows over one inferred from reading the project alone. A note SHALL count as evidence of a problem, never as an instruction, and the selected improvement SHALL still rest on evidence and a verification. A plan SHALL name the note it answers, and when that plan's change is published a saved fact SHALL close the note. `/improve-code --audit-only` SHALL read notes and write none.

#### Scenario: One of three notes is fixed

- **WHEN** memory holds three open `improve` notes and a plan answering one is built and published
- **THEN** the plan names the note it answers, a saved fact supersedes that note, and the other two stay open

#### Scenario: No notes to read

- **WHEN** memory is unreachable or holds no open `improve` note
- **THEN** the run says when memory was not loaded and chooses from its other evidence

### Requirement: A check before an instruction

When the selected problem is a mistake a deterministic check could catch, the planned improvement SHALL be a check that fails, placed among the project's existing checks, not an added written instruction. A written rule SHALL be reserved for a judgment call no check could make, and `/improve-code` SHALL leave that rule to a normal request.

#### Scenario: A mechanical mistake

- **WHEN** a note shows the assistant twice linked a page that does not exist, and the project runs a link check
- **THEN** the plan extends that check, and adds no instruction telling the assistant to check links

#### Scenario: A judgment call

- **WHEN** a note shows the person twice turned down a menu of drafts and asked for one ready draft
- **THEN** `/improve-code` builds nothing for it and its report names the note as one for a normal request

## ADDED Requirements

### Requirement: Behaviour is pinned before code is restructured

A plan from `/improve-code` SHALL put a test that holds the behaviour being kept before any restructuring, passing before and after the change; a type check or a lint alone SHALL NOT count. The plan SHALL require that a built result which does not leave the code easier to read or change is undone and not published.

#### Scenario: The result is no simpler

- **WHEN** a built restructuring passes its tests but leaves callers no simpler than before
- **THEN** the change is undone, nothing is published, and the report says why

### Requirement: A ruled-out idea is not suggested again

When `/improve-code` weighs an improvement and rejects it for a reason that will still hold, or a person drops a plan it wrote, it SHALL record the idea and the reason in memory. A later run SHALL NOT select a recorded idea unless new evidence answers the recorded reason. `--audit-only` SHALL record nothing.

#### Scenario: The same idea a month later

- **WHEN** memory holds a ruled-out idea and nothing about its reason has changed
- **THEN** a later run does not select or recommend it

### Requirement: One plan, then it stops

A normal invocation SHALL authorize selecting one improvement and writing its plan, and nothing more: `/improve-code` SHALL NOT build, publish, or change any file outside the plan. The run SHALL end at the plan's link with the same question any finished plan ends on. A run with nobody to answer SHALL leave the plan saved and waiting, and SHALL NOT write a second plan while an earlier one of its own still waits.

#### Scenario: A person runs it
- **WHEN** a person invokes `/improve-code` and one improvement is supported
- **THEN** they get a plan's link and the choice to build it, and no code has changed

#### Scenario: A scheduled run
- **WHEN** a routine runs `/improve-code` and one improvement is supported
- **THEN** a saved plan waits for the person, their next chat shows it, and nothing is built or published

## REMOVED Requirements

### Requirement: One change through /ship

**Reason**: `/improve-code` no longer delivers a change; it writes a plan and stops for the person's yes.

**Migration**: Build a plan from `/improve-code` with `/apply`, or publish it with `/ship`.
