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
