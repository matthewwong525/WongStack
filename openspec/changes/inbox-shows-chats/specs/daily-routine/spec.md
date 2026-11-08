## ADDED Requirements

### Requirement: The background's work is kept in a journal

What the daily's helper and the check-ins do SHALL go to a private journal on that computer, outside git, kept 14 days, one line for each thing: a check-in, a background run's start and end, a closed chat, a source it could not read, a note between chats. A schedule's runs SHALL show in the app, not only in the journal. The helper SHALL send no other chat a message about it; a note that keeps chats in line SHALL be the one message it sends to a chat the note concerns. When the app can not take the person's chat list, the journal SHALL say so one time for each run of failures, not one time each minute.

#### Scenario: The app can not take the chat list

- **WHEN** the helper can not send the chat list one time, and the next send works
- **THEN** the journal has one line saying so, and no chat opens or gets a message about it

### Requirement: A failure two times in a row opens one Needs-you chat

When the daily's helper fails the same way two times in a row, at sending the person's chat list to the app, at starting their morning, at one of their jobs, or at reaching Paseo, it SHALL open one new chat named `Needs you: <what broke>`. Its first message SHALL say what failed, the reason, and the steps to fix it; when the person's daily guide gives its own fix, the chat SHALL follow that. The helper SHALL open at most one such chat for each kind of problem each local day, and a success SHALL start the count again. The watch SHALL not watch that chat and no check-in SHALL judge its stops, so it waits for the person. When Paseo can not open the chat, the journal SHALL say so with the reason.

#### Scenario: The chat list stays unsent

- **WHEN** the app's sign-in ends at 14:00 and the helper can not send the chat list at 14:00, 14:01 and all afternoon
- **THEN** the journal has one line at 14:00, one chat *Needs you: the chat list* opens at 14:01 with the sign-in steps, and no second chat opens that day

#### Scenario: Paseo can not open the chat

- **WHEN** the morning fails two times in a row and Paseo refuses to open a chat
- **THEN** the journal says the chat did not open, with Paseo's reason, and the helper goes on

## MODIFIED Requirements

### Requirement: Check-ins need no settings file

A person with no daily settings file SHALL get check-ins as the person from their company sign-in, else the repo's git email, in the computer's time zone. A settings file SHALL add the morning start, routines and the install's own jobs, and its values SHALL win.

#### Scenario: A teammate who never typed /daily

- **WHEN** a teammate with no settings file leaves a chat that later stops with its work half done
- **THEN** a check-in keeps that chat going, and the chat shows in their own Inbox only

### Requirement: Opening a chat keeps the daily's jobs running

When a person who has daily background jobs opens any chat in a repo, the daily SHALL make sure one worker runs for that person and repo, and start it in the background when none does, without holding up the chat. Background jobs are the person's chat list, add-ons, event jobs, and the background schedule runs the computer hands it. They SHALL run with or without Paseo. A chat that a background run opened SHALL start no worker, and a second start SHALL never make a second worker for the same person and repo. A worker SHALL handle only its own repo's chats, and the chats its daily started or was handed.

#### Scenario: Two days later

- **WHEN** Jo's worker started on Monday morning and Jo's weekly background schedule is due on Wednesday while the computer stayed on
- **THEN** the run happens, and opening another chat starts no second worker

#### Scenario: Two repos on one computer

- **WHEN** Jo has chats open in two repos, each with its own worker
- **THEN** each chat shows one time in Jo's Inbox, from its own repo's worker

### Requirement: Any chat does the daily's asks

In any chat in the repo, the person SHALL be able to ask for a reminder at a time, to watch a chat, to tell a watched chat an answer, to turn check-ins off or on, and *what's going on?*. A reminder SHALL be a one-time schedule that opens a chat at that time with the reminder, saved after the person's OK like any schedule. *What's going on?* SHALL answer from the journal and, where the host can watch other chats, from where each watched chat stands. No chat SHALL get journal lines the person did not ask for.

#### Scenario: A reminder from a work chat

- **WHEN** Jo, in a chat fixing the store page, says "remind me Friday to call Kim back" and says OK
- **THEN** a one-time schedule opens a chat *call Kim back* on Friday morning, and the first chat goes on with its work

#### Scenario: What happened while away

- **WHEN** three check-ins kept chats going during the morning and Jo opens a new chat and asks *what's going on?*
- **THEN** the answer names those three check-ins and each watched chat's state, and no chat got a message about them before

## REMOVED Requirements

### Requirement: Tasks handed over mid-day start at once

**Reason**: There are no board tasks to start.
**Migration**: Ask any chat for the work, or make a schedule.

### Requirement: Each chat the person opens has one to-do

**Reason**: The Inbox lists each open chat itself.
**Migration**: See `inbox`: *The inbox opens on the person's chats*.

### Requirement: What the background did is kept in a journal

**Reason**: Its board scenario goes with the board.
**Migration**: See *The background's work is kept in a journal*.

### Requirement: A problem that needs the person opens one chat

**Reason**: Its board kind becomes the chat list.
**Migration**: See *A failure two times in a row opens one Needs-you chat*.
