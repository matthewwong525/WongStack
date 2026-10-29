# Design

## Context

- WongOS (a private repo built on WongStack, at `/root/.paseo/worktrees/2qd263o3/rainy-giraffe` on the maintainer's computer) holds the source of this change: the week board (`app/worker/tasks.ts`, `task-positions.ts`, `backlog-groups.ts`, `chat-tasks.ts`, `app/worker/api/daily-*.ts`, `app/src/pages/tasks/`, `app/src/components/` board parts, `app/src/lib/plan*.ts`, drag hooks) and the personal daily (`.agents/skills/daily/`: `daily.mjs`, `chief.mjs`, `todos.mjs`, `config.mjs`). Its in-flight change *daily-fills-email* moves the background helper chat into background sub-agents of the Daily chat; this change takes that design.
- WongStack today: a team daily (`team.md`, `people/*.md`, 805-line `daily.mjs`), an Inbox mini app with a per-chat item list, a Schedules view, plan pages (`PlanView`), the line and taps. It has no notes, calendar, or task tables.
- Mini apps serve their API at `/apps/<name>/api/<route>`; each route is a described action, so skills call it through `scripts/company-api.mjs call` ([skill actions](../../../wiki/stack/company-api.md#build-a-skill-on-actions)).
- WongOS runs its daily from a host timer (`open-daily`) and a host service (`chief-service`), both calling `.agents/skills/daily/scripts/daily.mjs`.

## Goals / Non-Goals

**Goals:** one week board in WongStack that WongOS then uses as is, plus the WongOS-only parts it adds; one personal daily in WongStack; WongOS's own parts as add-on scripts and settings, so WongOS's daily skill files match WongStack's.

**Non-Goals:** notes, calendar, Notion or email on WongStack's board; installing a host service; changing the plan page.

## Decisions

1. **The board lives in the Inbox mini app.** Worker: `app/worker/apps/inbox/tasks/` (store, positions, backlog groups, chat to-dos) with routes added to `app/worker/apps/inbox/api.ts`. Screen: `app/src/apps/inbox/week/`; `App.tsx` opens the week, `?item=` still opens `PlanView`. Ported from WongOS with notes, calendar and Notion parts cut. Alternative: a new `tasks` mini app. Rejected: the person chose the Inbox opening on the week, and WongOS already routes `/` to the Inbox.
2. **Daily-facing routes keep WongOS's shapes.** `GET daily-tasks`, `POST daily-task-add` (idempotent by key, `daily:` or `chat:`), `POST daily-task-place`, `POST daily-task-status`, `POST daily-task-remove` (`chat:` keys only), `POST daily-task-link`. The week screen uses its own routes ported from WongOS's `/api/plan`, `/api/tasks`, `/api/backlog-groups`. Every route acts for the signed-in person's board alone.
3. **One migration, tables only when missing.** `schema/migrations/20261028120000_task_board.sql` uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` with the same table and column names as WongOS (`tasks`, backlog groups, week goal), minus notes and Notion columns. In WongOS it changes nothing; WongOS's own extra columns stay.
4. **The item list and Schedules view leave the screen, not the Worker.** `List`, `AgentCard`, `Decision`, `SendBar`, `StartCard`, `PlanCard`, `desk`, `drafts`, `groups`, `keys`, `linkify`, `Header`, `Unready`, `Schedules`, `cadence` and their tests go. Item, tap and schedule routes stay: plans are items, and `/schedule` and the host runner use the schedule routes.
5. **Settings file per person.** `.agents/daily/<name>.json` (WongOS's `matthew.json` contract, with `person` any id and an `emails` list), plus an optional `.agents/daily/team.json` with `checks` only. `config.mjs` validates both; `sources` keeps `tasks` and `chats`; unknown sources go through add-ons. `addons`: `{ "morning": ["<repo path>"], "pass": ["<repo path>"] }`, each a Node script the daily runs with a JSON context on stdin and reads JSON lines from stdout (`line` to post, `event` to judge, `skip` chat ids).
6. **The daily commands.** `D who`, `start [--report]` (due routines, once per day, plus morning add-ons), `picture` (board week, late tasks, chats), `watch` (the pass loop for a Monitor in the Daily chat), `serve` (the same pass, sending lines to the Daily chat, for a computer that runs it as a service), `mark`, `status`, `hand`, `reply`, `answer`, `allow`, `close`, `done-agent`, `todo link`, `remind`, `start-task`, `note-end`, `open-daily` (opens or finds the Daily workspace and sends `/daily`). `chief-service` stays as an alias of `serve`, so WongOS's host unit keeps working.
7. **Stops go to background helpers.** Each `stopped`, `asking` and `done` line gets one background sub-agent of the Daily chat (Claude Code: the Agent tool, `run_in_background: true`), with a fixed brief: the line, `D`, and *follow Judge one stop; end with one line*. Its end line goes to `D note-end`; the Daily chat posts nothing. No helper chat.
8. **To-dos per chat.** `todos.mjs` from WongOS: a `chat:<agent id>` task on today while the chat lives; moved to today each day; done on proof or removed when the chat is gone.
9. **Skill text stays in budget.** The new `SKILL.md` and `references/chief.md` replace the old ones; `measure-context --check` must pass, so cut words, not rules.

## Risks / Trade-offs

- [Installs on the team daily lose `team.md`] → Updating step converts each line to a routine; the sync plan shows it.
- [WongOS's board differs: notes, calendar, Notion] → those parts stay WongOS-listed differences in the files that need them, added back on top of WongStack's copy.
- [A big change at once] → one major release; the board and the daily are separate task groups, each tested alone.

## Migration Plan

Release as a major version. WongOS syncs it, moves its board onto WongStack's files with its own parts added back, removes its now-matching entries from `scripts/wongstack-differences.json`, and keeps its host units, which still call `daily.mjs open-daily` and `chief-service`.
