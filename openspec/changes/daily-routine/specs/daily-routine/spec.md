## Purpose

`/daily` gives every person on a team one start-of-day command: it runs the steps the whole team shares, then that person's own, and learns new steps as they ask.

## ADDED Requirements

### Requirement: Daily runs as the signed-in person

`/daily` SHALL know the person from their company sign-in before it runs any step. When they are signed out or the sign-in has ended, it SHALL give them the sign-in link, wait, and carry on once they are in; it SHALL run no step under a guessed person. An install with no company app SHALL use the repo's git email and say so.

#### Scenario: Signed in

- **WHEN** a person signed in as `jo@example.com` runs `/daily`
- **THEN** it runs the team's steps and then the steps in the file that lists `jo@example.com`

#### Scenario: Signed out

- **WHEN** a person whose company sign-in has ended runs `/daily`
- **THEN** it shows the sign-in link, runs no step until they sign in, then runs their day without a second `/daily`

### Requirement: Team steps run before the person's own

`/daily` SHALL run the team's steps first, then the person's own, and reply with a short list of what it did and what is left for today. A step SHALL run only on the days its line names; a line with no days runs every day. A person with no steps file SHALL get the team's steps and an offer to start their own.

#### Scenario: A weekly step on another day

- **WHEN** the team file says `Mondays: plan the week with /team-plan` and `/daily` runs on a Tuesday
- **THEN** that step does not run and the rest of the day's steps do

#### Scenario: A new person

- **WHEN** a signed-in person with no steps file runs `/daily`
- **THEN** it runs the team's steps and offers to start their own list

### Requirement: A person changes their own steps by asking

A person SHALL be able to add, change or remove their own steps by saying so, and the change SHALL go through the usual save, shown before it is saved. Only the owner's review SHALL change the team's steps.

#### Scenario: Adding a step

- **WHEN** Jo says "add checking yesterday's orders to my daily"
- **THEN** Jo's list gains that step, Jo sees the new list, and the next `/daily` runs it

### Requirement: A long step opens its own workspace once a day

A step marked to run on its own SHALL open in its own workspace where the host can open one, and SHALL run in the same chat where it cannot. A second `/daily` on the same day SHALL open no step's workspace twice, and SHALL name the ones already open.

#### Scenario: Run twice in a day

- **WHEN** a person runs `/daily` twice on one day and their email step opens its own workspace
- **THEN** the second run opens no new email workspace and names the one already open

#### Scenario: A host with no workspaces

- **WHEN** `/daily` runs where the host cannot open a workspace
- **THEN** the email step runs in the same chat

### Requirement: Updates keep each install's steps

A WongStack install or update SHALL deliver the daily skill without the team's steps or any person's steps, and SHALL never overwrite or remove them in an installed repo.

#### Scenario: An update after a team wrote its steps

- **WHEN** an install with a team file and two people files updates WongStack
- **THEN** the skill's instructions update and all three files are unchanged
