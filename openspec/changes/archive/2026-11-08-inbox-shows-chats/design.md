# Design

## Context

See [proposal.md](proposal.md#why). The Inbox mini app (`app/src/apps/inbox/`, `app/worker/apps/inbox/`) opens on `week/Week.tsx`; `Reviews.tsx` and `Schedules.tsx` borrow `useBoard`, `ViewToggle` and `SearchField` from `week/`. A chat appears today only as a board task keyed `chat:<agentId>` (`.agents/skills/daily/scripts/todos.mjs`), titled once from the Paseo name and never updated. A review page (`inbox_items`, kind `plan`) stores only `workspace` (the folder's basename), not its chat. A background schedule run (`schedule/scripts/lib/app-runs.mjs` → `daily.mjs` worker) ends with a journal line and has no way to open a chat; the worker's only chat-opening path is `failed()` → `openChat` for *Needs you*.

The app's D1 (`DB`, `wongstack-db`) holds inbox, reviews, schedules and runs. Memory's D1 (`MEMORY_DB`) is production-only and kept out of every mini app's env (`app/worker/apps/index.ts`).

## Goals / Non-Goals

**Goals:** one `chats` table in the app's D1 that the computer keeps current; a chat-list home; a review linked to its chat by agent id; a background run that can hand a result to a new chat; the board's code, actions, tables and docs gone.

**Non-Goals:** reading or joining memory's `sessions` table from the app (the row only stores the same id); questions, approvals and link items (unchanged); a merge of the two databases.

## Decisions

### The chat list lives in the app's D1

A new table, in one migration with the drops:

```sql
CREATE TABLE IF NOT EXISTS chats (
  agent_id TEXT PRIMARY KEY,      -- PASEO_AGENT_ID, else the agent's session id
  owner TEXT NOT NULL,            -- the person's sign-in email
  session_id TEXT,                -- memory's session id ('claude:<uuid>'), for a later join; never read by the app
  computer TEXT NOT NULL,
  name TEXT NOT NULL,             -- the current chat name, after its step word
  step TEXT,                      -- EXPLORE | PLAN | APPLY | SHIP | DONE | NULL
  folder TEXT NOT NULL,           -- workspace basename, matches inbox_items.workspace
  source TEXT,                    -- 'schedule:<id>' for a run's chat
  close_asked_at TEXT,
  seen_at TEXT NOT NULL
);
ALTER TABLE inbox_items ADD COLUMN chat TEXT;   -- agent_id; NULL on older items
DROP TABLE IF EXISTS tasks; DROP TABLE IF EXISTS week_goals; DROP TABLE IF EXISTS backlog_groups;
```

*Alternative:* memory's D1, beside `sessions`. Rejected with the person (Decision log): staging and previews have no memory DB, mini apps must not bind it, and `sessions` records capture progress, a different fact. *Alternative:* keep using board tasks for chats. Rejected: the board is deleted, and a task's title goes stale.

The drop triggers on `backlog_groups` go with the table. `DROP` is safe under replay: it is newer than the only file that creates these tables, and nothing after it needs them.

### Who writes a row

- **`step-title.mjs set`** (each step) and its session-start hook call `inbox.chat-put` with name, step, folder and session id. It already knows `PASEO_AGENT_ID` and the session id (`chatId`), so the row is right the moment a step changes, worker or not. A failure is one stderr line; the step goes on.
- **The worker's watch pass** (each minute) calls `inbox.chats-sync` with every open Paseo chat it watches on this computer: rows on this computer not in the list are deleted. This replaces `todos.mjs`'s board calls; its `closeDone` logic stays, reading `close_asked_at` from the sync answer instead of a board *Done*.
- **`/close`** calls `inbox.chat-remove` as its last step.
- **The app** deletes a row not seen for 3 days at its next read, for a computer whose worker is off.

All three routes are company actions in `app/worker/apps/inbox/chats.ts`, owner-only (the caller's sign-in email is `owner`), callable by agents like `inbox.daily-*` today, and listed in `.agents/skills/daily/actions.json`.

### Reading the list

`GET chats` returns the person's rows, each with its waiting plan item (by `inbox_items.chat = agent_id`, else by `workspace = folder` for an item with no `chat`), plus waiting items that match no row. Sort: rows with a waiting item first, newest item first; then the rest by `seen_at`. The Archive reuses `reviews.ts` (`titlePatterns` moves there from `tasks/board.ts`) with its existing paging and search. A new covering index on `inbox_items(chat)` is added, and `reviews-migration.test.ts` gets its line, since a plan item's body sits before the filter columns.

`reply-link.mjs` writes `chat: PASEO_AGENT_ID` on each item it puts (`store.ts` takes it as optional).

### A background run hands a result to a chat

The background brief (`.agents/skills/daily/references/briefs/header.md`) gains one rule: when the run finds something the person should see, write it to `D handoff --file <path>` and stop. `D handoff` writes a `handoff` event; the worker's `start` reads it after the run ends and calls the existing `openChat` with the schedule's name as the title and the file's text as the brief, at most one per run, and reports `chatTitle`/`agentId` on the run result as a chat run does. The new chat then makes its review page the normal way. *Alternative:* switch the whole run to chat mode when its check finds work. Rejected: most checks find work that needs no person, and a chat for each would flood the list.

### Reminders

`D remind` and the *remind me* ask go to `/schedule`: a one-time `chat` schedule whose instructions are the reminder, shown and OK'd like any schedule. No new code beyond the skill text.

### What goes

`app/src/apps/inbox/week/`, `app/src/lib/board.ts`, `app/worker/apps/inbox/tasks/`, `scripts/board.mjs`, the board half of `todos.mjs`, `daily.mjs start-task`, `chief.mjs` board reads (`readWeek`, `doneTasks`, `startedOn` task rows, `todoLink`/`D todo link` — a plan's link now reaches the Inbox through its item), `worker.mjs` `NEEDS_YOU.board` (renamed to `chats`), `config.mjs` `sources.tasks` (ignored with one journal line if set), the `task-board` journeys, area and spec. Each removed name goes in `scripts/retired-names.json`.

## UX

### Use-case brief

Matthew, often on his phone between other work, opens the Inbox several times a day to see which chats need him and to open their reviews. Done is: he sees what waits on him at the top and opens it in one tap. Common case: 3–10 open chats, 0–3 waiting. Edge: no Paseo (no chat rows, waiting reviews still show), computer off (rows stay, *Computer offline*). Mirrors the closest screen, the Reviews list.

### Flow

Open Inbox → *Needs you* row → tap → the review opens → answer → *Back* → the chat list. Close: row menu → *Close chat*. Schedules: top bar → *Schedules* → its list; *Back* returns.

### Hierarchy

The one primary action is opening a waiting review. Working chats are quieter rows with no tag. The Archive search sits below them. *Schedules* and *Computer online* are small top-bar items.

### Review

[review.html](review.html); the first What Changes item sketches the screen.

### Components

Existing parts only: `Card`, `Badge`, `Button`, `DropdownMenu` (row menu), `Skeleton`, `Alert`, the shared `SearchField` (moved from `week/Search.tsx` to `app/src/apps/inbox/`), `InboxStatus` (moved from `week/Parts.tsx`). No new component kit part.

## Risks / Trade-offs

- [An install's own code uses a `tasks`, `backlog_groups` or `week_goals` table] → the sync plan greps the install for those names outside WongStack's files; when found, it keeps the tables by skipping the drop statement for that install, and says so.
- [Undone tasks are lost] → before the drop goes live, the build reads the live board's undone tasks and lists them in the chat; any the person names become reminders.
- [A row lingers when the worker is off and a chat closes without `/close`] → the 3-day cut, and the next worker pass.
- [Older review pages have no `chat`] → the folder fallback; two chats in one folder both show that item under the newest.

## Migration Plan

1. Ship the migration with the code: the app reads `chats` and drops the board in one release. Old computers keep calling `inbox.daily-*`, which now answer 404 `retired`; their worker logs one line and goes on.
2. The `CHANGELOG` `major` entry's **Updating.** note: the board is deleted, list your undone tasks first, and keep your own `tasks` table if your code uses one.
3. Rollback: D1 Time Travel restores the dropped tables ([recovery](../../../wiki/stack/d1-recovery.md)); the code reverts by a new release.
