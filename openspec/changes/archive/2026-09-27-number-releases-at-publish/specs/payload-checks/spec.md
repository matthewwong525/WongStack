## ADDED Requirements

### Requirement: The release rule covers every shipped file

The meta-only release rule SHALL load for every file a target receives, as the payload file list names it, plus `VERSION` and `CHANGELOG.md`. A check SHALL fail when a listed path falls outside the rule's paths.

#### Scenario: A new payload file

- **WHEN** a change adds a path to the payload file list that no pattern in the release rule matches
- **THEN** the payload checks fail, naming the path
