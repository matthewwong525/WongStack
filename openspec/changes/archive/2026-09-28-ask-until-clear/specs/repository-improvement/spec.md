## MODIFIED Requirements

### Requirement: Unattended only when said so

An interactive run SHALL ask material multiple-choice questions before selecting, with a follow-up group when an answer opens another material choice. A run SHALL be unattended only when its invocation says so explicitly; it then takes supported defaults, labelled assumed.

#### Scenario: No reply

- **WHEN** an interactive selection question goes unanswered
- **THEN** the run waits and does not treat silence as permission
