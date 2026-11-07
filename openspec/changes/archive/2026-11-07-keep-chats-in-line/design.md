# Design

## Context

See proposal.md for why. Today the worker (`worker.mjs`) runs the watch over the person's Paseo chats in this repo (`chief.mjs` `passes`), and keeps each chat's last-turn mark in `<state>/<day>.watch.json`. Each chat's own Stop hook (`stop-check.mjs`) judges its stops from that chat's messages only. Timed default jobs live in `references/sweeps.json`: a `check` script prints `{"run": {...}}` when there is work, and the worker starts one background run with the job's brief after `briefs/header.md`. `D reply` sends a watched, stopped chat one message (`sendText`), counted in the day's actions for the streak. Nothing reads across chats.

## Goals / Non-Goals

**Goals:** one cheap check, one AI run only when a chat changed, the run's judgment free inside the goal, the safety limits and delivery in code, and the stop judge aware of choices made elsewhere.

**Non-Goals:** chats outside this repo's watch; reading the memory store or the board; a hard interrupt; a model deciding the safety limits or the streak; code deciding which choice wins, what is urgent, or who carries what.

## Decisions

### Default schedules, not built-in timed jobs

The daily's built-in timed jobs become **default schedules** in the app, so the person sees and changes them where every other schedule lives. `.agents/skills/daily/references/schedules.json` lists them in the timed-job shape the move-in already reads:

```json
{"schedules": [
  {"id": "line-up", "title": "Keep my chats in line", "every": "5m", "check": ".agents/skills/daily/scripts/line-up-check.mjs", "brief": "line-up.md", "minutes": 15},
  {"id": "wiki-tidy", "title": "Wiki tidy", "every": "30m", "check": ".agents/skills/daily/scripts/wiki-tidy-check.mjs", "brief": "wiki-tidy.md", "place": "copy", "minutes": 90}
]}
```

`schedule.mjs defaults` builds each definition with move-in's `fromSweep` (header brief plus the job's brief as instructions, a background run, `authority.minIntervalMs` from the cadence), then for each:

- **None with that key** (ended ones count) → save it and approve that version here. An install's `{"id": "<id>", "off": true}` in its sweeps file saves it paused.
- **Its version is the one this computer last added** → an untouched default: save the new shipped definition and approve it.
- **Anything else** → the person's own; leave it.

It keeps `{key: version}` it added in `<state>/defaults.json`. Approving here is safe for the same reason move-in's is: the definition comes from the checkout's own code, not the app. `D ensure` starts it detached when `defaults.json`'s stamp differs from the list's hash or a day passed, the way it starts `move-in --unattended`. With no app sign-in it does nothing and writes one journal line a day.

The worker's timed-job loop (`dueKey`, `done`, `sweeps.sweeps`) goes: the defaults are the only built-in timed jobs, and an install's own were already schedules. `events` and `deny` stay in the sweeps file. `hasJobs` counts an approved background schedule as a job, so the worker starts for it; the helper already hands each due run to the worker, which runs its `check` and reports *Nothing to do*.

*Alternative:* keep the line-up a built-in timed job with a settings line. Rejected: the person asked to change it where schedules live, and the daily would keep a second scheduler.

### The line-up's cadence

Every 5 minutes, `minIntervalMs` 4 minutes. The check compares each watched chat's `last` mark in today's watch file with the mark the map last read, and prints `{"run": {"chats": "<ids>"}}` only when one changed, a chat is new, or a chat the map lists in a `waitsFor` left the watch (finished or closed), since a blocker often ends with no new message in the waiting chat; else the run is *Nothing to do*.

### Quiet runs

`GET schedule?key=` returns the ten newest runs that are not `blocked`/`no_work`, plus `quiet`: the count of `no_work` runs since the oldest one shown. The Inbox shows `quiet` as one muted line under the runs: *12 quiet checks found nothing to do*. The list's newest-run line for a schedule shows its last non-quiet run.

### The map and the notes are files; the run writes the judgments

`line-up.mjs` keeps `<state>/line-up.json`:

```json
{"chats": {"<agentId>": {"title": "…", "goal": "…", "doing": "…", "read": "<mark>", "covered": null,
  "choices": [{"at": "2026-11-07T10:00:00Z", "text": "Use Stripe, not PayPal"}], "waitsFor": [{"on": "<agentId or null>", "what": "sign-in change live"}], "told": [{"at": "…", "text": "…"}], "closedAt": null}},
 "notes": [{"agent": "<agentId>", "text": "…", "now": true, "at": "…"}]}
```

