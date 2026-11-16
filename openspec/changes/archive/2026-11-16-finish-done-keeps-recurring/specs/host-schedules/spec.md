# Spec Delta

## ADDED Requirements

### Requirement: A run's finish never ends a schedule with no end

A run's `finish --done` SHALL end its schedule only when the schedule has an end condition (`until`). On a schedule with no end condition, `finish --done` SHALL be refused with a message that says to finish again without `--done`, before any progress is saved or the run's claim is released. A run's first message SHALL offer `--done` only when its schedule has an end condition.

#### Scenario: Done on a recurring schedule with no end

- **WHEN** a run of a recurring schedule with no `until` runs `finish --done <proof>`
- **THEN** the command fails with a message naming the missing end, the schedule stays active, its progress is unchanged, and the run still holds the claim, so `finish` without `--done` then succeeds

#### Scenario: Done on a schedule with an end

- **WHEN** a run of a schedule with an `until` runs `finish --done <proof>`
- **THEN** its progress is saved, the claim is released, and the schedule ends with that proof

#### Scenario: The footer matches the schedule

- **WHEN** a schedule with no `until` opens its chat
- **THEN** the footer's finish line names `--progress` and no `--done`
