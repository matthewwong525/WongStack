## ADDED Requirements

### Requirement: A helper that stops without its report is sent back once

On a host that runs project hooks, when the helper building a change stops without its report, the host SHALL send it back once, saying to wait for anything it started that still runs and then report. A second stop, any other agent's stop, and a stop the hook cannot read SHALL go through unchanged, so the hook never traps a helper or blocks a chat.

#### Scenario: The helper stops while its checks run

- **WHEN** a building helper ends its turn with no report while a check it started is still running
- **THEN** it is sent back with a message to wait and report, and its next stop goes through

#### Scenario: Any other stop

- **WHEN** the main chat or a helper not building a change stops
- **THEN** it stops as before, with no message
