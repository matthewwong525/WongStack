# live-line Specification

## Purpose

One outbound connection from a person's signed-in computer, and from their open inbox, to their company app, so taps, changes and schedule runs arrive at once without opening any way into the computer.

## Requirements

### Requirement: The computer connects out and never listens

The person's computer SHALL reach the app only by connecting out, signed in as that person, and SHALL open no port, accept no webhook, and run no server for the app to call. While its line is open, a tap SHALL reach the chat within a few seconds. When the line cannot open or drops, the computer SHALL fall back to checking on today's cadence and SHALL reconnect on its own.

#### Scenario: A tap with the line open

- **WHEN** the line is open and the person taps *Build it* on a plan in the inbox
- **THEN** the chat gets the build request within a few seconds, with no open port on the computer

#### Scenario: The line drops

- **WHEN** the connection to the app is lost
- **THEN** taps still arrive by the regular check, and the line reopens once the app can be reached

### Requirement: The line carries a wake-up, never a command

The app SHALL send nothing down the line but a signal to look for waiting work. The computer SHALL fetch that work through its signed-in requests and SHALL act only on a tap on an item it made itself, sending only the message it fixed for that action, or on a run of a schedule whose exact version was approved on that computer. It SHALL read that schedule's instructions from the app and SHALL start nothing when they differ from the approved version. It SHALL never run any other command, prompt, or code received from the app, and SHALL ignore and log anything else.

#### Scenario: Work the computer didn't set up

- **WHEN** the app hands the computer a run for a schedule this computer never approved, or whose instructions changed since its approval
- **THEN** no chat starts, the run shows as waiting for the person's OK on that computer, and the computer's log records it

#### Scenario: A message that is not a wake-up

- **WHEN** anything other than a wake-up arrives on the line
- **THEN** the computer ignores it and acts on nothing

### Requirement: Only the person's own computer and inbox share a line

A line SHALL belong to one signed-in person in one company app. It SHALL close when that person's sign-in ends or expires, and SHALL refuse a page from another website. One person's activity SHALL never wake another person's computer or inbox.

#### Scenario: Two people on one team

- **WHEN** Ana taps in her inbox while Ben's computer is connected to the same app
- **THEN** only Ana's computer is woken

#### Scenario: Sign-in expires

- **WHEN** the person's company sign-in expires while the line is open
- **THEN** the line closes, and the computer reopens it only with a fresh sign-in

### Requirement: An open inbox updates at once

An open inbox SHALL join its person's line, so a new item, a tap's *Sent* or *Didn't arrive*, and a closed item show at once. When it cannot join, it SHALL keep refreshing itself as before.

#### Scenario: Sent shows at once

- **WHEN** the computer reports a tap reached its chat while the inbox is open
- **THEN** the tap shows *Sent* without waiting for the next refresh

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

### Requirement: The helper warns on an outdated Node

The helper SHALL warn the person when the computer's Node is older than the minimum WongStack records for current security fixes, and SHALL keep working.

#### Scenario: An old Node

- **WHEN** the helper starts on a Node older than the recorded minimum
- **THEN** the person is told which version to update to, and taps still arrive

### Requirement: The line lives in its own Worker, so app changes keep their preview link

The live line SHALL run in one Worker of its own, beside the app, for the live app only, and the app SHALL only point at it. The line's Worker SHALL have no web address of its own: a computer or a page reaches the line only through the app's signed-in route. A change to the app SHALL get a per-change preview link. A preview SHALL have no line: its inbox SHALL keep refreshing itself, and nothing on a preview SHALL reach the live line or a live computer.

#### Scenario: An app change gets its link

- **WHEN** a change to the app is saved or previewed from the agent host
- **THEN** a per-change preview link is printed for it
- **AND** its open inbox refreshes itself with no line, and a tap made there wakes no computer through the live line

#### Scenario: The line can't be reached directly

- **WHEN** anyone requests the line's Worker on any web address
- **THEN** no address answers, and the line is reachable only through the app's signed-in route

### Requirement: Moving the line keeps schedules and the inbox

Moving the line out of the app SHALL leave every schedule, run, and inbox item as it was, and the update SHALL say in plain words that the line's old saved state inside the app is deleted and can't be undone, and what puts it back.

#### Scenario: An app that already has the line takes the update

- **WHEN** an install whose app holds the line publishes this update
- **THEN** its schedules and runs are unchanged, its computer reconnects to the new line, and the schedule clock resumes
- **AND** the update note says the old line state is deleted and that the computer's reconnect restores it

### Requirement: The update retires the test line

The update that removes the test line SHALL say in plain words to publish the release that lets staging run without a line first, and, once published, to delete the install's old test line Worker, saying that the delete can't be undone and that it held only test state.

#### Scenario: An install with a test line takes the update

- **WHEN** an install whose staging app points at its own test line takes the update
- **THEN** its sync plan carries the delete of the old test line as a step after publishing, saying it can't be undone

### Requirement: A line change can be tried on this computer

The app and its line SHALL run together on this computer, and the local stand-in sign-in SHALL count as a person there, only when the app runs locally with sign-in skipped and the request comes from this computer. A stand-in computer SHALL join the local line and show each *look now* it hears, and SHALL refuse any address but this computer's, so it never reaches a live app.

#### Scenario: A tap reaches the stand-in

- **WHEN** the app runs locally, the local inbox is open, the stand-in computer has joined, and a test item is tapped
- **THEN** the stand-in shows *look now* within a second

#### Scenario: The stand-in is pointed at a live app

- **WHEN** the stand-in computer is given any address but this computer's
- **THEN** it refuses before connecting

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
