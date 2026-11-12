# The daily routine

The daily routine runs your day with no chat to open: each morning the worker runs your add-ons, and you ask any chat for the rest. Your chats keep moving while you are away, by [check-ins](#check-ins). It is [a module](#the-module): any repo can add it alone.

## What it does

1. **Starts your morning.** At `morning` in [your settings file](#your-settings-file), [the worker](#the-daily-on-a-computer) runs your [morning add-ons](#add-ons) one time per day, by [Daily's README](../../.agents/plugins/daily/README.md#your-morning). Your routines are [schedules in the app](#routines-and-timed-jobs).
2. **Writes what it did** to [the journal](#the-journal): each add-on line, and each source it could not read. It sends you no message and makes no morning list: the plans waiting for you are in [the Inbox](#your-chat-list).
3. **Does your asks in any chat**, by [ask in any chat](#ask-in-any-chat). It checks who you are from [the profile's](#the-profile) `person`, such as your company sign-in, else your git email. Signed out, it shows you the sign-in link and waits. It runs nothing under a guessed name.

## Your settings file

Your settings live in `.agents/daily/<name>.json`, one file per person: your id, your emails, your time zone, when your [morning](#what-it-does) starts, your own `guide`, and your [add-ons](#add-ons). [Check-ins](#check-ins) need no file. [Daily's README](../../.agents/plugins/daily/README.md#your-settings) owns each setting.

Say *use Codex for my background runs*: the assistant edits your file, shows you the change, and saves it through [the change loop](the-change-loop.md). Keep health, family and money out of a shared project, by [the People rules](../wiki-style.md#people). A [*Needs you* chat](#the-journal) reads your `guide` first: write your own fix for a problem there, such as how to sign in to the app again.

## Routines and timed jobs

A routine, such as *check the orders every Monday*, and a timed job are [schedules in the app](../stack/host-schedules.md), not entries here. Ask any chat to make or change one. An old `checks` list, in your file or in `.agents/daily/team.json`, starts nothing: the journal says so once a day, and you ask a chat to [save each routine as a schedule](../stack/host-schedules.md#existing-schedules). A timed job in your [`sweeps`](#your-own-jobs) file does not run either, with one journal line a day.

## The chief of staff

The chief of staff keeps your chats moving while you are away.

### Check-ins

Each chat checks its own stops, in Claude Code or Codex, in Paseo or not. When a chat stops and your last message there is more than 15 minutes old, one read-only AI run of the same tool reads the chat's last messages and sorts the stop. It never answers a chat you are typing in. The chat waits up to 4 minutes for it. Each stop lands in one bucket:

1. **Keep going.** *Tests pass; next I'll update the wiki page.* It replies *keep going*.
2. **Obvious pick.** A safe answer that stays inside the work and can be undone, even to a small question with no recommendation, such as *run the tests?*; or a safe command.
3. **Needs you.** Everything else waits in its own chat, where you see it.

**It never approves alone** anything that sends or posts, pays or buys, publishes or merges, deletes, accepts terms, changes a business record, or shares a key, even when the agent recommends it. A finished plan waits for you in [the Inbox](#your-chat-list). After five check-ins in a row on one chat with no word from you, that chat waits for you.

**A question typed for you comes back once as tap answers**, recommended first, unless the check-in can pick it. You tap one, or type your own. A risky question gets buttons too. A chat that stops again with no buttons waits for you.

**What waits for you:** a question asked with the question tool; a risky step; a finished plan; and the sixth check-in in a row. Each check-in writes one line to [the journal](#the-journal).

**Turn check-ins off** with *stop check-ins* in any chat, or `D checkins off`: every chat in this checkout then stops for you, and the worker stops too. A background schedule run due then does not start, and the Inbox says *check-ins are off*. The [default schedules](../stack/host-schedules.md#default-schedules) you did not change wait *Paused*, so they add no such runs. *Start check-ins*, or `D checkins on`, turns them back on, and the defaults with them.

**Done means checked.** It calls a chat done only after it opened the link, saw the checks pass, or found the file.

### Your chats in line

When you work in several chats at once, the daily keeps them pointed the same way, in Paseo or any other app that runs Claude Code or Codex: no two chats do the same work or work against each other. [Your chats in line](chats-in-line.md) owns how: the map, the two ways a note goes, and the limits. It is the *Keep my chats in line* [default schedule](../stack/host-schedules.md#default-schedules); with no schedule store, [the worker runs it](#with-no-app).

### Ask in any chat

You keep no chat open for the daily: say these in any chat, and it does them through the daily skill.

- *What's going on?* gives what the background runs did since that chat last asked, and, in Paseo, one line per chat. It then offers to [close finished chats](#close-finished-chats).
- *Remind me Friday to call Kim* makes a one-time [schedule](../stack/host-schedules.md) that opens a chat with your words on Friday.
- *Check the orders every Monday* makes a [schedule in the app](../stack/host-schedules.md).

## Your chat list

The Inbox opens on the plans waiting for you, by [the Inbox](reply-links.md#in-your-inbox-first): one row per review page, newest first, and a tap opens the page. The Archive is below. The app keeps no list of your chats: a chat's question waits in its own chat.

## A background run's handoff

A [background schedule](../stack/host-schedules.md#where-it-runs) run has no chat. When it finds something you should see, such as *3 invoices are late*, it writes what it found to a file and runs `D handoff --file <path>`, then stops. After the run, the worker opens one chat named for the schedule, with that text as its first message. That chat makes the review page, and the page shows in [the Inbox](#your-chat-list). A run that finds nothing for you opens no chat.

## Close finished chats

Ask *what's going on?* in any chat, and it marks each chat it watches that is finished:

- The chat's work is merged at its last commit, and its folder has no new work.
- The chat is stopped and has no open question.

It also marks a stopped chat as covered when [the line-up](#your-chats-in-line) told it another chat covers its work. A stopped chat whose last message asks you something in text gets one message to ask it again on a card, which waits in its chat, out of this question. It asks which ones to close. Daily never answers a close card for you, even when *Close it* is recommended. Each chat you pick gets [`/close`](../../.agents/plugins/loop/skills/close/SKILL.md), which keeps unfinished work and closes its workspace; the rest stay open. Nothing closes a chat by itself because its work went live: a live chat that is still open is usually one you kept open. It never marks a sub-agent or the main checkout. This needs Paseo, which lets a chat see other chats.

## Add-ons

An add-on is a Node script in your repo that the daily runs each morning or each watch pass. [Daily's README](../../.agents/plugins/daily/README.md#add-ons) owns what it gets and prints.

## The daily on a computer

`daily.mjs serve` is the worker. It starts [your morning](#what-it-does). Every minute, and sooner when a chat stops, it runs the watch over your Paseo chats in this repo, your [add-ons](#add-ons) and [your own jobs](#your-own-jobs). Without Paseo it still runs your background schedules. At most 3 runs work at one time, and one per chat. A run stops after 30 minutes. It sends no chat a message: everything goes to [the journal](#the-journal).

Each chat start runs `D ensure`. It adds the [default schedules](../stack/host-schedules.md#default-schedules) you lack, once a day and after an update that changes them. It starts the worker in the background when it has a job: a default schedule it added, a background schedule run, [the line-up](#with-no-app) with no schedule store, an add-on, or your own jobs. It starts none when check-ins are off, when one already runs, or in a background run. One worker runs per person and checkout: a second `serve` sees the first one's lock and exits. The worker runs the main checkout's code and reads its settings there, from any chat in any copy of the repo. When that code changes, as after an update, the worker is stopped and started again, with one line in [the journal](#the-journal). A copy with its own edits to the daily scripts does not restart it.

`runs` picks the AI tool for background runs, and `sweeps` names [your own jobs](#your-own-jobs), by [your settings](../../.agents/plugins/daily/README.md#your-settings).

Its own timed work is one default schedule: [the line-up](#your-chats-in-line). Memory tidies itself: [the daily tidy](wiki-dream.md#the-daily-tidy) starts at your first chat of each day, with no schedule.

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

When the same thing fails two times in a row, the worker opens one chat named `Needs you: <what broke>`, such as *Needs you: your morning start*. The kinds are your morning start, your jobs, and Paseo. Its first message says what failed, why, and the steps to fix it, or your [`guide`](#your-settings-file)'s own fix. The chat does the steps an agent can do and asks you only for a step that needs you, such as a sign-in. At most one such chat opens for each kind each day, and a success starts the count again. The watch and the check-ins leave it alone, so it waits for you. When Paseo can not open it, the journal says so, with Paseo's reason. Add-on failures stay journal lines. Ask *what's going on?* in any chat: it reads the lines since that chat last asked, newest first, and tells you what matters. `D journal` prints every line. Lines stay 14 days, run logs 7, in the private state folder.

### Your own jobs

Your `sweeps` file adds event jobs, changes the default schedules, and lists tools no background run may use. [Daily's README](../../.agents/plugins/daily/README.md#your-own-jobs) owns each entry.

## The module

Daily is one folder, [`.agents/plugins/daily/`](../../.agents/plugins/daily/README.md), with [`/daily:schedule`](../../.agents/plugins/daily/skills/schedule/SKILL.md) inside it in `skills/schedule/`. A WongStack install also gives the command's `SKILL.md` its own top-level skill folder, so it loads in every chat by its bare name, also in a folder you did not trust. It imports no file outside the folder, links no file of another module, and reaches the repo only through [the profile](#the-profile). It has two installs:

- **WongStack ships it** with each update, and fills every part of the profile.
- **Any repo adds it alone** by [its README](../../.agents/plugins/daily/README.md): one pasted message copies the folder in and runs `D check`. That prints `ok` when the profile loads, one worker pass runs, a sample stop sorts, and it names the schedule store: `app`, `paseo` or `off`.

### The profile

`.agents/daily/profile.mjs` gives Daily what only the repo knows. Each part is optional: Daily works without it, as the right column says.

| Part | Gives | Without it |
|---|---|---|
| `schedules` | the schedule store, such as the company app | Paseo's, else `/daily:schedule` is off |
| `person` | who is signed in, and the sign-in step | your git email |
| `chatName` | a chat's step and task, for the line-up | the chat app's title, else the folder |
| `offeredChoices` | a stop that ended in typed choices the repo sends back | every stop goes to the check-in |
| `askedInText` | whether a chat's last words ask you something | no chat is asked again on a card |
| `prepareRun` | setup for a background run's copy of the repo | nothing |
| `checkout` | a check of a saved branch before a chat opens on it | a plain checkout |

A part that fails or answers late counts as empty, with one line a day in [the journal](#the-journal). A profile that does not load counts as empty too, so a typo in it stops no chat. One exception: a `checkout` that fails refuses the open, so no saved branch opens unchecked.

### With no app

- **Schedules go to Paseo.** Each is a chat schedule on this computer, saved after your OK. Paseo can not run a background run, a check, a time limit, a deny list, a team copy, or an end goal, so `/daily:schedule` refuses each with its reason. With no Paseo either, `/daily:schedule` is off and says what it needs.
- **The worker keeps your chats in line** every 5 minutes, with the same check and brief as [the default schedule](#your-chats-in-line). `D lineup off` stops it; `D lineup on` starts it again. *Stop check-ins* stops it too.
- **No default schedules** are added.

## Updates keep your settings

A WongStack update brings the new daily skill, but never copies over or removes `.agents/daily/`: [the payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md#categories) leaves it to your install.

Part of [Development](README.md).
