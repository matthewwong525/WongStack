# Tasks

## 1. Before anything is deleted

- [x] 1.1 Read the live board's undone tasks with `company-api.mjs call inbox.daily-tasks` and list them in the chat; make each one Matthew names a reminder through `/schedule`. Verify: the list is in the chat and each named reminder shows in `/schedule list`.

## 2. Database

- [x] 2.1 Add one migration in `schema/migrations/`: the `chats` table and its owner index, `inbox_items.chat` and its covering index, and the drops of `tasks`, `week_goals`, `backlog_groups`; remove the board file from `app/tests/employee-access/connections.ts`'s list only if that list names applied files, else add the new one. Verify: `npm run db:reset:staging`'s local equivalent applies every migration in order, and `reviews-migration.test.ts` has a line for each new `inbox_items` query and passes.
- [x] 2.2 Add sample chats to `schema/seed.sql`: two waiting on a review (one from a schedule), two working, one with no Paseo id, linked to existing sample `inbox_items`. Verify: the seed applies on a fresh local database.

## 3. App server

- [x] 3.1 Write `app/worker/apps/inbox/chats.ts`: `inbox.chat-put`, `inbox.chats-sync`, `inbox.chat-remove`, `inbox.chat-close` (sets `close_asked_at`) and `GET chats` (rows with their waiting item, the folder fallback, orphan waiting items, the 3-day cut), owner-only; add them to `api.ts`; `store.ts` items take an optional `chat`. Verify: a new `chats.test.ts` covers each route, another person's rows unseen, the folder fallback, an orphan item, a row past 3 days gone, and a teammate's call refused for another owner.
- [x] 3.2 Delete `app/worker/apps/inbox/tasks/`, move `titlePatterns` into `reviews.ts`, drop `board` from `items.ts`, and make `inbox.daily-*` and `inbox.task-*` answer 404 `retired` for older computers. Verify: `api.test.ts` and `reviews` tests pass with the board assertions removed; the runtime test `app/tests/runtime/apps/inbox.ts` checks `GET chats` instead of the week.

## 4. Inbox screen

- [x] 4.1 Write `app/src/apps/inbox/Chats.tsx` (Needs you, Working, the Archive section from `Reviews.tsx`, the row menu with *Close chat*, top bar with `InboxStatus` and *Schedules*) and make it the home in `App.tsx`; move `SearchField` and `InboxStatus` out of `week/`. Verify: `Chats.test.tsx` covers the order, a tap opening the waiting item, *Close chat*, an orphan review row, the empty and offline states, and the search.
- [x] 4.2 Delete `app/src/apps/inbox/week/` and `app/src/lib/board.ts`; strip `ViewToggle`/`useBoard` from `Schedules.tsx` (add its *Back*), point `PlanView.tsx`'s Back and `frame.ts`'s comment at the chat list, update `app.json`'s description, and drop the board allowance in `app/.oxlintrc.json`. Verify: `npm test` in `app/` passes, with the board tests in `App`, `Reviews`, `PlanView` and `Schedules` tests replaced by chat-list ones.

## 5. Computer side

- [x] 5.1 `step-title.mjs` puts the chat row on `set` and at session start; `/close` removes it as its last step; `reply-link.mjs` writes `chat` on each item. Verify: script tests show the row put with the new step, a failed put printing one line and not stopping the step, and an item carrying the agent id.
- [x] 5.2 Replace the board half of `todos.mjs` with `inbox.chats-sync` in the watch pass, keep the 15-minute `/close` from `close_asked_at`; delete `scripts/board.mjs`, `daily.mjs start-task`, `chief.mjs`'s board reads and `D todo link`; rename the `board` *Needs you* kind to `chats`; ignore `sources.tasks` with one journal line; turn `D remind` into a `/schedule` one-time chat schedule. Verify: `daily-todos`, `daily`, `daily-worker` and `daily-chief` tests pass, rewritten for the sync, and a test shows *Needs you: the chat list* after two failed syncs.
- [x] 5.3 Add `D handoff --file` and the brief rule; the worker opens one chat per run from a handoff and reports its title and agent id on the run result. Verify: a worker test shows a run with a handoff opening exactly one chat named for the schedule, and a run without one opening none.
- [x] 5.4 `schedule/scripts/lib/move-in.mjs` finds the owner without `board`; update `scripts/tests/fixtures/scheduled-work.mjs`. Verify: `schedule-move-in` tests pass.

## 6. Docs and release

- [x] 6.1 Rewrite `wiki/development/daily.md` (remove *The week board*, replace *A to-do for each chat* with the chat list, the handoff, reminders), and update `wiki/development/reply-links.md`, `wiki/stack/host-schedules.md`, `wiki/stack/mini-apps.md`, `wiki/development/first-day/use-skills.md`, `.agents/skills/daily/SKILL.md`, `references/chief.md`, `references/example.json`, `actions.json`. Verify: `node scripts/check-payload-links.mjs` passes and `measure-context.mjs --check` stays under its baseline.
- [x] 6.2 Update `payload-files.json`, `areas.json` (drop `task-board`, reword `inbox`), `retired-names.json` (each removed action, file and setting), delete the `task-board` journeys, and edit the `inbox` spec's Purpose line to the chat list. Verify: `node scripts/check-retired-names.mjs` and `memory-areas.test.mjs` pass.
- [x] 6.3 Add a `## Next (major) — The Inbox shows your chats` entry to `CHANGELOG.md`, its **Updating.** note in plain words: the week board and its tasks are deleted; the chat lists undone tasks first; an install whose own code uses a `tasks` table keeps it. Verify: the entry is first under the entries.

## 7. Review fixes

- [x] 7.1 `run-result` keeps a handoff's agent id when the run's first report already gave its chat title. Verify: a `schedules.test.ts` case reports a run started, then its handoff, and sees the agent id stored.
- [x] 7.2 The watch pass sends each chat's name without its step word, and the step; a sync with a step word corrects an old row's name and step. Verify: `daily-todos` and `chats.test.ts` cases.
- [x] 7.3 A handoff chat opens with its schedule's Paseo label, so its row's source is `schedule:<key>` from the put and the sync. Verify: `daily-worker`, `daily`, `step-title`, `daily-todos` and `chats.test.ts` cases.
- [x] 7.4 The update note says an install's own mini app that imports `checkerOwns` checks the owner itself. Verify: the `## Next (major)` entry's **Updating.** note has the sentence.
- [x] 7.5 The watch pass takes a leading step word as step-title.mjs makes it: a loop step or a repo skill's name in capitals (`VERIFY: x`), and a capital word no skill has (`TODO: x`) stays in the name. Verify: a `daily-todos` case.
- [x] 7.6 A sync fills a row's name and step only while the row has no step, so a put's newer step wins. Verify: `chats.test.ts` cases, a row with no step filled and a row with a step kept.

## 8. Checks

- [ ] 8.1 Run `node .github/scripts/checks.mjs --worktree`, then `/save`, and walk the preview at phone width as a signed-in person: the chat list with a waiting review, a tap into it and *Back*, *Close chat*, the Archive search, *Schedules* and its *Back*. Verify: CI passes and each step behaves as the `inbox` spec says.
