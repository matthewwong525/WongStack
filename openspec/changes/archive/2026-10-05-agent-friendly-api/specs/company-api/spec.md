# Spec Delta

## ADDED Requirements

### Requirement: An action explains its inputs and its input errors

Every top-level input of a described action SHALL carry a description that discovery publishes; an action with an undescribed input SHALL fail the checks before publication, identifying the action and the input. An invalid-input error SHALL name each failing input and the reason, bounded in count and length, and SHALL contain no service credential value. Invalid input SHALL still perform no business work.

#### Scenario: A caller sends a wrong input

- **WHEN** a caller supplies a value outside one input's documented schema
- **THEN** the error names that input and why it failed, and the business handler does not run

#### Scenario: An action leaves an input undescribed

- **WHEN** a new described action has an input with no description
- **THEN** publication checks fail and identify that action and input

### Requirement: A write can name the read that confirms it

A described action that changes something SHALL be able to name one described read action that shows whether the change happened. The checks SHALL reject a name that is not a registered read action, and a read action that names one. Discovery SHALL publish the name only to a caller permitted to see that read action. Naming a confirming read SHALL NOT cause any automatic repeat of the write.

#### Scenario: A write names its confirming read

- **WHEN** a permitted employee describes a write that names a confirming read they may also use
- **THEN** the description names that read action

#### Scenario: The name points at something that is not a read

- **WHEN** an action names a confirming action that is missing or that itself changes something
- **THEN** publication checks fail and identify the action
