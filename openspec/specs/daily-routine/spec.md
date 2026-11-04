# daily-routine Specification

## Purpose
`/daily` gives every person on a team one start-of-day command: it runs the steps the whole team shares, then that person's own, and learns new steps as they ask. It then stays on as their chief of staff: it watches the agents it started, keeps them moving, and brings the person only what needs them.

## Requirements

### Requirement: Daily runs as the signed-in person

`/daily` SHALL know the person from their company sign-in before it runs any step. When they are signed out or the sign-in has ended, it SHALL give them the sign-in link, wait, and carry on once they are in; it SHALL run no step under a guessed person. An install with no company app SHALL use the repo's git email and say so.

#### Scenario: Signed in

- **WHEN** a person signed in as `jo@example.com` runs `/daily`
- **THEN** it runs the team's steps and then the steps in the file that lists `jo@example.com`

#### Scenario: Signed out

- **WHEN** a person whose company sign-in has ended runs `/daily`
- **THEN** it shows the sign-in link, runs no step until they sign in, then runs their day without a second `/daily`

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

A task the person asks the daily chat to start after the morning round SHALL start working at once from its brief, with no planning round.

#### Scenario: A task asked at noon

- **WHEN** the person tells the daily chat at noon to get someone to research packaging suppliers
- **THEN** the agent starts researching at once and the chief watches it

### Requirement: The chief hands bigger tasks to their own workspace

In the daily chat, the chief SHALL answer quick asks itself: a question, a reminder, where its agents stand, a quick lookup. Any task bigger than that, one that edits files, takes several steps, or needs more than a few minutes, it SHALL start in its own workspace without asking, say so in one line, and watch it like any agent it starts. The person SHALL be able to keep a task in the chat by saying so, even right after a hand-off, and the task SHALL then never run in two places. Where no workspace can open, the chief SHALL do the task in the chat.

#### Scenario: A big task asked mid-day

- **WHEN** the person tells the daily chat "rewrite the returns page on the store"
- **THEN** the chief starts it in its own workspace without asking first, names it in one line, and watches it, and the daily chat stays free for the person

#### Scenario: The person keeps it here

- **WHEN** the person asks for a big task and says "do it here", with the ask or right after the chief handed it off
- **THEN** the chief does the task in the daily chat, and no workspace keeps working on it: one it just opened is closed first

### Requirement: Each person's daily reads their settings file

`/daily` SHALL find the signed-in person's settings file by any email it lists, and run the routines that file and the optional team file name. A routine SHALL start only on its days, at most one time per day, each in its own workspace where the host can open one. A person with no settings file SHALL get the team's routines and an offer to start their file.

#### Scenario: A weekly routine on another day

- **WHEN** Jo's file has a Monday routine and Jo runs `/daily` on a Tuesday
- **THEN** that routine does not start, and the reply says nothing started for it

#### Scenario: Run twice in a day

- **WHEN** Jo runs `/daily` twice on one day
- **THEN** the second run starts no routine again and names the workspaces already open

### Requirement: The morning reply lists today's tasks

After the routines, `/daily` SHALL send one ordered list of the person's tasks for today from the week board, late ones with how late they are, and the link to their week. A source it could not read SHALL be named as not read, never shown as empty.

#### Scenario: A late task

- **WHEN** a task from last Thursday is not done
- **THEN** today's list holds it with its lateness

#### Scenario: No app

- **WHEN** the app does not answer
- **THEN** the reply says the board was not read and lists no tasks

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

A routine SHALL open in its own workspace where the host can open one, and SHALL run in the same chat where it cannot. A second `/daily` on the same day SHALL open no routine's workspace twice.

#### Scenario: A host with no workspaces

- **WHEN** `/daily` runs where the host cannot open a workspace
- **THEN** the routine runs in the same chat

### Requirement: Updates keep each install's settings

A WongStack install or update SHALL deliver the daily skill without any person's or team's settings file, and SHALL never overwrite or remove them in an installed repo.

#### Scenario: An update after a team wrote its settings

- **WHEN** an install with a team file and two people's settings files updates WongStack
- **THEN** the skill updates and all three files are unchanged

### Requirement: A person changes their own routines by asking

A person SHALL be able to add, change or stop their own routines by saying so, and the change SHALL go through the usual save, shown before it is saved. Only the owner's review SHALL change the team's file.

#### Scenario: Adding a routine

- **WHEN** Jo says "add checking yesterday's orders to my daily on weekdays"
- **THEN** Jo's settings file gains that routine, Jo sees it, and the next weekday `/daily` starts it

### Requirement: The Daily chat holds only the person's talk

The Daily chat SHALL receive no event messages: what happens goes to a private journal on that computer, outside git, kept 14 days. Each check-in SHALL add one line saying what was seen, what was done, or what waits for the person. When the person writes in the Daily chat, its agent SHALL get the journal lines new since their last message, out of the person's sight. The only message the computer SHALL send the Daily chat is one line a day when the person's board can not be read.

