# Design

## Context

See proposal.md for why. `step-title.mjs` keeps one state file per chat: `{ step, task, taskFrom, shown }`. `taskFrom` is `prompt` (the first message's clause, or a Paseo name copied from it), `name` (any other Paseo name), or `task` (a skill's `--task`). `nextState` lets a given `--task` replace only `prompt` words or none, so a `name` or an earlier `task` stays for the whole chat. Only `/plan` passes `--task`; `/explore`, `/apply`, and `/ship` pass none.

## Goals / Non-Goals

**Goals:** each step's `set` names the work at that time; any host name from before the first step name gives way; a Paseo name the person sets later stays; names stay at most 60 characters.

**Non-Goals:** the hook's typed-command names (`/verify the invoice page`), the step words and when they move, the skip rules (Daily, routines, helpers, main folder), and renaming old chats.

## Decisions

1. **A given `--task` wins.** In `nextState`, given words replace any earlier words unless `taskFrom` is `person`. No `--task` keeps the words, as `DONE` does. Alternative: keep the old weak/strong split and only add `--task` to more skills; rejected, because a `name` would still block every step, which is how the stuck names happened.
2. **The skills give the words.** Each `set` that starts a step passes `--task`, written by the agent: `/explore` the idea in a few words; `/plan`'s first `set` the work as it understands it, and its finish the proposal's title; `/apply` and `/ship` the plan's title, or the to-do's goal for work that changes no file; `set DONE` passes none. One plan keeps one name across PLAN, APPLY, and SHIP. Alternative: let the script build words from the latest message; rejected, because a message clause is the cut-off name this change removes.
3. **A hand rename in Paseo stays.** The state gains `seen`: the host's name at the first `set` and every title written since. At each `set`, if the Paseo record's title, with its step word removed, is not one of `seen` without its step word (spaces joined, capitals ignored), the person renamed the chat: its words become the task with `taskFrom: 'person'`, and a given `--task` does not replace them. A title Paseo has not saved yet is still in `seen`, so a slow save is not taken as a rename. The hook's typed-command writes add to `seen` too. Claude Code and Codex alone have no record to read, so their names are never `person`.
4. **Words are cut to 60 characters** at a word, with a trailing comma, colon, dash, or `and` removed, in one helper that both `clauseOf` and given words use (`TASK_MAX` becomes 60).
5. **Old states keep working.** A state with no `seen` starts it from the record's title at the next `set`; `taskFrom: 'name'` and `'task'` read as replaceable.

## Risks / Trade-offs

- A name the person gave in Paseo before the chat's first step name is replaced, because the script can not tell it from Paseo's own. The person can rename it again; that name then stays.
- The words depend on the agent following the skill line. A missing `--task` keeps the old words, which is today's behavior, not a failure.
- The added skill text needs an offsetting cut to stay under the skill-text limit (`measure-context.mjs --check`).
