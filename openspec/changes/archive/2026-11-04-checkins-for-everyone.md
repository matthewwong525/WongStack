<!-- openspec-archive v1 2026-11-04-checkins-for-everyone -->
<!-- file proposal.md utf8 11118 -->
# Check-ins for everyone, with or without Paseo

**Status:** ready-to-ship
**Branch:** daily-memory-review-server
**Open questions:** none

## Why

Today a stopped chat gets a check-in only while a Daily chat is open in Paseo, and only for 24 hours, or from a computer service someone set up by hand. A teammate who never types `/daily` gets none, and a chat outside Paseo gets none. Check-ins should work for everyone, every day, with nothing to set up, and keep working if we ever leave Paseo.

## What Changes

- **Every chat checks its own stops.** When a chat stops and you have been away from it for 15 minutes or more, the chat's own stop step asks a fresh AI helper, with the same rules as today's check-ins: keep going, take the safe pick, or wait for you. On *keep going* or a safe pick, the chat carries on by itself. It works in any app that runs Claude Code or Codex, in Paseo or not, every day, with no 24-hour end. You see a short pause at the stop while the helper decides.
  ```mermaid
  flowchart TD
    s["the chat stops"] --> q{"you wrote in the last 15 min?"}
    q -->|yes| y["it stops: your turn"]
    q -->|no| h["a fresh helper reads the chat"]
    h -->|"keep going or safe pick"| c["the chat carries on"]
    h -->|"needs you"| w["it stops and waits for you"]
  ```
- **What still waits for you.** A check-in never answers for you when you just wrote, and it never takes a risky step.
  | The stop | What happens |
  |---|---|
  | Less than 15 minutes after your message | it stops; it's your turn |
  | A question with options to pick from | it waits for you |
  | Anything that sends, pays, publishes, deletes or accepts terms | it waits for you |
  | The fifth check-in in a row with no word from you | it waits for you |
- **No daily settings needed.** Check-ins use your company sign-in, else your git email. A settings file still adds your morning list, your board, your routines and your own jobs.
  | | Without settings | With settings |
  |---|---|---|
  | Check-ins | yes | yes |
  | Morning list, board, routines | no | yes |
  | Your own jobs | no | yes |
- **The Daily chat is where you talk, not where it watches.** `/daily` gives your morning list, then answers *what's going on?* from the check-ins' journal. Keep one Daily chat open for days: your first message each new day brings that day's list and starts its routines, with no new `/daily`. Your board's to-dos, your add-ons and your own timed jobs keep running in the background: opening any chat starts that helper when you have such a job, so there is no service to install.
  ```text
  Today                        After
  /daily → list                /daily → list
  chat watches for 24 h        each chat checks itself
  needs Paseo                  Paseo or not
  /daily again each morning    first message of the day
  ```
- **You can turn it off.** Say *stop check-ins* in any chat, and *start check-ins* to turn them on again. It applies to you, in that repo only.

Non-goals: answering a question with options for you; no change to what a check-in may do alone; routines in their own workspaces, hand-offs and *tell flashy-crab …* still need Paseo; memory loads and saves as today; the Reviews list and the cleanup jobs (each in its own workspace).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: each chat judges its own stops in its stop step, with or without Paseo; check-ins need no settings file; an off switch; chat start keeps the background worker running when the person has a job; the Daily chat's own watch is removed.

## Impact

- New `.agents/skills/daily/scripts/stop-check.mjs`: the stop step's check (the 15-minute rule, the streak, the off switch, the Daily chat and background runs skipped), one headless judge run with a time cap, and the `decision: block` answer; reused transcript readers from `memory/scripts/lib/transcripts.mjs`.
- `.agents/skills/daily/references/briefs/`: a stop-step judge brief that returns a bucket and the words, by `references/chief.md`.
- `.agents/settings.json` and `.agents/hooks.json`: the `Stop` entry runs the check with a longer timeout; `mark` stays for the worker.
- `.agents/skills/daily/scripts/daily.mjs`: `ensure`, `checkins on|off`; `serve` takes a single-instance lock and `--agent`; default settings when no file matches; the `watch` command goes.
- `.agents/skills/daily/scripts/config.mjs`: `defaultSettings`. `chief.mjs`: `admit` takes only own-repo chats; the chat-watch end paths go. `worker.mjs`: no default `stopped`/`asking` jobs; the lock.
- `.agents/skills/memory/scripts/session-start.mjs`: calls `daily.mjs ensure`. `daily.mjs journal --hook` and `journal.mjs` `newLines`: know the Daily chat by its transcript, not `PASEO_AGENT_ID`, and add the new day's start.
- `.agents/skills/daily/SKILL.md`, `references/chief.md`, `references/sweeps.json`, `wiki/development/daily.md`.
- Tests: `scripts/tests/daily*.test.mjs`, a new `daily-stop-check.test.mjs`, the session-start hook test. `scripts/retired-names.json`: `daily.mjs watch`. `CHANGELOG.md` (`minor`).

## Decision log

