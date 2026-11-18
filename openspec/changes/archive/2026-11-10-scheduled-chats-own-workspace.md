<!-- openspec-archive v1 2026-11-10-scheduled-chats-own-workspace -->
<!-- file proposal.md utf8 4561 -->
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
- **2026-11-10** — Archived for /ship as 51.9.0; `node scripts/payload-checks.mjs` passed locally (shellcheck skipped: not installed here).

<!-- end proposal.md -->
<!-- file design.md utf8 2572 -->
# Design

## Context

The helper starts an app-scheduled chat with `openSession()` in `app-runs.mjs`: `paseo run -d --cwd <folder> --title <title> --label schedule=<key>`. With no `--new-workspace`, Paseo makes a local workspace on the main copy and names it after the git branch. `workspace.mjs open` already solves the same problem for chats one chat opens for another: it fetches the default branch, opens a `branch-off` worktree from it, and renames the workspace from Paseo's *Created workspace* stderr line.

## Goals / Non-Goals

**Goals:**
- A scheduled chat shows under its schedule's name, and in a git project works in its own copy of the project.
- A run that could start before still starts: a fetch, default-branch, or rename problem only adds a warning.

**Non-Goals:**
- No change to background runs, the app's run result shape, or the Inbox, which finds a scheduled chat by its label, not its folder or workspace.
- No rename of workspaces that earlier runs left as *main*.

## Decisions

- **Reuse `workspace.mjs`'s helpers, don't copy them.** `defaultBranch`, `freshBase` and `nameWorkspace` become exports (`parseCreated` already is), so a scheduled chat and an opened chat pick the same base and the same name the same way.
- **The folder decides the workspace kind.** `git rev-parse --is-inside-work-tree` → `--new-workspace worktree --worktree-mode branch-off --base <origin/default>`; not git → `--new-workspace local`. A git project whose default branch can not be named also opens `local`, with a warning, because the run must still start.
- **The warning stays on the computer.** `runRound()` takes `warning` off the start result before it posts `run-result`, then logs it on the `run` line. The app's record keeps its fixed shape, and the helper's log is where a person looks for what the app caused.
- **The fetch is bounded and non-blocking.** `freshBase` fetches with an async `execFile` and an optional `timeout`; `openSession()` passes 60 s. The helper is long-running, and a synchronous fetch that hangs would stop every later run on the computer. `workspace.mjs open` keeps no limit, since a person is watching it.
- **`warning` keeps 1,000 characters in the log.** Every other field keeps 200. A joined fetch and rename warning passes 200, and the cut would drop the rename half.

## Risks / Trade-offs

- [Each run leaves a worktree] → the same as a chat `workspace.mjs open` starts; closing the chat's workspace removes it.
- [A fetch that times out starts from an older copy] → the warning says so, and the run still starts.

<!-- end design.md -->
<!-- file tasks.md utf8 1530 -->
# Tasks

## 1. Code

- [x] 1.1 In `app-runs.mjs`, make `openSession()` open a worktree from the fetched default branch, or a local workspace when the folder is not git or no default branch can be named; keep the schedule label; rename the workspace from Paseo's *Created workspace* line; return fetch and rename problems as `warning`. `runRound()` logs the warning and leaves it out of the run result.
- [x] 1.2 In `workspace.mjs`, export `defaultBranch`, `freshBase` and `nameWorkspace`; make `freshBase`'s fetch asynchronous with an optional `timeout`, which `openSession()` sets to 60 seconds.
- [x] 1.3 In `helper-log.mjs`, add `warning` to the allowed fields, kept to 1,000 characters.

## 2. Tests

- [x] 2.1 In `scripts/tests/schedule-app.test.mjs`: a git project opens a branch-off worktree from `origin/main` and is renamed; a non-git folder opens local and is renamed; a refused rename still starts with a warning; a git project with no default branch opens local with both warnings; the warning reaches the helper's real log and never the app; a hung fetch stops at its timeout.
- [x] 2.2 In `scripts/tests/helper.test.mjs`: a run's warning keeps 1,000 characters, other fields 200.

## 3. Words

- [x] 3.1 Update the **Chat** line in `wiki/stack/host-schedules.md` and `wiki/stack/live-line.md#the-log`.
- [x] 3.2 Add a `## Next (minor) — Scheduled chats open in their own named workspace` entry to `CHANGELOG.md`.

## 4. Checks

- [x] 4.1 Run `node scripts/payload-checks.mjs` and the script tests; fix what fails.

<!-- end tasks.md -->
<!-- file specs/host-schedules/spec.md utf8 1476 -->
## MODIFIED Requirements

### Requirement: A chat schedule opens its own workspace

A schedule that runs as a chat SHALL open in its own workspace, named after the schedule, never after a git branch. When the schedule's folder is a git project, the workspace SHALL be a fresh copy of the project from its latest fetched default branch, so the chat never works on the main copy. When the folder is not a git project, the chat SHALL open in that folder, in a workspace named after the schedule. When the fetch or the name fails, the run SHALL still start, and the computer's log SHALL say why. Where the computer can not open a workspace, the run SHALL not start, and the app SHALL show the run as not started and why. No run SHALL open two workspaces.

#### Scenario: A computer that can not open a workspace

- **WHEN** a chat schedule comes due on a computer whose chat app can not open a workspace
- **THEN** no chat starts, and the schedule's last run shows as not started, with the reason

#### Scenario: A morning standup run

- **WHEN** the Standup schedule starts a chat run in a git project's folder
- **THEN** the Paseo sidebar shows a workspace called *Standup*, in its own copy of the project from the latest default branch, and the main copy is unchanged

#### Scenario: The name can not be set

- **WHEN** Paseo opens the run's workspace but refuses the rename
- **THEN** the chat still starts, and the computer's log records that the workspace kept Paseo's name

<!-- end specs/host-schedules/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-10

~~~
<!-- end .openspec.yaml -->
