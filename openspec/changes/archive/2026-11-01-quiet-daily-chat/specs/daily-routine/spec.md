## MODIFIED Requirements

### Requirement: Background helpers judge each stop

When a watched chat stops or asks, one background helper with fresh context SHALL judge that stop: it keeps the chat going, picks a safe choice, or leaves the stop in its own chat. No separate helper chat SHALL open, and the Daily chat SHALL post nothing for a judged stop. When the daily runs on a computer, the computer SHALL start each helper itself, with the AI tool the person's chats use, at most 3 at a time, each stopped after 30 minutes.

#### Scenario: A stop that needs the person

- **WHEN** a watched chat asks whether to send an order email
- **THEN** the helper sends nothing, the question waits in that chat, and *what's going on?* in the Daily chat shows it

#### Scenario: A busy hour

- **WHEN** five watched chats stop at once while the daily runs on a computer
- **THEN** three helpers start, and each other stop waits until a helper ends

### Requirement: The Daily chat watches the person's chats all day

After the morning reply, the daily SHALL keep watching, where the host can watch other agents, every chat in the person's Paseo that worked in the last 24 hours and every chat handed to it, but never the Daily chat or a sub-agent. A stop after the person's own message SHALL wait 15 minutes from that message, also when the chat works and stops again in that time; a new message from the person SHALL start the wait over. The person SHALL be able to ask the Daily chat, at any time, for a reminder, a watch, a message to a chat, where things stand, or a new task.

#### Scenario: A task asked mid-day

- **WHEN** the person tells the daily chat "get someone to research packaging suppliers"
- **THEN** it opens a workspace for that task, watches it, and names it in the chat

#### Scenario: The person is answering

- **WHEN** a chat stops right after the person typed in it
- **THEN** the chief waits 15 minutes and sends that chat nothing while the person keeps writing

#### Scenario: The chat stops twice inside the wait

- **WHEN** the person types in a chat at 9:56, and the chat stops at 10:01, works again, and stops at 10:05
- **THEN** the daily sends that chat nothing before 10:11

## ADDED Requirements

### Requirement: The Daily chat holds only the person's talk

When the daily runs on a computer, the Daily chat SHALL receive no event messages: what happens goes to a private journal on that computer, outside git, kept 14 days. Each line SHALL say what was seen, what was done, or what waits for the person. When the person writes in the Daily chat, its agent SHALL get the journal lines new since their last message, out of the person's sight. The only message the computer SHALL send the Daily chat is one line a day when the person's board can not be read.

#### Scenario: The person asks what happened

- **WHEN** three helpers kept chats going during the morning and the person asks *what's going on?*
- **THEN** the agent answers from the journal, and the Daily chat shows no message for those three stops

#### Scenario: The board can not be read

- **WHEN** the board's sign-in ends and the computer can not read the board all afternoon
- **THEN** the Daily chat gets one line saying so that day, and no more

### Requirement: An install adds its own background jobs

The daily SHALL start with one job, judging a stopped or asking chat. An install SHALL be able to add jobs in one list in its own daily folder: an event or a time that starts each job, an optional check with no AI that says whether there is work, and the instructions the run follows. An update SHALL never change or remove that list. A job's run SHALL never send, pay, publish or delete unless its own instructions allow that one step.

#### Scenario: A weekly job

- **WHEN** an install's list has a job every Monday at 9:00 with a check
- **THEN** at 9:00 on Monday the check runs, and a background run starts only when the check finds work

#### Scenario: A computer that was off

- **WHEN** the computer was off at 9:00 and starts at 11:00
- **THEN** the 9:00 job does not run that day
