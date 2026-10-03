# Spec Delta

## MODIFIED Requirements

### Requirement: The evidence is graded against the THEN

Each journey SHALL pass only when its evidence shows what its `THEN` describes; a run with no error or a bare `200` SHALL NOT pass. A journey whose evidence shows some of its `THEN` and contradicts none SHALL be reported as partly shown, naming each part not shown and why, and SHALL NOT be reported as a plain pass; it does not change the walk's verdict. When the evidence is ambiguous, the walk SHALL stop and ask the person, showing the evidence beside the `THEN`.

#### Scenario: A bare 200

- **WHEN** a request probe returns `200` with a body that does not show the `THEN`
- **THEN** the journey fails

#### Scenario: A part the preview cannot show

- **WHEN** a `THEN` promises a greeting that appears and is announced, and the evidence shows it appearing but nothing can show it announced
- **THEN** the journey is reported as partly shown, naming the announcement, and the walk's verdict is unchanged

## ADDED Requirements

### Requirement: Evidence carries no credential

Before a walk's evidence or comment is posted or uploaded, known credential values and token-shaped strings in its text SHALL be replaced with a placeholder, and the report SHALL say that a value was removed. A credential value SHALL NOT be printed while doing so.

#### Scenario: A journey captures request details

- **WHEN** a journey's evidence holds the Access service token the walk itself sent
- **THEN** the posted comment and the kept evidence hold a placeholder in its place, and the report says a value was removed

### Requirement: A grading change is measured first

The source repo SHALL keep a practice site with planted mistakes whose answers the walking agent cannot read. A change to how the walk writes journeys or grades evidence SHALL report, before and after, the planted mistakes caught, the planted mistakes passed, and the working promises failed. The practice site and its runs SHALL NOT ship to installed repos or run on every push.

#### Scenario: A grading instruction changes

- **WHEN** a change edits how the walk grades evidence
- **THEN** its record holds the caught, passed, and false-alarm counts for the instructions before and after

#### Scenario: A walk that passes everything

- **WHEN** a walking agent grades every practice promise as a pass
- **THEN** the report shows every planted mistake as missed
