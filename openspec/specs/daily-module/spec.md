# daily-module Specification

## Purpose
Daily is one module any repo can add: check-ins, the journal, the line-up, and `/schedule`, installed alone by one pasted message, plugged into the repo's own parts through one profile, and working with no company app or no Paseo.

## Requirements

### Requirement: Daily installs as one module with its own hooks

Daily SHALL ship as one module: the daily skill and the `/schedule` skill, under one version, with the hooks that run its check-ins and start its worker inside the module, never in the repo's shared settings files. In every install each part SHALL be a real folder in the repo's skills folder, so a copy of the folders brings the hooks. `/schedule` SHALL keep its name. The module SHALL import no file outside its own folders, and SHALL need no other module.

#### Scenario: Installed alone

- **WHEN** Daily's two folders are copied into an empty repo with no other WongStack part
- **THEN** a chat start, a check-in on a stop, and Daily's check all run, and nothing reads a file outside the two folders

### Requirement: A repo plugs into Daily through named slots

A repo SHALL connect Daily to its own parts through one profile file, outside the module's folders: where schedules are kept, who the person is, a chat's saved name, whether a turn already offered choices, what a background run's copy of the repo needs, and a check before a workspace opens on a saved branch. Each slot SHALL be optional, and an empty slot SHALL turn off or simplify only its own part: with no person slot, Daily SHALL know the person by their git email; with no chat-name slot, it SHALL use the chat app's own name; with no choices slot, each stop SHALL go to the check-in. A broken slot SHALL write one journal line and act as empty.

#### Scenario: No profile

- **WHEN** Daily is installed in a repo with no profile and a chat stops while the person is away
- **THEN** the check-in sorts the stop, the journal gets its line, and Daily names the person by their git email

### Requirement: Daily works in a repo with no app

With no schedule store in the profile, `/schedule` SHALL save each schedule as a Paseo schedule after the person's OK, when Paseo is on the computer, and SHALL say plainly what it can not do there, such as a check script or a deny list. With neither, `/schedule` SHALL say it needs an app or Paseo, save nothing, and, for a script, give the line the person can add to the computer's own timer, without editing a timer itself. *Keep my chats in line* SHALL then run from Daily's worker on its own pass, with the same limits, and SHALL be pausable by asking. Check-ins, the journal, the morning and pass add-ons, the person's own jobs, and the Needs-you chats SHALL work with no app.

#### Scenario: A weekly schedule with Paseo and no app

- **WHEN** Jo, in a repo with Daily alone and Paseo, asks for a weekly sales summary and says OK
- **THEN** a Paseo schedule opens a chat with those instructions each week, and the chat says the computer and Paseo must stay on

#### Scenario: No app and no Paseo

- **WHEN** Jo asks for a weekly report in a repo with no app and no Paseo
- **THEN** no schedule is saved, and the chat says what Daily needs to keep one

### Requirement: Setup installs Daily from one pasted message

A person SHALL be able to add Daily to any repo by pasting one message, which names the setup guide's web address, into any AI tool, with nothing installed first. Setup SHALL copy Daily's folders in as real folders, write the person's settings file and any profile part the repo can fill outside them, adapt to the schedules, sign-in, and chat app the repo and computer already have, and ask before each step that costs money or makes something public. It SHALL NOT report Daily ready until Daily's check passes. It SHALL save its work in the repo and ask before it sends that work anywhere. It SHALL change nothing in a full WongStack install.

#### Scenario: A repo with Paseo and no app

- **WHEN** a person pastes the install message in a repo with no WongStack, on a computer with Paseo
- **THEN** the AI copies Daily in, writes the settings file with the person's git email, sets schedules to Paseo, runs the check until it passes, saves the work, and asks before it pushes

#### Scenario: Setup in a WongStack install

- **WHEN** the setup guide is followed in a full WongStack install
- **THEN** it says Daily already comes with each update, and changes nothing

### Requirement: A chat start asks once before Daily is set up

When Daily's folders are in a repo that has no Daily settings folder, a new chat SHALL get one short line that has the AI ask whether to set Daily up. It SHALL NOT start setup without a yes, a resumed chat SHALL stay quiet, and the chat SHALL go on either way.

#### Scenario: Folders copied, setup not done

- **WHEN** Daily's folders are in a repo with no settings folder, and Jo opens a chat and later resumes it
- **THEN** the AI asks once in the new chat whether to set Daily up, asks nothing on resume, and starts no setup unasked

### Requirement: An update keeps the repo's edits to Daily

A full WongStack install SHALL get Daily with WongStack's update. A repo with Daily alone SHALL update it with one pasted message, which SHALL change only Daily's folders, keep the repo's own edits inside them, and leave the profile and settings as they are. When an edit and the new version change the same lines, it SHALL stop, name each such file, and change no file.

#### Scenario: A local edit is kept

- **WHEN** a repo with Daily alone changed one line of a brief, and a person pastes the update message
- **THEN** the folders take the new version with that line kept, Daily's check runs, and nothing outside the folders changes

#### Scenario: An edit that conflicts

- **WHEN** the repo's edit and the new version change the same line
- **THEN** the update stops, names that file, and both folders stay as they were

### Requirement: WongStack's Daily works as before

In a full WongStack install, schedules SHALL stay in the company app with each computer's OK, the background helper and live line SHALL hand due runs to Daily's worker, the person SHALL be the signed-in person, and chats SHALL keep their step names, through WongStack's own profile. A WongStack update SHALL move an install to the module with no schedule, OK, setting, or journal line lost.

#### Scenario: The update to the module

- **WHEN** Jo's WongStack install with three approved schedules takes the update
- **THEN** the three schedules run at their next times on the same computer with no new OK, and Jo's settings file is unchanged
