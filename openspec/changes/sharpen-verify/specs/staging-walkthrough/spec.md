# Spec Delta

## ADDED Requirements

### Requirement: A grading change is measured first

The source repo SHALL keep a practice site with planted mistakes whose answers the walking agent cannot read. A change to how the walk writes journeys or grades evidence SHALL report, before and after, the planted mistakes caught, the planted mistakes passed, and the working promises failed. The practice site and its runs SHALL NOT ship to installed repos or run on every push.

#### Scenario: A grading instruction changes

- **WHEN** a change edits how the walk grades evidence
- **THEN** its record holds the caught, passed, and false-alarm counts for the instructions before and after

#### Scenario: A walk that passes everything

- **WHEN** a walking agent grades every practice promise as a pass
- **THEN** the report shows every planted mistake as missed
