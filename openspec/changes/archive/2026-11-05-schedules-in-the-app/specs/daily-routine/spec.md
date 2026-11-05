## ADDED Requirements

### Requirement: The settings file holds no schedules

A person's daily settings file SHALL hold their morning time, folders, add-ons and other daily settings, and SHALL hold no routines and no timed jobs: those are schedules in the company app. A settings file that still lists routines after the update SHALL start none of them, and the journal SHALL say once a day that they wait to move to the app. A person with no settings file SHALL still get check-ins.

#### Scenario: A routine left in the file

- **WHEN** Jo's settings file still lists a Monday routine after the update, because its move did not finish
- **THEN** the morning does not start it, and the journal says the routine waits to move to the app

#### Scenario: No settings file

- **WHEN** a teammate has no settings file
- **THEN** their chats still get check-ins

### Requirement: The morning add-ons run with no chat

Each morning the daily SHALL run the person's morning add-ons by itself, with no chat and no AI, at the person's morning time (8:00 in their time zone unless their settings name another), or at the first moment after it that the daily's helper runs on that computer. It SHALL run them at most one time per day. Each line an add-on gave, and each add-on that did not run, SHALL go to the journal. No chat SHALL open only to start the day.

#### Scenario: A morning with the computer on

- **WHEN** Jo's settings have a morning add-on and the helper is running at 8:00 on a Tuesday
- **THEN** the add-on runs at 8:00, its lines go to the journal, and no chat opens

#### Scenario: The first chat comes late

- **WHEN** Jo's computer was off at 8:00 and Jo opens a chat at 10:30
- **THEN** that day's add-ons run at 10:30, one time, and a second chat that day runs none again

### Requirement: An install adds its own event jobs

The daily SHALL start with one job: the small wiki tidy after each memory consolidation. Judging a stop SHALL be each chat's own check-in, not a job on that list. An install SHALL be able to add jobs that an event starts, in one list in its own daily folder: the event, an optional check with no AI that says whether there is work, and the instructions the run follows. A job in that list with a default job's name SHALL replace it, and the install SHALL be able to turn a default job off there. A job that runs at a time is a schedule in the company app, not an entry in that list. An update SHALL never change or remove that list, except the move of its timed jobs to the app. A job's run SHALL never send, pay, publish or delete unless its own instructions allow that one step.

#### Scenario: An install turns a default job off

- **WHEN** an install's list turns the wiki tidy off
- **THEN** the helper starts no wiki tidy, and runs the install's other jobs as before

#### Scenario: A timed job left in the list

- **WHEN** an install's list still holds a job with a time after the update, because its move did not finish
- **THEN** the job does not run from the list, and the journal says it waits to move to the app

## MODIFIED Requirements

### Requirement: Daily runs as the signed-in person

The daily SHALL know the person from their company sign-in, else the repo's git email, before the morning starts any step. It SHALL run no step under a guessed person: when no settings file lists the person's email, the morning SHALL run no add-on, even when only one settings file exists.

#### Scenario: Signed in

- **WHEN** a person signed in as `jo@example.com` has a settings file that lists `jo@example.com`
- **THEN** the morning runs the add-ons in that file

#### Scenario: Signed out

- **WHEN** Jo's company sign-in has ended and Jo's settings file lists Jo's git email
- **THEN** the morning finds Jo by the git email and runs Jo's add-ons, and runs no step under another person

#### Scenario: Another person's file

- **WHEN** the repo holds only `kim.json`, and a chat opens for `jo@example.com`
- **THEN** the morning runs no add-on for Jo, and Jo's chats still get check-ins

### Requirement: Opening a chat keeps the daily's jobs running

When a person who has daily background jobs opens any chat in a repo, the daily SHALL make sure one worker runs for that person and repo, and start it in the background when none does, without holding up the chat. Background jobs are the person's board to-dos, add-ons, event jobs, and the background schedule runs the computer hands it. They SHALL run with or without Paseo. A chat that a background run opened SHALL start no worker, and a second start SHALL never make a second worker for the same person and repo. A worker SHALL handle only its own repo's chats, and the chats its daily started or was handed.

#### Scenario: Two days later

- **WHEN** Jo's worker started on Monday morning and Jo's weekly background schedule is due on Wednesday while the computer stayed on
- **THEN** the run happens, and opening another chat starts no second worker

#### Scenario: Two repos on one computer

- **WHEN** Jo has chats open in two repos, each with its own worker
- **THEN** each chat has one to-do on Jo's board, from its own repo's worker

### Requirement: What the background did is kept in a journal

What the daily's helper and the check-ins do SHALL go to a private journal on that computer, outside git, kept 14 days, one line for each thing: a check-in, a background run's start and end, a closed chat, a source it could not read. A schedule's runs SHALL show in the app, not only in the journal. The helper SHALL send no other chat a message about it. When the person's board can not be read, the journal SHALL say so one time for each run of failures, not one time each minute.

#### Scenario: The board can not be read

- **WHEN** the helper can not read the board one time, and the next read works
- **THEN** the journal has one line saying so, and no chat opens or gets a message about it

## REMOVED Requirements

### Requirement: Each person's daily reads their settings file

**Reason**: Routines are schedules in the company app; the settings file no longer starts them.
**Migration**: "The settings file holds no schedules" here, and "Existing routines move to the app at the update" in `host-schedules`.

### Requirement: A routine opens its own workspace

**Reason**: Routines are schedules; the rule moved with them.
**Migration**: "A chat schedule opens its own workspace" in `host-schedules`.

### Requirement: A person changes their own routines by asking

**Reason**: A routine change is a schedule change, saved in the app after an OK, not a settings-file save.
**Migration**: "A person makes or changes a schedule by asking" in `host-schedules`.

### Requirement: An install adds its own background jobs

**Reason**: Timed jobs are background schedules in the company app; the install's list keeps event jobs only.
**Migration**: "An install adds its own event jobs" here, and "A background schedule runs with no chat" in `host-schedules`.

### Requirement: The morning starts with no chat

**Reason**: The morning no longer starts routines; the app's clock does.
**Migration**: "The morning add-ons run with no chat".
