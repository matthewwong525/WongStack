# Design

## Context

Since `checkins-for-everyone` (45.7.0), the Daily chat no longer watches. What still runs through it:

- **The morning.** `/daily` step 2 runs `D start` (no model: due routines and `addons.morning`, each claimed per day in `started.json`), then `D picture` (the list), and the agent writes the reply. `daily.mjs open-daily` opens a pinned `Daily` workspace and sends `/daily`, for a timer. `start` also saves the chat's `PASEO_AGENT_ID` in `daily-workspace.json`.
- **The journal hook.** The `UserPromptSubmit` hook `daily.mjs journal --hook` (`journalHook`) gives new journal lines, and the `NEW_DAY` line, only to a chat whose first message is `/daily` (`transcript.mjs dailyChat`).
- **The board line.** `worker.mjs boardLine` sends `Not read: your board — …` once a day with `sendDaily` → `chief.mjs dailyAgent`, which throws with no Daily chat.
- **The saved id.** `daily.mjs commands().chief` reads `daily-workspace.json` and `chiefEnv` gives a command with no `PASEO_AGENT_ID` (a background run: `worker.mjs runEnv` drops it) the Daily agent's id. `hand`, `handFor` (`reply`, `answer`, `allow`), `status`, `doneAgent`, `todoLink` and `close` refuse `unsupported` without an id. The default job list has no event jobs, but an install's own `stopped`/`asking` jobs (`briefs/judge.md`) run these commands from a background run.
- **The skips.** `stop-check.mjs` skips a chat that began with `/daily`; `finished.mjs` and `chief.mjs admit` skip a chat named `Daily` (`OWN_NAMES`); the worker's watch ignores the saved Daily id.

What watches chats does not need the Daily chat: every chat's `SessionStart` runs `D ensure` (`memory/scripts/session-start.mjs ensureDaily`), which starts one detached `D serve` per person and checkout, and each chat's `Stop` hook runs its own check-in.

## Goals / Non-Goals

**Goals:** no path needs or opens a Daily chat; the morning starts in the worker with no model; any chat runs the daily's asks from the skill; an install's own judge jobs keep working.

**Non-Goals:** no change to check-ins, board to-dos, `sweeps`, the wiki tidy, routine settings or `start-task`; no host service or timer shipped; no change to WongOS's own `.agents/daily/` files.

## Decisions

