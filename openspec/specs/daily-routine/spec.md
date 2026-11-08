# daily-routine Specification

## Purpose
The daily routine runs each person's day on a team with no chat to open: each morning the worker starts the routines the whole team shares, then that person's own, and any chat does their asks and learns new steps. It is also their chief of staff: it keeps their chats moving, and brings the person only what needs them.

## Requirements

### Requirement: Daily runs as the signed-in person

The daily SHALL know the person from their company sign-in, else the repo's git email, before the morning starts any step. It SHALL run no step under a guessed person: when no settings file lists the person's email, the morning SHALL run no add-on, even when only one settings file exists.

#### Scenario: Signed in

- **WHEN** a person signed in as `jo@example.com` has a settings file that lists `jo@example.com`
- **THEN** the morning runs the add-ons in that file

#### Scenario: Signed out

- **WHEN** Jo's company sign-in has ended and Jo's settings file lists Jo's git email
- **THEN** the morning finds Jo by the git email and runs Jo's add-ons, and runs no step under another person

#### Scenario: Another person's file

- **WHEN** the repo holds only `kim.json`, and a chat opens for `jo@example.com`
- **THEN** the morning runs no add-on for Jo, and Jo's chats still get check-ins

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

### Requirement: An install adds its own parts without changing the daily

A settings file SHALL be able to name add-on scripts in the repo that run at the morning and at each watch pass. A failing add-on SHALL be named as not read and SHALL never stop the daily.

#### Scenario: An add-on fails

- **WHEN** a pass add-on exits with an error
- **THEN** the watch says it was not read and goes on judging stops

### Requirement: A helper sorts each stop into three buckets

Each time a chat stops for its check-in, its helper SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the agent's question has a safe recommended or already-settled answer, or is a small, safe decision or an obvious question with one plain best answer; else leave the stop for the person. An answer the person gave in another watched chat SHALL count as settled, with their recent answers weighing most. A risky step, such as sending, paying, publishing or deleting, SHALL never be picked, a finished plan SHALL wait for the person, and a question asked with the question tool SHALL wait for the person.

#### Scenario: An agent names its next step

- **WHEN** a chat ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the helper replies *keep going*, without asking the person

#### Scenario: A risky recommended choice

- **WHEN** a chat asks whether to send a drafted email to a customer, with *Send it* recommended
- **THEN** the helper sends nothing, and the question waits in that chat

#### Scenario: Answered in another chat

- **WHEN** a chat asks "light or dark theme for the report page?" while Jo is away, and Jo chose dark for all report pages in another chat an hour earlier
- **THEN** the helper answers dark and names the chat the answer came from

#### Scenario: A small question with no recommendation

- **WHEN** a chat stops on "Should I run the tests before I go on?" with no option marked recommended, while Jo is away
- **THEN** the helper answers yes, and the chat goes on without Jo

### Requirement: A typed question comes back as tap answers

When a chat stops on a question for the person that it wrote as plain text, not with the question tool, and the helper does not pick its answer, its check-in SHALL send the stop back once, to ask that question with the question tool, with a few short answers and the recommended one first. A finished plan, a sign-in, key or payment step, and a question already asked with the question tool SHALL wait for the person as before. A chat that stops again with no question tool before the person writes SHALL wait for the person, with no second send-back.

#### Scenario: A plain-text question while the person is away

- **WHEN** Jo leaves a chat, and 30 minutes later it stops on "Should I keep the old page or remove it?" written as plain text
- **THEN** the chat asks again with the question tool, with its recommended answer first, and waits for Jo's tap

#### Scenario: The chat can not show the question tool

- **WHEN** a chat sent back to ask with the question tool stops again with no question tool, and Jo has not written since
- **THEN** the chat waits for Jo, with no second send-back

### Requirement: Updates keep each install's settings

A WongStack install or update SHALL deliver the daily skill without any person's or team's settings file, and SHALL never overwrite or remove them in an installed repo.

#### Scenario: An update after a team wrote its settings

- **WHEN** an install with a team file and two people's settings files updates WongStack
- **THEN** the skill updates and all three files are unchanged

### Requirement: Each chat checks its own stops

When a chat in the repo stops, the chat itself SHALL get the check-in, in any app that runs a supported AI tool, with or without Paseo, every day with no end. A stop less than 15 minutes after the person's own last message in that chat SHALL be the person's turn and SHALL get no check-in. Otherwise one helper with fresh context SHALL judge the stop; on *keep going* or a safe pick the chat SHALL carry on by itself, and on *needs you* it SHALL stop. A check-in that fails or runs out of time SHALL let the chat stop. A background run's chat and a sub-agent SHALL get no check-in, and a chat SHALL get no sixth check-in in a row with no word from the person.

#### Scenario: Away during a long build

- **WHEN** Jo writes in a chat at 9:00, leaves, and the chat stops at 9:40 with "Tests pass; next I'll update the wiki page"
- **THEN** the chat carries on by itself, and Jo finds it further on when back

#### Scenario: The person is answering

- **WHEN** Jo writes in a chat at 9:56 and the chat stops at 10:01
- **THEN** the chat stops and waits for Jo, with no check-in

