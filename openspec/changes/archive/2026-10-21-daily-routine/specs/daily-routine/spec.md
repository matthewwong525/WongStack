## Purpose

`/daily` gives every person on a team one start-of-day command: it runs the steps the whole team shares, then that person's own, and learns new steps as they ask. It then stays on as their chief of staff: it watches the agents it started, keeps them moving, and brings the person only what needs them.

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

### Requirement: The daily chat stays on as a chief of staff

Where the host can watch other agents, `/daily` SHALL keep watching, for up to 10 hours, every agent it started and every chat the person hands it, and SHALL watch no other chat. The person SHALL be able to ask it, at any time in that chat, to start a new agent for a task, to watch a chat they name, or to say where each watched agent stands. Where the host cannot watch, `/daily` SHALL run its steps in the chat and only report.

#### Scenario: A task asked mid-day

- **WHEN** the person tells the daily chat "get someone to research packaging suppliers"
- **THEN** it opens a workspace for that task, watches it, and names it in the chat

#### Scenario: A chat the person started alone

- **WHEN** the person is working in a chat they opened themselves and did not hand to `/daily`
- **THEN** the chief never sends anything to that chat

### Requirement: The chief sorts each stop into three buckets

Each time a watched agent stops or asks something, the chief SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the question has a clear best answer that is safe; or tell the person at once. A safe answer stays in the agent's own work and can be undone. An answer that sends or posts a message, pays, publishes, merges, deletes or overwrites data, accepts terms, or changes a business record SHALL never be given by the chief alone: it SHALL go on one approval list the person clears with a single answer. When unsure, the chief SHALL tell the person. Each thing the chief does alone SHALL show as one line in the daily chat.

#### Scenario: An agent names its next step

- **WHEN** a watched agent ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the chief replies *keep going* and shows `Kept going: <title>` in the daily chat, without asking the person

#### Scenario: A safe recommended choice

- **WHEN** a watched agent asks "Build it now (Recommended) / Review the plan / Stop"
- **THEN** the chief picks *Build it now* and shows the pick in the daily chat

#### Scenario: A risky recommended choice

- **WHEN** a watched agent asks whether to send a drafted email to a customer, with *Send it* recommended
- **THEN** the chief sends nothing, puts it on the approval list, and relays the person's answer

#### Scenario: No clear answer

- **WHEN** a watched agent asks which of two suppliers to order from, with no recommendation and nothing in its brief
- **THEN** the chief tells the person at once, with the agent's options, and a phone notification where the app sends one

### Requirement: The chief stops a loop

The chief SHALL take at most five actions in a row on one agent without the person's word; the next stop on that agent SHALL go to the person.

#### Scenario: The same stop again and again

- **WHEN** the chief has replied to one agent five times in a row and it stops again
- **THEN** the chief tells the person instead of replying

### Requirement: Agents start with their choices made

Every agent the chief starts SHALL begin from a brief that names the goal, what done looks like, the choices already made, what it may do without asking, and what it must ask first. Before starting it, the chief SHALL ask the person, in one round, any choice the task cannot start without.

#### Scenario: A task with an open choice

- **WHEN** the person asks for a task whose result depends on a choice only they can make
- **THEN** the chief asks that choice before it starts the agent, and the brief records the answer

### Requirement: Done is reported with proof

The chief SHALL tell the person a watched agent's task is done only with proof it checked: a link that opens, checks that passed, or the file, draft or record that was made. Without proof, it SHALL ask the agent for it once, then tell the person the task is unconfirmed.

#### Scenario: Done without proof

- **WHEN** a watched agent says "All done" and names no link, check or result
- **THEN** the chief asks it for the proof once, and reports `Done` only after checking what it gives

### Requirement: Reminders are kept and checked at each start

A person SHALL be able to save a dated reminder by asking, in the daily chat or after `/daily`. The reminder SHALL be visible only to that person and SHALL need no saved edit. Every `/daily` SHALL begin, before the steps, by listing the person's reminders due that day or overdue and their own open work in memory. A reminder SHALL stay listed each day until the person marks it done. When memory cannot be read, `/daily` SHALL say so and go on.

#### Scenario: A reminder for Friday

- **WHEN** Jo says on Tuesday "remind me Friday to call Kim back about the kits"
- **THEN** Friday's `/daily` lists it before the day's steps, and a teammate's `/daily` never shows it

#### Scenario: A missed day

- **WHEN** Jo does not run `/daily` on Friday and runs it on Monday
- **THEN** Monday's list shows the Friday reminder as overdue until Jo says it's done

#### Scenario: Memory unavailable

- **WHEN** the memory store cannot be read at the start of `/daily`
- **THEN** it says `Not read: reminders` and runs the day's steps
