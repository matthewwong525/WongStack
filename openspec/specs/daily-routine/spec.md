# daily-routine Specification

## Purpose
The daily routine runs each person's day on a team with no chat to open: each morning the worker starts the routines the whole team shares, then that person's own, and any chat does their asks and learns new steps. It is also their chief of staff: it keeps their chats moving, and brings the person only what needs them.

## Requirements

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

### Requirement: The chief stops a loop

The chief SHALL take at most five actions in a row on one agent without the person's word; the next stop on that agent SHALL go to the person.

#### Scenario: The same stop again and again

- **WHEN** the chief has replied to one agent five times in a row and it stops again
- **THEN** the chief tells the person instead of replying

### Requirement: Agents start with their choices made

Every agent the chief starts SHALL begin from a brief that names the goal, what done looks like, the choices already made, what it may do without asking, and what it must ask first. Before starting it, the chief SHALL ask the person, in one round, any choice the task cannot start without.

#### Scenario: A task with an open choice

- **WHEN** the person asks for a task whose result depends on a choice only they can make
- **THEN** the chief asks that choice before it starts the agent, and the brief records the answer

### Requirement: Done is reported with proof

The chief SHALL tell the person a watched agent's task is done only with proof it checked: a link that opens, checks that passed, or the file, draft or record that was made. Without proof, it SHALL ask the agent for it once, then tell the person the task is unconfirmed.

#### Scenario: Done without proof

- **WHEN** a watched agent says "All done" and names no link, check or result
- **THEN** the chief asks it for the proof once, and reports `Done` only after checking what it gives

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

### Requirement: Each chat the person opens has one to-do

While a chat in the person's Paseo works, the daily SHALL keep one to-do for it on today's board, moving an undone one to today each new day. When the chat is gone, its to-do SHALL be marked done on proof, or leave the board.

#### Scenario: A chat closes undone

- **WHEN** the chat `flashy-crab` closes with no proof of done
- **THEN** its to-do leaves the board

### Requirement: An install adds its own parts without changing the daily

A settings file SHALL be able to name add-on scripts in the repo that run at the morning and at each watch pass. A failing add-on SHALL be named as not read and SHALL never stop the daily.

#### Scenario: An add-on fails

- **WHEN** a pass add-on exits with an error
- **THEN** the watch says it was not read and goes on judging stops

### Requirement: A helper sorts each stop into three buckets

Each time a chat stops for its check-in, its helper SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the agent's question has a safe recommended or already-settled answer; else leave the stop for the person. A risky step, such as sending, paying, publishing or deleting, SHALL never be picked, a finished plan SHALL wait for the person, and a question asked with the question tool SHALL wait for the person.

#### Scenario: An agent names its next step

- **WHEN** a chat ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the helper replies *keep going*, without asking the person

#### Scenario: A risky recommended choice

- **WHEN** a chat asks whether to send a drafted email to a customer, with *Send it* recommended
- **THEN** the helper sends nothing, and the question waits in that chat

### Requirement: A routine opens its own workspace

A routine SHALL open in its own workspace. Where the host can not open one, the routine SHALL not start, and the journal SHALL say why. No routine SHALL open its workspace twice in one day.

#### Scenario: A host with no workspaces

- **WHEN** the morning starts where the host can not open a workspace
- **THEN** the routine does not start, and the journal names it and why

### Requirement: Updates keep each install's settings

A WongStack install or update SHALL deliver the daily skill without any person's or team's settings file, and SHALL never overwrite or remove them in an installed repo.

#### Scenario: An update after a team wrote its settings

- **WHEN** an install with a team file and two people's settings files updates WongStack
- **THEN** the skill updates and all three files are unchanged

### Requirement: A person changes their own routines by asking

A person SHALL be able to add, change or stop their own routines by saying so in any chat, and the change SHALL go through the usual save, shown before it is saved. Only the owner's review SHALL change the team's file.

#### Scenario: Adding a routine

- **WHEN** Jo says "add checking yesterday's orders to my daily on weekdays"
- **THEN** Jo's settings file gains that routine, Jo sees it, and the next weekday morning starts it

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

### Requirement: A person can turn check-ins off

A person SHALL be able to turn their check-ins off and on again by asking in any chat. Off SHALL apply to that person in that repo, until they turn it on.

#### Scenario: Turned off

- **WHEN** Jo says *stop check-ins*, then leaves three chats that stop
- **THEN** each of the three stops and waits for Jo

### Requirement: Opening a chat keeps the daily's jobs running

When a person who has daily background jobs opens any chat in a repo, the daily SHALL make sure one worker runs for that person and repo, and start it in the background when none does, without holding up the chat. Background jobs are the person's board to-dos, add-ons and timed jobs. Timed jobs SHALL run with or without Paseo. A chat that a background run opened SHALL start no worker, and a second start SHALL never make a second worker for the same person and repo. A worker SHALL handle only its own repo's chats, and the chats its daily started or was handed.

#### Scenario: Two days later

- **WHEN** Jo's worker started on Monday morning and Jo's weekly job is due on Wednesday while the computer stayed on
- **THEN** the job runs, and opening another chat starts no second worker

#### Scenario: Two repos on one computer

- **WHEN** Jo has chats open in two repos, each with its own worker
- **THEN** each chat has one to-do on Jo's board, from its own repo's worker

### Requirement: Finished chats close only when the person picks them

The helper SHALL NOT send `/close` to a chat by itself. Where the host lets a chat watch other chats, the answer to *what's going on?* in any chat SHALL mark each watched chat whose work is published, with nothing new on its branch or in its folder since, that is not working and has no open question. When it marks one or more, it SHALL ask which to close, and SHALL send `/close` only to the chats the person picks. It SHALL NOT mark the chat that asks, a sub-agent, or a chat in the main checkout.

#### Scenario: The person picks one finished chat

- **WHEN** the chats `flashy-crab` and `calm-otter` are both published with nothing new, and the person answers *what's going on?* with "close flashy-crab"
- **THEN** `flashy-crab` gets `/close` once, and `calm-otter` stays open

#### Scenario: A published chat left open

- **WHEN** a chat's change is published, and the person leaves it open for an hour without asking *what's going on?*
- **THEN** the chat stays open and gets no `/close`

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
