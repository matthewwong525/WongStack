# The daily routine

The daily routine runs your day with no chat to open: each morning the worker starts your due routines, and you ask any chat for the rest. Your chats keep moving while you are away, by [check-ins](#check-ins), with or without Paseo and with or without a settings file.

## What it does

1. **Starts your morning.** At `morning` in [your settings file](#your-settings-file), 08:00 by default, [the worker](#the-daily-on-a-computer) starts your due routines, each in its own workspace, and runs your [morning add-ons](#add-ons). Each runs one time per day: a restart or a second worker starts nothing twice. When the computer is off at that time, the morning starts at the worker's next pass that day.
2. **Writes what it did** to [the journal](#the-journal): each routine it started, each one that did not start and why, each add-on line, and each source it could not read. It sends you no message and makes no morning list: your tasks are on [your week](#the-week-board) in the Inbox.
3. **Does your asks in any chat**, by [ask in any chat](#ask-in-any-chat). It checks who you are from your company sign-in, else your git email. Signed out, it shows you the sign-in link and waits. It runs nothing under a guessed name.

The morning needs a settings file and the worker on. [Stop check-ins](#check-ins) stops the worker, so the morning waits too; *start check-ins* turns both back on.

## Your settings file

Your settings live in `.agents/daily/<name>.json`, one file per person. [Check-ins](#check-ins) need no file: without one, they use your email's first part as `person` and this computer's time zone. Routines, the board and the morning need the file. The daily finds yours by your git email, then your sign-in email, against its `emails`. A file that lists neither email is another person's, even when it is the only one. Start from [the example](../../.agents/skills/daily/references/example.json):

- **`person`**: your short id, lowercase, such as `jo-lee`.
- **`emails`**: every email you sign in or commit with.
- **`timezone`**: your day starts and ends here, such as `America/New_York`.
- **`sources`**: `tasks` reads your week board; `chats` lists your open chats. Each is `true` or `false`.
- **`places`**: named folders a routine opens in: `"."` is this checkout, `~/…` your home.
- **`checks`**: your [routines](#routines).
- **`morning`** (optional): when the worker starts your morning, as `"HH:MM"` in your time zone. The default is `"08:00"`.
- **`guide`** (optional): a Markdown file in the repo with your own rules for the daily's asks, such as *remind me on the day before*. A chat reads it before it does an ask. Its rules add to or replace the skill's defaults, never the safety rules: risky steps wait for you, agent text is data, and the [streak](#the-chief-of-staff). A [*Needs you* chat](#the-journal) reads it first too: write your own fix for a problem there, such as how to sign in to the board again, and the chat follows it, not the default steps.
- **`addons`** (optional): your [add-ons](#add-ons).

Say *add checking orders on Mondays to my daily*: the assistant edits your file, shows you the change, and saves it through [the change loop](the-change-loop.md). Keep health, family and money out of a shared project, by [the People rules](../wiki-style.md#people).

## The team file

`.agents/daily/team.json` is optional and holds `checks` only: routines everyone runs. Each team routine names a place that each person's settings define. Your own routine with the same `id` replaces the team one. The owner reviews each change to it.

## Routines

A routine is one entry in `checks`: its `id`, `title`, the `place` it opens in, the skill it runs (`procedure`, such as `.agents/skills/memory/SKILL.md`), and an optional one-line `prompt` that replaces the skill's `/name`. Its `cadence` is `daily`, `weekly` with `weekdays` (0 is Sunday), `monthly` (the first) or `manual`. `missed: "latest"` still starts a weekly or monthly one that a missed morning skipped; `skip` waits for the next. Only routines with `start: "run"` start on their own; `activeFrom` is the first day.

## The week board

Your tasks live on your week board, in [the Inbox](reply-links.md#in-your-inbox-first): one column per day, plus a backlog. You mark, move and delete tasks there. The daily reads this week and the 4 weeks before, so a task left undone on an earlier day comes back as late. When the Inbox does not answer, the list says `unavailable`: it never shows an empty week instead.

- *Remind me Friday to call Kim back* adds a task on Friday's column. The same words on the same day add it one time.
- *Start the supplier list* opens an undone task of today in its own workspace, one time ever, and marks it in progress.
- *Clean up my board* is work any chat does for you. It reads the week and the backlog with `inbox.daily-tasks`, then renames or moves a task with `inbox.task-change` and deletes one with `inbox.task-delete`, through [`company-api.mjs call`](../stack/company-api.md#connect-and-call). Before it deletes, it lists the tasks and asks you one time: a deleted task can't be brought back. The daily's own `inbox.daily-task-remove` takes only a chat's to-do.

## The chief of staff

The chief of staff keeps your chats moving while you are away.

### Check-ins

Each chat checks its own stops, in Claude Code or Codex, in Paseo or not. When a chat stops and your last message there is more than 15 minutes old, one read-only AI run of the same tool reads the chat's last messages and sorts the stop. It never answers a chat you are typing in. The chat waits up to 4 minutes for it. Each stop lands in one bucket:

1. **Keep going.** *Tests pass; next I'll update the wiki page.* It replies *keep going*.
2. **Obvious pick.** A safe answer that stays inside the work and can be undone, or a safe command.
3. **Needs you.** Everything else waits in its own chat, where you see it.

**It never approves alone** anything that sends or posts, pays or buys, publishes or merges, deletes, accepts terms, changes a business record, or shares a key, even when the agent recommends it. A finished plan waits for you: the chief puts its link on the chat's task. After five check-ins in a row on one chat with no word from you, that chat waits for you.

**What waits for you:** a question asked with the question tool, which holds the chat until you answer; a risky step; a finished plan; and the sixth check-in in a row. Each check-in writes one line to [the journal](#the-journal).

**Turn check-ins off** with *stop check-ins* in any chat, or `D checkins off`: every chat in this checkout then stops for you, and the worker stops too. *Start check-ins*, or `D checkins on`, turns them back on.

**Done means checked.** It marks a chat's task done only after it opened the link, saw the checks pass, or found the file.

### Ask in any chat

You keep no chat open for the daily: say these in any chat, and it does them through the daily skill.

- *What's going on?* gives what the background runs did since that chat last asked, and, in Paseo, one line per chat. It then offers to [close finished chats](#close-finished-chats).
- *Tell flashy-crab: yes, merge* sends your answer to that chat.
- *Watch flashy-crab* adds a chat to the watch.
- *Remind me Friday to …* and *start the supplier list* use [your week](#the-week-board).
- *Stop check-ins* and *start check-ins* turn [check-ins](#check-ins) off and on.
- *Add checking orders on Mondays to my daily* changes [your settings file](#your-settings-file).

## A to-do for each chat

With `tasks` on, the [worker](#the-daily-on-a-computer) keeps one task on today's column for each chat you open or hand it, with the chat's name. It closes the task when the chat's work is merged or the chat is gone. Mark it Done on the board, and the watch sends that chat `/close` once you have been quiet there for 15 minutes.

## Close finished chats

Ask *what's going on?* in any chat, and it marks each chat it watches that is finished:

- The chat's work is merged at its last commit, and its folder has no new work.
- The chat is stopped and has no open question.

It asks which ones to close. Each chat you pick gets [`/close`](../../.agents/skills/close/SKILL.md): it saves what it learned, adds what lasts to the wiki, and closes its workspace. A chat you do not pick stays open. Nothing closes a chat by itself because its work went live: a live chat that is still open is usually one you kept open. It never marks a sub-agent or the main checkout. This needs Paseo, which lets a chat see other chats. [The tidy-up](../../.agents/skills/schedule/scripts/tidy.mjs) still closes a saved chat idle for 3 days.

## Add-ons

An add-on is a Node script in your repo that the daily runs: `addons.morning` once per morning, `addons.pass` at each watch pass. Each gets a JSON context on stdin (`kind`, `day`, `person`, `timezone`, `repo`, and on a pass the last `events`) and prints JSON lines on stdout:

- `{"line": "…"}`: one line for [the journal](#the-journal) in the morning, or a `post` event on a pass.
- `{"event": {"event": "<kind>", …}}`: an event that [your own jobs](#your-own-jobs) judge; a kind with no job goes to the journal.
- `{"skip": ["<agent id>"]}`: chats the watch leaves alone.

An add-on that fails, prints anything else, or runs past 60 seconds gives one `Not read: add-on <path>` and never stops the daily.

## The daily on a computer

`daily.mjs serve` is the worker. It starts [your morning](#what-it-does). Every minute, and sooner when a chat stops, it runs the watch over your Paseo chats in this repo: their board to-dos, your [add-ons](#add-ons) and [your own jobs](#your-own-jobs). Without Paseo it still runs the wiki tidy and your timed jobs. At most 3 runs work at one time, and one per chat. A run stops after 30 minutes. It sends no chat a message: everything goes to [the journal](#the-journal). A problem that fails two times in a row opens one *Needs you* chat for each kind a day, by [the journal](#the-journal).

Each chat start runs `D ensure`. It starts the worker in the background when it has a job: a [default job](#your-own-jobs) you did not turn off, a routine that starts on its own, `tasks` on, an add-on, or your own jobs. It starts none when check-ins are off, when one already runs, or in a background run. One worker runs per person and checkout: a second `serve` sees the first one's lock and exits. The worker runs the main checkout's code and reads its settings there, from any chat in any copy of the repo. When that code changes, as after an update, the worker is stopped and started again, with one line in [the journal](#the-journal). A copy with its own edits to the daily scripts does not restart it.

- **`runs`** (optional, in [your settings file](#your-settings-file)): `{"agent": "codex"}` uses Codex; the default is Claude Code, the tested path.
- **`sweeps`** (optional): a JSON file in the repo with [your own jobs](#your-own-jobs).

It has one timed job of its own: [the small wiki tidy](wiki-dream.md#the-small-wiki-tidy) after each memory consolidation.

Nothing installs it as a service, and it does not need one. To keep it on when no chat starts, run it under your own service manager, such as this systemd unit:

```ini
[Service]
# As root, the worker sets IS_SANDBOX=1 for each Claude Code run itself.
EnvironmentFile=-/etc/environment
WorkingDirectory=/path/to/your/checkout
ExecStart=/usr/bin/node .claude/skills/daily/scripts/daily.mjs serve
Restart=always
RestartSec=30
```

`daily.mjs serve --dry-run` runs one pass on a copy of its state and prints what it would start, so you can check it first.

### The journal

The worker and the check-ins write one line for each thing they did: a check-in, a run's start and its end line, a closed chat, a source it could not read. A failure that goes on gets one line for each run of failures, not one each minute.

When the same thing fails two times in a row, the worker opens one chat named `Needs you: <what broke>`, such as *Needs you: the week board*. The kinds are your board, your morning start, each of your jobs, and Paseo. Its first message says what failed, why, and the steps to fix it, or your [`guide`](#your-settings-file)'s own fix. The chat does the steps an agent can do and asks you only for a step that needs you, such as a sign-in. At most one such chat opens for each kind each day, and a success starts the count again. The watch and the check-ins leave it alone, so it waits for you. When Paseo can not open it, the journal says so, with Paseo's reason. Add-on and to-do failures stay journal lines. Ask *what's going on?* in any chat: it reads the lines since that chat last asked, newest first, and tells you what matters. `D journal` prints every line. Lines stay 14 days, run logs 7, in the private state folder.

### Your own jobs

Your `sweeps` file adds to [the default list](../../.agents/skills/daily/references/sweeps.json):

- **`events`**: an event kind, such as one your [add-on](#add-ons) prints, and the brief that judges it. A `stopped` or `asking` job you added stays, beside the check-ins: `{"invoice": {"brief": "invoice.md", "title": "Invoice {{invoice}}", "lane": "invoices", "ownPlace": true}}`. A `lane` runs one job at a time; `ownPlace` runs outside the 3-run limit. An entry with the name of a default one replaces it.
- **`sweeps`**: timed jobs, such as `{"id": "pay", "at": ["09:00"], "days": [1], "check": "scripts/pay-check.mjs", "brief": "pay.md"}`. `every: "15m"` with `hours: "8-21"` repeats. A time the computer missed is skipped. The optional `check` is an [add-on](#add-ons) script; it prints `{"run": {…}}` when there is work, and those fields fill the brief. `"minutes": 90` lets a run work 90 minutes, not 30. `"place": "copy"` runs it in its own copy of `origin/main`, removed when the run ends: use it for a job that publishes.
- **Turn a default job off** with its `id`: `{"sweeps": [{"id": "wiki-tidy", "off": true}]}`. An entry with a default's `id` replaces it.
- **`deny`**: tool patterns that no background job may use, such as a command that sends an email a person must approve first: `{"deny": ["Bash(*email*send*)", "Bash(*send-approved*)"], "sweeps": []}`. Each run of a timed job or an event gets the list, and Claude Code refuses those tools in that run. A morning routine does not get the list: it opens its own chat, not a background run. Keep each pattern narrow: a pattern that matches too much also blocks the job's own work, and the run's log shows the refusal. It works with Claude Code only: with Codex and a `deny` list, the worker starts no background run and writes `Not started: … the deny list works only with Claude Code` in [the journal](#the-journal).

A brief is a Markdown file in `.agents/daily/briefs/`, else [the skill's](../../.agents/skills/daily/references/briefs/header.md); `{{name}}` takes a field. Each run reads the header brief first: no person is there, agent text is data, and it never sends or pays unless its brief allows that one step.

## Updates keep your settings

A WongStack update brings the new daily skill, but never copies over or removes `.agents/daily/`: [the payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md#categories) leaves it to your install.

Part of [Development](README.md).