- **2026-11-03** — Asked whether memory should move from chat start to the daily's background worker → chose to split it: memory loads at chat start, and saving stays a background run started at chat start; neither moves to the worker.
- **2026-11-03** — Asked whether the always-on server should be required → chose no: it stays optional, because a laptop's chats can only be saved and watched on that laptop, and WongStack requires no host.
- **2026-11-03** — Asked whether check-ins should continue past 24 hours → chose yes, every day, with no daily end.
- **2026-11-03** — Asked whether check-ins should work for people who don't use `/daily` → chose yes: no settings file needed.
- **2026-11-03** — Asked whether review pages should stay available → chose yes, never deleted; planned in its own workspace, "Keep review pages in an Inbox archive".
- **2026-11-03** — Asked whether to plan everything as one change or two → chose two: check-ins here, the Reviews list in its own workspace.
- **2026-11-03** — Asked whether check-ins without Paseo go in this plan → chose yes: Matthew wants the option to leave Paseo.
- **2026-11-03** — Asked whether check-ins run only in the chat's stop step, or also through the Paseo worker for the cases a stop step can't cover → chose the stop step only: one way everywhere; a stop within 15 minutes of the person's message, and a question with options, wait for the person.
- **2026-11-03** — Asked whether an open Daily chat should start a new day's list and routines by itself on the person's first message that day → chose yes, so one Daily chat can stay open for days.
- **2026-11-03** — Assumed: the Daily chat is known by its first message being `/daily`, in the stop step and in the message step alike, and its journal place is kept by the chat's session id, because a chat outside Paseo has no agent label.
- **2026-11-04** — Assumed: a Codex Daily chat, which has no message hook, gets the new day's start from `D journal --new` (which SKILL.md has it run each message), because the spec promises the new-day start for every AI tool and the review found Codex left out.
- **2026-11-04** — Assumed: the daily finds a settings file only by its `emails`, for every command, not "the only file" as before, because the review found a teammate with no file ran as that file's person (its off file, its worker and its jobs), and one person resolved two ways would split the morning and the journal across two state folders.
- **2026-11-03** — Assumed: the stop step lets the chat stop when the person wrote less than 15 minutes before, rather than holding the stop open for the rest of the 15 minutes, because a held stop blocks the chat the person may be typing in.
- **2026-11-03** — Assumed: the helper's run is capped at 4 minutes and the stop goes ahead on a timeout or an error, because a stuck check must never keep a chat from stopping.
- **2026-11-03** — Assumed: background runs are skipped by their environment, because a stop step outside Paseo has no agent label to read.
- **2026-11-03** — Assumed: Codex uses the same carry-on answer as Claude Code, as the build helper's stop check already does for both, and the build checks it live in Codex.
- **2026-11-03** — Assumed: the background worker stays for board to-dos, add-ons and timed jobs, starts at chat start only when the person has one of those, and needs no Paseo for timed jobs, because cleanup jobs planned next run there.
- **2026-11-03** — Assumed: one worker per person per repo, watching only its own repo's chats, with a single-instance lock, because two repos on one computer would otherwise add one chat's to-do twice.
- **2026-11-03** — Assumed: the off switch is a command (`checkins off|on`) saved per person and repo, not an environment variable, because a teammate asks in chat and never edits a shell profile.
- **2026-11-03** — Assumed: with no settings file, the person is the company sign-in's email, else the git email, and the time zone is the computer's, because these are what the computer already knows.
- **2026-11-03** — Assumed: the systemd service file stays as an option, and a second `serve` exits when another holds the lock, because a server that reboots should not wait for a chat.
- **2026-11-03** — Assumed: until WongOS takes this release, WongStack runs `checkins off` on the shared server, because WongOS's own worker still judges every chat there.
- **2026-11-03** — Check: removed the chief tests for the watch's `hours` end, its empty-list end and its stopped-service end, and `readArgs`'s `watch --hours` case, because the watch command, its time limit and those ends are gone; the empty-list test now checks that a gone chat leaves one time. The journal's "another chat gets nothing" case now keeps one place per chat key, and the worker's merge test expects only the install's own `invoice` event, because the default `stopped` and `asking` jobs moved to the stop step.
- **2026-11-04** — Built and reviewed in two rounds; a person's own message that equals a kept reply now counts as theirs, and only the host's wrap marks a check-in's reply. Live in a scratch checkout outside Paseo: a Claude Code chat and a Codex chat each stopped after a 16-minute wait and carried on by their own stop step; a stop right after the person's message got no check-in; the judge let a looping chat wait for the person. WongStack's check-ins are off on the shared server until WongOS takes this release.
- **2026-11-04** — Merged with main's wrap-up-and-wiki-tidy (45.5.0): its two default jobs stay in the defaults list, so the worker now starts at every chat start unless both are off or check-ins are off; without Paseo the wiki tidy still runs and the wrap-up waits. This replaces this plan's "the daily ships no job of its own".
- **2026-11-04** — Archive checkpoint: archived at `openspec/changes/archive/2026-11-04-checkins-for-everyone` and saved for publishing, with main merged in.

<!-- end proposal.md -->
<!-- file design.md utf8 11146 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 6016 -->
## 1. Settings without a file

- [x] 1.1 In `.agents/skills/daily/scripts/config.mjs`, add `defaultSettings({ email, timezone })` by the design; test it in `scripts/tests/daily.test.mjs`, including an email with dots and a plus.
- [x] 1.2 In `daily.mjs`, export one resolver for the person's settings, the given file or the defaults, and use it in `main()` for every command but `start`, `picture`, `start-task` and `remind`, which keep the "No daily settings" error; the sign-in email when `valid` or `near`, else the git email. Test both paths and the kept error.

## 2. The stop step's check

