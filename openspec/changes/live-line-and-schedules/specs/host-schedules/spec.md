## MODIFIED Requirements

### Requirement: Scheduling uses a verified available host

For work selected to run as assistant sessions, `/schedule` SHALL use the company app's clock when the owner's computer has the background helper and a chat app that can open a session, and otherwise the person's chosen or available host scheduler, distinguishing the host from the assistant model and verifying the capabilities needed in the future execution environment. It SHALL add no container or cloud runner. Before activation it SHALL show the task, destination, absolute next time and timezone, required uptime, and material capability limits.

#### Scenario: The app's clock is available

- **WHEN** a person signed in to their company app, with the helper running, asks for a weekly task
- **THEN** the schedule uses the app's clock, runs on that computer, and reports that the computer must be on

#### Scenario: Codex runs inside Paseo

- **WHEN** a Codex session in Paseo requests future work, the app's clock is unavailable, and Paseo supplies the suitable scheduler
- **THEN** the schedule uses the verified Paseo destination and reports what must remain running

#### Scenario: Only an open-session loop is available

- **WHEN** the person requests a fresh session after this chat ends but only a session-bound loop is available
- **THEN** no independent future schedule is claimed, and the missing capability is reported

## ADDED Requirements

### Requirement: The inbox lists and controls each owner's schedules

The inbox SHALL offer a Schedules view, behind the company sign-in and the inbox's own access, listing the signed-in person's schedules with what each does, its state, its next run and its last run's time and result. It SHALL let the owner pause, resume, and run a schedule now, and SHALL show schedules still kept by another host, read-only, with where they run. It SHALL never show one person's schedule to another. Setting up or changing a schedule SHALL stay in the chat.

#### Scenario: Pause from a phone

- **WHEN** the owner taps *Pause* on a weekly schedule
- **THEN** it shows *Paused* and no run starts until they resume it

#### Scenario: Another person's schedule

- **WHEN** a teammate opens the inbox's Schedules view
- **THEN** they see only schedules they own

### Requirement: An app-clock run starts at most once, on the owner's computer

At a schedule's due time the app SHALL wake the owner's computer the schedule is bound to, and that computer SHALL open the schedule's session from the instructions saved in its repo. A run SHALL start at most once. A run that comes due while the computer is away SHALL start once on its return when still within the schedule's allowed lateness, and SHALL otherwise show as missed. A run asked for now while the computer is away SHALL wait and offer *Cancel* until the computer takes it.

#### Scenario: The computer was off

- **WHEN** a daily 8:00 run comes due while the computer is off and it returns at 15:00, past the allowed lateness
- **THEN** no session starts for that run, it shows as missed, and the next day's run happens normally

#### Scenario: Taken but never reported

- **WHEN** the computer takes a run and its result never comes back
- **THEN** the run shows as not started, and it is never handed out again

### Requirement: Moving a schedule to the app's clock never runs it twice

An existing schedule on another host SHALL stay there until the owner asks to move it. Moving SHALL pause the original before the app's copy can run, and SHALL remove the original only after the app's copy is registered and read back.

#### Scenario: Moving the weekly research

- **WHEN** the owner asks to move a Paseo schedule to the app
- **THEN** the Paseo schedule is paused first, the app's copy takes the next due time, and the work runs once
