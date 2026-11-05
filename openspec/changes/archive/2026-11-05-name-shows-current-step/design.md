# Design

## Context

[`step-title.mjs`](../../../.agents/skills/explore/scripts/step-title.mjs) has two ways in. The `UserPromptSubmit` hook moves the step as soon as a loop verb is typed (`typed: true`), and each skill calls `set <STEP>` itself. `nextState` ranks EXPLORE < PLAN < APPLY < SHIP < DONE and skips a lower `set` unless `--typed`. So `/ship` from a plan is SHIP at once, and `/apply`'s `set APPLY` inside it prints `STEP_TITLE=skipped lower`.

## Goals / Non-Goals

**Goals:** the skills alone move the step, at the point their own work starts; any move is allowed.

**Non-Goals:** no change to task-word rules, host writes, skip reasons, or the hook's Claude `sessionTitle` output.

## Decisions

1. **No order guard.** `nextState(state, { step, task })` always takes `step`; the task-word rules stay as they are. `set` drops `--typed`, and `STEP_TITLE=skipped lower` goes away. *Alternative:* keep the guard and pass `--typed` from nested calls; rejected, because every call would then pass it and the guard would guard nothing.
2. **The hook no longer moves the step on a loop verb.** It keeps two jobs: a chat's first message with no skill starts PLAN, as today; a loop verb on a chat with no task words stores them (`hostTask`, else `clauseOf`, with `taskFrom` as today) and leaves `step` as it was. With no step yet, it writes no name. A first message naming another skill, such as `/daily`, still stores an empty state. `VERBS` becomes the set of loop verbs, since the hook needs only "loop verb, other skill, or none". Claude `sessionTitle` keeps showing the stored title when it differs from `shown`, and at start.
3. **Each skill sets its step where its work starts:**
   - `/plan`: `set PLAN` first thing, so a chat at DONE that gets `/plan …` shows PLAN while it plans; `set PLAN --task …` at Finish stays, to take the proposal title.
   - `/apply`: `set APPLY` just before it builds, works a to-do, or makes the preview, not as its first line. Under `/ship` with every task done, it does none of these, so no short APPLY shows.
   - `/ship`: `set SHIP` moves from Step 1 to the start of Step 2, after the pull-in returns, and runs again after each `apply` inside `/ship` (Step 2's unchecked tasks, Step 4's one fix) until `finish` merges; then `set DONE`.
   - `/explore`: standalone `set EXPLORE`, without `--typed`.
4. **Retire `--typed`** in `scripts/retired-names.json`, so no live file still passes it.

## Risks / Trade-offs

- [Claude Code alone shows a typed step one message later than today] → Paseo and Codex get the write at once from `set`; the person uses Paseo. The spec scenario says so.
- [A skill that forgets its `set` leaves an old step showing] → the same risk as today; the tests pin each skill's call, and the step words are few.
- [Skill text grows past the context baseline] → the edits move lines, not add them; `measure-context.mjs --check` confirms.
