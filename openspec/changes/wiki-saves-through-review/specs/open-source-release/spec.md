## MODIFIED Requirements

### Requirement: GitHub settings enforce the documented gate

The default branch SHALL be protected by a ruleset that requires the test and payload checks to pass and blocks force-push and deletion. No save route SHALL rely on bypassing it: every file edit reaches the default branch through a pull request. Private vulnerability reporting, secret scanning, push protection, and Dependabot alerts SHALL be on. Only squash merges SHALL be allowed, and head branches SHALL be deleted after a merge. The agent SHALL show each setting to the user before it applies it.

#### Scenario: A red PR cannot merge

- **WHEN** a PR's required checks fail
- **THEN** GitHub refuses the merge

#### Scenario: A reporter follows SECURITY.md

- **WHEN** a reader opens the private vulnerability reporting link in `SECURITY.md`
- **THEN** GitHub shows the report form
