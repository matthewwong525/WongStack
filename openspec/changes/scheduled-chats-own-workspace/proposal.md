# Scheduled chats open in their own named workspace

**Status:** ready-to-ship
**Branch:** scheduled-chats-own-workspace
**Open questions:** none

## Why

Every chat that an app schedule starts shows as **main** in the Paseo sidebar, so you can't tell *Standup* from *Plan the week*. The helper runs `paseo run -d --cwd <folder>` with no `--new-workspace`. Paseo then makes a new local workspace on the main copy for each run and names it after the git branch. Each chat also works on the main copy, so a chat that must change a file has to move first. Chats that `workspace.mjs open` starts already get their own named worktree; scheduled chats should match.

## What Changes

- **A scheduled chat opens in its own copy of the project, named after the schedule.** The sidebar shows *Standup*, not *main*. The copy starts from the freshly fetched default branch, as a chat that `workspace.mjs open` starts does.
    ```mermaid
    flowchart LR
      sched["Schedule: Standup"] --> before["main copy, shown as main"]
      sched --> after["own copy, shown as Standup"]
    ```
- **A folder that is not a git project still gets a name.** The chat opens in that folder, and its workspace takes the schedule's name. A git project with no default branch to copy does the same, with a warning.
- **A fetch or rename problem never stops the run.** The run starts from the last fetched copy, or keeps Paseo's name. The warning goes to the helper's log only; the app's run result stays as it is.
- **A fetch that hangs stops after 60 seconds.** The helper is long-running, so the fetch runs without blocking it and has a time limit.
- **The log keeps a run's whole warning.** A warning can join a fetch warning and a rename warning, so it keeps up to 1,000 characters, not the 200 of every other field.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities
- `host-schedules`: a chat schedule's workspace is named after the schedule, and in a git project it is a fresh copy from the default branch.

## Impact

- `.agents/skills/schedule/scripts/lib/app-runs.mjs`: `openSession()` opens a worktree from the fetched default branch (a local workspace when the folder is not git or no default branch can be named), keeps the `--label schedule=<key>`, renames the workspace to the title from Paseo's *Created workspace* line, and returns fetch and rename problems as `warning`; `runRound()` logs the warning and leaves it out of the app's run result.
- `.agents/skills/schedule/scripts/workspace.mjs`: exports `defaultBranch`, `freshBase` and `nameWorkspace`; `freshBase` fetches without blocking and takes an optional `timeout`.
- `.agents/skills/hand-over/scripts/lib/helper-log.mjs`: `warning` joins the allowed fields, kept to 1,000 characters.
- Tests: `scripts/tests/schedule-app.test.mjs`, `scripts/tests/helper.test.mjs`.
- Docs: `wiki/stack/host-schedules.md` (the **Chat** line), `wiki/stack/live-line.md#the-log`.
- `CHANGELOG.md`: a minor entry.

## Decision log

- **2026-11-10** — Found: `openSession()` runs `paseo run -d --cwd <folder> --title <title>` with no `--new-workspace`, so Paseo makes a local workspace on the main copy for each run and names it after the git branch. The chat's own title was right.
- **2026-11-10** — Ported from a downstream repo, where it shipped: a scheduled chat opens in its own copy each time, and today's *main* workspaces can be renamed by hand with `paseo workspace rename`.
- **2026-11-10** — Assumed: a folder that is not a git project opens a local workspace named after the schedule, because a worktree needs git and the run must still start.
- **2026-11-10** — Assumed: a failed fetch, a missing default branch or a refused rename keeps the run going with a warning, because a stale copy or a wrong name is better than a missed run.
- **2026-11-10** — Assumed: the warning stays in the computer's log and never reaches the app's run result, so the app's record keeps its fixed shape.
- **2026-11-10** — Assumed (from the downstream ship review): the fetch gets a 60-second limit and runs asynchronously, because the helper is long-running and a hung fetch would stop every later run. `workspace.mjs open` keeps no limit.
- **2026-11-10** — Assumed (from the downstream ship review): the log keeps 1,000 characters of `warning`, because a joined fetch and rename warning passed 200 and lost the rename half.
