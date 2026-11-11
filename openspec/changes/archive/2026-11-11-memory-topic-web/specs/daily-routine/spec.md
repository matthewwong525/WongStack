# Spec Delta

## ADDED Requirements

### Requirement: WongStack's timed jobs are default schedules

WongStack SHALL ship the daily's built-in timed jobs as default schedules. Each SHALL be added to the person's schedules in the company app the first time a chat starts after install or update, approved on that computer, without a question. A default the person never changed SHALL take WongStack's newer version at an update; one they changed, paused or ended SHALL be left as it is, and an ended one SHALL never be added again. A default that WongStack retires SHALL end for the person at the update, changed or not, and SHALL never be added again. A schedule's run list SHALL leave out runs that found nothing to do, and show how many there were.

While the person's check-ins are off on a computer, each default they never changed SHALL wait paused on that computer, so its run list gets no runs that could not start. When check-ins go on, each default paused this way SHALL go on again. A default the person paused, changed or ended SHALL never be paused or resumed by check-ins, and one they resume while check-ins are off SHALL stay on.

A day SHALL count as set up only after a try sets up every default. A try that fails, or stops with no result, SHALL write a journal line with its reason, at most one line a day for the same reason, and a chat start SHALL try again about an hour later.

#### Scenario: First chat after the update

- **WHEN** Jo opens a chat after the update and has no line-up schedule
- **THEN** the line-up appears in Jo's *Schedules* list, approved on that computer, and no wiki tidy schedule is added

#### Scenario: The wiki tidy is retired

- **WHEN** Jo has the wiki tidy schedule, paused and with her own text, and opens a chat after the update
- **THEN** the wiki tidy ends in Jo's *Schedules* list, the journal says so in one line, and no later chat adds it again

#### Scenario: Jo changed the line-up

- **WHEN** Jo set the line-up to every 15 minutes, and a later update ships a new line-up
- **THEN** Jo's line-up stays every 15 minutes with Jo's text

#### Scenario: Check-ins off for three days

- **WHEN** Jo turns check-ins off on Monday and on again on Thursday
- **THEN** from Monday to Thursday the line-up shows *Paused* and its run list gets no *didn't start* lines, and on Thursday it runs on time again

#### Scenario: A failed setup says why and tries again

- **WHEN** a chat start's background setup of the defaults fails, or stops with no result
- **THEN** the journal holds one line with the reason, and a chat start an hour or more later the same day tries again and, once it works, adds the missing defaults

## MODIFIED Requirements

### Requirement: An install adds its own event jobs

The daily SHALL ship no event job of its own: memory starts its own daily tidy. Judging a stop SHALL be each chat's own check-in, not a job on that list. An install SHALL be able to add jobs that an event starts, in one list in its own daily folder: the event, an optional check with no AI that says whether there is work, and the instructions the run follows. An entry in that list that names a job WongStack no longer ships SHALL be skipped without an error. A job that runs at a time is a schedule in the company app, not an entry in that list. An update SHALL never change or remove that list, except the move of its timed jobs to the app. A job's run SHALL never send, pay, publish or delete unless its own instructions allow that one step.

#### Scenario: An install turns a default job off

- **WHEN** an install's list still turns the wiki tidy off after the update
- **THEN** the helper reports no error for that entry, starts no wiki tidy, and runs the install's other jobs as before

#### Scenario: A timed job left in the list

- **WHEN** an install's list still holds a job with a time after the update, because its move did not finish
- **THEN** the job does not run from the list, and the journal says it waits to move to the app

## REMOVED Requirements

### Requirement: The daily's own jobs are default schedules

**Reason**: The wiki tidy is no longer a default schedule, and two of this requirement's scenarios named it.

**Migration**: *WongStack's timed jobs are default schedules* keeps every rule and adds that a retired default ends at the update.
