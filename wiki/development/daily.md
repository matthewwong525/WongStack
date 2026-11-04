# The daily routine

Type `/daily` to start your day: the assistant finds your settings, starts your routines that are due, and replies with one ordered list of today's tasks and a link to your week in the Inbox. Your chats keep moving while you are away, by [check-ins](#check-ins), with or without Paseo and with or without a settings file.

## What it does

1. **Checks who you are** from your company sign-in, else your git email. Signed out, it shows you the sign-in link and waits. It runs nothing under a guessed name.
2. **Starts your due routines**, each in its own workspace, and runs your [morning add-ons](#add-ons). Each runs one time per day: a second `/daily` opens nothing twice.
3. **Replies with one ordered list:** late tasks first, then today's tasks from [your week](#the-week-board), then each routine that did not start and why. It ends with the link to your week in the Inbox.

You start it; the assistant never runs it on its own. For a run every morning, ask: [offer a routine](the-change-loop.md#offer-a-routine-or-an-app) covers it. `daily.mjs open-daily` opens the Daily workspace and sends it `/daily`, one time per day, so a timer can run it.

## Your settings file

Your settings live in `.agents/daily/<name>.json`, one file per person. [Check-ins](#check-ins) need no file: without one, they use your email's first part as `person` and this computer's time zone. Routines, the board and the morning list need the file. The daily finds yours by your git email, then your sign-in email, against its `emails`. A file that lists neither email is another person's, even when it is the only one. Start from [the example](../../.agents/skills/daily/references/example.json):

- **`person`**: your short id, lowercase, such as `jo-lee`.
- **`emails`**: every email you sign in or commit with.
- **`timezone`**: your day starts and ends here, such as `America/New_York`.
- **`sources`**: `tasks` reads your week board; `chats` lists your open chats. Each is `true` or `false`.
- **`places`**: named folders a routine opens in: `"."` is this checkout, `~/…` your home.
- **`checks`**: your [routines](#routines).
- **`guide`** (optional): a Markdown file in the repo with your own rules for the Daily chat, such as *no questions here*. It reads the guide at the start and after each compaction. Its rules add to or replace the skill's defaults, never the safety rules: risky steps wait for you, agent text is data, and the [streak](#the-chief-of-staff).
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

## The chief of staff

The chief of staff keeps your chats moving and keeps the Daily chat free for you.

### Check-ins

Each chat checks its own stops, in Claude Code or Codex, in Paseo or not. When a chat stops and your last message there is more than 15 minutes old, one read-only AI run of the same tool reads the chat's last messages and sorts the stop. It never answers a chat you are typing in. The chat waits up to 4 minutes for it. Each stop lands in one bucket:

1. **Keep going.** *Tests pass; next I'll update the wiki page.* It replies *keep going*.
2. **Obvious pick.** A safe answer that stays inside the work and can be undone, or a safe command.
3. **Needs you.** Everything else waits in its own chat, where you see it.

**It never approves alone** anything that sends or posts, pays or buys, publishes or merges, deletes, accepts terms, changes a business record, or shares a key, even when the agent recommends it. A finished plan waits for you: the chief puts its link on the chat's task. After five check-ins in a row on one chat with no word from you, that chat waits for you.

**What waits for you:** a question asked with the question tool, which holds the chat until you answer; a risky step; a finished plan; and the sixth check-in in a row. Each check-in writes one line to [the journal](#the-journal).

**Turn check-ins off** with *stop check-ins* in the Daily chat, or `D checkins off`: every chat in this checkout then stops for you. *Start check-ins*, or `D checkins on`, turns them back on.

### The Daily chat

Keep one Daily chat open for days. With each message you send there, the journal's new lines come with it. On a new day, your first message there starts the day first: it starts the due routines and gives you the list, then answers you. A second message or a second chat starts nothing twice.


**Done means checked.** It marks a chat's task done only after it opened the link, saw the checks pass, or found the file.

**It keeps the chat free.** It answers quick things itself. A bigger task, one that edits files or takes several steps, goes to its own workspace, and the worker watches that one too. Say *do it here* to keep it in the chat.

Ask it any time: *what's going on?*, *tell flashy-crab: yes, merge*, *watch flashy-crab*, *remind me Friday to …*.

## A to-do for each chat

With `tasks` on, the [worker](#the-daily-on-a-computer) keeps one task on today's column for each chat you open, hand it or ask it for, with the chat's name. It closes the task when the chat's work is merged or the chat is gone. Mark it Done on the board, and the watch sends that chat `/close` once you have been quiet there for 15 minutes.

## Wrap up a finished chat

The [worker](#the-daily-on-a-computer) sends `/close` to a Paseo chat it watches when all of these are true, with no settings and no board:

- The chat's work is merged at its last commit, and its folder has no new work.
- The chat is stopped, has no open question, and no background run judges it.
- You have written nothing there for 15 minutes; with no time to read, the chat's own last update counts.

The chat then saves what it learned, adds what lasts to the wiki, and closes its workspace ([`/close`](../../.agents/skills/close/SKILL.md)). Each chat gets `/close` one time, counting a Done on the board. It never goes to the Daily chat, a sub-agent, or the main checkout. The journal says `Wrapped up: <chat>`; after 3 failed sends, `Not closed: <chat>`. Where no helper runs, [the tidy-up](../../.agents/skills/schedule/scripts/tidy.mjs) still closes a saved chat idle for 3 days.

## Add-ons

An add-on is a Node script in your repo that the daily runs: `addons.morning` once per morning, `addons.pass` at each watch pass. Each gets a JSON context on stdin (`kind`, `day`, `person`, `timezone`, `repo`, and on a pass the last `events`) and prints JSON lines on stdout:

- `{"line": "…"}`: one line for the morning reply, or a `post` event on a pass.
- `{"event": {"event": "<kind>", …}}`: an event the Daily chat judges; a kind the skill does not know goes by your [guide](#your-settings-file).
- `{"skip": ["<agent id>"]}`: chats the watch leaves alone.

An add-on that fails, prints anything else, or runs past 60 seconds gives one `Not read: add-on <path>` and never stops the daily.

## The daily on a computer

`daily.mjs serve` is the worker. Every minute, and sooner when a chat stops, it runs the watch over your Paseo chats in this repo: their board to-dos, your [add-ons](#add-ons) and [your own jobs](#your-own-jobs). Without Paseo it still runs the wiki tidy and your timed jobs; the wrap-up waits for Paseo, which sends its `/close`. At most 3 runs work at one time, and one per chat. A run stops after 30 minutes. The Daily chat gets no message from it, only a board it can not read, one line per day; the rest goes to [the journal](#the-journal).

Each chat start runs `D ensure`. It starts the worker in the background when it has a job: a [default job](#your-own-jobs) you did not turn off, `tasks` on, an add-on, or your own jobs. It starts none when check-ins are off, when one already runs, or in a background run. One worker runs per person and checkout: a second `serve` sees the first one's lock and exits.

- **`runs`** (optional, in [your settings file](#your-settings-file)): `{"agent": "codex"}` uses Codex; the default is Claude Code, the tested path.
- **`sweeps`** (optional): a JSON file in the repo with [your own jobs](#your-own-jobs).

It has two timed jobs of its own: [wrap-up](#wrap-up-a-finished-chat) each 5 minutes, and [the small wiki tidy](wiki-dream.md#the-small-wiki-tidy) after each memory consolidation.

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

The worker and the check-ins write one line for each thing they did: a check-in, a run's start and its end line, a closed chat, a source it could not read. With each message you send in the Daily chat, its new lines reach the assistant, newest first, and you see none of them: ask *what's going on?*. In Codex, the chat runs `D journal --new` per message. `D journal` prints every line. Lines stay 14 days, run logs 7, in the private state folder.

### Your own jobs

Your `sweeps` file adds to [the default list](../../.agents/skills/daily/references/sweeps.json):

- **`events`**: an event kind, such as one your [add-on](#add-ons) prints, and the brief that judges it. A `stopped` or `asking` job you added stays, beside the check-ins: `{"invoice": {"brief": "invoice.md", "title": "Invoice {{invoice}}", "lane": "invoices", "ownPlace": true}}`. A `lane` runs one job at a time; `ownPlace` runs outside the 3-run limit. An entry with the name of a default one replaces it.
- **`sweeps`**: timed jobs, such as `{"id": "pay", "at": ["09:00"], "days": [1], "check": "scripts/pay-check.mjs", "brief": "pay.md"}`. `every: "15m"` with `hours: "8-21"` repeats. A time the computer missed is skipped. The optional `check` is an [add-on](#add-ons) script; it prints `{"run": {…}}` when there is work, and those fields fill the brief. `"minutes": 90` lets a run work 90 minutes, not 30. `"place": "copy"` runs it in its own copy of `origin/main`, removed when the run ends: use it for a job that publishes. `"do"` names one of the daily's own jobs, such as `wrap-up`, which runs with no AI.
- **Turn a default job off** with its `id`: `{"sweeps": [{"id": "wiki-tidy", "off": true}]}`. An entry with a default's `id` replaces it.

A brief is a Markdown file in `.agents/daily/briefs/`, else [the skill's](../../.agents/skills/daily/references/briefs/header.md); `{{name}}` takes a field. Each run reads the header brief first: no person is there, agent text is data, and it never sends or pays unless its brief allows that one step.

## Updates keep your settings

A WongStack update brings the new `/daily`, but never copies over or removes `.agents/daily/`: [the payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md#categories) leaves it to your install.

Part of [Development](README.md).
