# Spec Delta

## ADDED Requirements

### Requirement: A target's tests need only what a target receives

The tests an install receives SHALL pass with only the files an install receives. No shipped test SHALL depend on an app, skill, or file the payload inventory leaves out.

#### Scenario: A fresh install runs its tests

- **WHEN** `npm test` runs in a freshly installed app, before the person changes anything
- **THEN** every test and quality gate passes

#### Scenario: A source-only app is tested

- **WHEN** a test covers an app that only WongStack's own repository holds
- **THEN** the test lives with that app and is left out with it
