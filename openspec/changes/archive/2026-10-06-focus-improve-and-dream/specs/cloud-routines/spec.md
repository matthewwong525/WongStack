# Spec Delta

## ADDED Requirements

### Requirement: A renamed skill's old name still runs

A routine whose prompt starts with a skill's earlier name SHALL run the skill under its current name, with the rest of the prompt unchanged, and the run's record SHALL name the skill that ran. `/improve` SHALL run `/improve-code` and `/dream` SHALL run `/dream-memory`.

#### Scenario: A routine made before the rename

- **WHEN** a routine created with the prompt `/improve --audit-only` runs after the install updates
- **THEN** the run follows `/improve-code` with `--audit-only`, and no one had to change the routine
