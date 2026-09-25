## ADDED Requirements

### Requirement: Explore searches memory before it asks

Before its first question in standalone or bounded mode, `/explore` SHALL search the memory store once on the intent's key terms and the paths it expects to touch, and SHALL read the live facts it finds. It SHALL NOT ask a question that a live fact already answers. It SHALL instead state the fact, with its age and author, as a recorded assumption that the user can correct. When the store is unreachable, `/explore` SHALL say so in one line and continue. `/plan` gets this through the bounded mode it already invokes.

#### Scenario: A preference is already known

- **WHEN** the store holds a live `feedback` fact that the user prefers one bundled pull request for refactors, and the intent is a refactor
- **THEN** `/explore` does not ask how to split the pull requests
- **AND** its summary names the fact and its age as the reason

#### Scenario: Nothing relevant is stored

- **WHEN** the search returns no live fact for the intent
- **THEN** `/explore` asks its questions as it does today

#### Scenario: Plan inherits the search

- **WHEN** `/plan` invokes `/explore` in bounded mode
- **THEN** the search runs once before the exit round, and not again inside `/plan`
