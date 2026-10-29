## ADDED Requirements

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

### Requirement: Background helpers judge each stop

When a watched chat stops or asks, the Daily chat SHALL start one background helper with fresh context for that stop, which keeps it going, picks a safe choice, or leaves the stop in its own chat. No separate helper chat SHALL open, and the Daily chat SHALL post nothing for a judged stop.

#### Scenario: A stop that needs the person

- **WHEN** a watched chat asks whether to send an order email
- **THEN** the helper sends nothing, the question waits in that chat, and *what's going on?* in the Daily chat shows it

### Requirement: An install adds its own parts without changing the daily

A settings file SHALL be able to name add-on scripts in the repo that run at the morning and at each watch pass. A failing add-on SHALL be named as not read and SHALL never stop the daily.

#### Scenario: An add-on fails

- **WHEN** a pass add-on exits with an error
- **THEN** the watch says it was not read and goes on judging stops

### Requirement: The Daily chat watches the person's chats all day

After the morning reply, the Daily chat SHALL keep watching, where the host can watch other agents, every chat in the person's Paseo that worked in the last 24 hours and every chat handed to it, but never itself or a sub-agent. A stop right after the person's own message SHALL wait 15 minutes for them first. The person SHALL be able to ask it, at any time, for a reminder, a watch, a message to a chat, where things stand, or a new task.

#### Scenario: A task asked mid-day

- **WHEN** the person tells the daily chat "get someone to research packaging suppliers"
- **THEN** it opens a workspace for that task, watches it, and names it in the chat

#### Scenario: The person is answering

- **WHEN** a chat stops right after the person typed in it
- **THEN** the chief waits 15 minutes and sends that chat nothing while the person keeps writing

### Requirement: A helper sorts each stop into three buckets

Each time a watched agent stops or asks something, its helper SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the question has a safe recommended or already-settled answer; else leave the stop in its own chat for the person. A risky step, such as sending, paying, publishing or deleting, SHALL never be picked, and a finished plan SHALL wait for the person.

#### Scenario: An agent names its next step

- **WHEN** a watched agent ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the helper replies *keep going*, without asking the person

#### Scenario: A risky recommended choice

- **WHEN** a watched agent asks whether to send a drafted email to a customer, with *Send it* recommended
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

## REMOVED Requirements

### Requirement: The daily chat stays on as a chief of staff

**Reason**: Restated for settings files, routines and background helpers.

**Migration**: See "The Daily chat watches the person's chats all day".

### Requirement: The chief sorts each stop into three buckets

**Reason**: Restated for settings files, routines and background helpers.

**Migration**: See "A helper sorts each stop into three buckets".

### Requirement: A long step opens its own workspace once a day

**Reason**: Restated for settings files, routines and background helpers.

**Migration**: See "A routine opens its own workspace".

### Requirement: Updates keep each install's steps

**Reason**: Restated for settings files, routines and background helpers.

**Migration**: See "Updates keep each install's settings".

### Requirement: A person changes their own steps by asking

**Reason**: Restated for settings files, routines and background helpers.

**Migration**: See "A person changes their own routines by asking".

### Requirement: Team steps run before the person's own

**Reason**: Steps files gave way to settings files with routines.

**Migration**: The update turns each `team.md` line into a routine in `team.json` and each person's line into a routine in their file.

### Requirement: Reminders are kept and checked at each start

**Reason**: A reminder is now a task on that day's board, so the morning list shows it.

**Migration**: Ask the Daily chat to remind you; open reminders in memory are not moved.

### Requirement: The chief sends approvals and questions to the inbox when it is on

**Reason**: A question now waits in its own chat; the inbox shows the week.

**Migration**: Open the chat to answer it.

### Requirement: Morning agents plan before they work

**Reason**: Routines start at once in their own chats, which plan by their own skills.

**Migration**: None needed.

### Requirement: The person's Go starts each planned agent

**Reason**: The morning plan round is gone.

**Migration**: None needed.

### Requirement: The watch tells the inbox where each agent stands

**Reason**: Each chat's to-do on the board stands in for its card.

**Migration**: Ask *what's going on?* in the Daily chat.