- [x] 2.1 Add `.agents/skills/daily/scripts/stop-check.mjs` by the design: the skips (background runs, off, the Daily chat, `ask-check`'s block), the person's turn under 15 minutes, the streak file, one headless judge with a 240-second kill, the block answer, and a journal line each time. Inject the clock, the spawn and the state folder for tests.
- [x] 2.2 Read the person's last message and the transcript's tail for Claude Code and Codex rows, reusing `memory/scripts/lib/transcripts.mjs` and the row shapes `apply/scripts/helper-stop-check.mjs` reads; tool results and hook text are not the person's message.
- [x] 2.3 Add `.agents/skills/daily/references/briefs/stop-judge.md` and a short "From the stop step" section in `references/chief.md`: no `D reply`, end with the JSON line.
- [x] 2.4 In `.agents/settings.json` and `.agents/hooks.json`, add the `Stop` entry running `stop-check.mjs stop --agent claude|codex` with `"timeout": 300`; keep `mark` and `ask-check`.
- [x] 2.5 Write `scripts/tests/daily-stop-check.test.mjs`: away 40 minutes and a named next step → block with the reply; a message 5 minutes old → nothing and the streak reset; the sixth stop in a row → nothing and a journal line; off → nothing; a `/daily` chat → nothing; `WONG_DAILY_RUN` → nothing; a timeout, a bad end line, and a judge error → nothing; `ask-check` blocking → nothing; a Codex transcript → the same answers as Claude Code.

## 3. The worker, kept running when needed

- [x] 3.1 In `worker.mjs` or `daily.mjs serve`, take `<state>/serve.lock` with the pid; take over a dead pid's or stale beat's lock; a second `serve` exits 0 with one stderr line; add `serve --agent claude|codex`, with the settings' `runs.agent` winning. Test the take, the refusal and the takeover in `scripts/tests/daily-worker.test.mjs`.
- [x] 3.2 Make `serveDaily` keep running timed sweeps when Paseo is absent, skipping the chat watch, board to-dos and hands; test with a failing `paseoCli`.
- [x] 3.3 Add `D ensure` by the design, returning `{ state: 'started'|'running'|'off'|'no-jobs'|'no-person'|'run' }`; test each state with an injected spawn.
- [x] 3.4 Add `D checkins off|on`: `off` writes `<state>/off`, stops the lock's pid and journals a line; `on` removes it and runs `ensure`. Test both, and that `ensure` and `stop-check` do nothing while off.
- [x] 3.5 In `.agents/skills/memory/scripts/session-start.mjs`, call `ensure` inside a try, adding no output or time; test that a memory run and a daily run start no worker.
- [x] 3.6 In `chief.mjs` `admit()`, take a chat only when its `cwd` has this repo's git common dir, cached per cwd; started and handed rows stay from any folder. Test a chat in a Paseo worktree of this repo (taken), one in another repo (skipped), and one whose folder is gone (skipped) in `scripts/tests/daily-chief.test.mjs`.

## 4. The Daily chat stops watching

- [x] 4.1 Remove the `stopped` and `asking` events from `references/sweeps.json`.
- [x] 4.2 Remove the `watch` CLI command and `--hours`, the non-service `end('time')` and `end('empty')` paths, and `passes()`'s `serviceAlive` check; keep `watch()` for the worker. Update `scripts/tests/daily-chief.test.mjs` and `daily.test.mjs`; add `daily.mjs watch` to `scripts/retired-names.json` and run `node scripts/check-retired-names.mjs`.
- [x] 4.3 `.agents/skills/daily/SKILL.md` step 4 and `references/chief.md`: `D ensure`, then the journal; *stop check-ins* and *start check-ins* run `D checkins off|on`; cut words elsewhere so `node scripts/measure-context.mjs --check` passes.

- [x] 4.4 In `daily.mjs` `journal --hook` and `journal.mjs` `newLines`, know the Daily chat by its transcript's first message and keep its place by `session_id`; on the first message of a day with no morning run, add the new-day line. Test in `scripts/tests/daily-journal.test.mjs`: a Daily chat outside Paseo gets its lines; another chat gets none; Tuesday's first message gets the new-day line, the second gets none, and a `/daily` message gets none.
- [x] 4.5 `.agents/skills/daily/SKILL.md`: one line saying the new-day line runs steps 2 and 3.

## 5. Words

- [x] 5.1 `wiki/development/daily.md`: each chat checks its own stops, with or without Paseo; what waits for the person; a settings file is optional for check-ins; turning check-ins off; one Daily chat kept open for days; the worker starts at chat start only for board to-dos, add-ons and own jobs, and the service file stays an option. Keep the page under 3,000 words, and run `node scripts/check-payload-links.mjs`.
- [x] 5.2 `CHANGELOG.md` `## Next (minor) — Check-ins for everyone, with or without Paseo`, with an Updating note in plain words: check-ins now come from each chat; a computer that runs the daily as a service keeps it; an install that added its own `stopped` or `asking` job keeps it.

## 6. Verify

- [x] 6.1 Run the daily and memory tests and `node .github/scripts/checks.mjs --worktree`.
- [x] 6.2 On this computer, run `D checkins off` in this checkout first (WongOS's worker still judges every chat here). In a scratch checkout, outside Paseo, run one Claude Code chat and one Codex chat each to a stop with a named next step while the last person message is over 15 minutes old (set by the test clock or a waited turn), and confirm each carries on, writes a journal line, and that a fresh message makes the next stop wait.
- [x] 6.3 `/save`, and check the gate passes.

<!-- end tasks.md -->
<!-- file specs/daily-routine/spec.md utf8 8064 -->
## ADDED Requirements

### Requirement: Each chat checks its own stops

When a chat in the repo stops, the chat itself SHALL get the check-in, in any app that runs a supported AI tool, with or without Paseo, every day with no end. A stop less than 15 minutes after the person's own last message in that chat SHALL be the person's turn and SHALL get no check-in. Otherwise one helper with fresh context SHALL judge the stop; on *keep going* or a safe pick the chat SHALL carry on by itself, and on *needs you* it SHALL stop. A check-in that fails or runs out of time SHALL let the chat stop. The Daily chat, a background run's chat and a sub-agent SHALL get no check-in, and a chat SHALL get no sixth check-in in a row with no word from the person.

#### Scenario: Away during a long build

- **WHEN** Jo writes in a chat at 9:00, leaves, and the chat stops at 9:40 with "Tests pass; next I'll update the wiki page"
- **THEN** the chat carries on by itself, and Jo finds it further on when back

#### Scenario: The person is answering

- **WHEN** Jo writes in a chat at 9:56 and the chat stops at 10:01
- **THEN** the chat stops and waits for Jo, with no check-in

#### Scenario: A chat outside Paseo

- **WHEN** a teammate runs a chat in a plain terminal, leaves, and it stops 30 minutes later with its work half done
- **THEN** that chat gets its check-in the same way as a chat in Paseo

### Requirement: Check-ins need no settings file

A person with no daily settings file SHALL get check-ins as the person from their company sign-in, else the repo's git email, in the computer's time zone. A settings file SHALL add the morning list, the board, routines and the install's own jobs, and its values SHALL win.

#### Scenario: A teammate who never typed /daily

- **WHEN** a teammate with no settings file leaves a chat that later stops with its work half done
- **THEN** a check-in keeps that chat going, and nothing is added to their board

### Requirement: A person can turn check-ins off

A person SHALL be able to turn their check-ins off and on again by asking in any chat. Off SHALL apply to that person in that repo, until they turn it on.

#### Scenario: Turned off

- **WHEN** Jo says *stop check-ins*, then leaves three chats that stop
- **THEN** each of the three stops and waits for Jo

### Requirement: Opening a chat keeps the daily's jobs running

When a person who has daily background jobs opens any chat in a repo, the daily SHALL make sure one worker runs for that person and repo, and start it in the background when none does, without holding up the chat. Background jobs are the person's board to-dos, add-ons and timed jobs. Timed jobs SHALL run with or without Paseo. A chat that a background run opened SHALL start no worker, and a second start SHALL never make a second worker for the same person and repo. A worker SHALL handle only its own repo's chats, and the chats its daily started or was handed.

#### Scenario: Two days later

- **WHEN** Jo's worker started on Monday morning and Jo's weekly job is due on Wednesday while the computer stayed on
- **THEN** the job runs, and opening another chat starts no second worker

#### Scenario: Two repos on one computer

- **WHEN** Jo has chats open in two repos, each with its own worker
- **THEN** each chat has one to-do on Jo's board, from its own repo's worker

### Requirement: The Daily chat answers at any time

After the morning reply, the person SHALL be able to ask the Daily chat, at any time, where things stand, which it answers from the journal, with or without Paseo. A Daily chat SHALL be able to stay open for days: the person's first message on a new day SHALL bring that day's list and start its routines, as `/daily` does, and a second message that day SHALL start nothing again. Where the host can watch other agents, the person SHALL also be able to ask it for a reminder, a watch, a message to a chat, or a new task.

#### Scenario: A task asked mid-day

- **WHEN** the person tells the Daily chat "get someone to research packaging suppliers"
- **THEN** it opens a workspace for that task and names it in the chat, and that chat gets its check-ins like any other

#### Scenario: The Daily chat left open overnight

- **WHEN** Jo's Daily chat from Monday is still open and Jo writes "morning" in it on Tuesday
- **THEN** the reply gives Tuesday's list and Tuesday's routines start, with no new `/daily`

## MODIFIED Requirements

### Requirement: A helper sorts each stop into three buckets

Each time a chat stops for its check-in, its helper SHALL decide one of three things: reply *keep going* when the agent reported progress and named its next step; pick the answer when the agent's question has a safe recommended or already-settled answer; else leave the stop for the person. A risky step, such as sending, paying, publishing or deleting, SHALL never be picked, a finished plan SHALL wait for the person, and a question asked with the question tool SHALL wait for the person.

#### Scenario: An agent names its next step

- **WHEN** a chat ends its turn with "Tests pass; next I'll update the wiki page"
- **THEN** the helper replies *keep going*, without asking the person

#### Scenario: A risky recommended choice

- **WHEN** a chat asks whether to send a drafted email to a customer, with *Send it* recommended
- **THEN** the helper sends nothing, and the question waits in that chat

### Requirement: The Daily chat holds only the person's talk

The Daily chat SHALL receive no event messages: what happens goes to a private journal on that computer, outside git, kept 14 days. Each check-in SHALL add one line saying what was seen, what was done, or what waits for the person. When the person writes in the Daily chat, its agent SHALL get the journal lines new since their last message, out of the person's sight. The only message the computer SHALL send the Daily chat is one line a day when the person's board can not be read.

#### Scenario: The person asks what happened

- **WHEN** three check-ins kept chats going during the morning and the person asks *what's going on?*
- **THEN** the agent answers from the journal, and the Daily chat shows no message for those three stops

#### Scenario: The board can not be read

- **WHEN** the board's sign-in ends and the computer can not read the board all afternoon
- **THEN** the Daily chat gets one line saying so that day, and no more

### Requirement: An install adds its own background jobs

An install SHALL be able to add background jobs in one list in its own daily folder: an event or a time that starts each job, an optional check with no AI that says whether there is work, and the instructions the run follows. The daily SHALL ship no job of its own in that list. An update SHALL never change or remove that list. A job's run SHALL never send, pay, publish or delete unless its own instructions allow that one step.

#### Scenario: A weekly job

- **WHEN** an install's list has a job every Monday at 9:00 with a check
- **THEN** at 9:00 on Monday the check runs, and a background run starts only when the check finds work

#### Scenario: A computer that was off

- **WHEN** the computer was off at 9:00 and starts at 11:00
- **THEN** the 9:00 job does not run that day

## REMOVED Requirements

### Requirement: Background helpers judge each stop

**Reason**: A stop is judged in the chat's own stop step, not by a background helper that a watch starts; the new requirement "Each chat checks its own stops" holds the promise, and works without Paseo.

**Migration**: None for the person. An install whose own jobs list names the `stopped` or `asking` events keeps them; the default list no longer does.

### Requirement: The Daily chat watches the person's chats all day

**Reason**: The Daily chat no longer watches. Each chat checks its own stops, every day with no 24-hour end; "The Daily chat answers at any time" keeps what the person can ask it.

**Migration**: None for the person: `/daily` no longer starts a watch. The 15-minute wait moves to "Each chat checks its own stops".

<!-- end specs/daily-routine/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-03

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 94058 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes: each button shows when the link offers it.
  A preview page (data-kind="preview", from apply's preview-review.mjs) names the finished build and offers Publish.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-11-04-checkins-for-everyone</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .back { display:flex; align-items:center; gap:8px; min-width:0; margin:0 0 8px; }
  .back .muted { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  /* Picture files: a wrapping row of labelled figures in em, so the fit and zoom scale them like a drawing; two sit side by side when they fit. */
  .art.photo { width:49.2em; display:flex; flex-wrap:wrap; align-items:flex-start; gap:.8em; white-space:normal; line-height:1.3; }
  .art.photo figure { flex:1 1 18em; min-width:0; margin:0; text-align:center; }
  .art.photo img { display:block; width:100%; height:auto; max-height:40em; object-fit:contain; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art.photo figcaption { margin-top:.3em; color:var(--muted-foreground); font-size:.95em; }
  .shot { position:relative; display:block; } .art .pin.spot { position:absolute; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture; several sit side by side when they fit. */
  .art.ads { width:auto; max-width:49.2em; margin-right:1px; }
  .ad { flex:1 1 15em; max-width:20em; min-width:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .art.photo .ad img { max-height:none; aspect-ratio:4 / 5; object-fit:cover; border:0; border-radius:0; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .art.photo .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  .try { margin:8px 0 0; padding:0 var(--pad); }
  .item > .verdict { grid-column:1 / -1; display:flex; align-items:center; gap:8px; margin-top:10px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  body.read-only .bar, body.read-only .add, body.read-only .verdict, body.read-only .hint, body.read-only .vhint .note-it, body.read-only #chip { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-11-04-checkins-for-everyone" data-own-back>
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-11-04-checkins-for-everyone</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint"><span class="lead">Tap + Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Open a drawing and tap it to see it full screen.</span></p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Today a stopped chat gets a check-in only while a Daily chat is open in Paseo, and only for 24 hours, or from a computer service someone set up by hand. A teammate who never types <code>/daily</code> gets none, and a chat outside Paseo gets none. Check-ins should work for everyone, every day, with nothing to set up, and keep working if we ever leave Paseo.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Every chat checks its own stops.</b> When a chat stops and you have been away from it for 15 minutes or more, the chat's own stop step asks a fresh AI helper, with the same rules as today's check-ins: keep going, take the safe pick, or wait for you. On <i>keep going</i> or a safe pick, the chat carries on by itself. It works in any app that runs Claude Code or Codex, in Paseo or not, every day, with no 24-hour end. You see a short pause at the stop while the helper decides.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:41.462em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 539 547" width="539" height="547" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_s_q_0"><path d="M198.28,56L198.28,97"/><path class="pele-marker" d="M198.28,104L194.92,96L201.64,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_q_y_0"><path d="M157.25,247.18C157.25,270.26 87.36,270.26 87.36,293.33L87.36,350.83"/><path class="pele-marker" d="M87.36,357.83L84,349.83L90.72,349.83Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_q_h_0"><path d="M239.32,247.18C239.32,270.26 309.21,270.26 309.21,293.33L309.21,338.83"/><path class="pele-marker" d="M309.21,345.83L305.85,337.83L312.57,337.83Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_h_c_0"><path d="M258.72,417.83C258.72,428.08 194.28,428.08 194.28,438.33L194.28,483.83"/><path class="pele-marker" d="M194.28,490.83L190.92,482.83L197.64,482.83Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_h_w_0"><path d="M359.7,417.83C359.7,428.08 424.13,428.08 424.13,438.33L424.13,483.83"/><path class="pele-marker" d="M424.13,490.83L420.77,482.83L427.49,482.83Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_q_y_0"><rect x="72.47" y="295.33" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="87.36" y="310.73" text-anchor="middle">yes</text></g><g class="pele-edge-label" data-id="L_q_h_0"><rect x="297.42" y="295.33" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="309.21" y="310.73" text-anchor="middle">no</text></g><g class="pele-edge-label" data-id="L_h_c_0"><rect x="118.3" y="440.33" width="151.96" height="21" rx="3" fill="var(--_bg)"/><text x="194.28" y="455.73" text-anchor="middle">keep going or safe pick</text></g><g class="pele-edge-label" data-id="L_h_w_0"><rect x="387.83" y="440.33" width="72.6" height="21" rx="3" fill="var(--_bg)"/><text x="424.13" y="455.73" text-anchor="middle">needs you</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="s" transform="translate(198.28,32)"><rect x="-67.81" y="-24" width="135.62" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">the chat stops</text></g><g class="pele-node pele-shape-diam" data-id="q" transform="translate(198.28,188.42)"><polygon points="0,-84.41 135.06,0 0,84.42 -135.06,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" text-anchor="middle" xml:space="preserve"><tspan x="0" y="-6.4">you wrote in the last 15</tspan><tspan x="0" y="17.6">min?</tspan></text></g><g class="pele-node pele-shape-rect" data-id="y" transform="translate(87.36,381.83)"><rect x="-79.36" y="-24" width="158.72" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">it stops: your turn</text></g><g class="pele-node pele-shape-rect" data-id="h" transform="translate(309.21,381.83)"><rect x="-102.49" y="-36" width="204.98" height="72" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" text-anchor="middle" xml:space="preserve"><tspan x="0" y="-6.4">a fresh helper reads the</tspan><tspan x="0" y="17.6">chat</tspan></text></g><g class="pele-node pele-shape-rect" data-id="c" transform="translate(194.28,514.83)"><rect x="-83.81" y="-24" width="167.62" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">the chat carries on</text></g><g class="pele-node pele-shape-rect" data-id="w" transform="translate(424.13,514.83)"><rect x="-106.04" y="-24" width="212.08" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">it stops and waits for you</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>What still waits for you.</b> A check-in never answers for you when you just wrote, and it never takes a risky step.</div></div><div class="table"><table class="tbl"><thead><tr><th>The stop</th><th>What happens</th></tr></thead><tbody><tr data-note="item-2-row-1" tabindex="0"><td>Less than 15 minutes after your message</td><td>it stops; it's your turn</td></tr><tr data-note="item-2-row-2" tabindex="0"><td>A question with options to pick from</td><td>it waits for you</td></tr><tr data-note="item-2-row-3" tabindex="0"><td>Anything that sends, pays, publishes, deletes or accepts terms</td><td>it waits for you</td></tr><tr data-note="item-2-row-4" tabindex="0"><td>The fifth check-in in a row with no word from you</td><td>it waits for you</td></tr></tbody></table></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>No daily settings needed.</b> Check-ins use your company sign-in, else your git email. A settings file still adds your morning list, your board, your routines and your own jobs.</div></div><div class="table"><table class="tbl"><thead><tr><th></th><th>Without settings</th><th>With settings</th></tr></thead><tbody><tr data-note="item-3-row-1" tabindex="0"><td>Check-ins</td><td>yes</td><td>yes</td></tr><tr data-note="item-3-row-2" tabindex="0"><td>Morning list, board, routines</td><td>no</td><td>yes</td></tr><tr data-note="item-3-row-3" tabindex="0"><td>Your own jobs</td><td>no</td><td>yes</td></tr></tbody></table></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The Daily chat is where you talk, not where it watches.</b> <code>/daily</code> gives your morning list, then answers <i>what's going on?</i> from the check-ins' journal. Keep one Daily chat open for days: your first message each new day brings that day's list and starts its routines, with no new <code>/daily</code>. Your board's to-dos, your add-ons and your own timed jobs keep running in the background: opening any chat starts that helper when you have such a job, so there is no service to install.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">Today                        After</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">/daily → list                /daily → list</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">chat watches for 24 h        each chat checks itself</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">needs Paseo                  Paseo or not</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">/daily again each morning    first message of the day</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>You can turn it off.</b> Say <i>stop check-ins</i> in any chat, and <i>start check-ins</i> to turn them on again. It applies to you, in that repo only.</div></div></li>
</ol>
<p class="aside">Non-goals: answering a question with options for you; no change to what a check-in may do alone; routines in their own workspaces, hand-offs and <i>tell flashy-crab …</i> still need Paseo; memory loads and saves as today; the Reviews list and the cleanup jobs (each in its own workspace).</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked whether memory should move from chat start to the daily's background worker → chose to split it: memory loads at chat start, and saving stays a background run started at chat start; neither moves to the worker.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked whether the always-on server should be required → chose no: it stays optional, because a laptop's chats can only be saved and watched on that laptop, and WongStack requires no host.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked whether check-ins should continue past 24 hours → chose yes, every day, with no daily end.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked whether check-ins should work for people who don't use <code>/daily</code> → chose yes: no settings file needed.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked whether review pages should stay available → chose yes, never deleted; planned in its own workspace, &quot;Keep review pages in an Inbox archive&quot;.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked whether to plan everything as one change or two → chose two: check-ins here, the Reviews list in its own workspace.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked whether check-ins without Paseo go in this plan → chose yes: Matthew wants the option to leave Paseo.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked whether check-ins run only in the chat's stop step, or also through the Paseo worker for the cases a stop step can't cover → chose the stop step only: one way everywhere; a stop within 15 minutes of the person's message, and a question with options, wait for the person.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked whether an open Daily chat should start a new day's list and routines by itself on the person's first message that day → chose yes, so one Daily chat can stay open for days.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: the Daily chat is known by its first message being <code>/daily</code>, in the stop step and in the message step alike, and its journal place is kept by the chat's session id, because a chat outside Paseo has no agent label.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: a Codex Daily chat, which has no message hook, gets the new day's start from <code>D journal --new</code> (which SKILL.md has it run each message), because the spec promises the new-day start for every AI tool and the review found Codex left out.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: the daily finds a settings file only by its <code>emails</code>, for every command, not &quot;the only file&quot; as before, because the review found a teammate with no file ran as that file's person (its off file, its worker and its jobs), and one person resolved two ways would split the morning and the journal across two state folders.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: the stop step lets the chat stop when the person wrote less than 15 minutes before, rather than holding the stop open for the rest of the 15 minutes, because a held stop blocks the chat the person may be typing in.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: the helper's run is capped at 4 minutes and the stop goes ahead on a timeout or an error, because a stuck check must never keep a chat from stopping.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: background runs are skipped by their environment, because a stop step outside Paseo has no agent label to read.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: Codex uses the same carry-on answer as Claude Code, as the build helper's stop check already does for both, and the build checks it live in Codex.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: the background worker stays for board to-dos, add-ons and timed jobs, starts at chat start only when the person has one of those, and needs no Paseo for timed jobs, because cleanup jobs planned next run there.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: one worker per person per repo, watching only its own repo's chats, with a single-instance lock, because two repos on one computer would otherwise add one chat's to-do twice.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: the off switch is a command (<code>checkins off|on</code>) saved per person and repo, not an environment variable, because a teammate asks in chat and never edits a shell profile.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: with no settings file, the person is the company sign-in's email, else the git email, and the time zone is the computer's, because these are what the computer already knows.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: the systemd service file stays as an option, and a second <code>serve</code> exits when another holds the lock, because a server that reboots should not wait for a chat.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: until WongOS takes this release, WongStack runs <code>checkins off</code> on the shared server, because WongOS's own worker still judges every chat there.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-03</p>Check: removed the chief tests for the watch's <code>hours</code> end, its empty-list end and its stopped-service end, and <code>readArgs</code>'s <code>watch --hours</code> case, because the watch command, its time limit and those ends are gone; the empty-list test now checks that a gone chat leaves one time. The journal's &quot;another chat gets nothing&quot; case now keeps one place per chat key, and the worker's merge test expects only the install's own <code>invoice</code> event, because the default <code>stopped</code> and <code>asking</code> jobs moved to the stop step.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-04</p>Built and reviewed in two rounds; a person's own message that equals a kept reply now counts as theirs, and only the host's wrap marks a check-in's reply. Live in a scratch checkout outside Paseo: a Claude Code chat and a Codex chat each stopped after a 16-minute wait and carried on by their own stop step; a stop right after the person's message got no check-in; the judge let a looping chat wait for the person. WongStack's check-ins are off on the shared server until WongOS takes this release.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-04</p>Merged with main's wrap-up-and-wiki-tidy (45.5.0): its two default jobs stay in the defaults list, so the worker now starts at every chat start unless both are off or check-ins are off; without Paseo the wiki tidy still runs and the wrap-up waits. This replaces this plan's &quot;the daily ships no job of its own&quot;.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-04</p>Archive checkpoint: archived at <code>openspec/changes/archive/2026-11-04-checkins-for-everyone</code> and saved for publishing, with main merged in.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom<span class="note-it"> · tap a line or picture to note it</span></p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" data-actions="[{&quot;name&quot;:&quot;build&quot;,&quot;label&quot;:&quot;Build it&quot;,&quot;done&quot;:&quot;Asked the chat to build.&quot;},{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build and publish&quot;,&quot;done&quot;:&quot;Asked the chat to build and publish.&quot;,&quot;confirm&quot;:{&quot;say&quot;:&quot;Goes live, can't be undone.&quot;,&quot;yes&quot;:&quot;Yes, publish&quot;,&quot;ask&quot;:&quot;Build and publish? This goes live and can't be undone.&quot;}}]" hidden>
    <div id="ready-confirm" role="group" hidden><p></p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span></span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  // A preview page shows a finished build: its words name the preview. A review page of other work names its cards.
  const PREVIEW = document.body.getAttribute('data-kind') === 'preview', NAME = PREVIEW ? CHANGE.replace(/-preview$/, '') : CHANGE;
  const REVIEW = document.body.getAttribute('data-kind') === 'review', NOUN = REVIEW ? 'Card' : 'Change', PAGE = REVIEW ? 'page' : 'plan';
  if (PREVIEW) {
    document.title = 'Preview · ' + NAME;
    document.querySelector('.eyebrow').textContent = NAME;
    document.querySelector('h1').textContent = 'Built: look, then publish?';
    document.querySelector('.hint .lead').textContent = 'Tap a picture to see it full screen, then tap it to note it.';
    document.querySelector('.hint .tail').textContent = '';
  }
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Change on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {} };
  // A note on words keeps its quote; a note on a picture spot keeps the picture, the spot in percent, and its name.
  const EXTRA = { quote: 'string', k: 'number', x: 'number', y: 'number', on: 'string' };
  const ok = function (r, id) {
    return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id)
      && Object.keys(EXTRA).every(function (f) { return r[f] === undefined || typeof r[f] === EXTRA[f]; });
  };
  function extraOf(rec) {
    const x = {};
    Object.keys(EXTRA).forEach(function (f) { if (rec && rec[f] !== undefined) x[f] = rec[f]; });
    return x;
  }
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
      if (saved && saved.ok && typeof saved.ok === 'object') {
        data.ok = {};
        Object.keys(saved.ok).forEach(function (id) { if (/^item-\d+$/.test(id) && (saved.ok[id] === true || saved.ok[id] === 'sent')) data.ok[id] = saved.ok[id]; });
      }
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?(?:-(words|spot)-\d+)?$/.exec(id) || [];
    if (m[5]) return Object.assign(where(id.replace(/-(words|spot)-\d+$/, '')), m[5] === 'words' ? { kind: 'words' } : {});
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: NOUN + ' #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    // Picture files read as their labels, joined with a dot.
    const row = el.tagName === 'TR', photo = el.classList.contains('photo'), cells = row ? c.querySelectorAll('td') : photo ? c.querySelectorAll('img')
      : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return (photo ? n.alt : n.textContent).replace(/\s+/g, ' ').trim(); }).join(row || photo ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  // A note on words or a spot sits on its base target: words are found again by their quote, a spot by the base's label.
  function find(id, rec) {
    const m = /^(.*)-(words|spot)-\d+$/.exec(id), el = document.querySelector('[data-note="' + (m ? m[1] : id) + '"]');
    if (!el) return null;
    if (m && m[2] === 'words') return textOf(el).indexOf(rec.quote) >= 0 ? el : null;
    if (m && !el.querySelectorAll('.shot')[rec.k]) return null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add'), function (n) { n.parentNode.removeChild(n); });
    return c.textContent.replace(/\s+/g, ' ');
  }
  // A new note on words or a spot takes the next free number on its target.
  function nextId(base, kind) {
    const pre = base + '-' + kind + '-';
    let k = 1;
    data.notes.map(function (n) { return n.id; }).concat(Object.keys(data.drafts)).forEach(function (id) {
      if (id.indexOf(pre) === 0) k = Math.max(k, +id.slice(pre.length) + 1);
    });
    return pre + k;
  }
  // The notes list groups notes by Why, each card, and Decisions.
  function groupOf(id) {
    const m = /^(why|item|decision)-(\d+)/.exec(id) || [];
    return m[1] === 'why' ? [0, 'Why'] : m[1] === 'item' ? [+m[2], NOUN + ' ' + m[2]] : [1e6, 'Decisions'];
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }))
      .map(function (id, i) { return [groupOf(id)[0], i, id]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    let group = null;
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec);
      if (groupOf(id)[1] !== group) {
        group = groupOf(id)[1];
        const head = document.createElement('li');
        head.className = 'group'; head.textContent = group;
        $('note-list').appendChild(head);
      }
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        if (rec.x !== undefined) {
          pin.className += ' spot'; pin.style.left = rec.x + '%'; pin.style.top = rec.y + '%';
          el.querySelectorAll('.shot')[rec.k].appendChild(pin);
        } else slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      const id = el.getAttribute('data-note');
      if (el.closest('.art') || el.querySelector('.pin[data-open="' + id + '"]')) return;
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    all('.verdict', function (v) {
      const id = v.querySelector('[data-ok]').getAttribute('data-ok'), state = data.ok[id], n = id.slice(5);
      v.querySelector('.tag').hidden = !state;
      v.querySelector('.tag').textContent = state === 'sent' ? 'OK · Sent' : 'OK';
      v.querySelector('[data-ok]').textContent = state ? 'Undo' : 'OK';
      v.querySelector('[data-ok]').setAttribute('aria-label', (state ? 'Undo OK on ' : 'OK ') + NOUN.toLowerCase() + ' ' + n);
      v.querySelector('[data-open]').hidden = !!state;
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, chipExtra = null, tap = null;
  // True once the inbox opens this page from its Archive: it takes no note.
  let readOnly = false;
  const pointers = {};
  // `extra` makes the chip start a new note on selected words or a picture spot.
  function showChip(el, x, y, keyboard, extra) {
    if (readOnly) return;
    const id = el.getAttribute('data-note');
    chipFor = el; chipExtra = extra || null;
    chip.textContent = extra && extra.quote ? 'Note' : !extra && (noteOf(id) || data.drafts[id]) ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; chipExtra = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a picture file in full screen notes that spot of it, kept in percent so it holds at any size.
  function spotAt(el, target, e) {
    if (!el.closest('#viewer') || !el.classList.contains('photo') || target.tagName !== 'IMG') return null;
    const r = target.getBoundingClientRect(), pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: Array.prototype.indexOf.call(el.querySelectorAll('img'), target), x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: target.alt };
  }
  // Selected words in one note target offer a note on just those words.
  let picking = 0;
  document.addEventListener('selectionchange', function () {
    clearTimeout(picking);
    picking = setTimeout(function () {
      const s = window.getSelection ? window.getSelection() : null;
      if (!s || s.isCollapsed || !s.rangeCount || open) return;
      const range = s.getRangeAt(0), at = range.commonAncestorContainer, host = (at.nodeType === 1 ? at : at.parentNode).closest('[data-note]');
      const quote = s.toString().replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!host || !quote || host.closest('.art, #editor, #viewer') || textOf(host).indexOf(quote) < 0) return;
      const r = range.getBoundingClientRect();
      showChip(host, r.left + r.width / 2, r.bottom, false, { quote: quote });
    }, 150);
  });
  chip.addEventListener('click', function () {
    if (!chipFor) return;
    const id = chipFor.getAttribute('data-note'), extra = chipExtra;
    openEditor(extra ? nextId(id, extra.quote ? 'words' : 'spot') : id, chipFor, extra);
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id);
    const el = rec ? find(id, rec) : t.closest('[data-note]') || document.querySelector('[data-note="' + id + '"]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) {
        const el = chipFor, words = chipExtra && chipExtra.quote;
        hideChip();
        if (words && window.getSelection) window.getSelection().removeAllRanges();
        el.focus();
      }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el, extra) {
    if (readOnly) return;
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const quote = extra && extra.quote, clip = quote && quote.length > 60 ? quote.slice(0, 59) + '…' : quote;
    const label = draft ? draft.label : note ? note.label : quote ? 'words "' + clip + '"' : labelOf(el);
    open = { id: id, label: label, el: el, extra: extra || extraOf(draft || note) };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = Object.assign({ label: open.label, text: text }, open.extra);
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push(Object.assign({ id: id, label: open.label, text: text }, open.extra));
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length, k = oks().length;
      copyNotes(function () { toast('Saved and copied ' + plural2(n, k) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump(hash) {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(typeof hash === 'string' ? hash : location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return Object.assign({ id: n.id, label: n.label, text: n.text }, extraOf(n)); }); }
  // An OK not yet in the chat, as its card's id, in card order.
  function oks() {
    return Object.keys(data.ok).filter(function (id) { return data.ok[id] === true; }).sort(function (a, b) { return a.slice(5) - b.slice(5); });
  }
  function acknowledge(notes, okd) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    okd.forEach(function (id) { if (data.ok[id] === true) data.ok[id] = 'sent'; });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id), spot = n.x === undefined ? '' : ', spot at ' + n.x + '% across and ' + n.y + '% down on "' + n.on + '"';
      return '- ' + w.spot + spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  // What goes to the chat: each OK on its own line, then the notes.
  function lines(notes, okd) {
    return okd.map(function (id) { return NOUN + ' #' + id.slice(5) + ': OK'; }).concat(bullets(notes)).join('\n');
  }
  function notesText() {
    const header = REVIEW ? document.body.getAttribute('data-header')
      : PREVIEW ? 'Notes on the preview of ' + NAME + ' from its review page. Don\'t publish yet.'
      : 'Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.';
    return header + '\n' + lines(unsent(), oks());
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  function plural2(n, k) { return !k ? plural(n) : (n ? plural(n) + ' and ' : '') + k + (k === 1 ? ' OK' : ' OKs'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length || oks().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), okd = oks(), n = notes.length, k = okd.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural2(n, k) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: lines(notes, okd) });
      const changed = 'The ' + PAGE + ' changed. Reload to read it first.';
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { says(changed); toast(changed); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes, okd);
      says('Sent ' + plural2(n, k) + ' to the chat.');
      toast('Sent ' + plural2(n, k) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length, k = oks().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural2(n, k) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── OK and Change on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Change ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Change</button>';
    item.appendChild(v);
  });
  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
  });
  // A picture file's spot pins sit over the picture itself.
  all('.art.photo img', function (img) {
    const shot = document.createElement('span');
    shot.className = 'shot';
    img.parentNode.insertBefore(shot, img);
    shot.appendChild(img);
  });

  // ── the page's own buttons, from the builder; one that can't be undone asks once more above the footer ──
  let version = null, confirming = null;
  const ACTIONS = JSON.parse($('ready').getAttribute('data-actions') || '[]');
  const actionOf = function (name) { return ACTIONS.filter(function (a) { return a.name === name; })[0] || null; };
  const choice = function (name) { return $('ready').querySelector('[data-ready="' + name + '"]'); };
  ACTIONS.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('data-ready', a.name); b.setAttribute('data-label', a.label);
    if (a.confirm) { b.textContent = a.label; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'ready-confirm'); }
    else b.innerHTML = '<span class="spinner" hidden aria-hidden="true"></span><span></span>';
    $('ready').insertBefore(b, $('ready-confirm'));
  });
  function fillConfirm(a) {
    confirming = a;
    $('ready-confirm').querySelector('p').textContent = a.confirm.say;
    $('ready-confirm').setAttribute('aria-label', a.confirm.ask);
    choice('yes').setAttribute('data-label', a.confirm.yes);
  }
  if (ACTIONS.filter(function (a) { return a.confirm; }).length) fillConfirm(ACTIONS.filter(function (a) { return a.confirm; })[0]);
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focus && wasOpen && !$('ready').hidden && confirming) choice(confirming.name).focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready'), spinner = b.querySelector('.spinner');
      const active = !!spinner && pending === (step === 'yes' ? confirming && confirming.name : step);
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(active));
      if (spinner) {
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : b.getAttribute('data-label');
      }
    });
    const shown = $('ready').hidden ? 0 : $('ready').querySelectorAll('#ready > button:not([hidden])').length;
    el.style.setProperty('--cols', String(Math.min(3, 1 + shown)));
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Each button shows when the link offers it; the choices stay hidden when it offers none.
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || typeof answer.version !== 'string') return;
    const shown = ACTIONS.filter(function (a) {
      choice(a.name).hidden = names.indexOf(a.name) < 0;
      return names.indexOf(a.name) >= 0;
    });
    if (!shown.length) return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot(), okd = oks();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length || okd.length) body.text = lines(notes, okd);
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? actionOf(name).done
        : r.status === 409 && a.changed === true ? 'The ' + PAGE + ' changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes, okd);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready'), a = actionOf(step);
    if (step === 'yes') act(confirming.name);
    else if (step === 'cancel' || a.confirm) {
      says('');
      if (a) fillConfirm(a);
      $('ready-confirm').hidden = step === 'cancel';
      all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', String(b === button)); });
      bar();
      choice(step === 'cancel' ? confirming.name : 'cancel').focus({ preventScroll: true });
    } else act(step);
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' ? { changed: true } : state === 'done' ? { done: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      post({ type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' });
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) { load(m.value); render(); }
    else if (hosted.reply && m.type === 'inbox:result') { const reply = hosted.reply; hosted.reply = null; reply(m.state); }
  }
  // Back and the workspace sit first in the page, so they scroll away with its words; the inbox's own bar stays put.
  function backRow(workspace) {
    const row = document.createElement('div'), back = document.createElement('button');
    row.className = 'back'; back.type = 'button'; back.className = 'btn-ghost'; back.textContent = 'Back';
    back.addEventListener('click', function () { post({ type: 'inbox:back' }); });
    row.appendChild(back);
    if (typeof workspace === 'string' && workspace) {
      const where = document.createElement('span');
      where.className = 'muted'; where.textContent = workspace; row.appendChild(where);
    }
    document.querySelector('main > header').prepend(row);
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    hosted = { reply: null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    backRow(m.workspace);
    // A closed page in the inbox's Archive opens read-only: no button, no note.
    if (m.readOnly === true) { readOnly = true; document.body.classList.add('read-only'); render(); return; }
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab and a # link scrolls in place: the frame never leaves this page.
  // A srcdoc page resolves #why against the inbox's address, so following it would load the inbox here.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    e.preventDefault();
    if (href.charAt(1) === '/') { jump(href); return; }
    let el = null;
    try { el = document.getElementById(decodeURIComponent(href.slice(1))); } catch (err) { /* a bad escape names nothing */ }
    if (el) el.scrollIntoView({ block: 'start' });
  }, true);
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
