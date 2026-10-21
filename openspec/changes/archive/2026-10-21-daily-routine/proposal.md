# Run each person's day with /daily, a chief of staff that keeps agents moving

**Status:** ready-to-ship
**Branch:** daily-routine-skill
**Open questions:** none

## Why

A business owner wants each person on the team to start the day the same reliable way, without re-explaining it every morning. Today WongStack has no shared start-of-day: each person types the same requests by hand, and Matt's daily in WongOS works for him alone.

Once the day starts, the person becomes the bottleneck. Each agent they start stops between turns and waits for them, even though most stops need only *keep going*, and most choices have an obvious best answer. WongOS's daily already says *Needs you* each time an agent stops, so every stop still lands on the person. A chief of staff should judge each stop first and bring the person only what needs them.

Each person also carries things that come back on their own: a weekly report, the books on the first of the month, a call to return on Friday. Today they keep those in their head. The chief of staff should hold them: repeating jobs it runs on their days, and reminders it checks each time it starts. Everyone on the team runs their own `/daily`, with their own steps, reminders and agents, so each person's day is fitted to them.

## What Changes

- **One command starts the day.** A person types `/daily`. It checks who they are from their company sign-in, runs the team's steps, then their own, and replies with a short list of what it did and what is left for today.
  ```text
  /daily ─▶ who? ─▶ team steps ─▶ my steps ─▶ list
             │ signed out
             ▼
        sign-in link ─▶ wait ─▶ go on
  ```
- **Signed out, it asks you to sign in first.** It sends the company sign-in link and waits. Once you are in, it carries on by itself; nothing runs under a guessed name.
- **The team's steps and each person's steps live inside the daily skill.** The owner keeps the team part: the steps everyone runs. Each person has their own part, found by their sign-in email. A step is one plain line, such as `Mondays: plan the week with /team-plan`.
  ```text
  daily skill
   ├─ team steps     everyone, every day
   └─ people
       ├─ Sam        Sam's own steps
       └─ Jo         Jo's own steps
  ```
- **Repeating jobs run on their own days.** A step's days are plain words: *every day*, *Mondays*, *weekdays*, *the first of the month*. `/daily` runs each one only on its day, like a schedule you set by talking.
- **You teach it as you go.** Say "add checking yesterday's orders to my daily", and tomorrow it does that step for you. It shows the new list and saves it like any other edit. A new person with no steps yet gets the team part, then an offer to start their own.
- **It keeps your reminders and checks them every time it starts.** Say *remind me Friday to call Kim back about the kits*, in the daily chat or after `/daily`. It saves the reminder as your own private note, which teammates never see, with no edit to save. Each `/daily` starts by listing what's due today or overdue, along with work you left open, before the day's steps. Say *done* and it drops off.
  ```text
  /daily ─▶ who? ─▶ reminders ─▶ steps ─▶ list
                    due today
                    + overdue
                    + left open
  ```
- **A long step gets its own workspace where your app allows it.** A step like working through email opens its own workspace, so its questions don't take over the morning chat. Each one starts once a day: a second `/daily` opens nothing twice. Where the app can't open workspaces, the step runs right in the chat.
- **The daily chat stays on all day as your chief of staff.** After the morning steps, it keeps watching every agent it started, for up to 10 hours. Talk to it any time: *get someone to research packaging suppliers* starts a new agent, *watch flashy-crab* adds a chat you started yourself, *what's going on?* lists each agent and where it stands. It never steps into a chat you didn't start through it or hand to it.
  ```text
  you ──▶ chief of staff ──┬─▶ agent: email
           (daily chat)    ├─▶ agent: research
                           └─▶ agent: flashy-crab
  ```
- **Each time an agent stops, the chief sorts it into one of three buckets.** Most stops never reach you.
  ```text
  agent stops ─▶ chief reads it
                   │
     ┌─────────────┼──────────────┐
     ▼             ▼              ▼
  keep going   obvious pick   needs you
  it replies   safe: answers  pings you
               risky: list    right away
  ```
  1. **Keep going.** The agent finished a step and named its next one, or asked *shall I continue?* The chief replies *keep going* itself.
  2. **Obvious pick.** The agent asked a choice with a clear best answer. When that answer stays inside the work, such as *build it now* or *fix the failing test*, the chief picks it. When it sends, pays, publishes, deletes or signs up for something, the chief adds it to one approval list you clear in a single tap.
  3. **Needs you.** No clear answer, an agent stuck on the same thing twice, a login only you can do, or anything the chief isn't sure of. It tells you at once, in the chat and as a phone notification where your app sends them.

  Each thing the chief does on its own shows as one line in the chat, such as `Kept going: email` or `Picked "Build it now": research`, so you can step in.
- **Agents start with their choices already made.** Before the chief starts an agent, it writes a short brief: the goal, what *done* looks like, the choices already settled, and what the agent may do without asking. A choice only you can make, it asks you then, not halfway through the work.
- **Done means checked.** An agent's *done* reaches you only with proof the chief looked at: a link that opens, checks that passed, or the file or message it made. Without proof, the chief asks the agent for it once, then tells you.
- **Where the app can't watch other chats, `/daily` still works.** It runs each step in the morning chat and reports, with no watching.

