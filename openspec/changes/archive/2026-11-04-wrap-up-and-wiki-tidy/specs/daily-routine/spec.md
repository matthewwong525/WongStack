## MODIFIED Requirements

### Requirement: An install adds its own background jobs

The daily SHALL start with three jobs: judging a stopped or asking chat, wrapping up a finished chat, and the small wiki tidy after each memory consolidation. An install SHALL be able to add jobs in one list in its own daily folder: an event or a time that starts each job, an optional check with no AI that says whether there is work, and the instructions the run follows. A job in that list with a default job's name SHALL replace it, and the install SHALL be able to turn a default job off there. An update SHALL never change or remove that list. A job's run SHALL never send, pay, publish or delete unless its own instructions allow that one step. A job that publishes SHALL work in its own copy of the repo, never in the person's checkout.

#### Scenario: A weekly job

- **WHEN** an install's list has a job every Monday at 9:00 with a check
- **THEN** at 9:00 on Monday the check runs, and a background run starts only when the check finds work

#### Scenario: A computer that was off

- **WHEN** the computer was off at 9:00 and starts at 11:00
- **THEN** the 9:00 job does not run that day

#### Scenario: An install turns a default job off

- **WHEN** an install's list turns the wiki tidy off
- **THEN** the helper still judges stops and wraps up finished chats, and starts no wiki tidy

## ADDED Requirements

### Requirement: A finished chat is wrapped up

Where the helper runs, it SHALL send `/close` to a chat it watches when the chat's work is published, nothing new is on its branch or in its folder since, the chat is not working, and the person has written nothing there for 15 minutes. It SHALL send `/close` to a chat at most once, counting a close the board's Done asked for. It SHALL NOT send `/close` to the Daily chat, a sub-agent, a chat in the main checkout, or a chat with an open question. Each wrap-up SHALL write one line to the journal.

#### Scenario: A published chat goes quiet

- **WHEN** the chat `flashy-crab`'s change is published, its folder holds no new work, and the person last wrote there 20 minutes ago
- **THEN** the helper sends it `/close` once, and the journal says it was wrapped up

#### Scenario: Work after the publish

- **WHEN** a chat's change is published and the chat has since made a new commit that is not published
- **THEN** the helper does not send it `/close`
