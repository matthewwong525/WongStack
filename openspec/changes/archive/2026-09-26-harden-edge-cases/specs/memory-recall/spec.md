## ADDED Requirements

### Requirement: The session-start hook ends inside its timeout

The session-start hook SHALL exit as soon as its output is written, and SHALL finish inside its configured timeout even when the memory store cannot be reached. An open network request SHALL NOT keep the process alive after the digest is printed.

#### Scenario: The store is unreachable

- **WHEN** a session starts and the store's address does not answer
- **THEN** the hook prints the offline digest and exits within its 5-second timeout
