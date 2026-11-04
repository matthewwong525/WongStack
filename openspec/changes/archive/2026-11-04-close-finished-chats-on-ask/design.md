# Design

## Context

Wrap-up (45.5.0) is a built-in worker job: every 5 minutes, `wrap-up.mjs` reads the watch's Paseo lists, checks each chat's folder (`lookFolder`, tidy's `savedState`) and pull request (`mergedAtTip`), and sends `/close`. It was the only user of the worker's built-in path (`sweep.do`, `BUILTINS`, the `builtins` map). The board's Done (`todos.mjs closeDone`) reads wrap-up's record so a chat gets `/close` once. `D status` (`chief.mjs status`) already lists each watched chat with its Paseo status and open asks; the Daily skill answers *what's going on?* from it.

## Goals / Non-Goals

**Goals:** no automatic `/close`; `D status` says which chats are finished; the person's pick sends `/close` through an existing command.

**Non-Goals:** a new `D` command; caching `gh` reads for `status` (it runs only on request); cleaning up an old `wrap-up.json` in the state folder (nothing reads it, and the state folder is not in git).

## Decisions

- **Move the finished check, not delete it.** `lookFolder` and the merged-at-tip test move from `wrap-up.mjs` to a small read-only `finished.mjs` that exports `finished({ agent, project, look, prOf })`: true when the chat is idle or errored, its folder is a worktree of this checkout on a non-default branch, saved, and its pull request merged at the folder's tip. `status` calls it per row only for rows with no open ask, through an injectable `finishedOf` so the chief test needs no git or `gh`. Rejected: computing it in the skill from `gh` by hand, which repeats rules the code already has.
- **The pick goes through `D reply`.** The Daily chat writes `/close` to a private file and runs `D reply --agent <agent> --file <file> --bucket person --label "Closed: <title>"`. `reply` already refuses a gone or working chat and logs the action, so a pick on a chat that moved on fails safe. Rejected: `D close`, which force-archives a chat the Daily opened and skips `/close`'s save step.
- **Drop the built-in job path.** With wrap-up gone, `BUILTINS`, `badSweep`'s `do` branch, the worker's `builtin()` runner, the `serveDaily` `builtins` map and its `seen` list capture go, and so do the docs for `"do"`. An install list that still names `"do"` now fails as a bad job, like any unknown field value; it shipped one day ago and no install list in the docs uses it.
- **Done stops reading the wrap-up record.** `closeDone` loses its `wrapped` argument; `wrapUpFile` goes from `todos.mjs`.
- **Retire the script name.** `wrap-up.mjs` goes in `scripts/retired-names.json` pointing at `finished.mjs`, so no live doc keeps naming it. The bare word *wrap-up* stays, because `/close` uses it for its own saved summary.

## Risks / Trade-offs

- [`status` gets slower: one `gh` call per idle chat] → only on request, and the watch's row cap already bounds it.
- [A person who liked the automatic close loses it] → they ask *what's going on?* once in a while; the 3-day tidy-up still closes forgotten chats.
