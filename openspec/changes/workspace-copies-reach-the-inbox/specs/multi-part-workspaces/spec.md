## ADDED Requirements

### Requirement: A brief of any shape opens its workspace

Opening a workspace SHALL pass its brief to the new agent as its first message whatever the brief's first character, a list dash included, and SHALL never read the brief as a command option.

#### Scenario: A brief written as a list

- **WHEN** /daily opens a workspace with a brief whose first line is `- **Goal**: …`
- **THEN** the workspace opens and its agent's first message is that brief, unchanged
