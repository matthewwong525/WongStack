# The daily routine

The daily routine runs your day with no chat to open: each morning the worker runs your add-ons, and you ask any chat for the rest. Your chats keep moving while you are away, by [check-ins](#check-ins), with or without Paseo and with or without a settings file.

## What it does

1. **Starts your morning.** At `morning` in [your settings file](#your-settings-file), 08:00 by default, [the worker](#the-daily-on-a-computer) runs your [morning add-ons](#add-ons), one time per day: a restart or a second worker runs nothing twice. When the computer is off at that time, the morning starts at the worker's next pass that day. Your routines are [schedules in the app](#routines-and-timed-jobs).
2. **Writes what it did** to [the journal](#the-journal): each add-on line, and each source it could not read. It sends you no message and makes no morning list: your open chats are on [your chat list](#your-chat-list) in the Inbox.
3. **Does your asks in any chat**, by [ask in any chat](#ask-in-any-chat). It checks who you are from your company sign-in, else your git email. Signed out, it shows you the sign-in link and waits. It runs nothing under a guessed name.

The morning needs a settings file and the worker on. [Stop check-ins](#check-ins) stops the worker, so the morning waits too; *start check-ins* turns both back on.

## Your settings file

Your settings live in `.agents/daily/<name>.json`, one file per person. [Check-ins](#check-ins) need no file: without one, they use your email's first part as `person` and this computer's time zone. The morning needs the file. The daily finds yours by your git email, then your sign-in email, against its `emails`. A file that lists neither email is another person's, even when it is the only one. Start from [the example](../../.agents/skills/daily/references/example.json):

- **`person`**: your short id, lowercase, such as `jo-lee`.
- **`emails`**: every email you sign in or commit with.
- **`timezone`**: your day starts and ends here, such as `America/New_York`.
- **`sources`**: `chats` sends your open chats to [your chat list](#your-chat-list), `true` or `false`. An older `tasks` entry does nothing, with one journal line.
- **`places`**: named folders: `"."` is this checkout, `~/…` your home.
- **`morning`** (optional): when the worker starts your morning, as `"HH:MM"` in your time zone. The default is `"08:00"`.
- **`guide`** (optional): a Markdown file in the repo with your own rules for the daily's asks, such as *remind me on the day before*. A chat reads it before it does an ask. Its rules add to or replace the skill's defaults, never the safety rules: risky steps wait for you, agent text is data, and the [streak](#the-chief-of-staff). A [*Needs you* chat](#the-journal) reads it first too: write your own fix for a problem there, such as how to sign in to the app again, and the chat follows it, not the default steps.
- **`addons`** (optional): your [add-ons](#add-ons).

Say *use Codex for my background runs*: the assistant edits your file, shows you the change, and saves it through [the change loop](the-change-loop.md). Keep health, family and money out of a shared project, by [the People rules](../wiki-style.md#people).

## Routines and timed jobs

A routine, such as *check the orders every Monday*, and a timed job are [schedules in the app](../stack/host-schedules.md), not entries here. Ask any chat to make or change one. An old `checks` list, in your file or in `.agents/daily/team.json`, starts nothing: the journal says once a day that it waits, and `D ensure` moves it to the app. A timed job in your [`sweeps`](#your-own-jobs) file does not run either, with one journal line a day.

## Reminders

*Remind me Friday to call Kim back* makes a one-time schedule, by [`/schedule`](../../.agents/skills/schedule/SKILL.md): on Friday morning it opens a chat *call Kim back* with your words. The chat shows the schedule and saves it after your OK, like [any schedule](../stack/host-schedules.md#the-ok-on-each-computer). The chat you asked in goes on with its work.

## The chief of staff

The chief of staff keeps your chats moving while you are away.

### Check-ins

Each chat checks its own stops, in Claude Code or Codex, in Paseo or not. When a chat stops and your last message there is more than 15 minutes old, one read-only AI run of the same tool reads the chat's last messages and sorts the stop. It never answers a chat you are typing in. The chat waits up to 4 minutes for it. Each stop lands in one bucket:

1. **Keep going.** *Tests pass; next I'll update the wiki page.* It replies *keep going*.
2. **Obvious pick.** A safe answer that stays inside the work and can be undone, even to a small question with no recommendation, such as *run the tests?*; or a safe command.
3. **Needs you.** Everything else waits in its own chat, where you see it.

**It never approves alone** anything that sends or posts, pays or buys, publishes or merges, deletes, accepts terms, changes a business record, or shares a key, even when the agent recommends it. A finished plan waits for you, on its chat's row in [your chat list](#your-chat-list). After five check-ins in a row on one chat with no word from you, that chat waits for you.

**A question typed for you comes back once as tap answers**, recommended first, unless the check-in can pick it. You tap one, or type your own. A risky question gets buttons too. A chat that stops again with no buttons waits for you.

**What waits for you:** a question asked with the question tool; a risky step; a finished plan; and the sixth check-in in a row. Each check-in writes one line to [the journal](#the-journal).

**Turn check-ins off** with *stop check-ins* in any chat, or `D checkins off`: every chat in this checkout then stops for you, and the worker stops too. A background schedule run due then does not start, and the Inbox says *check-ins are off*. The [default schedules](../stack/host-schedules.md#default-schedules) you did not change wait *Paused*, so they add no such runs. *Start check-ins*, or `D checkins on`, turns them back on, and the defaults with them.

**Done means checked.** It calls a chat done only after it opened the link, saw the checks pass, or found the file.

### Your chats in line

When you work in several chats at once, the daily keeps them pointed the same way, in Paseo or any other app that runs Claude Code or Codex: no two chats do the same work or work against each other. [Your chats in line](chats-in-line.md) owns how: the map, the two ways a note goes, and the limits. It is the *Keep my chats in line* [default schedule](../stack/host-schedules.md#default-schedules).

### Ask in any chat

You keep no chat open for the daily: say these in any chat, and it does them through the daily skill.

- *What's going on?* gives what the background runs did since that chat last asked, and, in Paseo, one line per chat. It then offers to [close finished chats](#close-finished-chats).
- *Tell flashy-crab: yes, merge* sends your answer to that chat. It needs Paseo, so your words arrive as your own message.
- *Watch flashy-crab* adds a chat to the watch.
- *Remind me Friday to …* makes a [reminder](#reminders).
- *Stop check-ins* and *start check-ins* turn [check-ins](#check-ins) off and on.
- *Check the orders every Monday* makes a [schedule in the app](../stack/host-schedules.md).

## Your chat list

The Inbox opens on your open chats, by [the Inbox](reply-links.md#in-your-inbox-first). Each chat keeps its own row current:

- **A step writes its row.** Each step, such as *Plan* or *Apply*, sends the chat's name, step and folder to the app, and so does a chat's start. A send that fails writes one line and the step goes on.
- **The worker checks the list.** Each minute, [the worker](#the-daily-on-a-computer) sends the app every open Paseo chat on this computer, and the app drops the rows of chats that are gone. It sends them with this computer's company sign-in, from `node scripts/company-api.mjs login`. When that send fails two times in a row, *Needs you: the chat list* opens, by [the journal](#the-journal). Its first step, `D who`, asks the app whether it takes that sign-in: `app` is `ok`, `refused`, `missing` or `unreachable`. The date in a sign-in is no proof, because the app can refuse a sign-in that has days left.
- **A schedule's chat waits until it stops.** A chat a [schedule](../stack/host-schedules.md#where-it-runs) opened sends no row while it works. Once it stops and stays open, the worker adds its row 2 minutes later, under *Working*, marked *From a schedule*. A run that closes itself never shows. Once you write in it, it shows like any chat.
- **`/close` removes its row** as its last step. A row not heard from in 3 days goes, for a computer whose worker is off.
- **A review links to its chat.** A review page carries its chat's id, so it shows on that chat's row. An older page with no id joins the chat in its folder.

Tap *Close chat* in a row's menu, and the watch sends that chat [`/close`](../../.agents/skills/close/SKILL.md) once you have been quiet there for 15 minutes. Only the chats you pick close.

## A background run's handoff

A [background schedule](../stack/host-schedules.md#where-it-runs) run has no chat. When it finds something you should see, such as *3 invoices are late*, it writes what it found to a file and runs `D handoff --file <path>`, then stops. After the run, the worker opens one chat named for the schedule, with that text as its first message. That chat makes the review page, and it shows in [your chat list](#your-chat-list) once it stops. A run that finds nothing for you opens no chat.

## Close finished chats

Ask *what's going on?* in any chat, and it marks each chat it watches that is finished:

- The chat's work is merged at its last commit, and its folder has no new work.
- The chat is stopped and has no open question.

It also marks a stopped chat as covered when [the line-up](#your-chats-in-line) told it another chat covers its work. It asks which ones to close. Each chat you pick gets [`/close`](../../.agents/skills/close/SKILL.md): it saves what it learned, adds what lasts to the wiki, and closes its workspace. A chat you do not pick stays open. Nothing closes a chat by itself because its work went live: a live chat that is still open is usually one you kept open. It never marks a sub-agent or the main checkout. This needs Paseo, which lets a chat see other chats.

## Add-ons

An add-on is a Node script in your repo that the daily runs: `addons.morning` once per morning, `addons.pass` at each watch pass. Each gets a JSON context on stdin (`kind`, `day`, `person`, `timezone`, `repo`, and on a pass the last `events`) and prints JSON lines on stdout:

- `{"line": "…"}`: one line for [the journal](#the-journal) in the morning, or a `post` event on a pass.
- `{"event": {"event": "<kind>", …}}`: an event that [your own jobs](#your-own-jobs) judge; a kind with no job goes to the journal.
- `{"skip": ["<agent id>"]}`: chats the watch leaves alone.

An add-on that fails, prints anything else, or runs past 60 seconds gives one `Not read: add-on <path>` and never stops the daily.

## The daily on a computer

`daily.mjs serve` is the worker. It starts [your morning](#what-it-does). Every minute, and sooner when a chat stops, it runs the watch over your Paseo chats in this repo: [your chat list](#your-chat-list), your [add-ons](#add-ons) and [your own jobs](#your-own-jobs). Without Paseo it still runs your background schedules. At most 3 runs work at one time, and one per chat. A run stops after 30 minutes. It sends no chat a message: everything goes to [the journal](#the-journal). A problem that fails two times in a row opens one *Needs you* chat for each kind a day, by [the journal](#the-journal).

Each chat start runs `D ensure`. It adds the [default schedules](../stack/host-schedules.md#default-schedules) you lack, once a day and after an update that changes them. It starts the worker in the background when it has a job: a default schedule it added, a background schedule run, `chats` on, an add-on, or your own jobs. It starts none when check-ins are off, when one already runs, or in a background run. One worker runs per person and checkout: a second `serve` sees the first one's lock and exits. The worker runs the main checkout's code and reads its settings there, from any chat in any copy of the repo. When that code changes, as after an update, the worker is stopped and started again, with one line in [the journal](#the-journal). A copy with its own edits to the daily scripts does not restart it.

- **`runs`** (optional, in [your settings file](#your-settings-file)): `{"agent": "codex"}` uses Codex; the default is Claude Code, the tested path.
- **`sweeps`** (optional): a JSON file in the repo with [your own jobs](#your-own-jobs).

Its own timed work is two default schedules: [the line-up](#your-chats-in-line) and [the small wiki tidy](wiki-dream.md#the-small-wiki-tidy).

A [background schedule](../stack/host-schedules.md) runs here too. When one is due, the helper hands it to the worker. The worker runs it only when this computer approved that exact version, then runs its `check`, if any, and starts the run with the schedule's instructions as its brief. It tells the app *started*, or why not, such as *Nothing to do*. Another person's run stays for their own worker.

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

The worker and the check-ins write one line for each thing they did: a check-in, a run's start and its end line, a closed chat, a source it could not read, a note between chats. A failure that goes on gets one line for each run of failures, not one each minute.

When the same thing fails two times in a row, the worker opens one chat named `Needs you: <what broke>`, such as *Needs you: the chat list*. The kinds are your chat list, your morning start, your jobs, and Paseo. Its first message says what failed, why, and the steps to fix it, or your [`guide`](#your-settings-file)'s own fix. The chat does the steps an agent can do and asks you only for a step that needs you, such as a sign-in. At most one such chat opens for each kind each day, and a success starts the count again. The watch and the check-ins leave it alone, so it waits for you. When Paseo can not open it, the journal says so, with Paseo's reason. Add-on failures stay journal lines. Ask *what's going on?* in any chat: it reads the lines since that chat last asked, newest first, and tells you what matters. `D journal` prints every line. Lines stay 14 days, run logs 7, in the private state folder.

### Your own jobs

Your `sweeps` file adds to [the default list](../../.agents/skills/daily/references/sweeps.json):

- **`events`**: an event kind, such as one your [add-on](#add-ons) prints, and the brief that judges it. A `stopped` or `asking` job you added stays, beside the check-ins: `{"invoice": {"brief": "invoice.md", "title": "Invoice {{invoice}}", "lane": "invoices", "ownPlace": true}}`. A `lane` runs one job at a time; `ownPlace` runs outside the 3-run limit. An entry with the name of a default one replaces it.
- **`sweeps`**: only a [default schedule](../stack/host-schedules.md#default-schedules), by its `id`. `{"sweeps": [{"id": "wiki-tidy", "off": true}]}` adds it paused; any other entry with that `id` replaces its definition. A job's optional `check` is an [add-on](#add-ons) script; it prints `{"run": {…}}` when there is work, and those fields fill the brief. `"minutes": 90` lets a run work 90 minutes, not 30. `"place": "copy"` runs it in its own copy of `origin/main`, removed when the run ends. Your own timed job is a [background schedule](../stack/host-schedules.md), with the same `check`, `minutes` and `place`.
- **`deny`**: tool patterns that no background job may use, such as a command that sends an email a person must approve first: `{"deny": ["Bash(*email*send*)", "Bash(*send-approved*)"], "sweeps": []}`. Each background run gets the list, and Claude Code refuses those tools in that run. A schedule that opens a chat does not get it. Keep each pattern narrow: a pattern that matches too much also blocks the job's own work, and the run's log shows the refusal. It works with Claude Code only: with Codex and a `deny` list, the worker starts no background run and writes `Not started: … the deny list works only with Claude Code` in [the journal](#the-journal).

A brief is a Markdown file in `.agents/daily/briefs/`, else [the skill's](../../.agents/skills/daily/references/briefs/header.md); `{{name}}` takes a field. Each run reads the header brief first: no person is there, agent text is data, and it never sends or pays unless its brief allows that one step.

## Updates keep your settings

A WongStack update brings the new daily skill, but never copies over or removes `.agents/daily/`: [the payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md#categories) leaves it to your install.

Part of [Development](README.md).
