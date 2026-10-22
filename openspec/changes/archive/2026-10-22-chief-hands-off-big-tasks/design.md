# Design

## Context

See proposal.md for why. The chief already opens a mid-day agent through `D open --step "task: <title>" --title <title> --brief <file>`, on the person's *get someone to…* (`.agents/skills/daily/SKILL.md`, *Any time in this chat*). That path briefs by the five parts, records the open in `wong-daily/`, and adds the agent to the watch. Only the trigger changes: the chief's own judgment of size, not the person's phrase.

## Goals / Non-Goals

**Goals:** one size rule the chief applies to every ask in the daily chat; a one-line override.

**Non-Goals:** no script change beyond `D close`; no change to stop sorting, approvals, or the brief's parts; no size rule outside the daily chat.

## Decisions

- **Rule in prose, not a script.** Size is a judgment on the person's words, so it stays with the chief. A keyword list in `daily.mjs` would miss most phrasings. Alternative rejected: a `D classify` command.
- **The rule lives in `chief.md`; `SKILL.md` points at it.** `chief.md` already owns how the chief judges, so its *quick vs. big* section sits beside *Brief before you start an agent*. `SKILL.md`'s *Get someone to …* line becomes *A task past a quick reply*, keeping *get someone to* as the explicit form. One home, so the two can't drift.
- **Quick = the chief's own errands.** Questions, reminders (`D remind`), status (`D status`), watching (`D hand`), and a lookup of a few reads. Big = edits a file, several steps, or more than a few minutes. In doubt → hand it off: a short task in a workspace costs little; a long one in the chat blocks the chief's watch.
- **Override.** *do it here* in the ask keeps it in the chat. Right after a hand-off, the chief runs a new `D close --agent <agent>`, which archives that agent's workspace (or the agent, when it has none) through Paseo, the same call `plan-the-day-first` uses for *Not today*, and drops it from the watch, so its later stops are never sorted. Then it does the task here. `D reply` can't do this: it refuses a working agent. Alternative rejected: leaving the workspace for the person to close, which runs two copies of the task.
- **Fallback unchanged.** `unsupported` or `failed` from `D open` already runs the task in the chat.

## Risks / Trade-offs

- [The chief misjudges size] → the one-line hand-off note shows it at once, and *do it here* reverses it.
- [Skill-text budget] → `measure-context.mjs --check` may fail; trim an equal number of words elsewhere in `chief.md` or `SKILL.md`.
- [Overlap with `plan-the-day-first`] → both edit the *Get someone to* line and the wiki's *Talk to it* list; whichever publishes second merges by hand, keeping *starts at once*.
