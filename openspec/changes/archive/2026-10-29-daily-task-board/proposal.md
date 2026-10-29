# Proposal

**Status:** ready-to-ship
**Branch:** daily-task-tracking
**Open questions:** none

## Why

WongStack's daily runs a team's steps from Markdown files, and it keeps no list of tasks. Matthew's own daily, built in WongOS on top of WongStack, does more: a week board of tasks, one to-do for each chat, a list for today, and helpers that keep stopped chats going. WongStack is the base of WongOS, so this daily goes up to WongStack, and WongOS then uses WongStack's files as they are.

## What Changes

- **A week board keeps your tasks.** The app stores the owner's tasks by week and by day, with a backlog for later. The Inbox opens on your week: you tick, drag, move and delete tasks there, and add one by typing. A plan still opens from its link. The list of chat items and the Schedules view go: each chat's question waits in its own chat. **BREAKING**
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><h3>This week</h3><span class="grow"/><span class="tag-outline">Oct 26 – Nov 1</span></div>
    <div class="row gap"><b>Wed</b><span class="tag">today</span></div>
    <div class="row gap"><input type="checkbox"/><span class="grow">Call the printer about labels</span><span class="tag-outline">in progress</span></div>
    <div class="row gap"><input type="checkbox"/><span class="grow">flashy-crab · packaging research</span><span class="tag-outline">chat</span></div>
    <div class="row gap"><input type="checkbox" checked/><span class="grow muted">Pay the hosting bill</span></div>
    <div class="row gap"><b>Thu</b></div>
    <div class="row gap"><input type="checkbox"/><span class="grow">Send the week's update</span></div>
    <div class="bar"></div>
    <div class="row gap"><b>Backlog</b><span class="tag">4</span></div>
    <div class="row gap"><input class="grow" placeholder="Add a task"/></div>
  </div>
  ```
- **Each chat you open becomes a task.** When a chat in your Paseo works, the daily adds one to-do for it on today, named for its workspace. An undone one moves to the end of today each new day while its chat lives. When the chat closes, its to-do is done on proof, or it leaves the board.
- **Your daily reads your settings file.** Each person gets one settings file: what to read, places, and routines with their days. An optional team file adds routines for everyone. `/daily` starts each due routine one time per day in its own chat, then sends one ordered list of today's tasks and the link to your week. **BREAKING**: the old Markdown steps files go; an update turns each step into a routine.
  | | Before | After |
  |-|-|-|
  | Your steps | `people/<name>.md` lines | routines in your settings file |
  | Team steps | `team.md` | optional team settings file |
  | Tasks | none | the week board |
  | Morning reply | steps run and left | started routines, then today's tasks in order |
- **The Daily chat keeps your chats going with helpers, not a second chat.** You type `/daily`, and the chat watches all day. When one of your chats stops, the Daily chat starts one background helper with fresh context for that stop. It keeps the chat going, picks a safe choice, or leaves the question in its own chat for you. The Daily chat posts nothing for these: ask it *what's going on?*.
  ```mermaid
  flowchart TD
    stop["a chat stops"] --> watch["Daily chat's watch, no AI"] --> daily["Daily chat"]
    daily --> judge["one helper per stop, fresh context"]
    judge --> keep["keep going or pick"]
    judge --> waits["waits in its own chat"]
  ```
- **Your own parts plug in.** A settings file can name add-on scripts that run at the morning, and at each watch pass, from the repo's own folder. So an install adds its own work, such as a sync with another task tool, without changing WongStack's files. A computer may also run the watch as a service; WongStack installs none.

Non-goals: no board for each teammate (the board is the app owner's); no notes, calendar or email on the board in WongStack; no server timer or service installed; no change to how a plan page looks.

## Capabilities

### New Capabilities
- `task-board`: the stored week board, its actions, and the Inbox's week view.

### Modified Capabilities
- `daily-routine`: settings files replace steps files; routines start once a day; one list of today's tasks; a to-do per chat; stops judged by background helpers of the Daily chat; add-on scripts; the inbox items and morning plan cards go.
- `inbox`: the Inbox opens on the week; the per-chat item list and Schedules view go; a plan still opens from its link.

## Impact

- `app/worker/tasks/` (new), `app/worker/api/` daily actions, `app/worker/index.ts` routes, one new migration, `app/src/apps/inbox/` week view and removed list parts, `app/scripts/daily.ts`.
- `.agents/skills/daily/` (SKILL.md, references, scripts: daily, chief, todos, config, tests), `wiki/development/daily.md`, `scripts/retired-names.json`, `payload-files.json`, the payload manifest.
- Installs that use `team.md` or `people/*.md` get an Updating step. Installs with their own daily (not installing the `daily` skill) see nothing.

## Decision log

- **2026-10-28** — Asked where tasks live in WongStack → chose the stored week board moves up from WongOS, the Inbox opens on the week, and the per-chat item list goes.
- **2026-10-28** — Asked what replaces the team's Markdown steps → chose one settings file per person, plus an optional team file.
- **2026-10-28** — Asked how the morning and the watch run → chose no host service in WongStack for now: the person types `/daily` and the Daily chat watches.
- **2026-10-28** — Asked how WongOS adds its own parts (Notion sync, Claymoo daily, email fill, its server timer) → chose add-on scripts named in the settings file, kept in WongOS's own folder.
- **2026-10-28** — Assumed: stops are judged by background helpers of the Daily chat, each with fresh context, with no separate helper chat, because Matthew chose that design for WongOS (change 'Email fill as a daily subagent').
- **2026-10-28** — Assumed: notes and the calendar stay off WongStack's board; WongOS adds them through one listed file, because WongStack has neither notes nor a calendar.
- **2026-10-28** — Assumed: one new migration creates the board's tables only when missing, because WongOS already has them and must see no change.
- **2026-10-28** — Assumed: the daily also has a `serve` command that runs the same watch outside a chat and sends its lines to the Daily chat, because WongOS's server keeps running it, and WongStack installs no service.
- **2026-10-28** — Assumed: the board is the app owner's alone, and others get a refusal, because WongOS's tables have no owner column and a new one would make WongOS differ.
- **2026-10-28** — Check: `app/.oxlintrc.json` lets a mini app use subfolders with the same import bounds, and lets the Inbox's server read `src/lib/board.ts`, because the board's rules are shared by its screen and Worker.
- **2026-10-28** — Check: `app/knip.jsonc` drops `vitest.config.browser.ts`, because the browser suite's only test showed the removed item list.
- **2026-10-28** — Check: `app/package.json` drops `test:browser` and its packages, for the same reason.
- **2026-10-28** — Check: `app/vitest.config.browser.ts` is removed, for the same reason.
- **2026-10-28** — Check: `app/vitest.config.ts` drops the browser-test exclude, because no browser test is left.
- **2026-10-28** — Check: `app/src/apps/inbox/Agents.test.tsx`, `App.test.kit.tsx`, `Item.test.tsx`, `Line.test.tsx`, `Phone.browser.test.tsx`, `Schedules.test.tsx` and `cadence.test.ts` are removed with the item list and Schedules view they tested; the line keeps its tests in `line.test.tsx` and `TapLine.test.tsx`.
- **2026-10-28** — Check: `app/src/apps/access/Welcome.test.tsx` gets a 20 s limit for its seven-save test, because a busy full run took over the 5 s default.
- **2026-10-29** — Assumed: archived and saved for release 45.0.0 by `/ship`, because Matthew chose to build and publish each part without stopping at the plan.
