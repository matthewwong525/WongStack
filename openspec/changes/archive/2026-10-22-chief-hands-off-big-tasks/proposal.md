# The chief hands off big tasks by itself

**Status:** planned
**Branch:** gracious-pug
**Open questions:** none

## Why

The daily chat should stay free for quick things and for talking with you. Today the chief only hands a task to its own workspace when you say *get someone to…*. Ask it for anything else, even something big, and it does the work right there in the daily chat. While it works, it can't answer you or keep your other agents moving.

## What Changes

- **The chief decides what's big.** Quick things stay in the chat: a question, a reminder, *what's going on?*, a quick lookup. Anything bigger goes to its own workspace without you asking. That covers work that edits files, takes several steps, or needs more than a few minutes. The chief says one line, `Handed to its own workspace: <title>`, and watches it like any agent it starts.
  ```mermaid
  flowchart TD
    ask["you ask the daily chat"] --> size{"quick?"}
    size -->|"question, reminder, status, quick lookup"| here["answered in the chat"]
    size -->|"edits files, several steps, more than a few minutes"| brief["brief: goal, done, decided, free, ask first"]
    brief --> ws["its own workspace"]
    ws --> watch["the chief watches it"]
  ```
- **It doesn't ask first.** Say *do it here* with a task, or right after one is handed off, to keep that task in the chat instead. If it was already handed off, the chief closes that workspace first, so the work never runs twice. If a choice only you can make blocks the start, it still asks you before it hands the task off, in one round.
- **Where no workspace can open, nothing changes.** In a chat app that can't open one, the chief does the task in the chat, as it does today.

Non-goals: no change to how the chief sorts an agent's stops, what it may approve, or the morning steps. Other chats don't get this, only the daily chat after `/daily`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `daily-routine`: adds a requirement that the chief hands any task bigger than a quick reply to its own workspace on its own, keeping it in the chat when the person says so or when no workspace can open.

## Impact

- `.agents/skills/daily/SKILL.md`: the *any time in this chat* list gains the size rule and the *do it here* override; the existing `D open --step "task: <title>"` path does the opening.
- `.agents/skills/daily/scripts/daily.mjs`: a new `D close --agent <agent>` archives a workspace this `/daily` opened, for *do it here* right after a hand-off; tests in `scripts/tests/daily.test.mjs`.
- `.agents/skills/daily/references/chief.md`: what counts as quick vs. big, beside the brief.
- `wiki/development/daily.md#the-chief-of-staff`: the person's view.
- Payload files, so a `CHANGELOG.md` `## Next (minor)` entry; skill words count against `measure-context.mjs --check`, so the additions need an offsetting cut.
- Overlaps the unpublished `plan-the-day-first` change (workspace "Daily planning before inbox tasks"), which edits the same three files and adds *tasks handed over mid-day start at once*. Whichever publishes second merges the other's lines; this change's hand-offs start at once, the same as *get someone to*.

## Decision log

**2026-10-22** — Asked whether the chief already passes bigger tasks to new workspaces → found it only does on *get someone to…* or a step marked `(own workspace)`; chose *Plan that change*.
**2026-10-22** — Asked how this sits with the unpublished `plan-the-day-first` change → chose *Keep going here*: plan it as its own change; whichever publishes second catches up.
**2026-10-22** — Asked what counts as big → chose *Anything past a quick reply*: hand off what edits files, takes several steps, or needs more than a few minutes; keep questions, reminders, status, and quick lookups.
**2026-10-22** — Asked whether the chief asks before handing off → chose *Just hand it off*, with *do it here* to keep a task in the chat.
**2026-10-22** — Assumed: only the daily chat (after `/daily`) gets this, because the chief only exists there and a plain chat has no watch to follow the new agent.
**2026-10-22** — Assumed: a handed-off task starts work at once, with no plan first, because the overlapping change makes mid-day tasks start at once and this is the same path.
**2026-10-22** — Assumed: no script change for the hand-off itself, because `D open --step "task: <title>"` already opens and records a mid-day task.
**2026-10-22** — Assumed while building: *do it here* after a hand-off stops the new agent with a `D reply` (*Stop; this task moved to the daily chat.*) and leaves its workspace for the person to close, because this branch has no *Not today* close path and `daily.mjs` has no close command.
**2026-10-22** — Second look: a `D reply` *Stop* is refused while the handed-off agent works, and its later stops would still be sorted, so two copies of the task would run.
**2026-10-22** — Asked what *do it here* right after a hand-off does → chose *Close it, do it here*: the chief stops that agent and closes its workspace, then does the task in the daily chat. This replaces the build-time assumption above.
**2026-10-22** — Assumed while building: `D close` archives an agent with no workspace id with `paseo archive --force`, because a just-handed-off agent is running and a plain archive refuses it; the closed mark lives on its row in the day file, so a running watch can't overwrite it.
**2026-10-22** — Assumed: `D close` only archives an agent this `/daily` opened and refuses a chat handed in with `D hand`, because a handed-in chat is the person's own.
**2026-10-22** — Assumed while merging the published `plan-the-day-first`: `D close` also takes the closed agent's status card and open questions out of the inbox, because the watch drops a closed agent before it could notice it leave, so its card would otherwise stay up.
