# Spec Delta

## ADDED Requirements

### Requirement: A mid-build answer is recorded before the build resumes

When a build helper stops with a question and the person answers, `/apply` SHALL record the answer in the change's Decision log as an `Asked` line before it starts the next helper.

#### Scenario: The helper asks and the person answers

- **WHEN** a helper returns a question, the person picks an option, and tasks remain
- **THEN** the proposal's Decision log holds a dated `Asked` line with the question and the answer before the next helper starts

### Requirement: The publish question names what can't be undone

A proposal whose change deletes or reshapes stored data, sends a message, or removes a key SHALL say so in one plain line, and `/apply`'s report SHALL repeat that line above the publish question. A change that can simply be reversed SHALL show no such line.

#### Scenario: A change that drops a column

- **WHEN** a finished change removes a stored column
- **THEN** the report above *publish it?* says in one plain line that the removed data can't be brought back

#### Scenario: A wording change

- **WHEN** a finished change only edits text
- **THEN** the report carries no can't-be-undone line
