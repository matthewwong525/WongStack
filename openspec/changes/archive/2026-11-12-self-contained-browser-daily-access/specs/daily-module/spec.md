## MODIFIED Requirements

### Requirement: Daily installs as one module with its own hooks

Daily SHALL ship as one folder: the daily skill at its root and the schedule command inside it, under one version, with the hooks that run its check-ins and start its worker inside the folder, never in the repo's shared settings files. In every install the folder SHALL be a real folder in the repo's skills folder, so a copy of it brings the hooks. The schedule command SHALL be named `/daily:schedule` and SHALL load once. The module SHALL import no file outside its own folder, SHALL link no file in another module's folder, and SHALL need no other module. Each guide SHALL state in its own words how it asks the person a question.

#### Scenario: Installed alone

- **WHEN** Daily's folder is copied into an empty repo with no other WongStack part
- **THEN** a chat start, a check-in on a stop, and Daily's check all run, nothing reads a file outside the folder, no guide links a file of another module, and `/daily:schedule` shows once in the command list

### Requirement: Daily works in a repo with no app

With no schedule store in the profile, `/daily:schedule` SHALL save each schedule as a Paseo schedule after the person's OK, when Paseo is on the computer, and SHALL say plainly what it can not do there, such as a check script or a deny list. With neither, `/daily:schedule` SHALL say it needs an app or Paseo, save nothing, and, for a script, give the line the person can add to the computer's own timer, without editing a timer itself. *Keep my chats in line* SHALL then run from Daily's worker on its own pass, with the same limits, and SHALL be pausable by asking. Check-ins, the journal, the morning and pass add-ons, the person's own jobs, and the Needs-you chats SHALL work with no app.

#### Scenario: A weekly schedule with Paseo and no app

- **WHEN** Jo, in a repo with Daily alone and Paseo, asks for a weekly sales summary and says OK
- **THEN** a Paseo schedule opens a chat with those instructions each week, and the chat says the computer and Paseo must stay on

#### Scenario: No app and no Paseo

- **WHEN** Jo asks for a weekly report in a repo with no app and no Paseo
- **THEN** no schedule is saved, and the chat says what Daily needs to keep one

### Requirement: An update keeps the repo's edits to Daily

A full WongStack install SHALL get Daily with WongStack's update. A repo with Daily alone SHALL update it with one pasted message, which SHALL change only Daily's folder, keep the repo's own edits inside it, and leave the profile and settings as they are. An update from the earlier two-folder layout SHALL move the repo's edits into the one folder and leave no old schedule folder behind. When an edit and the new version change the same lines, it SHALL stop, name each such file, and change no file.

#### Scenario: A local edit is kept

- **WHEN** a repo with Daily alone changed one line of a brief, and a person pastes the update message
- **THEN** the folder takes the new version with that line kept, Daily's check runs, and nothing outside the folder changes

#### Scenario: An edit that conflicts

- **WHEN** the repo's edit and the new version change the same line
- **THEN** the update stops, names that file, and Daily stays as it was

### Requirement: WongStack's Daily works as before

In a full WongStack install, schedules SHALL stay in the company app with each computer's OK, the background helper and live line SHALL hand due runs to Daily's worker, the person SHALL be the signed-in person, and chats SHALL keep their step names, through WongStack's own profile. A WongStack update SHALL move an install to Daily's one folder with no schedule, OK, setting, or journal line lost, and a scheduled chat run SHALL find its run guide at the new place.

#### Scenario: The update to the module

- **WHEN** Jo's WongStack install with three approved schedules takes the update
- **THEN** the three schedules run at their next times on the same computer with no new OK, each run's chat reads its run guide, and Jo's settings file is unchanged
