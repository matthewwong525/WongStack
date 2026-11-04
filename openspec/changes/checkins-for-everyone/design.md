# Design

## Context

Stops are judged in two places today, and both need Paseo. The Daily chat runs `D watch` with the Monitor tool and ends at `--hours` (at most 24) or when nothing is left to watch. `D serve` runs the same watch inside the worker (`worker.mjs` `serveDaily`) with no end, but only when a person installs it as a service. Either one finds a stop through the `Stop` and `Notification` hooks' `daily.mjs mark`, which writes a marker named by `PASEO_AGENT_ID`. It then starts a `judge.md` background run from the `stopped` and `asking` events in `references/sweeps.json`, and that run answers through `D reply`, which sends by Paseo. Both need a settings file: `daily.mjs` `main()` stops on `who()` with no `file`.

The repo already answers a stop in the stop step. `explore/scripts/ask-check.mjs stop` and `apply/scripts/helper-stop-check.mjs` print `{"decision":"block","reason":...}`, and Claude Code and Codex both take that as "carry on with this text". `.claude` and `.codex` are links to `.agents`, so the hooks live in `.agents/settings.json` (Claude Code) and `.agents/hooks.json` (Codex). `memory/scripts/lib/headless.mjs` builds one headless run for either AI tool.

`admit()` in `chief.mjs` takes every live top-level Paseo chat that worked in the last 24 hours, in any folder. Daily state lives in `~/.local/state/wongstack/daily/<sha256 of the primary checkout>/<person>/`. The `SessionStart` hook (`memory/scripts/session-start.mjs`) already starts detached jobs. A daily run sets `WONG_DAILY_RUN=1` and a memory run sets `WONG_MEMORY_RUN=1`.

## Goals / Non-Goals

**Goals:**
- One way to judge a stop, in the chat's own stop step, with or without Paseo.
- No settings file needed for check-ins.
- One off switch.
- The worker kept alive by chat start, only when the person has a background job.

