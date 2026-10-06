# Spec Delta

## MODIFIED Requirements

### Requirement: Every guard is tested refusing

Each guard script, including the OpenSpec config check, SHALL have a test that asserts its refusal. The scripts' coverage floor SHALL have one too, run through its committed settings.

#### Scenario: A refusal is removed

- **WHEN** the CI wait's `FAILURE` branch is deleted
- **THEN** at least one payload test fails

#### Scenario: The floor's settings stop being read

- **WHEN** a change leaves the coverage settings file in a form the tool ignores
- **THEN** at least one payload test fails, because a half-tested sample passed the floor
