# daily-module Specification

## Purpose
Daily is one module any repo can add: check-ins, the journal, the line-up, and `/schedule`, installed alone by one pasted message, plugged into the repo's own parts through one profile, and working with no company app or no Paseo.

## Requirements

### Requirement: Daily works in a repo with no app

In an install with no company app, `/schedule` SHALL save each schedule as a Paseo schedule after the person's OK, when Paseo is on the computer, and SHALL say plainly what it can not do there, such as a check script or a deny list. With neither, `/schedule` SHALL say it needs an app or Paseo, save nothing, and, for a script, give the line the person can add to the computer's own timer, without editing a timer itself. *Keep my chats in line* SHALL then run from Daily's worker on its own pass, with the same limits, and SHALL be pausable by asking. Check-ins, the journal, the morning and pass add-ons, the person's own jobs, and the Needs-you chats SHALL work with no app.

#### Scenario: A weekly schedule with Paseo and no app

- **WHEN** Jo, in an install with no app and with Paseo, asks for a weekly sales summary and says OK
- **THEN** a Paseo schedule opens a chat with those instructions each week, and the chat says the computer and Paseo must stay on

#### Scenario: No app and no Paseo

- **WHEN** Jo asks for a weekly report in an install with no app and no Paseo
- **THEN** no schedule is saved, and the chat says what Daily needs to keep one

### Requirement: WongStack's Daily works as before

In a full WongStack install, schedules SHALL stay in the company app with each computer's OK, the background helper and live line SHALL hand due runs to Daily's worker, the person SHALL be the signed-in person, and chats SHALL keep their step names, through WongStack's own profile. A WongStack update SHALL move an install to Daily's one folder with no schedule, OK, setting, or journal line lost, and a scheduled chat run SHALL find its run guide at the new place.

#### Scenario: The update to the module

- **WHEN** Jo's WongStack install with three approved schedules takes the update
- **THEN** the three schedules run at their next times on the same computer with no new OK, each run's chat reads its run guide, and Jo's settings file is unchanged
