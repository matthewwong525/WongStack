# Chats close only when you say yes, and schedule runs stay out of the Inbox until they need you

**Status:** ready-to-ship
**Branch:** ordinary-insect
**Open questions:** none

## Why

Today a chat closes by itself when its task is done, and the background tidy-up closes saved chats left alone for 3 days. Closing a chat is your call: you may want to read it again, ask one more thing, or keep it as a reminder. Also, each schedule run shows in the Inbox while it works, so the list fills with runs that need nothing from you.

## What Changes

- **A finished chat asks before it closes.** When the work in a chat is done, the chat asks *Close this chat?*. It closes only when you say yes. When the task will clearly come back, the offer to make it a routine or a small app is one more answer in the same card. *Keep it open* leaves the chat as it is. Once you say yes, closing asks nothing more. *Close chat* in the Inbox, and *which ones to close?* in *what's going on?*, stay as they are.
  ```text
  It is live: https://admin.example/apps/notes/

  ┌ Question ─────────────────────────────┐
  │ Close this chat?                      │
  │ ( ) Close it (Recommended)            │
  │ ( ) Do this every Monday at 9         │
  │ ( ) Keep it open                      │
  └───────────────────────────────────────┘
  ```
- **The tidy-up stops closing chats.** The background tidy-up that runs when a chat starts no longer closes chats left alone for 3 days. It still deletes old temporary and scratch files and stops servers left running from a closed chat's folder.
  | The tidy-up | Before | After |
  |---|---|---|
  | Chats left alone 3 days | closes them | leaves them open |
  | Old temporary and scratch files | deletes them | deletes them |
  | Servers left from a closed chat | stops them | stops them |
- **A schedule's chat shows in the Inbox only when it needs you.** While a schedule's chat works, the Inbox does not show it. When it stops and stays open, such as a News run that failed, it shows in the *Working* group, marked *From a schedule*. A run that closes itself when it is done never shows. A run that ends well still closes itself, as now.
  ```mermaid
  stateDiagram-v2
    direction LR
    [*] --> Working: schedule starts
    Working --> Gone: run closes itself
    Working --> Shown: run stops, stays open
    note right of Working: not in the Inbox
    note right of Shown: in the Inbox
  ```

Non-goals: no change to what `/close` does once it runs; no change to *Close chat* in the Inbox or to *what's going on?*; no new Inbox group; routines that close themselves when they are done keep doing so.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-cleanup`: a finished task asks *Close this chat?* and runs `/close` only on a yes; the session-start tidy-up no longer archives idle workspaces; `/ship`'s close after a publish waits for that yes.
- `multi-part-workspaces`: after a publish in a Paseo worktree, `/ship` opens the next parts, then asks to close instead of closing.
- `inbox`: a chat a schedule opened stays off the chat list while it runs and shows only once it stops and stays open.

## Impact

- Rules: `AGENTS.md` (*One task, one workspace*), `wiki/development/the-change-loop.md#one-task-one-workspace`, `.agents/skills/explore/references/asking-the-user.md` (*End every reply with the next step*), `.agents/skills/plan/references/new-workspace.md#next-work`, `.agents/skills/ship/SKILL.md` step 6, `.agents/skills/lesson/SKILL.md`, `wiki/development/first-day/make-a-change.md`.
- Tidy-up: `.agents/skills/schedule/scripts/tidy.mjs` (`sweepWorkspaces`, `isIdle`, `IDLE_MS`, `ownWorkspace`, `listAgents` go); `wiki/development/daily.md`, `wiki/development/required-tools.md`.
- Inbox chat list: `.agents/skills/daily/scripts/todos.mjs` (`openChats`), `.agents/skills/daily/scripts/chief.mjs` (passes Paseo's agent record), `.agents/skills/explore/scripts/step-title.mjs` (no put for a schedule's chat), `.agents/skills/schedule/scripts/lib/app-runs.mjs` (`openSession` labels a chat run with its schedule); `wiki/development/daily.md`, `wiki/stack/host-schedules.md`.
- Tests: `scripts/tests/tidy.test.mjs`, `scripts/tests/daily-todos.test.mjs`, `scripts/tests/step-title.test.mjs`, `scripts/tests/schedule-app.test.mjs`.
- Release: `CHANGELOG.md` (`minor`), `scripts/retired-names.json`.

## What the build needs

Nothing from you: no key, no account.

## Decision log

- **2026-11-08** — Assumed: a finished chat asks *Close this chat?* and runs `/close` only on a yes, and the tidy-up stops closing idle chats, because the request from WongOS settled both.
- **2026-11-08** — Assumed: a schedule's chat stays off the Inbox while it runs and shows once it stops and stays open, and routines that close themselves on success keep doing so, because the request from WongOS settled it.
- **2026-11-08** — Asked which Inbox group a stopped schedule chat goes in → chose *Working*, the group for chats with no review page, so the Inbox needs no change.
- **2026-11-08** — Assumed: the close card is one question with *Close it (Recommended)*, the routine or app offer when one applies, and *Keep it open*, because the change loop already puts an offer as one answer in the next-step question, never a question of its own. Picking the offer starts it, and the chat asks *Close this chat?* again when that is done.
- **2026-11-08** — Assumed: only a Paseo worktree asks *Close this chat?*, because elsewhere there is no workspace to close; replies outside Paseo keep their present next step.
- **2026-11-08** — Assumed: a chat opened to run a schedule now carries the schedule's Paseo label, as a background run's handoff chat already does, because without it the Inbox can not tell a schedule's chat run from yours.
- **2026-11-08** — Assumed: the Inbox reads a chat's labels from Paseo's own agent record, because `paseo ls --json` does not list labels, so today the worker's chat list never sees a schedule's label.
- **2026-11-08** — Assumed: a stopped schedule chat shows only after it has been stopped 2 minutes, because a run that closes itself is archived just after it stops, and the worker's pass, which wakes when a chat stops, would otherwise show it for a moment.
- **2026-11-08** — Assumed: a step change in a schedule's chat no longer puts its row in the Inbox, because a step changes only while the chat runs; the worker's pass adds the row once the chat has stopped.
- **2026-11-08** — Assumed: this is a `minor` release, because chats behave differently; nothing breaks.
- **2026-11-08** — Assumed: `ownWorkspace` stays in `tidy.mjs`, with its test, because `daily/scripts/finished.mjs` still uses it to mark finished chats; the plan thought only the sweep used it.
- **2026-11-08** — Check: the `isIdle` test, the sweep-archive test and its Paseo-output-changed note test are deleted with the code they covered; a new test shows the sweep archives nothing and asks Paseo nothing, yet still cleans temp, scratch and orphan servers.
- **2026-11-08** — Assumed: the context budget needed offsetting cuts, so the `/close` bullet in the change loop drops *(or throws it away when asked)* (`/close` owns discard), and a few rule lines lose filler words.
- **2026-11-08** — Assumed: the `checked:` date of the attachments `own-your-setup`, `plan-first` and `safe-changes` moves to today with no text change, because none of their lines names closing chats or the idle tidy-up.
- **2026-11-08** — Assumed: a schedule's chat stays hidden only until you write in it; after that it shows like any chat, because hiding your own later turns was not asked for, and the review found it.
- **2026-11-08** — Assumed: archived for /ship as 51.5.0, because the build, the second look and its two fixes are done; the full local check run was cut short by server load, and each failing test passed alone, so CI decides.
