## 1. Week board: Worker

- [x] 1.1 Add `schema/migrations/20261028120000_task_board.sql` (tables only when missing) and list it in `payload-files.json`; check: a runtime test creates, reads and moves a task on a fresh database.
- [x] 1.2 Port the board store, positions, backlog groups and chat to-dos to `app/worker/apps/inbox/tasks/`, with no notes, calendar or Notion parts; check: ported unit tests pass.
- [x] 1.3 Add the week screen routes and the daily routes (`daily-tasks`, `daily-task-add`, `-place`, `-status`, `-remove`, `-link`) to the Inbox's `api.ts`, as described actions; check: route tests and `check-skill-actions.mjs` pass.

## 2. Week board: screen

- [x] 2.1 Port the week view to `app/src/apps/inbox/week/` and open it from `App.tsx`; `?item=` still opens a plan; check: week view tests pass.
- [x] 2.2 Remove the item list and Schedules view and their tests; add removed names to `scripts/retired-names.json` where they are named elsewhere; check: `npm test` in `app/` passes (lint, types, knip, jscpd).

## 3. Daily skill

- [x] 3.1 Replace `.agents/skills/daily/scripts/` with the personal daily (`daily.mjs`, `chief.mjs`, `todos.mjs`, `config.mjs`), settings files, add-ons, `watch`, `serve` and `open-daily`, board calls through the Inbox's routes; check: script tests pass.
- [x] 3.2 Rewrite `SKILL.md` and `references/chief.md` for the settings file, the list, background helpers and add-ons; remove `team.md` and `people/`; check: `measure-context.mjs --check` passes.

## 4. Docs and release

- [x] 4.1 Rewrite `wiki/development/daily.md`; update the Inbox and reply-link pages that named the item list; check: `check-payload-links.mjs` passes.
- [x] 4.2 Update the payload list and manifest, and add the `## Next (major)` CHANGELOG entry with its Updating steps; check: `node .github/scripts/checks.mjs --worktree` passes.
