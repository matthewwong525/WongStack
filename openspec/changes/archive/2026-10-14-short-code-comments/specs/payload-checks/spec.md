# Spec Delta

## ADDED Requirements

### Requirement: WongStack's scripts keep comments short

Every JavaScript file the payload checks lint SHALL fail the checks when it holds a comment longer than two lines or a comment line wider than 120 characters, under the same rule and the same exceptions as the scaffold. The checks SHALL prove the rule still fails on a bad sample whenever the proof runs.

#### Scenario: A long comment in a helper script

- **WHEN** a change adds a three-line comment to a script under `scripts/` or a skill's `scripts/` folder
- **THEN** the payload checks fail and name the file and line

#### Scenario: The rule stops being read

- **WHEN** a settings change leaves the comment-length rule unregistered
- **THEN** the proof fails and names the lint check
