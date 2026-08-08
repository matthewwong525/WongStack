## ADDED Requirements

### Requirement: Session capture excludes credential values

When `/save` compresses the conversation into a session note, it SHALL exclude every real credential value supplied, rotated, read, or written during the session. It MAY preserve the variable name, the fact that it changed, its purpose, where it is obtained, and any non-secret operational decision. The same exclusion SHALL apply to the change's Status, Decision log, tasks, commit message, PR body, and `/save` report.

#### Scenario: A token was rotated during the session

- **WHEN** `/save` captures a session in which `SERVICE_TOKEN` was rotated
- **THEN** the note may record that `SERVICE_TOKEN` rotated and its non-secret sourcing guidance
- **AND** neither the old nor new value appears in the note or another committed handoff surface

#### Scenario: A pasted credential appears in surrounding conversation

- **WHEN** a credential value is present in conversation context used to write the note
- **THEN** `/save` omits the value rather than treating verbatim user text as automatically durable
- **AND** the note remains useful by retaining the non-secret decision and variable name
