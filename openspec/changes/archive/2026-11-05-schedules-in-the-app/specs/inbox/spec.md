## ADDED Requirements

### Requirement: The inbox lists the person's schedules

The inbox SHALL have a Schedules view, next to Reviews, that lists the signed-in person's own schedules, and only theirs. A teammate with no week board SHALL still reach it. Each SHALL show what it does, when it runs next, and how its last run went, and SHALL offer Pause, Resume, Run now, and Cancel for a run that waits. A schedule SHALL open to its ten newest runs and its instructions, which the view SHALL show and never change. A schedule that waits for the person's OK SHALL say so and name the computer. A schedule that runs on another host SHALL show as running there, with no buttons. Making or changing a schedule SHALL stay in a chat.

#### Scenario: A teammate with no week board

- **WHEN** Kim, a teammate with no week board, opens the Inbox
- **THEN** Kim can open Schedules and sees Kim's own schedules, and none of the owner's

#### Scenario: A schedule that needs an OK

- **WHEN** a schedule was changed in a chat on another computer
- **THEN** Schedules shows it as waiting for Jo's OK on that computer, offers no Run now, and has no button that approves it
