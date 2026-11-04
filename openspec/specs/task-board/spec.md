# task-board Specification

## Purpose
A stored week board in the live app: the owner's tasks by week and day, plus a backlog, that the daily reads and writes and the Inbox shows.

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

### Requirement: An agent cleans up the board when the owner asks

When the owner asks, an agent SHALL be able to rename, move or delete any task on the board, not only a chat's to-do, through the app's described actions and as the owner. Before it deletes, the agent SHALL show the owner the tasks it will delete and wait for one yes. A teammate who is not the owner SHALL still be refused.

#### Scenario: Clean up my board

- **WHEN** the owner asks a chat to clean up their board, and says yes to the three done tasks it lists
- **THEN** the chat deletes those three tasks and no other, and the next read of the week no longer shows them

#### Scenario: A teammate's agent

- **WHEN** an agent signed in as a teammate who is not the owner asks to delete a task
- **THEN** the app refuses, and the task stays