Non-goals: no timer (a person can ask for a morning run later through the usual schedule offer); no task board or day page like WongOS's (a team can add one as their own step); the chief never approves sending, paying, publishing or deleting on its own; moving Matt's WongOS and ClaymooApp dailies onto this comes later, in each of those.

## Capabilities

### New Capabilities

- `daily-routine`: `/daily` identifies the person by company sign-in, lists the person's due reminders and open work, runs the team's then the person's steps on the days they name, saves new reminders as private memory facts, lets a person change their own steps, opens long steps in their own workspace once per day where the host supports it, keeps install-owned steps across updates, then stays on as a chief of staff: it watches the agents it started or was handed, sorts each stop into keep going, obvious pick or needs you, briefs each agent with its decisions up front, and reports *done* only with proof.

### Modified Capabilities

None.

## Impact

- New skill `.agents/skills/daily/` (`SKILL.md`, `references/chief.md`, `scripts/daily.mjs` and its test), started only by a person (`disable-model-invocation: true`).
- Reuses `memory/scripts/lib/store.mjs` (`signIn`, `memoryOrigin`) for identity, `memory.mjs search` and `put-facts` for reminders (a `user` fact tagged `reminder`), `schedule/scripts/workspace.mjs` to open workspaces, and `schedule/scripts/lib/paseo.mjs` for `paseo ls`, `logs`, `send` and `permit` to watch and answer agents.
- `payload-files.json`: `daily` in `core.skillDirs`; `.claude/skills/daily/team.md` and `.claude/skills/daily/people` in `core.exclude`. `payload-manifest.md` says the install owns them.
- New wiki page `wiki/development/daily.md`, linked from the development hub.
- `areas.json` gains `daily-routine`; `CHANGELOG.md` gets a minor entry.

## Decision log

- **2026-10-15** — Asked where each person's own steps are kept → chose inside the daily skill, in subfolders.
- **2026-10-15** — Asked where the first version is built → chose WongStack, for every install; WongOS moves Matt's daily onto it after its next sync.
- **2026-10-15** — Asked whether a step opens its own workspace → chose only where the app supports it, else the same chat.
- **2026-10-15** — Assumed: a step is one plain line, with its days in words, not a settings file like WongOS's, because people edit it by saying what they want and the assistant reads words well.
- **2026-10-15** — Assumed: anyone may change their own steps and the owner reviews the team's, both through the usual save, because every repo edit already goes through it.
- **2026-10-15** — Assumed: no timer at first, because WongOS chose "you start it" and the usual routine offer covers a morning run.
- **2026-10-21** — Asked how the chief of staff relates to the parked /daily → chose to grow /daily into it: one chat that starts the day, then stays on watching its agents.
- **2026-10-21** — Asked what the chief may answer on its own → chose obvious picks for safe steps only; anything that sends, pays, publishes or deletes goes to a one-tap approval list.
- **2026-10-21** — Asked which chats the chief looks after → chose only the ones it started or the person hands it.
- **2026-10-21** — Assumed: it watches for up to 10 hours, because WongOS's watcher uses that limit and a workday fits in it.
- **2026-10-21** — Assumed: *needs you* goes to the chat plus a phone notification where the app sends them, because the person may be away from the screen and a missed escalation stalls the work.
- **2026-10-21** — Assumed: a deterministic watcher with no model notices stops and the chief's model only judges each one, because polling with the model burns turns all day for nothing (the knowledge center's [deterministic-first principle](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai)).
- **2026-10-21** — Assumed: when unsure, the chief escalates, and after 5 replies in a row to one agent with no word from the person it escalates too, because a wrong *keep going* loops quietly while a wrong escalation costs one tap.
- **2026-10-21** — Asked on the review page to cover repeating jobs (daily to monthly), saved reminders checked at each start, and a tailored daily for each person → added saved reminders and the start-of-day check; repeating jobs and each person's own daily were already planned, and the Why now says so.
- **2026-10-21** — Assumed: a reminder is a private memory fact (type `user`, tag `reminder`, body starting `Reminder for YYYY-MM-DD:`), not a line in the person's steps file, because it saves at once with no edit to publish, teammates never see it, and memory never closes it on its own the way it closes a 30-day-old open thread.
- **2026-10-21** — Assumed: the start-of-day check also lists the person's own open threads in memory, newest 5, because "work you left open" is the other stored fact a morning needs.
- **2026-10-21** — Assumed: the chief answers a question card by denying it with the chosen text as the message, because the probe (design decision 13) found Paseo's CLI hides the question that `permit allow --input` keys its answer by, while the agent went on with a denial's message.
- **2026-10-21** — Assumed: WongOS and ClaymooApp move their dailies onto this later, in their own changes after a sync, because their Notion and board steps are their own.
- **2026-10-21** — Assumed: the live run (task 6.2) passed with two throwaway agents: keep going, a safe pick, a risky send held back and answered as not approved, done checked against its file, an unhanded chat refused, the sixth unbroken reply refused, and today's reminder listed while tomorrow's was not; so the change is saved as built, not parked.
- **2026-10-21** — Assumed: archived for publishing at Matthew's *Publish it*; the context budget forced a trim of the payload manifest's install-owns paragraph to fit the daily line, meaning unchanged.
