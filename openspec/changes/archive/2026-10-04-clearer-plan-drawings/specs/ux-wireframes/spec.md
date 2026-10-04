## ADDED Requirements

### Requirement: A drawing fits what its bullet explains

A drawing SHALL take the shared guide's pattern that fits its bullet: steps with the usual path in one line and what goes wrong in a row below it, a back-and-forth between two parties in order, the states a thing moves through, options side by side, or a comparison table. A changed flow SHALL be drawn before and after, with each new part marked.

#### Scenario: Steps that can fail

- **WHEN** a bullet describes steps where one can fail
- **THEN** its drawing runs the usual path in one line and puts the failure in a row below it

#### Scenario: A changed flow

- **WHEN** a bullet adds a step to an existing flow
- **THEN** its drawing shows the flow before and after, with the new step marked
