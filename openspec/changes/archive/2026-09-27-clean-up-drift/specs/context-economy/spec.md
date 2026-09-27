## MODIFIED Requirements

### Requirement: Save loads conditional procedures only when they apply

`/save` SHALL complete an ordinary checkpoint without loading its conditional procedures (named secrets, facts-only, new-plan fallback), and SHALL load each one that applies before acting on it.

#### Scenario: An ordinary checkpoint

- **WHEN** `/save` checkpoints an active change with no named secret
- **THEN** it loads no conditional procedure and keeps every credential and gate check

## REMOVED Requirements

### Requirement: Each rule has one owner
**Reason**: The same promise is written in `payload-layout` as "Every payload fact has exactly one owning file".
**Migration**: None; read the `payload-layout` requirement.
