# Proposal

**Status:** ready-to-ship
**Branch:** inbox-cleanup-and-knowledge
**Open questions:** none

## Why

The Inbox opens on a week board of days, dates, typed tasks and a backlog. You don't run your work from it: you run it from your chats. So the board is noise, and the reviews you need sit one tap away under *Reviews*. A scheduled run that finds something for you has no way to show it to you, because a background run has no chat.

## What Changes

- **The Inbox opens on your chats.** One row for each open chat: its name, its step (*Plan*, *Apply*, *Ship*…) and its folder. A chat that waits on a review goes on top under *Needs you*, and a tap opens the review. Rows show no dates or time left. Below are the chats that are working, then the *Archive* of past reviews with its search. *Schedules* is one button in the top bar. There are no days, dates, tabs or backlog.
  ```picture
  Before: pictures/before-week.png
  After: pictures/after-chats.png
  After, Schedules: pictures/after-schedules.png
  Try it: https://inbox-shows-chats-wongstack-staging.matthewwong525.workers.dev/apps/inbox/
  ```
- **A row follows its chat.** It shows the chat's current step, so it never goes stale. It leaves when the chat closes. *Close chat* in a row's menu sends the chat `/close` once you have been quiet there for 15 minutes, as *Done* on the board did.
  ```picture
  After, a row's menu: pictures/after-close-menu.png
  Try it: https://inbox-shows-chats-wongstack-staging.matthewwong525.workers.dev/apps/inbox/
  ```
- **A schedule's run opens a chat when it has something for you.** A background run that finds nothing still opens nothing. A run that finds something for you to see, such as *3 invoices are late*, opens one chat named for the schedule, with what it found. That chat makes the review, and it shows in your list like any other chat.
  ```mermaid
  flowchart TD
    run["Scheduled run"] -->|"nothing to do"| quiet["No chat"]
    run -->|"something for you"| chat["Opens a chat"]
    chat --> review["Review in the Inbox"]
  ```
- **The week board is deleted.** Its days, typed tasks, backlog groups, week goals and task search go, with the asks that wrote them: *start a task* and *clean up my board*. *Remind me Friday to call Kim* still works: it makes a one-time schedule that opens a chat on Friday. Before the board goes, the chat lists your undone tasks, so you can make any of them a reminder. Deleting the board's tasks can't be undone.

Non-goals: no merge of the app's database and memory's database into one; no change to memory's own list of chat sessions; no new kinds of review page; questions, approvals and private links stay as they are.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities
- `inbox`: the Inbox opens on the person's open chats, each with its name, step, folder and waiting review, and a *Close chat*; Reviews becomes the Archive under it; Schedules is a top-bar button; Back from a review goes to the chat list.
- `daily-routine`: no board to-do per chat; *remind me* makes a one-time schedule; *start a task*, *clean up my board* and the *Needs you: the week board* chat go.
- `host-schedules`: a background run that has something for the person opens one chat.
- `multi-part-workspaces`: the *workspace for a board task* scenario goes.

### Removed Capabilities
- `task-board`: the week board, its tasks, groups and goals.

## Impact

- `app/src/apps/inbox/`: a new `Chats.tsx` home; `week/` and `app/src/lib/board.ts` are deleted; `Reviews.tsx` becomes the Archive section; `Schedules.tsx` loses `ViewToggle`/`useBoard`; `PlanView.tsx` Back; `app.json` description.
- `app/worker/apps/inbox/`: a new `chats.ts` (put a computer's chat list, read the person's chats with their waiting items, ask to close); `tasks/` is deleted; `titlePatterns` moves to `reviews.ts`; `items.ts` drops `board`; `store.ts` items take an optional `chat` (agent id).
- `schema/migrations/`: one migration adds `chats` and `inbox_items.chat`, and drops `tasks`, `backlog_groups` and `week_goals`; `schema/seed.sql` adds sample chats.
- `.agents/skills/daily/`: `todos.mjs` and `board.mjs` give way to a chat-list push in the watch; `chief.mjs`, `daily.mjs`, `worker.mjs`, `config.mjs`, `actions.json`, `SKILL.md`, `references/`.
- `.agents/skills/explore/scripts/step-title.mjs` pushes the chat's row; `.agents/skills/close/` removes it; `.agents/skills/hand-over/scripts/reply-link.mjs` records the chat on each item.
- `.agents/skills/schedule/`: the background brief and `app-runs.mjs`/worker hand a found result to a new chat; `lib/move-in.mjs` stops reading `board`.
- `wiki/development/daily.md`, `wiki/development/reply-links.md`, `wiki/stack/host-schedules.md`, `wiki/stack/mini-apps.md`, `wiki/development/first-day/use-skills.md`; `payload-files.json`, `areas.json`, `retired-names.json`; `CHANGELOG.md` (a `major` entry: the board and its actions are removed).

