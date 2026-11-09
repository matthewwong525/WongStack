## MODIFIED Requirements

### Requirement: The inbox opens on the person's chats

The inbox SHALL open on a list of the signed-in person's open chats, one row each, with the chat's name, its current step and its folder, and only that person's chats. A chat with a review page waiting on the person SHALL sit on top under *Needs you*, and a tap SHALL open that page. A waiting review page whose chat the app does not know SHALL also show under *Needs you*, as its own row. A row SHALL leave the list when its chat closes, and SHALL show the step the chat is on now, not the step it had when it opened. A chat a schedule opened SHALL stay off the list while it runs, and SHALL show only once it has stopped and stayed open; a run that closes itself when it stops SHALL never show. Once the person writes in a schedule's chat, it SHALL show like any chat. The inbox SHALL show no days, dates, tasks or backlog. A plan item SHALL still open from its own link.

#### Scenario: Opening the inbox

- **WHEN** Jo has three open chats, one of them waiting on Jo's review of its plan
- **THEN** Jo sees that chat under *Needs you* with its step and folder, the other two under it, and no days or tasks, and a tap on the first opens its plan

#### Scenario: A chat moves to the next step

- **WHEN** a chat Jo sees under *Plan* moves to *Apply*
- **THEN** its row shows *Apply* the next time the inbox reads the list, and no second row appears

#### Scenario: A schedule's run needs Jo

- **WHEN** Jo's News schedule opens a chat, works for 5 minutes, then fails and stays open
- **THEN** the chat is not in Jo's list while it works, and shows under *Working*, marked as from a schedule, a few minutes after it stops

#### Scenario: A schedule's run closes itself

- **WHEN** Jo's News schedule opens a chat that finishes and closes itself
- **THEN** that chat never shows in Jo's list

#### Scenario: Jo writes in a schedule's chat

- **WHEN** Jo's News schedule chat stops and stays open, and Jo replies in it and it starts to work again
- **THEN** the chat stays in Jo's list while it works, marked as from a schedule
