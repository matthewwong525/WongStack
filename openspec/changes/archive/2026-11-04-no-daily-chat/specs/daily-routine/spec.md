# Spec Delta

## ADDED Requirements

### Requirement: The morning starts with no chat

Each morning the daily SHALL start the person's due routines and morning add-ons by itself, with no chat and no AI, at the person's morning time (8:00 in their time zone unless their settings name another), or at the first moment after it that the daily's helper runs on that computer. It SHALL start each one at most one time per day. What it started, each line an add-on gave, and each routine or add-on that did not start SHALL go to the journal. No chat SHALL open only to start the day.

#### Scenario: A morning with the computer on

- **WHEN** Jo's settings have a weekday routine and the helper is running at 8:00 on a Tuesday
- **THEN** the routine opens in its own workspace at 8:00, the journal says so, and no other chat opens

#### Scenario: The first chat comes late

- **WHEN** Jo's computer was off at 8:00 and Jo opens a chat at 10:30
- **THEN** that day's due routines start at 10:30, one time, and a second chat that day starts none again

### Requirement: Any chat does the daily's asks

In any chat in the repo, the person SHALL be able to ask for a reminder on a day of their board, to start an undone task of today, to watch a chat, to tell a watched chat an answer, to turn check-ins off or on, and *what's going on?*. *What's going on?* SHALL answer from the journal and, where the host can watch other chats, from where each watched chat stands. No chat SHALL get journal lines the person did not ask for.

#### Scenario: A reminder from a work chat

- **WHEN** Jo, in a chat fixing the store page, says "remind me Friday to call Kim back"
- **THEN** a task *call Kim back* lands on Friday's column, one time, and the chat goes on with its work

#### Scenario: What happened while away

- **WHEN** three check-ins kept chats going during the morning and Jo opens a new chat and asks *what's going on?*
- **THEN** the answer names those three check-ins and each watched chat's state, and no chat got a message about them before

### Requirement: What the background did is kept in a journal

What the daily's helper and the check-ins do SHALL go to a private journal on that computer, outside git, kept 14 days, one line for each thing: a check-in, a background run's start and end, a routine started, a closed chat, a source it could not read. The helper SHALL send no chat a message about it. When the person's board can not be read, the journal SHALL say so, one time per day.

#### Scenario: The board can not be read

- **WHEN** the board's sign-in ends and the helper can not read the board all afternoon
- **THEN** the journal has one line saying so that day, and no chat gets a message about it

## MODIFIED Requirements

### Requirement: Daily runs as the signed-in person

The daily SHALL know the person from their company sign-in, else the repo's git email, before the morning starts any step. It SHALL run no step under a guessed person: when no settings file lists the person's email, the morning SHALL start no routine, even when only one settings file exists.

#### Scenario: Signed in

- **WHEN** a person signed in as `jo@example.com` has a settings file that lists `jo@example.com`
- **THEN** the morning starts the team's routines and then the routines in that file

#### Scenario: Signed out

- **WHEN** Jo's company sign-in has ended and Jo's settings file lists Jo's git email
- **THEN** the morning finds Jo by the git email and starts Jo's routines, and runs no step under another person

#### Scenario: Another person's file

- **WHEN** the repo holds only `kim.json`, and a chat opens for `jo@example.com`
- **THEN** the morning starts no routine for Jo, and Jo's chats still get check-ins

### Requirement: Tasks handed over mid-day start at once

A board task the person asks any chat to start SHALL open in its own workspace and start working at once from its brief, with no planning round, one time ever, and SHALL be marked in progress.

#### Scenario: A task asked at noon

- **WHEN** Jo tells a chat at noon "start the supplier list", an undone task on today's column
- **THEN** a workspace opens for it and starts researching at once, and the task shows in progress

### Requirement: Each person's daily reads their settings file

The morning start SHALL find the person's settings file by any email it lists, and start the routines that file and the optional team file name. A routine SHALL start only on its days, at most one time per day, each in its own workspace where the host can open one. A person with no settings file SHALL get no routines, and SHALL still get check-ins.

#### Scenario: A weekly routine on another day

- **WHEN** Jo's file has a Monday routine and the morning starts on a Tuesday
- **THEN** that routine does not start

#### Scenario: Run twice in a day

- **WHEN** Jo's helper restarts at noon on a day whose morning already started
- **THEN** no routine starts again

### Requirement: A routine opens its own workspace

A routine SHALL open in its own workspace. Where the host can not open one, the routine SHALL not start, and the journal SHALL say why. No routine SHALL open its workspace twice in one day.

