## ADDED Requirements

### Requirement: Background capture writes through the memory script only

The background capture run SHALL send each decision to the memory script on standard input. It SHALL NOT need permission to create files, and the tools it is granted SHALL cover every step its runbook tells it to take. A test SHALL fail when the runbook names a step that the granted tools do not allow.

#### Scenario: Capture runs in don't-ask mode

- **WHEN** the background run processes a session under `dontAsk` permissions
- **THEN** it records its facts, and the next digest reports a successful run

#### Scenario: The runbook drifts from the grant

- **WHEN** the runbook tells the model to write a file that the grant does not allow
- **THEN** the test suite fails

### Requirement: Concurrent memory runs do not lose state

The run lock SHALL tolerate a lock file that disappears while it is checked. The record of sessions already seen SHALL be written atomically, so that a foreground command and a background run do not overwrite each other's updates.

#### Scenario: Two writers update the seen-set

- **WHEN** a foreground `strip` and the background run both update the seen-set
- **THEN** both updates are kept
