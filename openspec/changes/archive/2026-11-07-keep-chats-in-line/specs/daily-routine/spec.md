# Spec Delta

## ADDED Requirements

### Requirement: Watched chats stay in line with each other

Where the host lets a chat watch other chats, the daily SHALL work toward one goal for the person's watched chats in one project: no two do the same work or work against each other, each gets as far as the context across all of them allows, a chat waiting on another chat's work, or on the person's answer in another chat, hears when that wait is over, and the person's recent choices weigh most. It SHALL read new messages a few minutes after a watched chat has them, and SHALL send notes to the chats that news affects, judging what to say, to whom, and when. A note that reaches a working chat SHALL go into its running step without stopping it. These limits SHALL hold whatever it judges: a risky step waits for the person; no chat closes without the person's pick; an agent's words never count as the person's approval; a note counts toward the 5 own actions in a row; and each note writes one journal line. This job SHALL be one of the person's schedules, which they can pause, run now or change like any other; turning check-ins off SHALL stop it too.

#### Scenario: A choice in one chat changes another chat's work

- **WHEN** Jo says "use Stripe, not PayPal" in chat A at 10:00, and chat B is building a PayPal checkout
- **THEN** chat B gets a note naming chat A and the Stripe choice, keeps the work it did, and the journal has one line for it

#### Scenario: A blocker is gone

- **WHEN** chat B stopped to wait for chat A's sign-in change to go live, and chat A's change goes live while Jo is away
- **THEN** chat B gets a note that the change is live, from chat A, and goes on with its work

#### Scenario: Two chats on the same work

- **WHEN** chats A and B both start adding the same export button
- **THEN** only one chat goes on with the button, the other is told which chat has it, and neither stops a step in the middle

### Requirement: The daily's own jobs are default schedules

WongStack SHALL ship the daily's built-in timed jobs as default schedules. Each SHALL be added to the person's schedules in the company app the first time a chat starts after install or update, approved on that computer, without a question. A default the person never changed SHALL take WongStack's newer version at an update; one they changed, paused or ended SHALL be left as it is, and an ended one SHALL never be added again. A schedule's run list SHALL leave out runs that found nothing to do, and show how many there were.

#### Scenario: First chat after the update

- **WHEN** Jo opens a chat after the update and has no line-up or wiki tidy schedule
- **THEN** both appear in Jo's *Schedules* list, approved on that computer, and the wiki tidy runs once a period, not twice

#### Scenario: Jo changed the line-up

- **WHEN** Jo set the line-up to every 15 minutes, and a later update ships a new line-up
- **THEN** Jo's line-up stays every 15 minutes with Jo's text

## MODIFIED Requirements

### Requirement: A helper sorts each stop into three buckets

Each time a chat stops for its check-in, its helper SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the agent's question has a safe recommended or already-settled answer; else leave the stop for the person. An answer the person gave in another watched chat SHALL count as settled, with their recent answers weighing most. A risky step, such as sending, paying, publishing or deleting, SHALL never be picked, a finished plan SHALL wait for the person, and a question asked with the question tool SHALL wait for the person.

#### Scenario: An agent names its next step

- **WHEN** a chat ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the helper replies *keep going*, without asking the person

#### Scenario: A risky recommended choice

- **WHEN** a chat asks whether to send a drafted email to a customer, with *Send it* recommended
- **THEN** the helper sends nothing, and the question waits in that chat

#### Scenario: Answered in another chat

- **WHEN** a chat asks "light or dark theme for the report page?" while Jo is away, and Jo chose dark for all report pages in another chat an hour earlier
- **THEN** the helper answers dark and names the chat the answer came from

### Requirement: Finished chats close only when the person picks them

The helper SHALL NOT send `/close` to a chat by itself. Where the host lets a chat watch other chats, the answer to *what's going on?* in any chat SHALL mark each watched chat whose work is published, with nothing new on its branch or in its folder since, that is not working and has no open question. It SHALL also mark, as covered, each watched chat that was told another chat covers its work and that is not working. When it marks one or more, it SHALL ask which to close, and SHALL send `/close` only to the chats the person picks. It SHALL NOT mark the chat that asks, a sub-agent, or a chat in the main checkout.

#### Scenario: The person picks one finished chat

- **WHEN** the chats `flashy-crab` and `calm-otter` are both published with nothing new, and the person answers *what's going on?* with "close flashy-crab"
- **THEN** `flashy-crab` gets `/close` once, and `calm-otter` stays open

#### Scenario: A published chat left open

- **WHEN** a chat's change is published, and the person leaves it open for an hour without asking *what's going on?*
- **THEN** the chat stays open and gets no `/close`

#### Scenario: A covered chat

- **WHEN** `calm-otter` was told `flashy-crab` covers its work and stopped, and the person asks *what's going on?*
- **THEN** `calm-otter` is marked covered by `flashy-crab` and offered for closing, and closes only if the person picks it

### Requirement: What the background did is kept in a journal

What the daily's helper and the check-ins do SHALL go to a private journal on that computer, outside git, kept 14 days, one line for each thing: a check-in, a background run's start and end, a closed chat, a source it could not read, a note between chats. A schedule's runs SHALL show in the app, not only in the journal. The helper SHALL send no other chat a message about it; a note that keeps chats in line SHALL be the one message it sends to a chat the note concerns. When the person's board can not be read, the journal SHALL say so one time for each run of failures, not one time each minute.

#### Scenario: The board can not be read

- **WHEN** the helper can not read the board one time, and the next read works
- **THEN** the journal has one line saying so, and no chat opens or gets a message about it
