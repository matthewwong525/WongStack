# Spec Delta

## MODIFIED Requirements

### Requirement: The evidence is graded against the THEN

Each journey SHALL pass only when its evidence shows every part of what its `THEN` describes; a run with no error, a bare `200`, or evidence for only some of the `THEN` SHALL NOT pass. When the evidence is ambiguous, the walk SHALL stop and ask the person, showing the evidence beside the `THEN`.

#### Scenario: A bare 200

- **WHEN** a request probe returns `200` with a body that does not show the `THEN`
- **THEN** the journey fails

#### Scenario: Half of the THEN

- **WHEN** a `THEN` promises a message and that nothing is saved, and the evidence shows the message but not the unchanged list
- **THEN** the journey does not pass

## ADDED Requirements

### Requirement: A grading change is measured first

The source repo SHALL keep a practice site with planted mistakes whose answers the walking agent cannot read. A change to how the walk writes journeys or grades evidence SHALL report, before and after, the planted mistakes caught, the planted mistakes passed, and the working promises failed. The practice site and its runs SHALL NOT ship to installed repos or run on every push.

#### Scenario: A grading instruction changes

- **WHEN** a change edits how the walk grades evidence
- **THEN** its record holds the caught, passed, and false-alarm counts for the instructions before and after

#### Scenario: A walk that passes everything

- **WHEN** a walking agent grades every practice promise as a pass
- **THEN** the report shows every planted mistake as missed