- **The worker runs the morning.** Each `workerPass` calls a new `morningDue` step before `dispatch`: when the person has a settings file, today's local time is at or past `config.morning` (`"HH:MM"`, default `"08:00"`), and today's `morning-<day>.json` does not exist, it calls `start()` and journals one line per started or failed routine, each add-on `line`, and each `notRead`. Add-on `events` go to `worker.dispatch`, the same path as pass add-on events, so an install's `sweeps.events` judges them. `start()` already claims each routine and the add-ons per day through `launchOnce`, so two workers or a restart start nothing twice. A dry run prints `wouldStart` rows from `start({ dryRun: true })`. Alternative: a host timer running `D start`, as WongOS does. Rejected: it is a service to install, which Matthew called too heavy in October, and the worker already runs whenever a chat has started.
- **`morning` joins the settings.** `config.mjs` reads an optional `morning` `"HH:MM"` and rejects another shape; `example.json` shows it. A missing file keeps the defaults, which hold no routines, so a person with no file gets no morning start (`hasFile` stays the gate, as `NEED_FILE` holds `start`).
- **`/daily` stops being a typed command.** `SKILL.md` frontmatter: `user-invocable: false`, no `disable-model-invocation`, and a description that names the asks (*remind me*, *start a task*, *watch* or *tell a chat*, *what's going on*, *stop check-ins*, changing daily settings), so any chat loads it on those words. The body keeps *On request* and *Changing settings*; steps 1 to 4 go. *What's going on?* runs `D journal --new` (lines since this chat last asked, by `chatKey`) and, in Paseo, `D status`. `measure-context.mjs` counts the new description; the plan rebaselines it once, with the skill's body cut more than the description adds. Alternative: a line in `AGENTS.md`, as WongOS did. Rejected: it loads in every chat; a skill description is shorter and the asks already live in the skill.
- **The journal hook goes.** Remove the `UserPromptSubmit` entry from `.agents/settings.json`, `journalHook`, `newDay`, `NEW_DAY`, `hookOutput`, the `journal --hook` branch of `main`, and their tests. `D journal` and `D journal --new` stay. Codex has no such hook, so `.agents/hooks.json` is unchanged.
- **`open-daily`, `picture`, `daily-workspace.json` and `dailyAgent` go.** Remove `openDaily`, `takeDay`, `dailyRecord`, `picture` with `readChats`, `worktrees` and `trimTasks` if nothing else reads them, the `start` write of `agentId`, `dailyAgent`, and `serveDaily`'s `daily` and `ignore`. The `D` usage, `FLAGS` and `NEED_FILE` lose the commands. Add `open-daily` and `daily-workspace.json` to `scripts/retired-names.json`, so a stale doc that names them fails the check.
- **A background run acts under a stand-in id.** `chiefEnv(env, call)` returns `env` when `PASEO_AGENT_ID` is set, and `{ ...env, PASEO_AGENT_ID: 'daily-worker' }` when `WONG_DAILY_RUN` is set and it is not. The stand-in matches no chat, so `watched` excludes nothing extra, and `hand` never refuses *that is this chat*. A plain terminal with no Paseo id still gets `unsupported`. `daily.mjs commands().chief` drops `dailyId`; `status` drops its `dailyId` argument. Alternative: keep saving a Daily agent id, as WongOS does. Rejected: with no Daily chat nothing writes it.
- **The board line goes to the journal only.** `boardLine` and `sendDaily` go; `quiet()` already journals the `not-read` line, and the watch's `notRead` list already keeps it to one line per source per day. The `told` field in the worker queue goes. Alternative: open a *Sign in again* chat, as WongOS does. Rejected: each chat's session start already warns before the company sign-in ends, and a helper-opened chat is noise for teammates.
- **The Daily skips go.** Remove `dailyChat`/`isDaily` from `transcript.mjs` and the `daily` skip from `stop-check.mjs`; remove `OWN_NAMES` from `finished.mjs` and `chief.mjs admit`. An old `Daily` workspace sits in the main checkout, which both already skip.
- **The Daily chat's hand-off rules go.** Remove *Quick or big* and the Daily-chat sentence of *The person's answers* from `references/chief.md`, keeping the relay (`--bucket person`) for *tell flashy-crab*; remove `D close` (`chief.mjs close`) and the `asked` hand source, whose only user was *quick or big*. *Watch flashy-crab* keeps `D hand`. *Brief before you start an agent* stays: `start-task` and an install's jobs still brief agents.
- **`newerDaily` keeps its job under its old meaning.** It ends an older watch day when a later day started or watched; the worker's own watch file now always marks the day. Rename it `newerDay` and its end reason `next-day`, with no behavior change.
- **The release is major.** `/daily` and `open-daily` go. The CHANGELOG's **Updating.** note: remove any timer that runs `daily.mjs open-daily`; the helper now starts your morning by itself; close your old Daily chat when you like.

## Risks / Trade-offs

- [No chat runs on a morning when nothing started the worker] → the first chat that day starts it (`D ensure`), and its first pass starts the morning. A person who wants 8:00 sharp runs `D serve` under their own service manager, as the wiki already shows.
- [Check-ins off also stops the morning] → `D ensure` starts no worker when check-ins are off, so routines wait. The wiki says so, and *start check-ins* turns both back on. Splitting the switch is a later change if someone asks.
- [A morning add-on fails with no chat to say so] → its `notRead` line goes to the journal, and *what's going on?* shows it.
- [Late tasks are no longer listed] → the person chose the board as the list; an undone task stays visible on its day.
- [An install's guide wrote rules for the Daily chat] → `guide` still applies to the asks and to add-on event kinds; rules about the Daily chat are inert. The wiki says what `guide` now covers.
- [The plan `chat-names-and-thinking-floor` edits `openDaily`] → whichever publishes second drops that hunk; its other parts are unaffected.

## Migration Plan

1. Publish as a major release; installs get it on their next `/wong-sync`.
2. On this computer, after merge: no systemd unit, crontab or Paseo schedule here runs `open-daily` (checked 2026-11-04 while planning), so no hand step. WongOS imports none of the removed functions (checked against its `origin/main`). The old Daily chat can be closed with `/close` or left.
3. WongOS keeps its own `.agents/daily/` worker and host timer; its next sync takes the skill and scripts as shipped. Its `chiefEnv` dependence on `daily-workspace.json` ends with this release, so it may drop that file after the sync.

Rollback: revert the release; `open-daily` and the hook return, and a person types `/daily` again.
