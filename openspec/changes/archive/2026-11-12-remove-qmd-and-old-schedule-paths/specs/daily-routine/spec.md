# Daily routine

## MODIFIED Requirements

### Requirement: The settings file holds no schedules

A person's daily settings file SHALL hold their morning time, folders, add-ons and other daily settings, and SHALL hold no routines and no timed jobs: those are schedules in the company app. A settings file that still lists routines SHALL start none of them, and the journal SHALL say once a day that they do not run and that the person can ask to save each as a schedule. A person with no settings file SHALL still get check-ins.

#### Scenario: A routine left in the file

- **WHEN** Jo's settings file still lists a Monday routine after the update
- **THEN** the morning does not start it, and the journal says the routine does not run and can be saved as a schedule

#### Scenario: No settings file

- **WHEN** a teammate has no settings file
- **THEN** their chats still get check-ins

### Requirement: An install adds its own event jobs

The daily SHALL ship no event job of its own: memory starts its own daily tidy. Judging a stop SHALL be each chat's own check-in, not a job on that list. An install SHALL be able to add jobs that an event starts, in one list in its own daily folder: the event, an optional check with no AI that says whether there is work, and the instructions the run follows. An entry in that list that names a job WongStack no longer ships SHALL be skipped without an error. A job that runs at a time is a schedule in the company app, not an entry in that list. An update SHALL never change or remove that list. A job's run SHALL never send, pay, publish or delete unless its own instructions allow that one step.

#### Scenario: An install turns a default job off

- **WHEN** an install's list still turns the wiki tidy off after the update
- **THEN** the helper reports no error for that entry, starts no wiki tidy, and runs the install's other jobs as before

#### Scenario: A timed job left in the list

- **WHEN** an install's list still holds a job with a time after the update
- **THEN** the job does not run from the list, and the journal says it does not run and can be saved as a schedule
