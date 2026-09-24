## ADDED Requirements

### Requirement: An open PR's body is published through the REST endpoint

The checkpoint SHALL publish a rendered body to an already open pull request through the REST pull-request update endpoint, with the body read from the rendered file. It SHALL NOT use `gh pr edit` for that update, because some supported `gh` releases query the retired Projects (classic) API there and fail. A new pull request SHALL still be created with its body read from the rendered file.

#### Scenario: The PR is already open

- **WHEN** a checkpoint regenerates the body for an open pull request
- **THEN** the body file is sent through the REST update endpoint in one call
- **AND** the call succeeds on a `gh` release whose `gh pr edit` fails with the Projects (classic) error

#### Scenario: No PR exists yet

- **WHEN** a checkpoint publishes a branch that has no pull request
- **THEN** the pull request is created with the rendered body file
