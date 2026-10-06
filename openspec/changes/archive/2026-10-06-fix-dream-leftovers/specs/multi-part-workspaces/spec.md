# Spec Delta

## MODIFIED Requirements

### Requirement: No workspace without a person or Paseo
An unattended run SHALL NOT open a workspace; it SHALL do the first part and record the rest as a memory thread. When Paseo cannot open a workspace, the agent SHALL open nothing, SHALL say whether Paseo is missing or its daemon does not answer, and SHALL carry on with the parts one at a time here.

#### Scenario: Scheduled run finds two parts
- **WHEN** a scheduled run's work turns out to hold two separately publishable parts
- **THEN** it opens no workspace, does the first part, and records the other as a thread

#### Scenario: Daemon down
- **WHEN** the person chooses new workspaces and the Paseo daemon does not answer
- **THEN** no workspace opens, the reply says the daemon does not answer, and the first part carries on here