#### Scenario: A chat outside Paseo

- **WHEN** a teammate runs a chat in a plain terminal, leaves, and it stops 30 minutes later with its work half done
- **THEN** that chat gets its check-in the same way as a chat in Paseo

#### Scenario: An old Daily chat after the update

- **WHEN** Jo's chat that began with `/daily` before this update stops 30 minutes after Jo's last message
- **THEN** it gets a check-in like any other chat

### Requirement: Check-ins need no settings file

A person with no daily settings file SHALL get check-ins as the person from their company sign-in, else the repo's git email, in the computer's time zone. A settings file SHALL add the morning start, routines and the install's own jobs, and its values SHALL win.

#### Scenario: A teammate who never typed /daily

- **WHEN** a teammate with no settings file leaves a chat that later stops with its work half done
- **THEN** a check-in keeps that chat going, and the chat shows in their own Inbox only

### Requirement: A person can turn check-ins off

A person SHALL be able to turn their check-ins off and on again by asking in any chat. Off SHALL apply to that person in that repo, until they turn it on.

#### Scenario: Turned off

- **WHEN** Jo says *stop check-ins*, then leaves three chats that stop
- **THEN** each of the three stops and waits for Jo

### Requirement: Opening a chat keeps the daily's jobs running

When a person who has daily background jobs opens any chat in a repo, the daily SHALL make sure one worker runs for that person and repo, and start it in the background when none does, without holding up the chat. Background jobs are the person's chat list, add-ons, event jobs, and the background schedule runs the computer hands it. They SHALL run with or without Paseo. A chat that a background run opened SHALL start no worker, and a second start SHALL never make a second worker for the same person and repo. A worker SHALL handle only its own repo's chats, and the chats its daily started or was handed.

#### Scenario: Two days later

- **WHEN** Jo's worker started on Monday morning and Jo's weekly background schedule is due on Wednesday while the computer stayed on
- **THEN** the run happens, and opening another chat starts no second worker

#### Scenario: Two repos on one computer

- **WHEN** Jo has chats open in two repos, each with its own worker
- **THEN** each chat shows one time in Jo's Inbox, from its own repo's worker

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

### Requirement: Any chat does the daily's asks

In any chat in the repo, the person SHALL be able to ask for a reminder at a time, to watch a chat, to tell a watched chat an answer, to turn check-ins off or on, and *what's going on?*. A reminder SHALL be a one-time schedule that opens a chat at that time with the reminder, saved after the person's OK like any schedule. *What's going on?* SHALL answer from the journal and, where the host can watch other chats, from where each watched chat stands. No chat SHALL get journal lines the person did not ask for.

#### Scenario: A reminder from a work chat

- **WHEN** Jo, in a chat fixing the store page, says "remind me Friday to call Kim back" and says OK
- **THEN** a one-time schedule opens a chat *call Kim back* on Friday morning, and the first chat goes on with its work

#### Scenario: What happened while away

- **WHEN** three check-ins kept chats going during the morning and Jo opens a new chat and asks *what's going on?*
- **THEN** the answer names those three check-ins and each watched chat's state, and no chat got a message about them before

### Requirement: An install can deny tools to its background jobs

An install SHALL be able to name, in its list of background jobs, tool patterns that no background job of the daily may use. Each run the daily's worker starts for a timed job or an event SHALL get that list, and the AI tool SHALL refuse those tools in that run. A morning routine opens its own chat, not a background run, and SHALL NOT be covered by the list. A list that is not a list of patterns SHALL be a bad entry, as any other. When the install's AI tool can not refuse tools by such a pattern, the worker SHALL start no background run while the list is set, and SHALL write why in the journal.

#### Scenario: A send command is denied

- **WHEN** an install's list denies `Bash(*send-approved*)` and a timed job's run starts with Claude Code
- **THEN** that run can not use a command matching `*send-approved*`, and its other tools work as before

#### Scenario: Codex with a deny list

- **WHEN** an install's list has a `deny` list and the person's runs use Codex
- **THEN** no background run starts, and the journal says the deny list works only with Claude Code

### Requirement: The settings file holds no schedules

A person's daily settings file SHALL hold their morning time, folders, add-ons and other daily settings, and SHALL hold no routines and no timed jobs: those are schedules in the company app. A settings file that still lists routines after the update SHALL start none of them, and the journal SHALL say once a day that they wait to move to the app. A person with no settings file SHALL still get check-ins.

#### Scenario: A routine left in the file

- **WHEN** Jo's settings file still lists a Monday routine after the update, because its move did not finish
- **THEN** the morning does not start it, and the journal says the routine waits to move to the app

#### Scenario: No settings file

- **WHEN** a teammate has no settings file
- **THEN** their chats still get check-ins

### Requirement: The morning add-ons run with no chat

Each morning the daily SHALL run the person's morning add-ons by itself, with no chat and no AI, at the person's morning time (8:00 in their time zone unless their settings name another), or at the first moment after it that the daily's helper runs on that computer. It SHALL run them at most one time per day. Each line an add-on gave, and each add-on that did not run, SHALL go to the journal. No chat SHALL open only to start the day.