#### Scenario: The person asks what happened

- **WHEN** three check-ins kept chats going during the morning and the person asks *what's going on?*
- **THEN** the agent answers from the journal, and the Daily chat shows no message for those three stops

#### Scenario: The board can not be read

- **WHEN** the board's sign-in ends and the computer can not read the board all afternoon
- **THEN** the Daily chat gets one line saying so that day, and no more

### Requirement: An install adds its own background jobs

The daily SHALL start with two jobs: wrapping up a finished chat, and the small wiki tidy after each memory consolidation. Judging a stop SHALL be each chat's own check-in, not a job on that list. An install SHALL be able to add jobs in one list in its own daily folder: an event or a time that starts each job, an optional check with no AI that says whether there is work, and the instructions the run follows. A job in that list with a default job's name SHALL replace it, and the install SHALL be able to turn a default job off there. An update SHALL never change or remove that list. A job's run SHALL never send, pay, publish or delete unless its own instructions allow that one step. A job that publishes SHALL work in its own copy of the repo, never in the person's checkout.

#### Scenario: A weekly job

- **WHEN** an install's list has a job every Monday at 9:00 with a check
- **THEN** at 9:00 on Monday the check runs, and a background run starts only when the check finds work

#### Scenario: A computer that was off

- **WHEN** the computer was off at 9:00 and starts at 11:00
- **THEN** the 9:00 job does not run that day

#### Scenario: An install turns a default job off

- **WHEN** an install's list turns the wiki tidy off
- **THEN** the helper still wraps up finished chats, and starts no wiki tidy

### Requirement: A finished chat is wrapped up

Where the host lets the helper watch other chats, it SHALL send `/close` to a chat it watches when the chat's work is published, nothing new is on its branch or in its folder since, the chat is not working, and the person has written nothing there for 15 minutes. It SHALL send `/close` to a chat at most once, counting a close the board's Done asked for. It SHALL NOT send `/close` to the Daily chat, a sub-agent, a chat in the main checkout, or a chat with an open question. Each wrap-up SHALL write one line to the journal.

#### Scenario: A published chat goes quiet

- **WHEN** the chat `flashy-crab`'s change is published, its folder holds no new work, and the person last wrote there 20 minutes ago
- **THEN** the helper sends it `/close` once, and the journal says it was wrapped up

#### Scenario: Work after the publish

- **WHEN** a chat's change is published and the chat has since made a new commit that is not published
- **THEN** the helper does not send it `/close`

### Requirement: Each chat checks its own stops

When a chat in the repo stops, the chat itself SHALL get the check-in, in any app that runs a supported AI tool, with or without Paseo, every day with no end. A stop less than 15 minutes after the person's own last message in that chat SHALL be the person's turn and SHALL get no check-in. Otherwise one helper with fresh context SHALL judge the stop; on *keep going* or a safe pick the chat SHALL carry on by itself, and on *needs you* it SHALL stop. A check-in that fails or runs out of time SHALL let the chat stop. The Daily chat, a background run's chat and a sub-agent SHALL get no check-in, and a chat SHALL get no sixth check-in in a row with no word from the person.

#### Scenario: Away during a long build

- **WHEN** Jo writes in a chat at 9:00, leaves, and the chat stops at 9:40 with "Tests pass; next I'll update the wiki page"
- **THEN** the chat carries on by itself, and Jo finds it further on when back

#### Scenario: The person is answering

- **WHEN** Jo writes in a chat at 9:56 and the chat stops at 10:01
- **THEN** the chat stops and waits for Jo, with no check-in

#### Scenario: A chat outside Paseo

- **WHEN** a teammate runs a chat in a plain terminal, leaves, and it stops 30 minutes later with its work half done
- **THEN** that chat gets its check-in the same way as a chat in Paseo

### Requirement: Check-ins need no settings file

A person with no daily settings file SHALL get check-ins as the person from their company sign-in, else the repo's git email, in the computer's time zone. A settings file SHALL add the morning list, the board, routines and the install's own jobs, and its values SHALL win.

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

### Requirement: The Daily chat answers at any time

After the morning reply, the person SHALL be able to ask the Daily chat, at any time, where things stand, which it answers from the journal, with or without Paseo. A Daily chat SHALL be able to stay open for days: the person's first message on a new day SHALL bring that day's list and start its routines, as `/daily` does, and a second message that day SHALL start nothing again. Where the host can watch other agents, the person SHALL also be able to ask it for a reminder, a watch, a message to a chat, or a new task.

#### Scenario: A task asked mid-day

- **WHEN** the person tells the Daily chat "get someone to research packaging suppliers"
- **THEN** it opens a workspace for that task and names it in the chat, and that chat gets its check-ins like any other

#### Scenario: The Daily chat left open overnight

- **WHEN** Jo's Daily chat from Monday is still open and Jo writes "morning" in it on Tuesday
- **THEN** the reply gives Tuesday's list and Tuesday's routines start, with no new `/daily`
