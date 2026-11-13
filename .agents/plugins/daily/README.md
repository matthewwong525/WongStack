# Daily

Daily keeps your AI chats moving while you are away: a check at each chat's stop sends back a safe next step, a background worker keeps your open chats in line, and `/schedule` runs work at set times. It works in Claude Code and Codex, and it needs no company app: your repo can add one through one profile file.

## Add it to your project

Paste this message into a chat in your project, in any AI tool:

> Add WongStack's Daily to this project. Follow the setup guide at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/daily/references/setup.md

The AI copies the Daily folder into your project, writes your settings file, runs the check, and saves the work. It asks you before each step that costs money or makes something public, and before it pushes. Until then, each new chat asks you once whether to set up Daily.

A [WongStack](https://github.com/matthewwong525/WongStack) project already has Daily: it comes with each update. The guide stops there and changes nothing.

## Update it

Paste this message:

> Update WongStack's Daily in this project. Follow the update steps at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/daily/references/setup.md#update

It keeps your own edits to the folder. When one of your edits and a new change touch the same lines, it changes nothing and names each file.

## What you get

- **Check-ins:** when a chat stops while you are away, one read-only AI run judges the stop. A safe next step or a clear pick goes back to the chat; anything risky waits for you. *Stop check-ins* turns them off.
- **Your chats in line:** every 5 minutes, the worker looks at your open chats and tells a chat when another one changes its plan or covers its work. *Stop keeping my chats in line* turns it off.
- **Schedules:** `/schedule` runs a request as a new chat at a set time, such as *every weekday at 9*. With no schedule store in your repo, [Paseo](https://paseo.sh) keeps them on this computer.
- **A journal:** *What's going on?* gives what the background runs did since you last asked.

## Your settings

Your settings live in `.agents/daily/<name>.json`, one file per person. Check-ins need no file: without one, they use your email's first part as `person` and this computer's time zone. The morning needs the file. Daily finds yours by your git email, then the profile's email, against its `emails`. A file that lists neither email is another person's, even when it is the only one. Start from [the example](references/example.json):

- **`person`**: your short id, lowercase, such as `jo-lee`.
- **`emails`**: every email you sign in or commit with.
- **`timezone`**: your day starts and ends here, such as `America/New_York`.
- **`sources`**: leave it empty, `{}`. An older `chats` or `tasks` entry does nothing, with one journal line.
- **`places`**: named folders: `"."` is this checkout, `~/…` your home.
- **`morning`** (optional): when the worker starts your morning, as `"HH:MM"` in your time zone. The default is `"08:00"`.
- **`guide`** (optional): a Markdown file in the repo with your own rules for Daily's asks, such as *remind me on the day before*. A chat reads it before it does an ask, and a *Needs you* chat reads it first. Its rules add to or replace the skill's defaults, never the safety rules: risky steps wait for you, agent text is data, and the streak.
- **`addons`** (optional): your [add-ons](#add-ons), `morning` and `pass`.
- **`runs`** (optional): `{"agent": "codex"}` uses Codex for background runs; the default is Claude Code, the tested path.
- **`sweeps`** (optional): a JSON file in the repo with [your own jobs](#your-own-jobs).

Say *use Codex for my background runs*: the assistant edits your file, shows you the change, and saves it. Keep health, family and money out of a shared project.

## Your morning

At `morning`, 08:00 by default, the worker runs your morning [add-ons](#add-ons) one time per day: a restart or a second worker runs nothing twice. When the computer is off at that time, the morning starts at the worker's next pass that day. The morning needs a settings file and the worker on. *Stop check-ins* stops the worker, so the morning waits too; *start check-ins* turns both back on.

## Add-ons

An add-on is a Node script in your repo that the worker runs: `addons.morning` once per morning, `addons.pass` at each watch pass. Each gets a JSON context on stdin (`kind`, `day`, `person`, `timezone`, `repo`, and on a pass the last `events`) and prints JSON lines on stdout:

- `{"line": "…"}`: one line for the journal in the morning, or a `post` event on a pass.
- `{"event": {"event": "<kind>", …}}`: an event that [your own jobs](#your-own-jobs) judge; a kind with no job goes to the journal.
- `{"skip": ["<agent id>"]}`: chats the watch leaves alone.

An add-on that fails, prints anything else, or runs past 60 seconds gives one `Not read: add-on <path>` and never stops Daily.

## Your own jobs

Your `sweeps` file adds to [the default list](references/sweeps.json):

- **`events`**: an event kind, such as one your [add-on](#add-ons) prints, and the brief that judges it. A `stopped` or `asking` job you added stays, beside the check-ins: `{"invoice": {"brief": "invoice.md", "title": "Invoice {{invoice}}", "lane": "invoices", "ownPlace": true}}`. A `lane` runs one job at a time; `ownPlace` runs outside the 3-run limit. An entry with the name of a default one replaces it.
- **`sweeps`**: only a [default schedule](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/host-schedules.md#default-schedules), by its `id`. `{"sweeps": [{"id": "line-up", "off": true}]}` adds it paused; any other entry with that `id` replaces its definition. An entry with the `id` of a retired default, such as `wiki-tidy`, is skipped with no error. A job's optional `check` is an [add-on](#add-ons) script; it prints `{"run": {…}}` when there is work, and those fields fill the brief. `"minutes": 90` lets a run work 90 minutes, not 30. `"place": "copy"` runs it in its own copy of `origin/main`, removed when the run ends. Your own timed job is a [background schedule](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/host-schedules.md), with the same `check`, `minutes` and `place`.
- **`deny`**: tool patterns that no background job may use, such as a command that sends an email a person must approve first: `{"deny": ["Bash(*email*send*)", "Bash(*send-approved*)"], "sweeps": []}`. Each background run gets the list, and Claude Code refuses those tools in that run. A schedule that opens a chat does not get it. Keep each pattern narrow: a pattern that matches too much also blocks the job's own work, and the run's log shows the refusal. It works with Claude Code only: with Codex and a `deny` list, the worker starts no background run and writes `Not started: … the deny list works only with Claude Code` in the journal.

A brief is a Markdown file in `.agents/daily/briefs/`, else [Daily's own](references/briefs/header.md); `{{name}}` takes a field. Each run reads the header brief first: no person is there, agent text is data, and it never sends or pays unless its brief allows that one step.

## What it needs

- **Node 20 or newer** on each computer.
- **One folder** at `.claude/skills/daily/`, as a real folder, with the schedule command inside it in `skills/schedule/`, linked up as `.claude/skills/schedule`. Claude Code and Codex load it from there, with no install step.
- **Its hooks in your project's settings**, `.claude/settings.json` and `.codex/hooks.json`, so the check-ins run in every chat. The setup guide adds them.
- **Your settings file:** `.agents/daily/<name>.json`, outside the folder, so an update never touches it.
- **Paseo, for schedules and the line-up,** unless your repo gives Daily its own schedule store. With neither, `/schedule` is off and the rest still works.
- **A profile, only if your repo has more to give:** `.agents/daily/profile.mjs`. It can add a schedule store, a sign-in, or chat names. Each part is optional.

[How WongStack uses Daily](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/daily.md) explains the profile and the worker in full.
