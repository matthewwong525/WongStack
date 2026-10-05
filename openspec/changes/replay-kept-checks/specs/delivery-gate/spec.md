# Spec Delta

## MODIFIED Requirements

### Requirement: The walkthrough is evidence, not a gate

`/ship` SHALL run `/verify` once before the merge and report its verdict (`staging-walkthrough`). A walk that cannot run, or a missing `verify` skill, SHALL NOT block the merge and SHALL NOT be installed; a walk `FAILURE` SHALL stop and ask the person to fix it or merge anyway, and a merge anyway SHALL be recorded in the report. Kept checks the walk wrote SHALL be saved once, and `/ship` SHALL merge that commit only when its gate passes.

#### Scenario: The walk fails

- **WHEN** the ship-time walk returns `FAILURE` after its own fix attempts
- **THEN** `/ship` stops before merging and asks whether to fix first or merge anyway

#### Scenario: The walk kept a check

- **WHEN** the ship-time walk wrote or replaced a kept check and its verdict is not `FAILURE`
- **THEN** `/ship` saves once more and the merged change carries the kept check
