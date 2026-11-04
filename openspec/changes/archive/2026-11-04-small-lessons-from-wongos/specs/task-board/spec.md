## ADDED Requirements

### Requirement: An agent cleans up the board when the owner asks

When the owner asks, an agent SHALL be able to rename, move or delete any task on the board, not only a chat's to-do, through the app's described actions and as the owner. Before it deletes, the agent SHALL show the owner the tasks it will delete and wait for one yes. A teammate who is not the owner SHALL still be refused.

#### Scenario: Clean up my board

- **WHEN** the owner asks a chat to clean up their board, and says yes to the three done tasks it lists
- **THEN** the chat deletes those three tasks and no other, and the next read of the week no longer shows them

#### Scenario: A teammate's agent

- **WHEN** an agent signed in as a teammate who is not the owner asks to delete a task
- **THEN** the app refuses, and the task stays
