# Asking the user delta

## MODIFIED Requirements

### Requirement: Questions before planning continue while a choice is open

At the move into planning, however planning was invoked, `/explore` SHALL ask only the choices a wrong guess would make the plan wrong, not merely different, as structured multiple-choice asks of no more questions than the tool holds per group. When the answers open another such choice, it SHALL ask a follow-up group rather than assume it, and SHALL stop asking once none is open. In an interactive session, an unanswered material choice SHALL remain open rather than be hidden in the summary as an assumption or evidence gap. A choice already settled SHALL NOT be asked again, nested calls included, unless a changed answer or new evidence invalidates its premise; only affected decisions SHALL be reopened. A minor gap SHALL become a recorded assumption with its reason. Previously authorized defaults and the explicitly assumed-default fallback when nobody can answer SHALL remain available.

#### Scenario: Everything is settled

- **WHEN** the conversation already answered every material choice
- **THEN** `/explore` asks nothing and moves to its summary

#### Scenario: An answer opens a new choice

- **WHEN** the first group's answers reveal another choice that would make the plan wrong if guessed
- **THEN** `/explore` asks a follow-up multiple-choice group before the plan is drafted
- **AND** while its answer is pending, that material choice remains open rather than being reported as settled or silently assumed

## ADDED Requirements

### Requirement: Changed premises revise only affected decisions

When a person's answer or newly discovered evidence invalidates an earlier premise, exploration SHALL reflect that change in every affected decision and recommendation. It SHALL preserve unrelated settled choices and SHALL explain why an affected choice needs revisiting.

#### Scenario: Expense visibility changes after an earlier answer

- **WHEN** the person changes expenses from shared to private after settling visibility and duplicate handling
- **THEN** the recommendation revises the approval queue and notification audience for private visibility
- **AND** the unchanged duplicate-handling answer remains settled

#### Scenario: The premise remains valid

- **WHEN** a later answer does not invalidate a settled choice
- **THEN** exploration keeps that choice without restarting its interview

### Requirement: Missing evidence delays only dependent questions

When a fact still needs investigation, exploration SHALL keep only the choices requiring that fact pending. Independent material choices with settled prerequisites SHALL remain eligible for the next question group, within the host's capabilities and existing group limits. The person SHALL NOT be asked to guess the missing fact.

#### Scenario: Independent choices are ready

- **WHEN** notification delivery cannot yet be verified but expense visibility and duplicate treatment can be decided independently
- **THEN** exploration asks the ready material choices without waiting for the delivery fact
- **AND** it preserves delivery as an evidence gap rather than inventing its behavior

#### Scenario: A choice needs the missing fact

- **WHEN** a consequential choice depends on evidence not yet available
- **THEN** exploration keeps that choice pending and names the evidence it needs rather than recommending an answer founded on a guessed fact

### Requirement: Exploration recommendations distinguish evidence from uncertainty

Exploration SHALL ground its recommendation in the relevant available project or process evidence rather than ask the person for discoverable facts. A claim not established by that evidence SHALL be identified as an assumption or an evidence gap. Exploration SHALL preserve its read-only boundary when additional proof would require implementation or an outward action.

#### Scenario: A proposed approach rests on a discoverable premise

- **WHEN** a proposed change assumes how an existing flow behaves and that behavior is discoverable in the available context
- **THEN** the recommendation reflects that context and the person is asked only about a remaining material choice

#### Scenario: Proof requires work outside exploration

- **WHEN** proving a claim requires a prototype, a write, or an unavailable observation
- **THEN** exploration names the evidence gap without claiming the result or performing that work

### Requirement: Consequential alternatives receive a grounded recommendation

When an open consequential choice has multiple viable approaches, exploration SHALL provide meaningfully different alternatives, their practical consequences, and a recommended approach supported by the available context. A fully specified or mechanically determined request SHALL NOT acquire artificial alternatives or new clarification questions merely to fill a comparison.

#### Scenario: Two approaches could satisfy the outcome

- **WHEN** the choice between viable approaches changes the outcome, compatibility, or acceptance criteria
- **THEN** the person receives distinct options with their consequences and a reasoned recommendation

#### Scenario: The request is already settled

- **WHEN** the requested result and its material constraints already determine the approach
- **THEN** exploration reuses those decisions without inventing another choice

### Requirement: Exploration handoffs expose consequential assumptions

An exploration handoff SHALL distinguish settled choices, supported minor assumptions, and remaining evidence gaps. Its recommendation SHALL reflect available evidence about consequential assumptions and plausible failure paths; unsupported hypotheticals SHALL NOT create extra requirements or questions. A bounded pass SHALL reuse prior findings unless a new material gap exists.

#### Scenario: Evidence contradicts the proposed approach

- **WHEN** available evidence shows a plausible failure in the proposed approach
- **THEN** exploration explains the problem and revises the recommendation or asks about a new material choice before handoff

#### Scenario: Planning follows completed exploration

- **WHEN** the person asks for a plan after exploration settled its material choices
- **THEN** the handoff retains the reasons, assumptions, and evidence limits without repeating the interview
