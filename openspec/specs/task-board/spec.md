# task-board Specification

## Purpose
TBD - created by archiving change daily-task-board. Update Purpose after archive.

## Requirements

### Requirement: The board keeps each person's tasks by week

The live app SHALL keep the app owner's tasks on a week board: each task on one day of a week, or in the backlog, with its order, its status (open, in progress, done) and an optional link. Only the owner SHALL read or change the board.

#### Scenario: A task moves to Thursday

- **WHEN** the owner drags *Send the week's update* from Wednesday to Thursday in the Inbox
- **THEN** the board keeps it on Thursday in that place, and the daily reads it there

#### Scenario: A teammate

- **WHEN** a signed-in teammate who is not the owner asks for the board
- **THEN** the app refuses, and shows no task

### Requirement: A skill adds a task one time by its key

A skill SHALL be able to read a week and add, place, mark and link a task through the app's described actions. An add with a key that a live task already has SHALL return that task and add nothing.

#### Scenario: The same chat twice

- **WHEN** the daily adds the to-do for chat `flashy-crab` twice on one day
- **THEN** the board holds one to-do for that chat

### Requirement: An update keeps the board's tasks

The board's tables SHALL be made only where they are missing; an update SHALL never remove or change a task already on the board.

#### Scenario: An install that already has a board

- **WHEN** a repo whose database already holds the board's tables updates to this release
- **THEN** every task stays as it was
