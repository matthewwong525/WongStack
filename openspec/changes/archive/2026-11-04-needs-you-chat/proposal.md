# A problem that needs you opens one chat

**Status:** ready-to-ship
**Branch:** cold-vampirebat
**Open questions:** none

## Why

When the daily's background worker can not read your board, start your morning, run one of your jobs, or reach Paseo, it writes one journal line and goes on. You see it only if you ask *what's going on?*. A problem that stays broken waits until you happen to look, and the worker can not fix it by itself.

## What Changes

- **The first failure writes one journal line, as today.** A problem that happens one time and then goes away needs nothing from you.
- **The same failure two times in a row opens one chat.** Its name is `Needs you: <what broke>`, such as *Needs you: the week board*. Its first message says what failed, why, and the steps to fix it. The chat does the steps an agent can do and asks you only for a step that needs you, such as a sign-in.
  ```mermaid
  flowchart LR
    f1[1st failure] --> j[one journal line]
    f1 --> f2[2nd failure in a row]
    f2 --> c["chat: Needs you: the week board"]
    ok[a success] --> r[count starts again]
  ```
- **At most one chat for each kind of problem each day.** The kinds are your board, your morning start, each of your jobs, and Paseo. A failure that goes on all day opens one chat, not one each minute.
- **A success starts the count again.** A board that reads again after one failure opens no chat.
- **Your own fix steps.** When your daily guide gives its own fix for a problem, the chat follows that, not the default steps.
- **The check-ins leave it alone.** The chat waits for you; no check-in tells it to keep going, and the worker gives it no to-do.
- **If Paseo can not open the chat, the journal says so**, with Paseo's reason.

Non-goals: no chat on a first failure; no message to another chat; no change to add-on or to-do failures, which stay journal lines; no new service to install.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: the journal requirement no longer says a failure only goes to the journal; a new requirement opens one *Needs you* chat on a second failure in a row of the same kind, at most one per kind a day, skipped by the watch and the check-ins.

## Impact

- `.agents/skills/daily/scripts/worker.mjs`: a failure count per kind in `needs-you.json`; the chat is opened through an injected opener; `serveDaily` passes the chats' ids to the watch's `ignore`; morning, job check and job start failures go through the count.
- `.agents/skills/daily/scripts/chief.mjs`: in the service watch, a source that fails again gives `not-read` with `again: true`, and a source that reads again gives `read`.
- `.agents/skills/daily/scripts/daily.mjs`: `serve` gives the worker an opener on the routine launcher and the settings' `guide`.
- `.agents/skills/daily/scripts/stop-check.mjs`: a *Needs you* chat gets no check-in.
- Tests: `scripts/tests/daily-worker.test.mjs`, `daily-chief.test.mjs`, `daily-stop-check.test.mjs`.
- Docs: `wiki/development/daily.md`; `CHANGELOG.md` (`minor`).

## What the build needs

Nothing from you: no key, no account, no sample data. The worker runs on this computer, outside the app.

## Decision log

- **2026-11-04** — Assumed: the plan's scope comes from the WongOS plan `sync-wongstack-both-ways`, which settled the four kinds, the two-in-a-row rule, one chat per kind a day, and the ignore list, because the person said that plan is the review for scope.
- **2026-11-04** — Assumed: this replaces the 47.0.0 choice that a board failure opens no chat, because the settled plan supersedes it; the first failure still opens nothing.
- **2026-11-04** — Assumed: the watch's `workspaces` source is the `paseo` kind, and only its `board` source is the `board` kind; `to-dos` and add-on failures stay journal lines, because a to-do failure can come from git, not the board, and the settled kinds name only these four.
- **2026-11-04** — Assumed: the `job:<id>` kind counts a job's check that throws and a job that does not start, not a run that ends with no line, because a long run is not a failure the person must fix.
- **2026-11-04** — Assumed: the chat opens through the routine launcher, as a new workspace from `main`, because that is how the daily already opens chats in WongStack, and its error names Paseo's reason for the journal.
- **2026-11-04** — Assumed: the install's own fix text comes from the settings' `guide` file, which the chat reads first, because the guide already owns an install's rules for the daily and needs no new setting.
- **2026-11-04** — Assumed: after the first journal line, more failures in the same run of failures write no line, and the chat-open writes one `Opened:` or `Not opened:` line, because the chat already says it and a line a minute buries the journal.
- **2026-11-04** — Assumed: each chat's own stop check skips a *Needs you* chat, as the watch does, because in WongStack the check-ins run in each chat's stop step, and a check-in would tell the chat to keep going while it waits for the person.
- **2026-11-04** — Assumed: the board's default fix ends with *the worker reads the board again within a minute*, not `D start --report`, because `start --report` reads only the saved morning, not the board.
- **2026-11-04** — Assumed: the service watch also says `read` on a source's first good read each day, because its failure list starts empty each day, so a failure yesterday and good reads today would otherwise leave the count at 1.
- **2026-11-04** — Assumed: `serveDaily` takes the `guide` from the settings it read last each pass, with the start's settings as the default, so `daily.mjs serve` passes only `openChat`; a guide added after the start counts.
- **2026-11-04** — Archived for publishing (archive checkpoint) by /ship on branch cold-vampirebat, release 47.1.0, after the build, one review fix and a clean second review.
- **2026-11-04** — Archive checkpoint again after main reached 47.1.0 first (chat names and thinking, #487); main merged in, now 47.2.0, local checks pass.
