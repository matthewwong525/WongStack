# Design

## Context

Since 45.9.0, `finished()` in `.agents/skills/daily/scripts/finished.mjs` decides whether a watched chat is finished: stopped (`idle` or `error`), not the Daily chat or a sub-agent, its folder a clean worktree of the project on a work branch, and its pull request merged at that folder's tip. Only `chief.mjs status` (`D status`, *what's going on?*) calls it, and it acts on nothing.

The worker (`daily.mjs serve`) runs the watch pass (`chief.mjs passes`, service mode) every minute, and sooner when a chat stops. Each pass reads `paseo ls --global` and `paseo permit ls`, admits chats of this repo that worked in the last 24 hours, and builds `rows` (watched chats). The chat list in Paseo shows each workspace's `title`; `paseo workspace rename <id> <title> --json` sets it (as `workspace.mjs` already does), and `paseo workspace ls --json` maps a workspace to its `cwd`, which matches the agent's `cwd`.

## Goals / Non-Goals

**Goals:**
- A watched finished chat's workspace name starts with `DONE: ` within one or two passes.
- The mark comes off when the chat is not finished any more; only a mark the helper set.

**Non-Goals:**
- No close, archive or `/close` from this path.
- No change to `finished()`, `D status`, the board, or the tidy-up.
- Nothing without Paseo: no host-neutral chat names exist to change.

## Decisions

1. **A new file, `done-titles.mjs`, called from the watch pass.** One exported `markDone({ stateDir, rows, list, pending, project, call, finishedOf, now })`, called in `passes` after `notice`, only when `service` is true (the worker), so a Daily chat's own `D watch` never renames. `serveDaily` passes `project` through `watching`, left out in a dry run as `todos` and `addons` are, so `serve --dry-run` renames nothing. *Alternative:* the chat renames itself at the end of `/ship`. Rejected: it misses a merge made outside the chat, the chat is not stopped yet at that moment, and it adds words to a skill under the instruction budget.
2. **Finished is `finished()` unchanged**, plus no pending ask for the agent, as `status` does. `finishedOf` is injectable for tests, defaulting to `finished({ agent, project, inspect })`.
3. **State in `<stateDir>/done-titles.json`**, kept across days: `marked: { [workspaceId]: { agentId, name, title } }`, where `name` is the plain name and `title` the exact title set; `checked: { [agentId]: { key, at } }`, where `key` is the agent's status plus its folder's tip.
4. **Mark:** for a finished row whose workspace title does not start with `DONE: `, strip a leading status word (`/^[A-Z]{2,}:\s+/`), set `DONE: <name>`, record it. A title of `null` falls back to the workspace's shown `name` from `workspace ls`.
5. **Unmark:** for a marked workspace whose chat is not finished (working, new commit, unsaved files, or gone from the merged state), rename back to `name` only when the current title still equals the recorded `title`; either way, drop the record. A chat that is archived drops its record with no rename.
6. **Throttle the GitHub read.** A stopped, not-finished row is checked again only when its `key` changed or 10 minutes passed. A working row needs no check: it is not finished, so it only unmarks. `finished()` reads git first and asks `gh` only for a clean work-branch worktree, so most rows cost no network.
7. **Failures are quiet.** A failed rename or `gh` read writes one `not-read` line (`source: 'done-titles'`) to the journal, as other sources do, and tries again next pass.
8. **Rename arguments.** Reuse `renameArgs` from `.agents/skills/schedule/scripts/workspace.mjs`; a `DONE: ` title never starts with `-`, so the open `--` thread (#1994) does not apply.

## Risks / Trade-offs

- **Watched chats only.** A chat idle more than a day before this ships is not watched, so it gets no mark; the 3-day tidy-up closes it anyway.
- **A merge made elsewhere** shows up within 10 minutes, not one.
- **A name flickers** when the person asks a DONE chat a quick question: the mark goes while it works and comes back after. That is the truthful state.
- **Overlap with `chat-names-and-thinking-floor`:** it edits `chief.mjs` rows and `describe`. This change adds one call in `passes`; the second to land merges by hand.
