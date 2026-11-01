# Your Daily chat holds only your talk

**Status:** ready-to-ship
**Branch:** pull-wongos-changes
**Open questions:** none

## Why

When the daily runs on a computer, it posts a `Watch ·` message in the Daily chat for each thing that happens: a chat stopped, a chat closed, a task done. In WongOS that was 25 messages by 10:00 on one day. WongOS fixed this on 2026-10-31 with a background worker, and it works there. The daily is WongStack's, so the fix goes up, and every install gets a clean Daily chat. It also fixes a bug: after you type in a chat, the daily can answer that chat before your 15 minutes end.

## What Changes

- **Your Daily chat holds only your talk.** With the daily running on a computer, the chat gets no `Watch ·` messages. You see the morning list and what you and the agent say. There is one exception: when your board can't be read, the chat gets one line a day, because then no to-do can carry it.
  ```text
  Today                     After
  ┌──────────────────────┐  ┌──────────────────────┐
  │ 8:00 list            │  │ 8:00 list            │
  │ Watch · 2026-11-01   │  │ You: move the dentist│
  │ {"event":"stopped"…} │  │      to Friday       │
  │ Watch · 2026-11-01   │  │ Agent: Moved.        │
  │ {"event":"gone"…}    │  │                      │
  │ You: move the dentist│  │                      │
  └──────────────────────┘  └──────────────────────┘
  ```
- **A background run does each job, with no chat.** The daily's computer service checks first, with no AI. When there is work, such as a stopped chat or a question card, it starts one AI run in the background with the same AI tool your chats use. Each run starts fresh, does its one job, writes one line, and ends. No chat or workspace opens. At most 3 runs work at the same time, and a run stops after 30 minutes. This replaces the old service, which posted the `Watch ·` messages.
  ```mermaid
  flowchart TD
    s["check, no AI"]
    s -->|work| r["background run"]
    r --> j[journal line]
    r --> b["to-do, if it needs you"]
  ```
- **Your agent still knows what happened.** Each run writes one line to a journal: what it saw, what it did, and what waits for you. The journal is a private file on the computer, not in git, and it keeps 14 days. Each time you write in the Daily chat, the new lines go to the agent, and you don't see them. Ask *what's going on?* and it answers from the journal.
  ```mermaid
  sequenceDiagram
    participant Run
    participant J as journal
    participant You
    participant A as agent
    Run->>J: Kept going: packaging research
    You->>A: what's up?
    J-->>A: new lines
    A->>You: answer
  ```
- **You can add your own jobs.** The daily starts with one job: judge a chat that stops or asks. Your install can add more in one list: what starts a job, how often, in which hours, and the instructions the run follows. Say *add a job that checks the frisbee payments every Monday at 9*, and the agent changes the list through the usual plan and review.
  | Job | When | What the run does |
  |---|---|---|
  | Your chats | a chat stops or asks | keeps it going, gives a safe answer, or leaves it for you |
  | Your own | the times you choose | your instructions, with a check first when you give one |
- **The 15-minute wait holds.** After you type in a chat, the daily sends that chat nothing for 15 minutes. Today the wait ends early when that chat works and stops again. Now it holds for the full 15 minutes, and if you type there again, the wait starts over.
  ```mermaid
  flowchart TD
    t["9:56 you type"] --> a["10:01 it stops"]
    a --> w["wait until 10:11"]
    w -->|you wrote again| x[no run]
    w -->|no word| j[run judges it]
  ```

Non-goals: no new chat or workspace; no change to what the daily may do alone (it still never sends, pays, publishes or deletes for you); no email jobs, which stay in WongOS; nothing installs the computer service for you.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: the computer service starts one background run per job and writes a journal in place of `Watch ·` messages; the Daily chat reads new journal lines when the person writes; an install adds jobs in one list; the 15-minute wait holds across a chat's later stops.

## Impact

- New in the daily skill: `.agents/skills/daily/scripts/worker.mjs` (the service loop and dispatch), `journal.mjs` (append, prune, read, hook), `references/sweeps.json` (the default job list), `references/briefs/header.md` and `judge.md`, with tests.
- `.agents/skills/daily/scripts/chief.mjs`: `serve` and its `Watch ·` batches go; the 15-minute hold in `notice` no longer drops when the agent runs again.
- `.agents/skills/daily/scripts/daily.mjs`: `serve` runs the worker; a new `journal` command.
- `.agents/skills/daily/SKILL.md`, `references/chief.md`, `.agents/settings.json` (one `UserPromptSubmit` hook).
- `wiki/development/daily.md`: the computer service, the journal, adding a job, a service example with `IS_SANDBOX=1` for a root Claude run.
- `scripts/tests/daily.test.mjs`, `scripts/tests/daily-chief.test.mjs`.
- `CHANGELOG.md` (`minor`). After the release, WongOS's next sync deletes its own `worker.mjs` and `journal.mjs`, keeps its email jobs in its own list, and drops the `.agents/settings.json` entry from its difference list.

## Decision log

- **2026-11-01** — Asked which WongOS changes go up to WongStack → chose the six small fixes, the 15-minute wait fix, and the quiet Daily chat; no email work.
- **2026-11-01** — Asked whether the background worker replaces the `Watch ·` service or sits beside it → chose replace: one way to run the daily on a computer.
- **2026-11-01** — Assumed: the 15-minute wait fix is part of this change, not its own, because the worker and the watch both hold a stop, and one change fixes both the same way.
- **2026-11-01** — Assumed: a background run uses the AI tool the person's chats use, Claude Code or Codex, picked the same way as the memory's background run, because WongStack names no single AI tool as required.
- **2026-11-01** — Assumed: the default job list ships in the skill, and an install adds jobs in its own `.agents/daily/` list, because an update never touches `.agents/daily/`.
- **2026-11-01** — Assumed: a Claude Code chat gets the journal lines through a hook; another AI tool's Daily chat runs `D journal --new` each time the person writes, as it runs `D watch --once` today.
- **2026-11-01** — Assumed: with no computer service, the Daily chat keeps its own watch and judges stops in background helpers as today, because a person with no always-on computer still needs the daily.
- **2026-11-01** — Assumed: the Claude Code hook runs `D journal --hook`, not `D journal --new`, because a hook must print its own JSON and must not wait on a sign-in check at each message; `--new` stays plain text for another AI tool.
- **2026-11-01** — Assumed: the 15-minute wait ends 15 minutes after the person's message, not after the stop, as the task's 9:56 → 10:11 example shows.
- **2026-11-01** — Assumed: the wiki gives a service file example and nothing installs it, as today, because how a computer runs a service differs.
- **2026-11-01** — Assumed: the wiki's service example drops the IS_SANDBOX line, because the worker sets it for a root Claude run.
- **2026-11-01** — Assumed: after the second review, a settings file is skipped as a job list only when it has no `person` and has `events` or `sweeps`, because a settings file with a misspelled field must still fail on that field.
