## ADDED Requirements

### Requirement: Store migrations apply once

The memory script's `migrate` command SHALL record each applied migration and SHALL skip a migration that is already recorded. A migration that is not idempotent SHALL be safe to ship.

#### Scenario: migrate runs twice

- **WHEN** `migrate` runs on a store where every migration is recorded
- **THEN** no migration statement runs again
