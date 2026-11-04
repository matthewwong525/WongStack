## ADDED Requirements

### Requirement: Each chat checks its own stops

When a chat in the repo stops, the chat itself SHALL get the check-in, in any app that runs a supported AI tool, with or without Paseo, every day with no end. A stop less than 15 minutes after the person's own last message in that chat SHALL be the person's turn and SHALL get no check-in. Otherwise one helper with fresh context SHALL judge the stop; on *keep going* or a safe pick the chat SHALL carry on by itself, and on *needs you* it SHALL stop. A check-in that fails or runs out of time SHALL let the chat stop. The Daily chat, a background run's chat and a sub-agent SHALL get no check-in, and a chat SHALL get no sixth check-in in a row with no word from the person.

#### Scenario: Away during a long build

- **WHEN** Jo writes in a chat at 9:00, leaves, and the chat stops at 9:40 with "Tests pass; next I'll update the wiki page"
- **THEN** the chat carries on by itself, and Jo finds it further on when back

#### Scenario: The person is answering

- **WHEN** Jo writes in a chat at 9:56 and the chat stops at 10:01
- **THEN** the chat stops and waits for Jo, with no check-in

#### Scenario: A chat outside Paseo

- **WHEN** a teammate runs a chat in a plain terminal, leaves, and it stops 30 minutes later with its work half done
- **THEN** that chat gets its check-in the same way as a chat in Paseo

### Requirement: Check-ins need no settings file

A person with no daily settings file SHALL get check-ins as the person from their company sign-in, else the repo's git email, in the computer's time zone. A settings file SHALL add the morning list, the board, routines and the install's own jobs, and its values SHALL win.

#### Scenario: A teammate who never typed /daily

- **WHEN** a teammate with no settings file leaves a chat that later stops with its work half done
- **THEN** a check-in keeps that chat going, and nothing is added to their board

### Requirement: A person can turn check-ins off

A person SHALL be able to turn their check-ins off and on again by asking in any chat. Off SHALL apply to that person in that repo, until they turn it on.

#### Scenario: Turned off

- **WHEN** Jo says *stop check-ins*, then leaves three chats that stop
- **THEN** each of the three stops and waits for Jo

### Requirement: Opening a chat keeps the daily's jobs running

When a person who has daily background jobs opens any chat in a repo, the daily SHALL make sure one worker runs for that person and repo, and start it in the background when none does, without holding up the chat. Background jobs are the person's board to-dos, add-ons and timed jobs. Timed jobs SHALL run with or without Paseo. A chat that a background run opened SHALL start no worker, and a second start SHALL never make a second worker for the same person and repo. A worker SHALL handle only its own repo's chats, and the chats its daily started or was handed.

#### Scenario: Two days later

- **WHEN** Jo's worker started on Monday morning and Jo's weekly job is due on Wednesday while the computer stayed on
- **THEN** the job runs, and opening another chat starts no second worker

#### Scenario: Two repos on one computer

- **WHEN** Jo has chats open in two repos, each with its own worker
- **THEN** each chat has one to-do on Jo's board, from its own repo's worker

### Requirement: The Daily chat answers at any time

After the morning reply, the person SHALL be able to ask the Daily chat, at any time, where things stand, which it answers from the journal, with or without Paseo. A Daily chat SHALL be able to stay open for days: the person's first message on a new day SHALL bring that day's list and start its routines, as `/daily` does, and a second message that day SHALL start nothing again. Where the host can watch other agents, the person SHALL also be able to ask it for a reminder, a watch, a message to a chat, or a new task.

#### Scenario: A task asked mid-day

- **WHEN** the person tells the Daily chat "get someone to research packaging suppliers"
- **THEN** it opens a workspace for that task and names it in the chat, and that chat gets its check-ins like any other

#### Scenario: The Daily chat left open overnight

- **WHEN** Jo's Daily chat from Monday is still open and Jo writes "morning" in it on Tuesday
- **THEN** the reply gives Tuesday's list and Tuesday's routines start, with no new `/daily`

## MODIFIED Requirements

### Requirement: A helper sorts each stop into three buckets

Each time a chat stops for its check-in, its helper SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the agent's question has a safe recommended or already-settled answer; else leave the stop for the person. A risky step, such as sending, paying, publishing or deleting, SHALL never be picked, a finished plan SHALL wait for the person, and a question asked with the question tool SHALL wait for the person.

#### Scenario: An agent names its next step

- **WHEN** a chat ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the helper replies *keep going*, without asking the person

#### Scenario: A risky recommended choice

- **WHEN** a chat asks whether to send a drafted email to a customer, with *Send it* recommended
- **THEN** the helper sends nothing, and the question waits in that chat

### Requirement: The Daily chat holds only the person's talk

The Daily chat SHALL receive no event messages: what happens goes to a private journal on that computer, outside git, kept 14 days. Each check-in SHALL add one line saying what was seen, what was done, or what waits for the person. When the person writes in the Daily chat, its agent SHALL get the journal lines new since their last message, out of the person's sight. The only message the computer SHALL send the Daily chat is one line a day when the person's board can not be read.

#### Scenario: The person asks what happened

- **WHEN** three check-ins kept chats going during the morning and the person asks *what's going on?*
- **THEN** the agent answers from the journal, and the Daily chat shows no message for those three stops

#### Scenario: The board can not be read

- **WHEN** the board's sign-in ends and the computer can not read the board all afternoon
- **THEN** the Daily chat gets one line saying so that day, and no more

### Requirement: An install adds its own background jobs

An install SHALL be able to add background jobs in one list in its own daily folder: an event or a time that starts each job, an optional check with no AI that says whether there is work, and the instructions the run follows. The daily SHALL ship no job of its own in that list. An update SHALL never change or remove that list. A job's run SHALL never send, pay, publish or delete unless its own instructions allow that one step.

#### Scenario: A weekly job

- **WHEN** an install's list has a job every Monday at 9:00 with a check
- **THEN** at 9:00 on Monday the check runs, and a background run starts only when the check finds work

#### Scenario: A computer that was off

- **WHEN** the computer was off at 9:00 and starts at 11:00
- **THEN** the 9:00 job does not run that day

## REMOVED Requirements

### Requirement: Background helpers judge each stop

**Reason**: A stop is judged in the chat's own stop step, not by a background helper that a watch starts; the new requirement "Each chat checks its own stops" holds the promise, and works without Paseo.

**Migration**: None for the person. An install whose own jobs list names the `stopped` or `asking` events keeps them; the default list no longer does.

### Requirement: The Daily chat watches the person's chats all day

**Reason**: The Daily chat no longer watches. Each chat checks its own stops, every day with no 24-hour end; "The Daily chat answers at any time" keeps what the person can ask it.

**Migration**: None for the person: `/daily` no longer starts a watch. The 15-minute wait moves to "Each chat checks its own stops".
