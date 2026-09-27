## MODIFIED Requirements

### Requirement: GitHub settings enforce the gate

The default branch SHALL require the test and payload checks, block force-push and deletion, and allow only squash merges; no save route SHALL rely on bypassing these rules. Private vulnerability reporting, secret scanning, push protection, and Dependabot alerts SHALL be on.

#### Scenario: A red pull request

- **WHEN** a pull request's required checks fail
- **THEN** GitHub refuses the merge
