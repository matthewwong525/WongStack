## ADDED Requirements

### Requirement: The build loads facts for the code it touches

Before its first edit, the build SHALL load the live memory facts for the areas the change's named files fall in, and treat them as dated context the repo overrides. A helper and an inline build SHALL do this alike. An unreachable store SHALL NOT stop the build.

#### Scenario: A Worker change

- **WHEN** `/apply` builds a change whose tasks edit `app/worker/index.ts`, and memory holds a Worker routing warning tagged `worker`
- **THEN** the build sees that warning before it edits the file

#### Scenario: Memory is down

- **WHEN** the store cannot be reached as the build starts
- **THEN** the build notes memory was not loaded and works the tasks