#### Scenario: A host with no workspaces

- **WHEN** the morning starts where the host can not open a workspace
- **THEN** the routine does not start, and the journal names it and why

### Requirement: A person changes their own routines by asking

A person SHALL be able to add, change or stop their own routines by saying so in any chat, and the change SHALL go through the usual save, shown before it is saved. Only the owner's review SHALL change the team's file.

#### Scenario: Adding a routine

- **WHEN** Jo says "add checking yesterday's orders to my daily on weekdays"
- **THEN** Jo's settings file gains that routine, Jo sees it, and the next weekday morning starts it

### Requirement: Each chat checks its own stops

When a chat in the repo stops, the chat itself SHALL get the check-in, in any app that runs a supported AI tool, with or without Paseo, every day with no end. A stop less than 15 minutes after the person's own last message in that chat SHALL be the person's turn and SHALL get no check-in. Otherwise one helper with fresh context SHALL judge the stop; on *keep going* or a safe pick the chat SHALL carry on by itself, and on *needs you* it SHALL stop. A check-in that fails or runs out of time SHALL let the chat stop. A background run's chat and a sub-agent SHALL get no check-in, and a chat SHALL get no sixth check-in in a row with no word from the person.

#### Scenario: Away during a long build

- **WHEN** Jo writes in a chat at 9:00, leaves, and the chat stops at 9:40 with "Tests pass; next I'll update the wiki page"
- **THEN** the chat carries on by itself, and Jo finds it further on when back

#### Scenario: The person is answering

- **WHEN** Jo writes in a chat at 9:56 and the chat stops at 10:01
- **THEN** the chat stops and waits for Jo, with no check-in

#### Scenario: A chat outside Paseo

- **WHEN** a teammate runs a chat in a plain terminal, leaves, and it stops 30 minutes later with its work half done
- **THEN** that chat gets its check-in the same way as a chat in Paseo

#### Scenario: An old Daily chat after the update

- **WHEN** Jo's chat that began with `/daily` before this update stops 30 minutes after Jo's last message
- **THEN** it gets a check-in like any other chat

### Requirement: Check-ins need no settings file

A person with no daily settings file SHALL get check-ins as the person from their company sign-in, else the repo's git email, in the computer's time zone. A settings file SHALL add the morning start, the board, routines and the install's own jobs, and its values SHALL win.

#### Scenario: A teammate who never typed /daily

- **WHEN** a teammate with no settings file leaves a chat that later stops with its work half done
- **THEN** a check-in keeps that chat going, and nothing is added to their board

### Requirement: Finished chats close only when the person picks them

The helper SHALL NOT send `/close` to a chat by itself. Where the host lets a chat watch other chats, the answer to *what's going on?* in any chat SHALL mark each watched chat whose work is published, with nothing new on its branch or in its folder since, that is not working and has no open question. When it marks one or more, it SHALL ask which to close, and SHALL send `/close` only to the chats the person picks. It SHALL NOT mark the chat that asks, a sub-agent, or a chat in the main checkout.

#### Scenario: The person picks one finished chat

- **WHEN** the chats `flashy-crab` and `calm-otter` are both published with nothing new, and the person answers *what's going on?* with "close flashy-crab"
- **THEN** `flashy-crab` gets `/close` once, and `calm-otter` stays open

#### Scenario: A published chat left open

- **WHEN** a chat's change is published, and the person leaves it open for an hour without asking *what's going on?*
- **THEN** the chat stays open and gets no `/close`

## REMOVED Requirements

### Requirement: The chief hands bigger tasks to their own workspace

**Reason**: It described the Daily chat keeping itself free. With no Daily chat, each chat already opens a new workspace for a new task.
**Migration**: Ask any chat; a new task opens its own workspace by the change loop's *one task, one workspace*, and *do it here* keeps it in that chat.

### Requirement: The morning reply lists today's tasks

**Reason**: No chat opens in the morning, and the person chose the week board as the list.
**Migration**: Open the week board in the Inbox; an undone task stays on its own day.

### Requirement: The Daily chat holds only the person's talk

**Reason**: There is no Daily chat. The journal part moves to *What the background did is kept in a journal*.
**Migration**: Ask *what's going on?* in any chat to read the journal.

### Requirement: The Daily chat answers at any time

**Reason**: There is no Daily chat to leave open. Its asks move to *Any chat does the daily's asks*, and the morning start to *The morning starts with no chat*.
**Migration**: Ask in any chat; the morning starts by itself.
