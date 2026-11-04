# Your day runs without a Daily chat

**Status:** ready-to-ship
**Branch:** new-beaver
**Open questions:** none

## Why

You rarely use the Daily chat. When you want something, you open a new chat and ask, and that chat organizes the work better. Most of the daily already runs in the background: the helper starts with every chat, each chat checks its own stops, and the journal keeps what happened. The Daily chat only starts the morning, sends a list you do not read, and answers a few asks that any chat can answer. WongOS removed its Daily chat on 2026-11-04 for the same reason.

## What Changes

- **BREAKING: No Daily chat, and no `/daily`.** Nothing opens a Daily chat, and `/daily` is no longer a command you type. A Daily chat you left open becomes a normal chat: it gets check-ins like any other, and you close it when you want. A timer that opened the Daily chat each morning stops working: the update tells you to remove it.
  ```mermaid
  flowchart LR
    d[Daily chat] -.-> x[gone]
    c[your chats] --> h[helper and check-ins, as today]
  ```
- **The morning starts by itself.** At 8:00 your time, or at the first moment after it that the helper runs, the helper starts your due routines and morning add-ons, each one time per day, with no chat and no AI. Its lines and anything it could not start go to the journal. To start at another time, set it in your settings file.
  ```mermaid
  flowchart LR
    t["8:00, or your first chat after it"] --> r[due routines, each in its own workspace]
    t --> a[morning add-ons]
    r --> j[journal]
    a --> j
  ```
- **No morning list.** Your week board in the Inbox is your list. A task you did not finish stays on its own day, so look at the days before today for late ones: nothing lists them for you now.
- **Ask any chat.** Open a chat and say *remind me Friday to call Kim*, *start the supplier list*, *tell flashy-crab: yes, merge*, *watch flashy-crab*, *stop check-ins* or *what's going on?*. Each works as it did in the Daily chat. *What's going on?* reads the journal, shows where each chat stands, marks the finished chats, and asks which to close.
  ```text
  You: what's going on?

  Chat:
  - Fix the invoice total: finished, live
  - Add the Notes page: waits for you — plan to review
  - 8:00: started Weekly review
  - Not read: your board — sign-in ended

  Close the finished one?
  [ Fix the invoice total ]  [ Keep it open ]
  ```
- **A board the helper can not read goes to the journal.** It no longer sends you a line. Each new chat already tells you when your company sign-in is about to end, and *what's going on?* names the board it could not read.

Non-goals: no change to the check-ins, the board's to-dos, your own jobs, the small wiki tidy, routines and their settings, or how a chat opens a new workspace for a new task. No new service to install on the computer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: the morning starts from the background helper with no chat; the morning reply, the Daily chat and its journal delivery go; any chat does the daily's asks and reads the journal; check-ins and finished-chat marks no longer single out a Daily chat.
- `company-api`: one scenario names `/daily`; it names a routine instead.
- `multi-part-workspaces`: one scenario names `/daily`; it names the daily's routine start instead.
- `inbox`: one scenario names the daily chat; it names the chat that made the item instead.

## Impact

- `.agents/skills/daily/SKILL.md`: no longer typed as `/daily`; any chat loads it for the daily's asks and settings changes.
- `.agents/skills/daily/scripts/daily.mjs`: `open-daily`, `picture`, `journal --hook`, the new-day line and `daily-workspace.json` go; settings gain an optional `morning` time.
- `.agents/skills/daily/scripts/worker.mjs`: each pass runs the morning start when due, from settings read again that pass; the beat records the code's stamp, so `D ensure` restarts a worker from before an update; the board line goes to the journal only.
- `.agents/skills/daily/scripts/chief.mjs`: `dailyAgent` goes; `chiefEnv` gives a background run its own stand-in id; the Daily-only `close` and `asked` hand source go.
- `.agents/skills/daily/scripts/stop-check.mjs`, `transcript.mjs`, `finished.mjs`, `journal.mjs`: the Daily chat skips and the hook output go.
- `.agents/skills/daily/references/chief.md`, `example.json`, `config.mjs`; `.agents/settings.json` loses the `UserPromptSubmit` hook.
- Docs: `wiki/development/daily.md`, `wiki/development/wiki-dream.md`, `wiki/development/README.md`, `wiki/development/the-change-loop.md`, `.agents/skills/memory/references/areas.json`.
- Tests: `daily`, `daily-chief`, `daily-worker`, `daily-journal`, `daily-stop-check`, `daily-finished`, `daily-todos`, and the context measure.
- `CHANGELOG.md` (`major`), with one hand step: remove a timer that runs `open-daily`.

