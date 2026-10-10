# Spec Delta

## ADDED Requirements

### Requirement: An update says what became of a sent report

When the install holds the number of a report it sent, `/wong-sync` SHALL look it up and say what was decided: fixed, with the version and the change's line, or not taken, with the reason. A decided report's number SHALL then be closed in the install's memory; an open one SHALL be kept for the next run. A lookup that fails SHALL be said in one line and SHALL NOT stop the update.

#### Scenario: The fix is in this update

- **WHEN** a sent report was closed as fixed in a version the update brings in
- **THEN** the person is told their reported trouble is fixed by that version, and the number is closed

#### Scenario: The service does not answer

- **WHEN** the lookup fails
- **THEN** the update goes on, one line says the report could not be checked, and the number is kept
