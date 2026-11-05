## MODIFIED Requirements

### Requirement: The line carries a wake-up, never a command

The app SHALL send nothing down the line but a signal to look for waiting work. The computer SHALL fetch that work through its signed-in requests and SHALL act only on a tap on an item it made itself, sending only the message it fixed for that action, or on a run of a schedule whose exact version was approved on that computer. It SHALL read that schedule's instructions from the app and SHALL start nothing when they differ from the approved version. It SHALL never run any other command, prompt, or code received from the app, and SHALL ignore and log anything else.

#### Scenario: Work the computer didn't set up

- **WHEN** the app hands the computer a run for a schedule this computer never approved, or whose instructions changed since its approval
- **THEN** no chat starts, the run shows as waiting for the person's OK on that computer, and the computer's log records it

#### Scenario: A message that is not a wake-up

- **WHEN** anything other than a wake-up arrives on the line
- **THEN** the computer ignores it and acts on nothing
