## MODIFIED Requirements

### Requirement: Predictable scheduled work prefers a script

Before selecting an assistant scheduler, `/daily:schedule` SHALL assess whether the requested work can reliably run as deterministic steps and SHALL prefer a script on an available clock when it can. A completion condition or a narrowly scoped model call SHALL not alone make the task require an assistant session. Required script implementation SHALL use the ordinary code change loop and publishing gate. Assistant scheduling SHALL be used for work requiring judgment, or an explicit informed choice by the person.

#### Scenario: A fixed invoice reminder

- **WHEN** the request is to check payment and send the same authorized reminder at a predictable interval until an invoice is paid
- **THEN** a timed script is preferred when it can reliably perform those checks and actions, with no assistant session required on every tick

#### Scenario: Follow-ups require interpretation

- **WHEN** each follow-up must interpret different replies and decide how to respond
- **THEN** the assistant scheduling route is considered and its need for judgment is explained

### Requirement: Scheduling uses a verified available host

For work selected to run as assistant sessions, `/daily:schedule` SHALL use the company app's clock when the owner's computer has the background helper and a chat app that can open a session, and otherwise the person's chosen or available host scheduler, distinguishing the host from the assistant model and verifying the capabilities needed in the future execution environment. It SHALL add no container or cloud runner. Before activation it SHALL show the task, destination, absolute next time and timezone, required uptime, and material capability limits.

#### Scenario: The app's clock is available

- **WHEN** a person signed in to their company app, with the helper running, asks for a weekly task
- **THEN** the schedule uses the app's clock, runs on that computer, and reports that the computer must be on

#### Scenario: Codex runs inside Paseo

- **WHEN** a Codex session in Paseo requests future work, the app's clock is unavailable, and Paseo supplies the suitable scheduler
- **THEN** the schedule uses the verified Paseo destination and reports what must remain running

#### Scenario: Only an open-session loop is available

- **WHEN** the person requests a fresh session after this chat ends but only a session-bound loop is available
- **THEN** no independent future schedule is claimed, and the missing capability is reported

### Requirement: One schedule list shows every schedule

`/daily:schedule`, any chat asked *what's scheduled?*, and the Inbox SHALL show the person's schedules from the app, each with what it does, its state, where it runs, its next run and its last result. A schedule that still runs on another host, such as Paseo, SHALL show in the same list, marked as running there. Changing a recurring schedule into one with an end SHALL be an explicit change of that same schedule, never a second schedule.

#### Scenario: List all scheduled work

- **WHEN** the person has a weekly routine, an invoice follow-up that ends when paid, and one schedule still in Paseo
- **THEN** all three appear in one list, each with its state and where it runs

#### Scenario: Add an end to a routine

- **WHEN** the person asks that a weekly routine stop once a stated goal is met
- **THEN** that schedule gains the end, its history stays, and no second schedule is made
