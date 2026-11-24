# loop-module Specification

## Purpose
WongStack's build loop, from idea to a published change, as one module any project can add alone: what a project gets, what works with nothing else there, and what an update keeps.

## Requirements

### Requirement: A project saves and publishes with or without GitHub

`/save` SHALL open or update a pull request and wait for its checks when the project is on GitHub, and SHALL make a commit on the change's branch when it is not. `/ship` SHALL merge only when the gate passes: the checks pass, or the project has no checks and the person asked to ship. With no GitHub, `/ship` SHALL merge into the main branch locally after the project's tests pass. It SHALL never push without a yes.

#### Scenario: A project on GitHub with no checks

- **WHEN** a person ships a change in a project on GitHub with no checks set up
- **THEN** the pull request is merged, because asking to ship is the approval

#### Scenario: A project with no remote

- **WHEN** a person saves and then ships a change in a project with no remote
- **THEN** the change is committed on its branch, merged into the main branch after the tests pass, and nothing is pushed

### Requirement: The loop works the same with or without memory

No loop command SHALL read or write the memory store, or depend on the memory plugin being installed. Where memory is installed, it SHALL reach the chat only through its own hooks and skill. There SHALL be no separate resume command: `/apply` picks up saved work.

#### Scenario: A project without memory

- **WHEN** a project has the loop and no memory plugin, and the person runs `/explore`, `/apply`, and `/close`
- **THEN** each finishes its job, and none says memory is missing or unreachable

#### Scenario: Pick up saved work in a new chat

- **WHEN** the person types `/apply add-auth` in a new chat, and `add-auth` is saved on its branch
- **THEN** the chat switches to that branch, by the same review as any pick-up, and recaps the change before it builds