**Non-Goals:**
- Answering a question asked with the question tool. That tool holds the turn, so no stop step runs.
- Changing what a check-in may do alone (`chief.md`'s buckets).
- Moving memory capture or tidy-up into the worker.
- Board to-dos for people with no settings file.
- A service installer.

## Decisions

### The stop step's check: `stop-check.mjs`

A new `.agents/skills/daily/scripts/stop-check.mjs stop` reads the hook JSON on stdin. It prints a block decision or nothing, and it never fails the chat: every error prints nothing. In order:

1. **Skip** when any of these hold:
   - `WONG_DAILY_RUN`, `WONG_MEMORY_RUN` or `WONG_STOP_CHECK` is set.
   - No `transcript_path`.
   - The person's `off` file exists in this repo's state.
   - The first user message in the transcript is `/daily`, which marks the Daily chat.
   - `ask-check.mjs`'s `stopDecision` would block this stop. Then that hook owns the stop, and two block answers on one stop would merge into one confusing reply.
2. **The person's turn.** Read the transcript with the readers in `memory/scripts/lib/transcripts.mjs`, extended for Codex rows as `helper-stop-check.mjs` reads them. When the last message from the person is less than 15 minutes old, reset the streak and skip. Tool results and hook-injected text do not count as the person's message.
3. **The streak.** Keep `<state>/stops/<session id>.json` with `{ count, since }`, where `since` is the time of the person's last message. A new person message resets `count`. On `count >= 5`, skip and journal "waits for you after 5 check-ins". `stop_hook_active` is ignored on purpose: a carried-on chat stops again with it set, and the streak, not the flag, ends the chain.
4. **Judge.** Run one headless judge with `headlessCommand`. It uses the same AI tool as the chat: the hook's own host, Claude Code from `.agents/settings.json` and Codex from `.agents/hooks.json`, given by a `--agent` argument in each file. The run gets read-only access to the repo, and its environment sets `WONG_STOP_CHECK=1` and `WONG_DAILY_RUN=1`. The prompt is the new brief `references/briefs/stop-judge.md`, with the transcript's tail as data: the last 40 messages, cut to 60,000 characters. The run is killed after 240 seconds.
5. **Answer.** The judge's last line is JSON: `{ "bucket": "keep-going"|"pick"|"person", "reply": "...", "line": "..." }`.
   - `keep-going` or `pick`: print `{"decision":"block","reason":<reply>}` and increment the streak.
   - `person`, a bad line, a timeout or an error: print nothing.
   - In every case, write one journal line with `addLine`, of kind `checkin`, with the chat's title, else its folder name.

The hook entries get `"timeout": 300` and stay beside `mark`, whose timeout stays 3. Alternatives:
- A `type: "agent"` or `type: "prompt"` hook. Rejected: Codex has neither.
- Judging inside the chat by a block that tells the chat to judge itself. Rejected: the agent that stopped grades its own stop, and fresh context is the point of a check-in.

### The judge's brief

`stop-judge.md` points to "Judge one stop", "Sort each stop" and "Needs you" in `references/chief.md`, as `judge.md` does. Two things differ:
- It sends nothing itself, and has no `D reply`. Its words go back through the hook.
- It ends with the JSON line above.

`chief.md` gets one short section, "From the stop step", that says this. `judge.md` stays for installs whose own jobs list names it.

### Settings without a file

`config.mjs` gains `defaultSettings({ email, timezone })`:
- `person` from the email's local part: lowercased, with each run of non-alphanumerics made `-`.
- `emails: [email]`.
- `timezone` from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `sources: { tasks: false, chats: true }`.
- No routines, add-ons or sweeps file.

`who()` gives the email: the sign-in's email when it is `valid` or `near`, else the git email. A settings file counts only when its `emails` hold the git or sign-in email, so a teammate is never taken for the only file's person. With neither, the stop step skips. `daily.mjs` `main()` uses the defaults for every command except `start`, `picture`, `start-task` and `remind`, which keep today's "No daily settings" error. `stop-check.mjs` calls the same resolver.

### The worker: kept running, only when needed

`D ensure` returns at once. It starts `daily.mjs serve --agent <agent>` detached (`setsid`, `stdio: 'ignore'`, `unref`) when all of these hold:
- `WONG_DAILY_RUN`, `WONG_MEMORY_RUN` and `WONG_STOP_CHECK` are unset.
- No `off` file.
- `serviceAlive` is false.
- The person has a job: a settings file with `tasks` on or add-ons, or a non-empty own sweeps list.

`session-start.mjs` calls it inside a try, as it calls `updateCopy`, so it adds no time or output. The worker's environment drops `PASEO_AGENT_ID` and `CLAUDE_*`. Without Paseo, `serveDaily`'s chat watch, board to-dos and hands are skipped (`paseoCli` fails) and timed sweeps still run.

Two more rules:
- **A lock.** `serve` takes `<state>/serve.lock` (`openSync 'wx'`, pid inside). It takes over a lock whose pid is dead or whose beat is stale. A second `serve` exits 0 with one stderr line, so a systemd unit and the hook's worker never run twice.
- **Own-repo chats.** `admit()` takes a chat only when `git rev-parse --git-common-dir` from its `cwd` is this repo's (cached per cwd; a missing folder never matches). Started and handed rows stay from any folder. With one worker per repo and the judging moved to each chat, no shared owners file is needed.

### What goes

- The `stopped` and `asking` events leave `references/sweeps.json`.
- The `watch` CLI command, `--hours`, the non-service `end('time')` and `end('empty')` paths, and `passes()`'s `serviceAlive` check go. `watch()` stays as the worker's function.
- `mark` stays: the worker still uses stop markers to update a chat's to-do.

SKILL.md step 4 becomes: run `D ensure`; new journal lines come with each message. `reply`, `answer` and `allow` stay, for a message the person asks the Daily chat to send through Paseo.

### The Daily chat, known without Paseo, kept for days

Today the `UserPromptSubmit` hook (`daily.mjs journal --hook`) knows the Daily chat by `PASEO_AGENT_ID` and keeps its journal place by that id. It changes to read the hook's `transcript_path` and `session_id`. A chat whose first user message is `/daily` is the Daily chat, by the same reader `stop-check.mjs` uses, and its journal place is kept by `session_id`. `newLines` takes that key in place of `agentId`/`dailyId`.

On a new day, the same hook adds the day's start. When `D start --report` would say `morning: "not run"` for today (no `morning-<day>.json`) and this message is not `/daily` itself, the hook's `additionalContext` opens with one line: "A new day: run /daily steps 2 and 3 before you answer." The agent then runs `D start` and `D picture` and replies with the list. `D start` already runs each routine and the morning add-ons once per day, so a second message, or a second chat, starts nothing twice. Codex has no message hook, so its Daily chat runs `D journal --new` with each message, and that command prints the same new-day line on the first call of a day with no morning run. Alternative: the worker starts the routines at a set hour. Rejected: the list is a reply, and a reply needs the person's message.

### The off switch

- `D checkins off` writes `<state>/off`, stops the lock's pid, and journals one line.
- `D checkins on` removes the file and runs `ensure`.

`references/chief.md` maps *stop check-ins* and *start check-ins* to these commands. Alternative: an environment variable. Rejected in the proposal's Decision log.

## Risks / Trade-offs

- **A pause at each stop while the person is away.** Most judges end in under a minute. The cap is 4 minutes, and the person is away by definition.
- **The cost of one AI run per stop.** It is the same run the worker starts today, now for every chat, not just Paseo chats. The 5-in-a-row cap and the 15-minute rule bound it.
- **A typed question with no tool.** The judge may pick a safe answer, as today. A question asked with the question tool waits, as the person sees it on screen.
- **Codex runs Stop hooks in an order this repo does not set.** `stop-check.mjs` checks `ask-check`'s decision itself, so the order does not matter. Codex's live behavior is checked in the build's verify step.
- **A chat started from the Daily chat by a message, not by `/daily`.** It is judged like any chat, which is wanted.
- **Two WongStack versions on one computer.** An older worker still judges every Paseo chat, and a chat could get a check-in from both. The Updating note tells an install to update. WongStack's own checkout runs `checkins off` on the shared server until WongOS updates.

## Migration Plan

An install's own jobs list keeps any `stopped` or `asking` job it added. A computer that runs `daily.mjs serve` as a service keeps it; the lock keeps it single. A Daily chat open at update time keeps its old Monitor watch until it ends; its next `/daily` runs `ensure`. Rollback is the previous release, and a left `off` file or `stops/` folder is ignored by it.

For WongOS: take this release with `/wong-sync`. Until then, run `node .claude/skills/daily/scripts/daily.mjs checkins off` in this checkout on the shared server.
