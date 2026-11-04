# Spec Delta

## MODIFIED Requirements

### Requirement: An install adds its own background jobs

The daily SHALL start with one job: the small wiki tidy after each memory consolidation. Judging a stop SHALL be each chat's own check-in, not a job on that list. An install SHALL be able to add jobs in one list in its own daily folder: an event or a time that starts each job, an optional check with no AI that says whether there is work, and the instructions the run follows. A job in that list with a default job's name SHALL replace it, and the install SHALL be able to turn a default job off there. An update SHALL never change or remove that list. A job's run SHALL never send, pay, publish or delete unless its own instructions allow that one step. A job that publishes SHALL work in its own copy of the repo, never in the person's checkout.

#### Scenario: A weekly job

- **WHEN** an install's list has a job every Monday at 9:00 with a check
- **THEN** at 9:00 on Monday the check runs, and a background run starts only when the check finds work

#### Scenario: A computer that was off

- **WHEN** the computer was off at 9:00 and starts at 11:00
- **THEN** the 9:00 job does not run that day

#### Scenario: An install turns a default job off

- **WHEN** an install's list turns the wiki tidy off
- **THEN** the helper starts no wiki tidy, and runs the install's other jobs as before

## ADDED Requirements

### Requirement: Finished chats close only when the person picks them

The helper SHALL NOT send `/close` to a chat by itself. Where the host lets the Daily chat watch other chats, its answer to *what's going on?* SHALL mark each watched chat whose work is published, with nothing new on its branch or in its folder since, that is not working and has no open question. When it marks one or more, it SHALL ask which to close, and SHALL send `/close` only to the chats the person picks. It SHALL NOT mark the Daily chat, a sub-agent, or a chat in the main checkout.

#### Scenario: The person picks one finished chat

- **WHEN** the chats `flashy-crab` and `calm-otter` are both published with nothing new, and the person answers *what's going on?* with "close flashy-crab"
- **THEN** `flashy-crab` gets `/close` once, and `calm-otter` stays open

#### Scenario: A published chat left open

- **WHEN** a chat's change is published, and the person leaves it open for an hour without asking the Daily chat
- **THEN** the chat stays open and gets no `/close`

## REMOVED Requirements

### Requirement: A finished chat is wrapped up

**Reason**: Closing a chat is the person's decision. A published chat that is still open is usually one the person kept open, and what it learned reaches memory and the wiki without a close.
**Migration**: Ask the Daily chat *what's going on?* and pick the finished chats to close, or mark a chat Done on the board. An install list entry that turns `wrap-up` off needs no edit.
