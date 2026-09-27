## ADDED Requirements

### Requirement: The publish question lists loosened checks

Before `/apply` reports a finished change, it SHALL run the loosened-checks step against the working tree. It SHALL fix each unexplained file itself, with no question: switch the check back on, or add a `Check:` bullet with a plain reason to the change's Decision log. Its report SHALL then list each `Check:` bullet of the change in one plain line at the reader's level, above the *publish it?* question, and SHALL name any file it could not fix. `/ship`'s final report SHALL carry the same list. A change with no `Check:` bullet SHALL show no list.

#### Scenario: A loosening is fixed and shown

- **WHEN** `/apply` finishes a change that skipped one test with no recorded reason
- **THEN** it records a `Check:` bullet or restores the test, without asking
- **AND** its report lists the loosened check in one plain line before *publish it?*

#### Scenario: Nothing loosened

- **WHEN** `/apply` finishes a change with no flagged file
- **THEN** its report has no loosened-checks list
