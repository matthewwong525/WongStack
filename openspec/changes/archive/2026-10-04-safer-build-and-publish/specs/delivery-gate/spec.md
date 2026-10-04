# Spec Delta

## ADDED Requirements

### Requirement: A failed check is diagnosed before it is fixed

On a failed gate, `/save` SHALL list every failing check with the cause its log supports before the first fix, and SHALL fix the failures the change caused in one push. A failure the change did not cause SHALL be re-run once and, if still failing, reported without a code edit. The attempt cap SHALL stay as it is.

#### Scenario: Two checks fail for different reasons

- **WHEN** a push fails a test and a link check
- **THEN** `/save` names both causes first and pushes one fix covering both

#### Scenario: A failure the change didn't cause

- **WHEN** the only failing check fails in code the change never touched
- **THEN** `/save` re-runs it once, and if it fails again stops with the error and the checks link, editing nothing