## Decision log

- **2026-11-07** — Asked what happens to the week board's days, dates and typed tasks → chose to delete the board fully, with the asks that write it.
- **2026-11-07** — Asked what the Inbox list shows → chose every open chat, *Needs you* on top, with past reviews in an Archive below.
- **2026-11-07** — Asked how schedules fit in → chose that a run with something for you opens a chat, and the Schedules list stays behind one top-bar button.
- **2026-11-07** — Asked where the chat list is stored, after asking why not memory's database → chose the app's database, beside reviews and schedules, so test copies can check it and the Inbox stays walled off from memory. Memory keeps its own session list: it records what memory read from each chat log, a different fact from what a chat is doing now. Each chat row keeps memory's session id, so the two join with no second copy.
- **2026-11-07** — Assumed: *remind me* becomes a one-time chat schedule, not a deleted ask, because one-time schedules already exist and a reminder is the board ask most worth keeping.
- **2026-11-07** — Assumed: a row's *Close chat* replaces the board's *Done*, with the same 15 quiet minutes, because closing a chat is your call and *Done* was the only way to make it from the Inbox.
- **2026-11-07** — Assumed: the chat row is written by the step change (`step-title.mjs`), removed by `/close`, and checked by the worker's minute pass, which drops chats Paseo no longer has; with check-ins off, a row not heard from in 3 days goes, because that matches the 3-day tidy-up and keeps the list right without the worker.
- **2026-11-07** — Assumed: a review links to its chat by the Paseo agent id, written on the item when the review is made, and an older review with no id joins its chat by folder name, because the item's folder name is all older reviews have.
- **2026-11-07** — Assumed: a review with no known chat, such as one made outside Paseo, shows under *Needs you* as its own row, named by its title, because a waiting review must never be hidden.
- **2026-11-07** — Assumed: an install whose own code uses a table named `tasks`, `backlog_groups` or `week_goals` keeps it, because the board's first migration let an app keep its own tables of those names; the sync plan checks before the drop.
- **2026-11-07** — Assumed: this is a `major` release, because it removes the board's actions that other skills and installs call.
- **2026-11-07** — Check: the week board's tests `app/src/apps/inbox/week/Drag.test.tsx`, `app/src/apps/inbox/week/edits.test.ts`, `app/src/apps/inbox/week/Groups.test.tsx`, `app/src/apps/inbox/week/plan.test.ts`, `app/src/apps/inbox/week/Rows.test.tsx`, `app/src/apps/inbox/week/week.test.kit.tsx`, `app/src/apps/inbox/week/Week.test.tsx`, `app/worker/apps/inbox/tasks/daily-routes.test.ts` and `app/worker/apps/inbox/tasks/week-routes.test.ts` are deleted, because the board they test is deleted; `chats.test.ts` and `Chats.test.tsx` test the chat list that replaces it.
- **2026-11-07** — Check: `app/src/apps/inbox/Reviews.test.tsx` is deleted, because its list moved into the Archive part; `Archive.test.tsx` keeps its archive, search, *Show more* and Retry tests.
- **2026-11-07** — Check: `app/.oxlintrc.json` drops the board's allowance to import `src/lib/board.ts`, because that file is deleted; the rule is now stricter, not looser.
- **2026-11-07** — Assumed: `checkerOwns` leaves the shared contract, with a line in the update note, because only the board used it and this is already a major release.
- **2026-11-08** — Built inside /ship. The live board had no undone tasks in the five weeks before, so no reminders were made. Two review rounds fixed a handoff chat's id never saved, step words left in synced chat names, a chat's schedule never recorded, and a worker pass that could bring back an old step. Local checks pass, apart from two that clear once the specs are updated, which this save does.
- **2026-11-08** — Archived at ship. The preview walk at phone width passed with two test chats and one test review page on the test copy: the chat list, a tap into the review and *Back*, *Close chat*, the Archive search, and *Schedules* and its *Back*. The test chats were removed after; the closed test page stays in the test copy's Archive.
