# daily-routine Specification

## Purpose
`/daily` gives every person on a team one start-of-day command: it runs the steps the whole team shares, then that person's own, and learns new steps as they ask. It then stays on as their chief of staff: it watches the agents it started, keeps them moving, and brings the person only what needs them.

## Requirements

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

Each time a watched agent stops or asks something, the chief SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the question has a clear best answer that is safe; or tell the person at once. A safe answer stays in the agent's own work and can be undone. An answer that sends or posts a message, pays, publishes, merges, deletes or overwrites data, accepts terms, or changes a business record SHALL never be given by the chief alone: it SHALL go on one approval list the person clears with a single answer. An agent stopped at a finished plan's link SHALL wait for the person: the chief SHALL NOT reply to it, build it, or publish it, and SHALL point the person to the plan. When unsure, the chief SHALL tell the person. Each thing the chief does alone SHALL show as one line in the daily chat.

#### Scenario: An agent names its next step

- **WHEN** a watched agent ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the chief replies *keep going* and shows `Kept going: <title>` in the daily chat, without asking the person

#### Scenario: A safe recommended choice

- **WHEN** a watched agent asks "Run the tests now (Recommended) / Skip them"
- **THEN** the chief picks *Run the tests now* and shows the pick in the daily chat

#### Scenario: A finished plan

- **WHEN** a watched agent stops with its plan's link and a line to review it
- **THEN** the chief sends the agent nothing, and the plan waits for the person under *Needs you* in the inbox, or as its link in the daily chat when there is no inbox

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

### Requirement: The chief sends approvals and questions to the inbox when it is on

When the person's inbox is available, the chief SHALL put each approval and each *needs you* question in the inbox instead of asking them in the daily chat, and SHALL write one line in the chat saying what waits there, with the inbox link. An answer from the inbox SHALL be relayed as the person's own answer; words the person typed on an approval SHALL count as approval only when they plainly say so. An answer the person types in the daily chat SHALL still count, and SHALL close the matching inbox item. When the person answers the agent in its own chat instead, the watch SHALL close that agent's open inbox items once the agent works again or stops asking, and the chief SHALL say so in one line. Where the inbox is unavailable, the chief SHALL ask in the chat as before.

#### Scenario: An approval while the inbox is on

- **WHEN** a watched agent asks to send a customer email and the inbox is available
- **THEN** the chat shows one line that an approval waits in the inbox, and the person's *Approve* there reaches the agent

#### Scenario: The person answers in the chat instead

- **WHEN** an approval waits in the inbox and the person types *approve it* in the daily chat
- **THEN** the chief relays the approval and the inbox item closes

#### Scenario: The person answers in the agent's own chat

- **WHEN** a question waits in the inbox and the person answers it in the agent's own chat, and the agent starts working
- **THEN** the item leaves the inbox, a later tap on it is never delivered, and the daily chat says it was answered in its chat

### Requirement: Morning agents plan before they work

Where the host can open and watch other agents, every agent `/daily` opens for the morning's steps, and every agent a caller asks `/daily` to plan first, SHALL first only read and plan. While planning it SHALL change, save, send or pay for nothing. Its plan SHALL say what it will do, what it needs from the person, what it will ask before it acts outside its own work, and any question it has now. The chief SHALL never reply *keep going* or pick an answer for an agent that is still planning. An agent that stops without a plan SHALL get one nudge, then show as having no plan.

#### Scenario: A step opens in the morning

- **WHEN** the person runs `/daily` and their ad brief step opens its own workspace
- **THEN** its agent reads, writes its plan, and stops, and nothing outside its workspace changes

#### Scenario: A plan that never comes

- **WHEN** an agent stops twice while planning without writing a plan
- **THEN** the chief stops nudging it and its card shows *No plan*

### Requirement: The person's Go starts each planned agent

Once every planning agent has a plan, or 15 minutes after the first opened, the chief SHALL put each plan before the person together. No planned agent SHALL start working before the person's answer on it. On *Go*, the agent SHALL receive the person's note and answers and start working, and the chief SHALL watch it as any other agent. On *Not today*, the agent SHALL stop and its workspace SHALL close; a one-off task SHALL come back as a reminder for the next day, and a step on the person's list SHALL come back on its own days. Where the inbox is unavailable, the chief SHALL ask in the daily chat which agents go today, in one question with their questions alongside.

#### Scenario: Two go, one waits

- **WHEN** the person sends two plans on *Go* and the TikTok Shop task on *Not today*
- **THEN** the two agents start with the person's notes, the TikTok Shop workspace closes, and tomorrow's `/daily` lists it as a reminder

#### Scenario: No inbox

- **WHEN** the morning plans are in and the inbox does not answer
- **THEN** the daily chat shows each plan and asks one question for which agents go today, and starts only those

### Requirement: The watch tells the inbox where each agent stands

While the inbox is available, the daily watch SHALL report each watched agent's state to it: planning, waiting on the person, working with its latest step and the chief's last action, or done with its checked proof. A report SHALL carry no more of the agent's words than its latest step's one line. An agent that closes SHALL leave the inbox.

#### Scenario: The chief keeps an agent going

- **WHEN** the chief replies *keep going* to the landing-page agent
- **THEN** its inbox card shows its latest step and *Kept going* within a minute

### Requirement: Tasks handed over mid-day start at once

A task the person asks the daily chat to start after the morning round SHALL start working at once from its brief, with no planning round.

#### Scenario: A task asked at noon

- **WHEN** the person tells the daily chat at noon to get someone to research packaging suppliers
- **THEN** the agent starts researching at once and the chief watches it

### Requirement: The chief hands bigger tasks to their own workspace

In the daily chat, the chief SHALL answer quick asks itself: a question, a reminder, where its agents stand, a quick lookup. Any task bigger than that, one that edits files, takes several steps, or needs more than a few minutes, it SHALL start in its own workspace without asking, say so in one line, and watch it like any agent it starts. The person SHALL be able to keep a task in the chat by saying so, even right after a hand-off, and the task SHALL then never run in two places. Where no workspace can open, the chief SHALL do the task in the chat.

#### Scenario: A big task asked mid-day

- **WHEN** the person tells the daily chat "rewrite the returns page on the store"
- **THEN** the chief starts it in its own workspace without asking first, names it in one line, and watches it, and the daily chat stays free for the person

#### Scenario: The person keeps it here

- **WHEN** the person asks for a big task and says "do it here", with the ask or right after the chief handed it off
- **THEN** the chief does the task in the daily chat, and no workspace keeps working on it: one it just opened is closed first
