## ADDED Requirements

### Requirement: The line lives in its own Worker, so app changes keep their preview link

The live line SHALL run in a Worker of its own, beside the app, with a staging twin, and the app SHALL only point at it. The line's Worker SHALL have no web address of its own: a computer or a page reaches the line only through the app's signed-in route. A change to the app SHALL get a per-change preview link.

#### Scenario: An app change gets its link

- **WHEN** a change to the app is saved or previewed from the agent host
- **THEN** a per-change preview link is printed for it
- **AND** a tap made from that link wakes the person's computer through the staging line

#### Scenario: The line can't be reached directly

- **WHEN** anyone requests the line's Worker on any web address
- **THEN** no address answers, and the line is reachable only through the app's signed-in route

### Requirement: Moving the line keeps schedules and the inbox

Moving the line out of the app SHALL leave every schedule, run, and inbox item as it was, and the update SHALL say in plain words that the line's old saved state inside the app is deleted and can't be undone, and what puts it back.

#### Scenario: An app that already has the line takes the update

- **WHEN** an install whose app holds the line publishes this update
- **THEN** its schedules and runs are unchanged, its computer reconnects to the new line, and the schedule clock resumes
- **AND** the update note says the old line state is deleted and that the computer's reconnect restores it
