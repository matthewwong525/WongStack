## MODIFIED Requirements

### Requirement: Save loads conditional procedures only when they apply

`/save` SHALL complete an ordinary checkpoint without loading its conditional procedures (named secrets, facts-only, new-plan fallback, archived handoff), and SHALL load each one that applies before acting on it.

#### Scenario: An ordinary checkpoint

- **WHEN** `/save` checkpoints an active change with no named secret
- **THEN** it loads no conditional procedure and keeps every credential and gate check
