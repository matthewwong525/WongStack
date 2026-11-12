## MODIFIED Requirements

### Requirement: Daily installs as one module with its own hooks

Daily SHALL ship as one folder: the daily skill at its root and the schedule command inside it, under one version, with the hooks that run its check-ins and start its worker inside the folder, never in the repo's shared settings files. In every install the folder SHALL be a real folder in the repo's skills folder, so a copy of it brings the hooks. Copied alone, the schedule command SHALL be named `/daily:schedule`; in a WongStack install it SHALL be `/schedule`, a top-level skill, by the payload layout. Either way it SHALL load once. The module SHALL import no file outside its own folder, SHALL link no file in another module's folder, and SHALL need no other module. Each guide SHALL state in its own words how it asks the person a question.

#### Scenario: Installed alone

- **WHEN** Daily's folder is copied into an empty repo with no other WongStack part
- **THEN** a chat start, a check-in on a stop, and Daily's check all run, nothing reads a file outside the folder, no guide links a file of another module, and `/daily:schedule` shows once in the command list

#### Scenario: In a WongStack install

- **WHEN** a WongStack install opens a chat in a folder the person did not trust
- **THEN** `/schedule` shows once in the command list and `/daily:schedule` does not show
