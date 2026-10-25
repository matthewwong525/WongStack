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

The app SHALL send nothing down the line but a signal to look for waiting work. The computer SHALL fetch that work through its signed-in requests and SHALL act only on a tap on an item it made itself, sending only the message it fixed for that action, or on a run of a schedule whose instructions are saved in its repo and match the revision the owner approved. It SHALL never run a command, prompt, or code received from the app, and SHALL ignore and log anything else.

#### Scenario: Work the computer didn't set up

- **WHEN** the app hands the computer a run for a schedule key its repo has no record of, or whose instructions changed since approval
- **THEN** no chat starts, the run shows as blocked, and the computer's log records it

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

Setup SHALL offer to run the computer's helper as a background program that starts with the computer and runs as the same user as the chats, never with more rights. Any chat that starts SHALL restart it when it is not running. The person SHALL be able to turn it off, and the inbox SHALL then work by checking while a chat runs. An update SHALL ask before adding it.

#### Scenario: After a restart

- **WHEN** the computer restarts and no chat has been opened yet
- **THEN** the helper is running and a due schedule or a tap is picked up

#### Scenario: Turned off

- **WHEN** the person turns the helper off
- **THEN** it no longer starts with the computer, and taps arrive by checking while a chat runs

### Requirement: The helper warns on an outdated Node

The helper SHALL warn the person when the computer's Node is older than the minimum WongStack records for current security fixes, and SHALL keep working.

#### Scenario: An old Node

- **WHEN** the helper starts on a Node older than the recorded minimum
- **THEN** the person is told which version to update to, and taps still arrive

### Requirement: The line lives in its own Worker, so app changes keep their preview link

The live line SHALL run in a Worker of its own, beside the app, with a staging twin, and the app SHALL only point at it. The line's Worker SHALL have no web address of its own: a computer or a page reaches the line only through the app's signed-in route. A change to the app SHALL get a per-change preview link.

#### Scenario: An app change gets its link

- **WHEN** a change to the app is saved or previewed from the agent host
- **THEN** a per-change preview link is printed for it
- **AND** a tap made from that link wakes the person's computer through the staging line

#### Scenario: The line can't be reached directly

- **WHEN** anyone requests the line's Worker on any web address
- **THEN** no address answers, and the line is reachable only through the app's signed-in route

### Requirement: Moving the line keeps schedules and the inbox

Moving the line out of the app SHALL leave every schedule, run, and inbox item as it was, and the update SHALL say in plain words that the line's old saved state inside the app is deleted and can't be undone, and what puts it back.

#### Scenario: An app that already has the line takes the update

- **WHEN** an install whose app holds the line publishes this update
- **THEN** its schedules and runs are unchanged, its computer reconnects to the new line, and the schedule clock resumes
- **AND** the update note says the old line state is deleted and that the computer's reconnect restores it
