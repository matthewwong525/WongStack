# Host schedules

## REMOVED Requirements

### Requirement: Existing schedules survive the update

**Reason**: The cloud runner stopped shipping at version 40, and no install in use still has one. The commands that list, pause, move and tear down its jobs are removed.

**Migration**: An install that still has a cloud runner pauses its jobs and removes the runner with the version it has, before it takes this update. After the update, the runner and its keys are removed at Cloudflare by hand.

### Requirement: Existing routines move to the app at the update

**Reason**: The move shipped at version 49 for installs that had routines and schedule files in the repo. The code that carries it is removed.

**Migration**: An install lets the move finish on its current version before it takes this update. After the update, the person asks the assistant to save each left-over routine or schedule file as a schedule in the app; *An update leaves old schedule data in place* covers what stays.

### Requirement: Moving a schedule to the app's clock never runs it twice

**Reason**: The on-request move worked only on a schedule that has an old schedule file in the repo, and it ran the removed mover's code.

**Migration**: The person asks for the schedule to be saved in the app, and for the Paseo schedule to be paused first and deleted after the app's copy is read back.

## ADDED Requirements

### Requirement: An update leaves old schedule data in place

An update SHALL NOT delete or change an install's old schedule data: the schedule files in the repo, the routines in a daily settings file, the timed jobs in an install's own daily list, a Paseo schedule, and a deployed cloud runner with its keys. WongStack SHALL run none of the old files, routines or timed jobs, and SHALL move none of them. `/daily:schedule` SHALL save any of them as a schedule in the app when the person asks.

#### Scenario: An install updates with an old schedule file

- **WHEN** an install that still has a schedule file in the repo takes the update
- **THEN** the file is unchanged, nothing runs from it, and no copy of it appears in the app

#### Scenario: The person asks to keep an old routine

- **WHEN** the person asks to keep a routine that is still in their daily settings file
- **THEN** the assistant saves it as a schedule in the app after the person's OK, and the routine runs from the app only