## Decision log

- **2026-11-04** — Assumed: WongStack drops the Daily chat as WongOS did, because Matthew chose it on 2026-11-04: "in wongstack we remove the daily chat as well, not necessary".
- **2026-11-04** — Asked how the morning starts with no Daily chat, and what happens to typing `/daily` → chose the helper starts it by itself, and `/daily` goes; the week board is the list.
- **2026-11-04** — Assumed: what watches chats stays the helper that every chat's start already runs, plus each chat's own stop check, with no host service, because both already work with no Daily chat and Matthew said in October a WongStack host service is too heavy.
- **2026-11-04** — Assumed: the morning starts at the helper's first pass at or after 8:00 local, set by an optional `morning` time in the settings file, because 8:00 is when WongOS's timer ran, and a helper that ran all night must not open routines at midnight.
- **2026-11-04** — Assumed: late tasks are not listed anywhere after this change, because the person chose the week board as the only list, and the board shows an undone task on its own day, not as late.
- **2026-11-04** — Assumed: a person with no settings file gets no morning start, because routines and morning add-ons live only in that file.
- **2026-11-04** — Assumed: the daily's asks live in the existing daily skill, which any chat may now load, not in a line in `AGENTS.md`, because a skill loads only when asked and the asks already live there.
- **2026-11-04** — Assumed: *what's going on?* reads the journal when asked, and the prompt hook goes, because a hook in every chat adds lines nobody asked for.
- **2026-11-04** — Assumed: a board the helper can not read goes to the journal only, not to a new chat as WongOS does, because each chat's start already warns before the company sign-in ends, and a chat opened by the helper is noise for teammates.
- **2026-11-04** — Assumed: a background run's daily commands act under a fixed stand-in id that matches no chat, not a saved Daily agent id, because with no Daily chat there is no id to save, and the stand-in keeps an install's own judge jobs working.
- **2026-11-04** — Assumed: the Daily chat's own hand-off rules (*quick or big*, *do it here*, `D close`) go, because any chat already opens a new workspace for a new task by [one task, one workspace](../../../wiki/development/the-change-loop.md#one-task-one-workspace).
- **2026-11-04** — Assumed: this is a major release, because `/daily` and `open-daily` go and a timer that runs `open-daily` breaks; Claymoo's teammates have no daily settings yet, so only the owner's timer needs the hand step.
- **2026-11-04** — Assumed: the plan `chat-names-and-thinking-floor`, which changes `openDaily`, is not merged here; whichever publishes second drops that part, because removing `openDaily` makes its thinking floor there moot.
- **2026-11-04** — Assumed: the unbuilt `callable-daily` plan, on its own branch, is moot after this change and is left for the owner to drop, because another agent can no longer call `/daily`.
- **2026-11-04** — Assumed: `daily.mjs journal --hook` stays as a silent no-op that exits 0, because a chat opened before the update still runs the old prompt hook, and a usage error there exits 2, which blocks that chat's message.
- **2026-11-04** — Assumed: `D ensure` also starts the worker for a person whose only job is a routine that starts on its own, because with no Daily chat the worker is the only thing that starts the morning.
- **2026-11-04** — Assumed: `chiefEnv(env)` takes only the env and is synchronous, not `chiefEnv(env, call)` as the design said, because the stand-in id needs no Paseo call.
- **2026-11-04** — Assumed: `hand --source` goes with all of its values, not only `asked`, and the to-do sources are `own` and `handed`, because `asked` was the only value besides the default.
- **2026-11-04** — Assumed: a morning that throws writes one `Not started: the morning — <error>` journal line per day and the worker goes on, so a broken settings file does not stop the watch.
- **2026-11-04** — Assumed: the context measure is rebaselined at the branch's start (46.3.0, `22948285`), before any text edit, because the daily skill's text moves from call-only to counted instructions; the skill's body cut keeps instructions below that baseline, and `wiki/voice.md`'s Simplified Technical English paragraph is shortened so the start-up words stay under the 2,200 ceiling, which is unchanged.
- **2026-11-04** — Assumed: `step-title.mjs` keeps its `daily-chat` label check, and the change-loop spec its *The Daily chat … keep their names* line, because an old Daily chat may stay open after the update until the person closes it; a later tidy can remove both.
- **2026-11-04** — Assumed: the test gates between task groups moved to the end of the build, by the build helper's rule.
- **2026-11-04** — Live check (task 5.2), from a plain chat in this worktree with no settings file: `D serve --dry-run` printed two watch events, `wouldCheck: wiki-tidy` and no `wouldStart` (no settings file, so no morning); `D journal --new` printed the journal's new line; `D status` gave `state: read`; `D remind --day 2026-11-01` refused with *No daily settings*. The past-day refusal and a due-routine `wouldStart` need a settings file, so they rest on the tests.
- **2026-11-04** — Check: `scripts/retired-names.json` lets `scripts/tests/daily.test.mjs` name `open-daily`, because that test checks the old command is refused. The removed test cases in `daily.test.mjs`, `daily-chief.test.mjs` and `daily-journal.test.mjs` tested code this change removes (`openDaily`, `picture`, `close`, `dailyAgent`, the prompt hook); the hook counts in `tools-on-path.test.mjs` and `pickup.test.mjs` drop by one for the removed hook.
- **2026-11-04** — Assumed: task 5.2 passed with a throwaway settings file (a daily routine, `morning` at 00:00): `D serve --dry-run` printed `wouldStart` for it, and `D remind --day 2026-11-01` refused with *2026-11-01 is in the past*, because this worktree has no settings file of its own.
- **2026-11-04** — Assumed (review fix 6.1): `D ensure` restarts a worker whose beat has no code stamp or another one, by a 12-character hash of the daily scripts folder's `.mjs` files, because a worker left from before `/wong-sync` holds the lock with fresh beats and runs code with no morning step. Only the lock holder's own beat counts, so a new worker that has not beaten yet is left alone; ensure waits up to 1 second for the old one to exit before it starts the new one, so the new one can take the lock. The journal line says *worker*, not *helper*, because `daily.md` names it the worker.
- **2026-11-04** — Assumed (review fix 6.1): the stamp covers only the daily scripts folder, not the memory scripts it imports, because the brief named that folder and a change there is what breaks an old worker's morning; a memory-only change waits for the worker's next restart.
- **2026-11-04** — Assumed (review fix 6.2): the morning reads the person's settings each pass by the same resolution as the commands (`personSettings`), and the worker keeps its start-time settings for the watch, jobs and time zone, because only the morning was named; a settings read error journals one `Not read: the settings file` line per day and the next pass tries again. A morning that throws now also tries again at the next pass, still journaled once a day, because a fixed cause should not wait a day.
- **2026-11-04** — Assumed (review fix 6.3): the inbox spec's *Delivered* scenario, which named the daily chat, now names the chat that made the item, through a new `inbox` delta, because the grep found it and the inbox stays. The daily-routine spec's other Daily chat lines are left to this change's daily-routine delta, which replaces or removes each at archive.
- **2026-11-04** — Assumed (review fix 6.4): the worker always runs the main checkout's daily scripts, in the main checkout, and `D ensure` compares its beat with that code's stamp, not the asking chat's copy, because chats in two copies would otherwise flip the worker back and forth, and a branch that edits the scripts would run unreviewed code; the per-pass settings re-read and `D ensure`'s own settings read the main checkout too, so a removed copy breaks nothing and both read the settings the worker uses. A main checkout with no daily scripts falls back to the asking copy's, as before.
- **2026-11-04** — Assumed: `D ensure` restarts a worker for older code only when the main checkout's worker writes a code stamp, because the final review found that a main checkout still on the old code (a skipped sync) would restart the same old worker at every chat start; the review rounds were used up, so the fix was made without a third round.
- **2026-11-04** — Archived for publishing (archive checkpoint) by /ship on branch new-beaver, release 47.0.0, after the build, two review rounds and the local checks passed.
