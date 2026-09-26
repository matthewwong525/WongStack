## MODIFIED Requirements

### Requirement: Background capture writes through the memory script only

The background capture run SHALL pass each JSON input to the memory script as the path of a file that it wrote into one input folder. The run SHALL create that folder for itself, outside the repository and outside its git directory, and SHALL delete it when the run ends, whether the run succeeds or fails. The run SHALL be granted permission to write files only inside that folder, and to run commands only through the memory script. The runbook SHALL NOT tell the model to pass JSON through a shell here-document, a pipe, or a redirect, because the permission check can deny a multi-line command whose text holds shell characters. The tools the run is granted SHALL cover every step its runbook tells it to take. A test SHALL fail when the runbook names a step that the granted tools do not allow.

#### Scenario: Capture runs in don't-ask mode

- **WHEN** the background run processes a session under `dontAsk` permissions, and a fact it records contains characters such as `<name>`, `>`, `|`, or `$`
- **THEN** it records its facts, and the next digest reports a successful run

#### Scenario: The input folder is removed

- **WHEN** a background run ends, with success or failure
- **THEN** its input folder no longer exists
- **AND** no file was written inside the repository or its git directory

#### Scenario: The runbook drifts from the grant

- **WHEN** the runbook tells the model to write a file outside the granted input folder, to pass JSON through a here-document, or to run a command outside the memory script
- **THEN** the test suite fails
