## MODIFIED Requirements

### Requirement: The helper starts with the computer and can be turned off

Each project SHALL have its own helper. Setup SHALL offer to run it as a background program that starts with the computer and runs as the same user as the chats, never with more rights, with that project's own code. Any chat that starts in the project SHALL restart it when it is not running. The person SHALL be able to turn it off, and the inbox SHALL then work by checking while a chat runs. An update SHALL ask before adding it. One project's helper or code SHALL never stop, replace or point at another project's helper, the shared one included.

#### Scenario: After a restart

- **WHEN** the computer restarts and no chat has been opened yet
- **THEN** the helper is running and a due schedule or a tap is picked up

#### Scenario: Turned off

- **WHEN** the person turns the helper off
- **THEN** it no longer starts with the computer, and taps arrive by checking while a chat runs

#### Scenario: Another project updates

- **WHEN** another project on the same computer takes newer code, or code that reads the sign-in from another place
- **THEN** this project's helper keeps running this project's code, and its approved schedules still start

## ADDED Requirements

### Requirement: A helper serves only its own project

A project's helper SHALL claim and start only its own project's schedules, check the person's approval with its own project's sign-in, and deliver taps only for its own project's inbox items. A schedule the person approved before the move SHALL stay approved, and a run already started SHALL not start again or sooner than its schedule allows. A project with its own helper SHALL leave the shared helper, so two helpers never claim the same schedule or send the same tap.

#### Scenario: Two projects on one computer

- **WHEN** a schedule in one project is due and another project's helper, on code that reads the sign-in from another place, also runs on the computer
- **THEN** the first project's helper starts it on the person's earlier approval, and the other helper does not claim it

#### Scenario: An older chat lists the project with the shared helper again

- **WHEN** a session on older code adds a project that has its own helper back to the shared helper's list
- **THEN** that project's own helper takes it off again before the shared helper claims one of its schedules, at most one due run excepted

### Requirement: A refused run names the real cause

A run refused because the computer has no sign-in to the schedule's app SHALL say that the computer is not signed in, not that it needs the person's OK, and SHALL NOT ask the person for an OK. A run refused for a missing OK on the current version SHALL still ask for one.

#### Scenario: No sign-in

- **WHEN** a schedule the person approved is due and the computer has no sign-in to its app
- **THEN** the run does not start, and the schedule shows that the computer is not signed in, with no request for an OK

#### Scenario: No OK on this version

- **WHEN** a schedule is due, the computer is signed in, and the person has not approved its current version
- **THEN** the run does not start, and the schedule asks for the person's OK
