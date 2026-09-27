## MODIFIED Requirements

### Requirement: A loosened check needs a recorded reason

The test check SHALL fail when a branch turns a check off, deletes a test without moving it, or changes a check's settings, unless a proposal the branch adds or changes, active or archived, names that file in a `Check:` Decision-log bullet. Every workflow file SHALL count as a check's settings. Its failure SHALL name each unexplained file and how to pass.

#### Scenario: A skip with no reason

- **WHEN** a branch adds a mutation-testing skip comment to a source file with no `Check:` bullet naming it
- **THEN** the check fails and names the file

#### Scenario: A recorded reason passes

- **WHEN** the Decision log adds a `Check:` bullet naming that file
- **THEN** the check passes and lists the file as explained

#### Scenario: A workflow other than the test workflow

- **WHEN** a branch removes a lint step from the payload workflow with no `Check:` bullet naming it
- **THEN** the check fails and names that workflow file
