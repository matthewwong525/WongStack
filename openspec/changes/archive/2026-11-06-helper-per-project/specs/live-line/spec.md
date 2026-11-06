## MODIFIED Requirements

### Requirement: The helper starts with the computer and can be turned off

Each project SHALL have its own helper. Setup SHALL offer to run it as a background program that starts with the computer and runs as the same user as the chats, never with more rights, with that project's own code. Any chat that starts in the project SHALL restart it when it is not running. The person SHALL be able to turn it off, and the inbox SHALL then work by checking while a chat runs. An update SHALL ask before adding it. One project's helper SHALL never stop, replace or point at another project's helper.

#### Scenario: After a restart

- **WHEN** the computer restarts and no chat has been opened yet
- **THEN** the helper is running and a due schedule or a tap is picked up

#### Scenario: Turned off

- **WHEN** the person turns the helper off
- **THEN** it no longer starts with the computer, and taps arrive by checking while a chat runs

#### Scenario: Another project updates

- **WHEN** another project on the same computer takes a newer helper
- **THEN** this project's helper keeps running this project's code, and its approved schedules still start

## ADDED Requirements

### Requirement: A helper serves only its own project

A project's helper SHALL claim and start only its own project's schedules, check the person's approval with its own project's sign-in, and deliver taps only for its own project's inbox items. A schedule the person approved before the move SHALL stay approved, and a run already started SHALL not start again. A project with its own helper SHALL leave the old shared helper, so two helpers never claim the same schedule or send the same tap.

#### Scenario: Two projects on one computer

- **WHEN** a schedule in one project is due and another project's helper also runs on the computer
- **THEN** the first project's helper starts it on the person's earlier approval, and the other project's helper does not claim it

#### Scenario: An old session starts the old shared helper

- **WHEN** a session on older code starts the old shared helper
- **THEN** that helper serves only the projects with no helper of their own, and each other project's schedules stay with its own helper
