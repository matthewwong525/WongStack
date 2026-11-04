# Wrap up finished chats, and tidy the wiki after memory

**Status:** in-progress
**Branch:** somber-stingray
**Open questions:** none

## Why

A chat whose work went live often stays open. Today only the board's Done sends it `/close`, and that needs a daily settings file with tasks on. The tidy-up archives an idle chat after 3 days without `/close`, so what it learned never reaches the wiki. The wiki gets those facts only when someone types `/dream-memory`, which is a long, rare job.

## What Changes

- **A finished chat wraps itself up.** When a chat's work is live and you have been quiet there for 15 minutes, your check-in helper sends that chat `/close`. The chat saves what it learned, adds what lasts to the wiki, and closes its workspace. It needs no settings and no board. A chat with new work after the publish, or a chat you write in again, stays open. The tidy-up stays as the fallback where no helper runs.
  ```mermaid
  flowchart TD
    m["work goes live"] --> q{"quiet 15 min?"}
    q -->|no| w[wait]
    q -->|yes| n{"new work?"}
    n -->|yes| k[stays open]
    n -->|no| c["send /close"]
    c --> s["saves, updates wiki, closes"]
  ```
- **The wiki gets a small tidy each time memory tidies itself.** About once a day, memory merges its duplicate facts. After that, the helper runs a small wiki tidy in the background: it takes the facts saved since the last tidy, puts each lasting one on the page that owns it, and fixes those pages where the new facts show them wrong. It publishes the edit by itself, through the normal checks, with no question. It never edits a page WongStack ships, specs or plans.
  | | Small wiki tidy | `/dream-memory` |
  |---|---|---|
  | Starts | on its own, after memory tidies | when you type it |
  | Reads | facts since the last tidy | all memory, pages, specs, plans |
  | Fixes | pages those facts touch | up to 20 pages, saved facts |
  | Lists | nothing | specs and plans gone wrong |
- **You see what they did when you ask.** Each wrap-up and each tidy writes one line to the helper's journal: *what's going on?* in the Daily chat shows it. A tidy's line names the pages it changed and links the change.
  ```text
  Wrapped up: Fix the invoice total
  Wiki tidy: 3 facts on 2 pages
    (wiki/customers.md, wiki/people/ana.md)
  ```
- **The same limits hold.** A job never sends, pays or deletes outside its own step. Both use your own AI allowance. An install can turn either job off in its own job list.

Non-goals: no weekly or nightly full dream (`/dream-memory` still starts only when you type it); no change to how memory saves or tidies facts; no change to `/close` itself; writing to a separate company knowledge repo (its own plan; when it ships, the tidy writes there).

Builds on: *Check-ins for everyone* (plan `checkins-for-everyone`, workspace chilly-lionfish, not yet built), which starts the helper for everyone with no settings. Until it ships, these jobs run only where the helper runs today. Whichever change publishes second catches up the other's files.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: the helper's default job list gains two jobs, wrap-up and the wiki tidy; an install's own list keeps them unless it turns one off; a job may run in its own copy of the repo with its own time limit.
- `wiki-dream`: a small wiki tidy runs on its own after each memory consolidation and publishes alone; the full dream still runs only when asked.

## Impact

