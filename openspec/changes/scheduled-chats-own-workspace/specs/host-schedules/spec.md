## MODIFIED Requirements

### Requirement: A chat schedule opens its own workspace

A schedule that runs as a chat SHALL open in its own workspace, named after the schedule, never after a git branch. When the schedule's folder is a git project, the workspace SHALL be a fresh copy of the project from its latest fetched default branch, so the chat never works on the main copy. When the folder is not a git project, the chat SHALL open in that folder, in a workspace named after the schedule. When the fetch or the name fails, the run SHALL still start, and the computer's log SHALL say why. Where the computer can not open a workspace, the run SHALL not start, and the app SHALL show the run as not started and why. No run SHALL open two workspaces.

#### Scenario: A computer that can not open a workspace

- **WHEN** a chat schedule comes due on a computer whose chat app can not open a workspace
- **THEN** no chat starts, and the schedule's last run shows as not started, with the reason

#### Scenario: A morning standup run

- **WHEN** the Standup schedule starts a chat run in a git project's folder
- **THEN** the Paseo sidebar shows a workspace called *Standup*, in its own copy of the project from the latest default branch, and the main copy is unchanged

#### Scenario: The name can not be set

- **WHEN** Paseo opens the run's workspace but refuses the rename
- **THEN** the chat still starts, and the computer's log records that the workspace kept Paseo's name
