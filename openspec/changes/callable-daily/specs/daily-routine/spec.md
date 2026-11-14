## MODIFIED Requirements

### Requirement: Daily runs as the signed-in person

`/daily` SHALL know the person from their company sign-in before it runs any step. When they are signed out or the sign-in has ended, it SHALL give them the sign-in link, wait, and carry on once they are in; it SHALL run no step under a guessed person. When another skill runs it, it SHALL give the link and hand back at once instead of waiting, with no step run. An install with no company app SHALL use the repo's git email and say so.

#### Scenario: Signed in

- **WHEN** a person signed in as `jo@example.com` runs `/daily`
- **THEN** it runs the team's steps and then the steps in the file that lists `jo@example.com`

#### Scenario: Signed out

- **WHEN** a person whose company sign-in has ended runs `/daily`
- **THEN** it shows the sign-in link, runs no step until they sign in, then runs their day without a second `/daily`

#### Scenario: Signed out when called

- **WHEN** a personal agent's daily runs `/daily` and the person's company sign-in has ended
- **THEN** `/daily` gives the sign-in link, runs no step, and hands back so the agent's own day goes on

### Requirement: The daily chat stays on as a chief of staff

Where the host can watch other agents, `/daily` SHALL keep watching, for up to 10 hours, every agent it started and every chat the person hands it, and SHALL watch no other chat. The person SHALL be able to ask it, at any time in that chat, to start a new agent for a task, to watch a chat they name, or to say where each watched agent stands. Where the host cannot watch, `/daily` SHALL run its steps in the chat and only report. When another skill runs `/daily`, it SHALL start no watch itself; it SHALL hand back how to start one, so one chat has one chief of staff.

#### Scenario: A task asked mid-day

- **WHEN** the person tells the daily chat "get someone to research packaging suppliers"
- **THEN** it opens a workspace for that task, watches it, and names it in the chat

#### Scenario: A chat the person started alone

- **WHEN** the person is working in a chat they opened themselves and did not hand to `/daily`
- **THEN** the chief never sends anything to that chat

## ADDED Requirements

### Requirement: Daily uses its own repo from any chat

`/daily` SHALL read the sign-in, reminders and record of today's agents of the repo it is installed in, and SHALL open each agent in that repo, whichever folder the chat that runs it sits in.

#### Scenario: Run from a personal agent's chat

- **WHEN** a personal agent working in `~/Personal` runs the `/daily` installed in `~/Team`
- **THEN** it reads `~/Team`'s sign-in and reminders, and its email step opens in `~/Team`, not `~/Personal`

### Requirement: Another skill can run daily inside its own day

Another skill SHALL be able to run `/daily` in its own chat and merge the result into its own day. Whoever runs it, `/daily` SHALL reply with the same fixed lines for reminders, started, already-open, skipped and left-for-today steps, and sources not read. A caller that is a script SHALL be able to get the person, the reminders due and today's agents as data from one command. When called, `/daily` SHALL end with no closing question or offer. A caller SHALL be able to name steps it already covers, and `/daily` SHALL skip those and say so. The caller SHALL be able to add its own agents to the one watch.

#### Scenario: Both days include email

- **WHEN** a personal agent's daily, which runs email itself, runs `/daily` whose steps include `Weekdays: /email (own workspace)`, and says it covers email
- **THEN** `/daily` opens no email workspace, replies `Skipped: /email — <the agent> covers it` among its other lines, and asks no closing question

#### Scenario: One watch for both days

- **WHEN** the personal agent starts the watch `/daily` handed back and hands it its own news agent
- **THEN** one watch follows both `/daily`'s agents and the news agent, and each stop gets one answer