- `.agents/skills/daily/references/sweeps.json`: two default `sweeps` entries, `wrap-up` and `wiki-tidy`.
- `.agents/skills/daily/scripts/worker.mjs`: `loadSweeps` merges the default `sweeps` with the install's (same `id` replaces, `"off": true` removes); a sweep with `do` runs built-in code with no AI run; a sweep with `"place": "copy"` runs in a temporary worktree of `origin/main`, removed when the run ends; a sweep's `minutes` sets its time limit (default 30).
- `.agents/skills/daily/scripts/wrap-up.mjs` (new): picks merged, quiet, idle chats and sends `/close` once each; reuses `savedState`/`mergedAtTip` from `schedule/scripts/tidy.mjs` and `sendText`/`userAt` from `chief.mjs`.
- `.agents/skills/daily/scripts/todos.mjs`: `closeDone` and wrap-up share one "close asked" record, so a chat gets `/close` once.
- `.agents/skills/daily/scripts/wiki-tidy-check.mjs` (new) and `references/briefs/wiki-tidy.md` (new).
- `.agents/skills/memory/scripts/memory.mjs`: `finish-run --kind consolidation --status ok` leaves a local marker the check reads.
- `.agents/skills/dream-memory/SKILL.md` and `scripts/dream.mjs`: a `--small` pass the brief runs; `since` counts a small tidy's record.
- Docs: `wiki/development/daily.md`, `wiki/development/wiki-dream.md`, `wiki/development/memory.md#consolidation`.
- Tests: `scripts/tests/daily-worker.test.mjs`, a new `daily-wrap-up.test.mjs`, the dream script's test.
- `CHANGELOG.md` (`minor`).

## Decision log

- **2026-11-03** — Assumed: the two jobs go on the helper's default job list, because the person settled that in the request.
- **2026-11-03** — Assumed: a chat is wrapped up when its work is merged and nothing new is on its branch, and the person has been quiet there 15 minutes, because the person settled that in the request.
- **2026-11-03** — Asked whether a weekly full dream should run on its own, and how often in a shared repo → chose neither: no weekly dream; a small wiki tidy runs each time memory consolidates, "kind of like how we consolidate memory".
- **2026-11-03** — Assumed: the small wiki tidy publishes by itself with no question, because Matthew chose "do it by itself" for the automatic wiki work, and `/dream-memory` publishes the same way.
- **2026-11-03** — Assumed: the wiki tidy is a separate helper run that starts after consolidation, not a step inside the memory run, because the memory run is locked down to the memory script with no git, and an unattended push from it was advised against on 2026-10-26.
- **2026-11-03** — Assumed: the wiki tidy runs in a temporary copy of the repo, never in the person's own checkout, because it makes a branch and publishes, and the person may be working in the checkout.
- **2026-11-03** — Assumed: the wiki tidy may run up to 90 minutes, because it waits for the checks before it publishes, and the 30-minute limit of a judge run is too short for that.
- **2026-11-03** — Assumed: wrap-up is code in the helper, with no AI run of its own, because sending `/close` follows a rule; the chat's own assistant does the judgment.
- **2026-11-03** — Assumed: the board's Done still sends `/close`, and wrap-up and Done share one record, because a chat with no code work never merges, and a chat must get `/close` once.
- **2026-11-03** — Assumed: the tidy-up is unchanged, because it already skips chats with work left, and its 3-day wait never races a 15-minute wrap-up.
- **2026-11-03** — Assumed: an install turns a default job off with `"off": true` in its own list, because the list already replaces a default event by name.
- **2026-11-03** — Assumed: this change builds on *Check-ins for everyone* and is recorded as such; whichever publishes second catches up, because the person settled that in the request.
- **2026-11-03** — Assumed: wrap-up reads the Paseo lists the watch read in the same pass, so it adds no second `paseo ls`, and it skips a pass where Paseo did not answer, because the watch already journals that.
- **2026-11-03** — Assumed: `daily.mjs serve --dry-run` leaves `copies/` out of its state copy, because a copy is a whole checkout and a dry run never runs in it.
- **2026-11-03** — Assumed: the `/close` line in `the-change-loop.md` now names the small wiki tidy, not only a dream, for a chat closed another way, because that line went stale with this change; the cut also keeps the save route's byte total.
- **2026-11-03** — Assumed: the wiki tidy's journal line puts the change's link before the page list, because a journal line is cut at 300 characters and the link must survive.
- **2026-11-04** — Built and reviewed (three review findings fixed); first save.
- **2026-11-04** — Assumed: the live check moves out of the tasks to after publish (the first merged chat that goes quiet shows `Wrapped up`, the first consolidation starts one wiki tidy), because the wiki tidy runs in a copy of the published main, which has none of this code before it merges, and a task that only passes after publish can never be ticked.