#### Scenario: A morning with the computer on

- **WHEN** Jo's settings have a morning add-on and the helper is running at 8:00 on a Tuesday
- **THEN** the add-on runs at 8:00, its lines go to the journal, and no chat opens

#### Scenario: The first chat comes late

- **WHEN** Jo's computer was off at 8:00 and Jo opens a chat at 10:30
- **THEN** that day's add-ons run at 10:30, one time, and a second chat that day runs none again

### Requirement: An install adds its own event jobs

The daily SHALL start with one job: the small wiki tidy after each memory consolidation. Judging a stop SHALL be each chat's own check-in, not a job on that list. An install SHALL be able to add jobs that an event starts, in one list in its own daily folder: the event, an optional check with no AI that says whether there is work, and the instructions the run follows. A job in that list with a default job's name SHALL replace it, and the install SHALL be able to turn a default job off there. A job that runs at a time is a schedule in the company app, not an entry in that list. An update SHALL never change or remove that list, except the move of its timed jobs to the app. A job's run SHALL never send, pay, publish or delete unless its own instructions allow that one step.

#### Scenario: An install turns a default job off

- **WHEN** an install's list turns the wiki tidy off
- **THEN** the helper starts no wiki tidy, and runs the install's other jobs as before

#### Scenario: A timed job left in the list

- **WHEN** an install's list still holds a job with a time after the update, because its move did not finish
- **THEN** the job does not run from the list, and the journal says it waits to move to the app

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

While the person's check-ins are off on a computer, each default they never changed SHALL wait paused on that computer, so its run list gets no runs that could not start. When check-ins go on, each default paused this way SHALL go on again. A default the person paused, changed or ended SHALL never be paused or resumed by check-ins, and one they resume while check-ins are off SHALL stay on.

A day SHALL count as set up only after a try sets up every default. A try that fails, or stops with no result, SHALL write a journal line with its reason, at most one line a day for the same reason, and a chat start SHALL try again about an hour later.

#### Scenario: First chat after the update

- **WHEN** Jo opens a chat after the update and has no line-up or wiki tidy schedule
- **THEN** both appear in Jo's *Schedules* list, approved on that computer, and the wiki tidy runs once a period, not twice

#### Scenario: Jo changed the line-up

- **WHEN** Jo set the line-up to every 15 minutes, and a later update ships a new line-up
- **THEN** Jo's line-up stays every 15 minutes with Jo's text

#### Scenario: Check-ins off for three days

- **WHEN** Jo turns check-ins off on Monday and on again on Thursday
- **THEN** from Monday to Thursday the line-up and the wiki tidy show *Paused* and their run lists get no *didn't start* lines, and on Thursday both run on time again

#### Scenario: Jo paused the wiki tidy first

- **WHEN** Jo paused the wiki tidy, then turns check-ins off and on again
- **THEN** the line-up pauses and goes on again, and the wiki tidy stays paused

#### Scenario: A failed setup says why and tries again

- **WHEN** a chat start's background setup of the defaults fails, or stops with no result
- **THEN** the journal holds one line with the reason, and a chat start an hour or more later the same day tries again and, once it works, adds the missing defaults

### Requirement: The background's work is kept in a journal

What the daily's helper and the check-ins do SHALL go to a private journal on that computer, outside git, kept 14 days, one line for each thing: a check-in, a background run's start and end, a closed chat, a source it could not read, a note between chats. A schedule's runs SHALL show in the app, not only in the journal. The helper SHALL send no other chat a message about it; a note that keeps chats in line SHALL be the one message it sends to a chat the note concerns. When the app can not take the person's chat list, the journal SHALL say so one time for each run of failures, not one time each minute.

#### Scenario: The app can not take the chat list

- **WHEN** the helper can not send the chat list one time, and the next send works
- **THEN** the journal has one line saying so, and no chat opens or gets a message about it

### Requirement: A failure two times in a row opens one Needs-you chat

When the daily's helper fails the same way two times in a row, at sending the person's chat list to the app, at starting their morning, at one of their jobs, or at reaching Paseo, it SHALL open one new chat named `Needs you: <what broke>`. Its first message SHALL say what failed, the reason, and the steps to fix it; when the person's daily guide gives its own fix, the chat SHALL follow that. The helper SHALL open at most one such chat for each kind of problem each local day, and a success SHALL start the count again. The watch SHALL not watch that chat and no check-in SHALL judge its stops, so it waits for the person. When Paseo can not open the chat, the journal SHALL say so with the reason.

#### Scenario: The chat list stays unsent

- **WHEN** the app's sign-in ends at 14:00 and the helper can not send the chat list at 14:00, 14:01 and all afternoon
- **THEN** the journal has one line at 14:00, one chat *Needs you: the chat list* opens at 14:01 with the sign-in steps, and no second chat opens that day

#### Scenario: Paseo can not open the chat

- **WHEN** the morning fails two times in a row and Paseo refuses to open a chat
- **THEN** the journal says the chat did not open, with Paseo's reason, and the helper goes on
