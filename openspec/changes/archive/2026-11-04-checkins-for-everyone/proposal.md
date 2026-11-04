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
