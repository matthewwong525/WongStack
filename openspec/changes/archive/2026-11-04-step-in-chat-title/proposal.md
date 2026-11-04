# Show the step in the chat title

**Status:** planned
**Branch:** unusual-hamster
**Open questions:** none

## Why

Today you must open a chat to see what it is doing: thinking, waiting for your review, building, publishing, or finished. With many chats open, that costs time. A step word at the start of each chat's name shows this at a glance, in Paseo and also in plain Claude Code or Codex.

## What Changes

- **Each chat's name starts with its step, in capital words.** The five words are EXPLORE, PLAN, APPLY, SHIP and DONE. The rest of the name stays the task, in the same words as now.
  ```text
  EXPLORE: Ideas for the sign-up page
  PLAN: Show the step in the chat title
  APPLY: Fix the invoice total
  SHIP: Ship goes all the way
  DONE: Live reader for company knowledge
  ```
- **The name changes when the chat moves to a new step.** A new chat starts in PLAN, or EXPLORE when you ask it only to think. It moves to APPLY when you say build, and to SHIP when you say publish. It moves to DONE when the work is live, or when a to-do that changes no file is finished. A step inside another step does not move the name back: a publish that must build first stays SHIP.
  ```mermaid
  flowchart TB
    e[EXPLORE] -->|plan it| p[PLAN]
    p -->|build| a[APPLY]
    a -->|publish| s[SHIP]
    p -->|publish| s
    s -->|live| d[DONE]
    a -->|to-do done| d
  ```
- **It works with or without Paseo.** Where you see the name, and when it changes:
  | Where the chat runs | Where you see the step | When it changes |
  |---|---|---|
  | Paseo | the chat list and the chat's tab | at once |
  | Claude Code alone | the chat's name | when you type a step, at once; a move the chat makes itself, such as DONE at the end of a publish, shows at your next message |
  | Codex alone | the chat's name in the list of past chats | at once in that list; an open Codex screen may show it only after you open the chat again |
- **Each step writes the whole name.** The task words are kept from the chat's first name, and a name typed by hand is replaced at the next step. A chat with no good name yet, such as a branch name, takes the plan's title.

Non-goals: no off switch, and no change to what each step may do. The Daily chat, routines and helper chats keep their names.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-loop`: a new requirement that every chat's name starts with its current step word, kept up to date as the chat moves, in Paseo, Claude Code and Codex.

## Impact

- New `.agents/skills/explore/scripts/step-title.mjs`: records a chat's step and task words, and sets the name in Paseo (chat and workspace), Claude Code (hook output) and Codex (its chat-name list).
- Hooks: `.agents/settings.json` (Claude Code) gains a `UserPromptSubmit` and a `SessionStart` entry; `.agents/hooks.json` (Codex) gains a `UserPromptSubmit` entry.
- Skills: one line each in `explore`, `plan`, `apply`, `ship` `SKILL.md`, offset by cuts for `measure-context.mjs --check`.
- Docs: `wiki/development/the-change-loop.md`.
- Tests: `scripts/tests/step-title.test.mjs`.
- `CHANGELOG.md` (`minor`).
- Overlap: the unpublished plan `done-chat-titles` (workspace "Mark finished chats DONE") is folded in here and will not be built. `chat-names-and-thinking-floor` (PR #487) edits `workspace.mjs` naming at open time; this change only reads names.

## Decision log

- **2026-11-04** — Asked how the step words look → chose full words (EXPLORE, PLAN, APPLY, SHIP, DONE), not short forms, because full words are clearer.
- **2026-11-04** — Asked how this plan fits with the chat "Mark finished chats DONE", which planned the DONE part → chose one plan here for all five words; that chat was told to stop and not build its plan.
- **2026-11-04** — Assumed: the name reads `<STEP>: <task>`, because the other chat's `DONE: ` plan already used that shape.
- **2026-11-04** — Assumed: the chat itself sets DONE at the end of its publish, not the daily's helper watching for finished chats, because the chat's own step works without Paseo and the helper does not; a merge made from another chat is rare.
- **2026-11-04** — Assumed: under `/plan`, the short explore pass keeps the name PLAN; EXPLORE shows only when you ask the chat just to think, because that is the step the chat is in.
- **2026-11-04** — Assumed: a step run inside another one never moves the name back (a publish that builds first stays SHIP; DONE stays DONE), and only a step you type does, because the name must show the step you asked for.
- **2026-11-04** — Assumed: a message with no step word keeps the current step, except a chat's first message, which starts PLAN, because every chat starts in plan.
- **2026-11-04** — Assumed: in Paseo both the chat's name and its workspace's name change, but not a workspace in the main folder, because the Daily chat and others share it.
- **2026-11-04** — Assumed: plain Claude Code shows a move the chat makes by itself at the next message, because Claude Code lets a hook set the name only when a message is sent or a chat starts.
- **2026-11-04** — Asked whether a mark typed by hand, such as `WAITING: `, gets replaced → chose to just overwrite: each step writes the whole name, with no special case for a hand-typed mark.
- **2026-11-04** — Assumed: there is no off switch, because a name change does no harm and the person asked for it everywhere.
- **2026-11-04** — Assumed: Codex is renamed through its own `codex app-server` `thread/name/set` call, with the `session_index.jsonl` line as a fallback, because 0.159.2's chat list reads the name from `state_5.sqlite` and the jsonl line alone does not show.
- **2026-11-04** — Assumed: a Paseo chat in the main folder, a Daily chat (`daily-chat=1`), an internal chat, or a daily, memory or stop-check run sets no name; plain Claude Code or Codex in the main folder still does, because a person working alone often works there.
- **2026-11-04** — Assumed: `/explore` sets EXPLORE as a typed step, because a new chat already starts at PLAN and the rank guard would block it.
- **2026-11-04** — Assumed: the Claude Code hook sends the name only when the stored title changed, and always on start or resume, so it does not write the name again at every message.
- **2026-11-04** — Assumed: the Paseo and Codex writes run in a background process when called from a hook, because each `paseo` call takes about 0.8 s and the hook must return at once.
- **2026-11-04** — Assumed: five sentences in `the-change-loop.md` were cut to fit its word cap and the `named-secret-save` route; checks.mjs, `required-tools.md` and the payload manifest also cover those facts.
