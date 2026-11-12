## ADDED Requirements

### Requirement: Any chat does the daily's few asks

In any chat in the repo, the person SHALL be able to turn check-ins off or on, ask *what's going on?*, and make or change a schedule by asking. *What's going on?* SHALL answer from the journal and, where the host can watch other chats, from where each watched chat stands. The daily SHALL have no reminder ask apart from a one-time schedule, and SHALL relay no answer from one chat to another: the person answers a chat in that chat. No chat SHALL get journal lines the person did not ask for.

#### Scenario: What happened while away

- **WHEN** three check-ins kept chats going during the morning and Jo opens a new chat and asks *what's going on?*
- **THEN** the answer names those three check-ins and each watched chat's state, and no chat got a message about them before

#### Scenario: A reminder

- **WHEN** Jo says "remind me Friday to call Kim back"
- **THEN** the chat offers a one-time schedule that opens a chat *call Kim back* on Friday, saved only after Jo's OK

### Requirement: Opening a chat starts the daily's worker

When a person who has daily background jobs opens any chat in a repo, the daily SHALL make sure one worker runs for that person and repo, and start it in the background when none does, without holding up the chat. Background jobs are add-ons, event jobs, the line-up when it runs from the worker, and the background schedule runs the computer hands it. They SHALL run with or without Paseo. A chat that a background run opened SHALL start no worker, and a second start SHALL never make a second worker for the same person and repo. A worker SHALL handle only its own repo's chats.

#### Scenario: Two days later

- **WHEN** Jo's worker started on Monday morning and Jo's weekly background schedule is due on Wednesday while the computer stayed on
- **THEN** the run happens, and opening another chat starts no second worker

#### Scenario: Two repos on one computer

- **WHEN** Jo has chats open in two repos, each with its own worker
- **THEN** each worker checks in and judges only its own repo's chats

### Requirement: The daily keeps a journal of its background work

What the daily's helper and the check-ins do SHALL go to a private journal on that computer, outside git, kept 14 days, one line for each thing: a check-in, a background run's start and end, a closed chat, a source it could not read, a note between chats. A schedule's runs SHALL show where the schedule lives, not only in the journal. The helper SHALL send no other chat a message about it; a note that keeps chats in line SHALL be the one message it sends to a chat the note concerns. A failure that goes on SHALL get one line for each run of failures, not one each minute.

#### Scenario: A source that can not be read

- **WHEN** an add-on fails at one pass and works at the next
- **THEN** the journal has one line saying so, and no chat opens or gets a message about it

### Requirement: Two failures in a row open one Needs-you chat

When the daily's helper fails the same way two times in a row, at starting the person's morning, at one of their jobs, or at reaching Paseo, it SHALL open one new chat named `Needs you: <what broke>`. Its first message SHALL say what failed, the reason, and the steps to fix it; when the person's daily guide gives its own fix, the chat SHALL follow that. The helper SHALL open at most one such chat for each kind of problem each local day, and a success SHALL start the count again. The watch SHALL not watch that chat and no check-in SHALL judge its stops, so it waits for the person. When Paseo can not open the chat, the journal SHALL say so with the reason.

#### Scenario: The morning fails all day

- **WHEN** Jo's morning add-on fails at 08:00, at 08:01 and at each pass after
- **THEN** the journal has one line at 08:00, one chat *Needs you: your morning start* opens at 08:01 with the steps to fix it, and no second chat opens that day

#### Scenario: Paseo can not open the chat

- **WHEN** the morning fails two times in a row and Paseo refuses to open a chat
- **THEN** the journal says the chat did not open, with Paseo's reason, and the helper goes on

## REMOVED Requirements

### Requirement: Any chat does the daily's asks

**Reason**: The reminder, watch, and tell asks go; *Any chat does the daily's few asks* replaces it.
**Migration**: Ask for a one-time schedule instead of a reminder; answer a chat in that chat.

### Requirement: Opening a chat keeps the daily's jobs running

**Reason**: The chat list is no longer a background job; *Opening a chat starts the daily's worker* replaces it.
**Migration**: None; the worker starts as before.

### Requirement: The background's work is kept in a journal

**Reason**: The chat-list failure line goes with the chat list; *The daily keeps a journal of its background work* replaces it.
**Migration**: None.

### Requirement: A failure two times in a row opens one Needs-you chat

**Reason**: The chat list is no longer a kind of failure; *Two failures in a row open one Needs-you chat* replaces it.
**Migration**: None.