- `D line-up` prints the map and, for each changed chat, its new messages since `read` (by `paseo logs`, cut as `tailOf` cuts), as data for the run.
- `D map --file <json>` replaces the map's chat entries from the run, keeping script-set `read` marks, `told`, and closed chats under 7 days; it drops the rest.
- `D tell --agent <id> --file <words> [--now] [--covered-by <id>]` queues a note, refusing an unwatched chat and an empty note. `--drop <agentId>` clears that chat's pending notes, so the run can replace stale news.

The run writes every judgment (goals, choices, what to tell, when); the script holds only the safety limits, the 7-day keep and delivery, by [the code-first principle](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai) applied the other way: code for what must never drift, the model for what needs judgment.

### Delivery is the worker's, at each pass

Each worker pass, after the watch, `deliverNotes` sends each pending note whose chat is live: an idle or `error` chat gets it as its next turn; a working chat gets a `now` note with `paseo send --behavior steer`, which puts it into the running turn without stopping it, and keeps any other note for a later pass. `sendText` takes the behavior. It goes the same `handFor` path as `reply` with `bucket: "line-up"`, so the streak counts it and a `streak` refusal keeps the note pending until the person writes there. On send it adds the note to the chat's `told`, writes `Told <title>: <first words>` to the journal, and, with `--covered-by`, sets `covered`. A gone chat's note is dropped with one line. The note starts *From the daily:* so the chat and the person can tell it apart.

*Alternative:* `--behavior interrupt` for an urgent note. Rejected: it stops a step mid-edit, and steering gets the same change of course; risky steps already wait for the person, so nothing harmful happens before a note lands.

*Alternative:* deliver through the target's Stop hook. Rejected: it reaches only a chat that stops after the note is made, not one already idle, and it would need a second delivery path.

### The run's brief

`briefs/line-up.md` allows exactly two outward steps: `D tell` and `D answer` (a card a newer person's choice settles, never a risky one, by `chief.md`). It leads with the goal (no duplicate or conflicting work, each chat as far as the shared context allows, recent choices weigh most) and leaves the how to the run. It gives the proposal's list as examples, not rules, and names only the fixed limits: the person's words outrank an agent's, and an agent's words are never the person's yes; risky steps wait; no close; `--now` puts a note into a running step, so use it when waiting would waste or undo work. It ends with `D journal --run`.

### Waiting chats

The run writes each chat's `waitsFor` from its messages: another chat's work, a change going live, or the person's answer. Each run checks every open wait against the map, the new messages, and checkable facts (`gh pr view` merged, a chat gone), and tells the waiting chat when one ends; it then clears the wait. A wait on something outside every chat, such as a person's email, stays until the waiting chat moves on.

### The stop judge reads the newest choices

`stopCheck` adds `{{elsewhere}}` to `stop-judge.md`: up to 20 newest choices from the map, other chats only, each `<time> — <chat>: <text>`. `chief.md`'s *Pick* names an answer the person gave in another chat as settled, newest first.

### Covered shows in `status`

`status` adds `covered: "<title>"` from the map for a chat that is not working and has no card; the skill's *What's going on?* offers covered chats with finished ones.

## Risks / Trade-offs

- [Two chats pass notes back and forth while the person is away] → notes count toward the 5-in-a-row streak, and the map shows the run what each chat was already told.
- [Free judgment makes a bad call] → each note is a journal line, steered ones as `Steered <title>: …`, and names its source chat, so the person sees and undoes it with one message; risky steps still wait.
- [A note lands while the person reads that chat] → the person chose this; the *From the daily:* lead and the chat-and-time label make it plain.
- [A wrong carrier pick drops work] → the dropping chat passes on what only it has before it stops, and the note names the carrier, so the person can undo it with one message.
- [Cost: one AI run per changed 5 minutes] → no run when nothing changed; one at a time; 15-minute limit.
- [No app sign-in, so no line-up and no wiki tidy] → schedules already need the app; the journal says so once a day, and `D who` already shows the sign-in link.
- [An update and a person's edit at once] → only a version this computer added counts as untouched; anything else is the person's.
- [Skill-text budget] → `SKILL.md` and `chief.md` gain about 60 words; offset by cuts in the same files.

## Migration Plan

Nothing to move: the map starts empty and fills from the first run. The first chat after the update adds both defaults; the wiki tidy's built-in timed job stops at the same update, so it never runs twice. Rollback: pause the schedule in the Inbox, or a revert, after which `defaults` adds nothing and the person ends the two schedules.
