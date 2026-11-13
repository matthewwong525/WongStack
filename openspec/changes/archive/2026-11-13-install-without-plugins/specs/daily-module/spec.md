## REMOVED Requirements

### Requirement: Daily installs as one module with its own hooks

**Reason**: Daily no longer loads as a plugin, so its hooks ran only in a trusted folder and its command was `/daily:schedule`; the project's settings run the hooks now, and the command is `/schedule`.
**Migration**: An install's update adds Daily's hooks to its settings and removes the plugin files; Daily alone updates by its setup guide's `## Update`. Type `/schedule`. See "Daily installs as one module whose hooks the project runs".

## ADDED Requirements

### Requirement: Daily installs as one module whose hooks the project runs

Daily SHALL ship as one folder: the daily skill at its root and the schedule command inside it, under one version, with the list of the hooks that run its check-ins and start its worker. In every repo the folder SHALL be a real folder in the repo's skills folder, and the project's own settings SHALL run its hooks, never a plugin. The schedule command SHALL be named `/schedule`, a top-level skill, alone or in WongStack, and SHALL load once. The module SHALL import no file outside its own folder, SHALL link no file in another module's folder, and SHALL need no other module. Each guide SHALL state in its own words how it asks the person a question.

#### Scenario: Installed alone

- **WHEN** Daily's setup guide adds the folder to an empty repo with no other WongStack part
- **THEN** a chat start, a check-in on a stop, and Daily's check all run, nothing reads a file outside the folder, no guide links a file of another module, and `/schedule` shows once in the command list

#### Scenario: In a WongStack install

- **WHEN** a WongStack install opens a chat in a folder the person did not trust
- **THEN** Daily's start check and stop check run, `/schedule` shows once in the command list, and `/daily:schedule` does not show

## MODIFIED Requirements

### Requirement: Daily works in a repo with no app

With no schedule store in the profile, `/schedule` SHALL save each schedule as a Paseo schedule after the person's OK, when Paseo is on the computer, and SHALL say plainly what it can not do there, such as a check script or a deny list. With neither, `/schedule` SHALL say it needs an app or Paseo, save nothing, and, for a script, give the line the person can add to the computer's own timer, without editing a timer itself. *Keep my chats in line* SHALL then run from Daily's worker on its own pass, with the same limits, and SHALL be pausable by asking. Check-ins, the journal, the morning and pass add-ons, the person's own jobs, and the Needs-you chats SHALL work with no app.

#### Scenario: A weekly schedule with Paseo and no app

- **WHEN** Jo, in a repo with Daily alone and Paseo, asks for a weekly sales summary and says OK
- **THEN** a Paseo schedule opens a chat with those instructions each week, and the chat says the computer and Paseo must stay on

#### Scenario: No app and no Paseo

- **WHEN** Jo asks for a weekly report in a repo with no app and no Paseo
- **THEN** no schedule is saved, and the chat says what Daily needs to keep one
