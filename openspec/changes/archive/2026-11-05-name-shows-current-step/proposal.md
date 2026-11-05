# The chat name shows the step that runs now

**Status:** ready-to-ship
**Branch:** workspace-name-follows-status
**Open questions:** none

## Why

Today the chat name shows the step you typed, not the step that runs. When you type publish from a plan, the name says SHIP while the chat still builds, so you can not see that it builds first. The name must show what the chat does now.

## What Changes

- **The name changes when a step starts its work, not when you type it.** Type publish from a plan, and the name shows APPLY while the chat builds, then SHIP while it publishes, then DONE when the work is live. If the plan is not finished, it shows PLAN first.
  ```mermaid
  flowchart TB
    t["you type /ship"] --> p["PLAN, if not done"]
    p --> a["APPLY, builds"]
    a --> s["SHIP, publishes"]
    s --> d["DONE, live"]
  ```
- **The name can go back to an earlier step.** It always shows the step that runs now. Today a step inside another step can not move the name back, so a publish that builds first stays SHIP.
- **Typing a step word no longer changes the name by itself.** The step that starts changes it a few seconds later. A chat's first message still gives the task words, and a first message with no step word still starts at PLAN.
- **Where you see the change:**
  | Where the chat runs | When the name changes |
  |---|---|
  | Paseo | at once, at each step |
  | Codex alone | at once in the list of past chats |
  | Claude Code alone | at your next message; a step that started and ended in one turn, such as APPLY inside a publish, may not show |

Non-goals: no new step words, no change to what each step may do, and no change to which chats keep their names.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-loop`: the chat-name requirement now shows the step that runs now, can move back, and moves when a step starts its work, not when a step word is typed.

## Impact

- `.agents/skills/explore/scripts/step-title.mjs`: drop the order guard and `--typed`; the hook stops moving the step on a typed verb but still keeps task words and starts a first no-verb message at PLAN.
- Skills: `apply` sets APPLY just before it builds or previews, not first; `ship` sets SHIP at Step 2, after its `/apply` pull-in; `explore` drops `--typed`.
- Docs: `wiki/development/the-change-loop.md`, the "A chat's name starts with its step" line.
- Tests: `scripts/tests/step-title.test.mjs`.
- `scripts/retired-names.json` (`--typed`), `CHANGELOG.md` (`patch`).

## Decision log

- **2026-11-05** — Asked (the person's request) when the name changes → chose when a step starts its work, not when a step word is typed, so a publish from a plan shows APPLY while it builds, then SHIP.
- **2026-11-05** — Assumed: the name can move back to an earlier step, such as PLAN when a publish must finish the plan first, because the name must show what runs now.
- **2026-11-05** — Assumed: `/apply` sets APPLY just before it builds or makes its preview, so a publish with nothing left to build goes straight to SHIP and shows no short APPLY.
- **2026-11-05** — Assumed: the hook still takes the task words from a first message that starts with a step word, because in Claude Code or Codex alone the chat has no other name to take them from.
- **2026-11-05** — Assumed: a first message with no step word still starts at PLAN, because every chat starts in plan and no skill sets it for a plain request.
- **2026-11-05** — Assumed: in Claude Code alone the name now changes one message later than today when you type a step word, because Claude Code lets a hook set the name only when a message is sent; the person uses Paseo, where it changes at once.
- **2026-11-05** — Assumed: `--typed` is removed, not kept and ignored, because no step needs it once every move is allowed; it goes in the retired-names list.
- **2026-11-05** — Assumed: a `patch` release, because the step words and hosts stay the same and only the timing changes.
- **2026-11-05** — Assumed: to stay inside the context budget, the wiki line reads *the step at work … It moves as each step starts*, and `/apply`'s to-do section drops *nothing is committed*, which *without `/save`* already says.
- **2026-11-05** — Assumed: the two attachments that cite the change-loop page (`plan-first`, `safe-changes`) get `checked: 2026-11-05` with no rewrite, because neither names the chat's name.
- **2026-11-05** — Assumed: `/ship` runs `set SHIP` again after each `apply` inside it until `finish` merges, because `/apply` sets APPLY and the name would otherwise stay APPLY until DONE; the `apply` after a failed live look comes after the merge, so it keeps APPLY while its fix waits on *publish it?*.
- **2026-11-05** — Assumed: `/plan` sets PLAN first thing and again with `--task` at Finish, because you asked that each step renames the chat when it starts, and a chat at DONE that gets `/plan …` must not show DONE while it plans.
- **2026-11-05** — Assumed: a test reads the four loop skills and checks each still sets its steps, because a skill that loses its `set` line leaves an old step showing and nothing else would catch it.
- **2026-11-05** — Assumed: to keep the skill text inside its budget, the added words in `/ship` and `/plan` are paid for by cuts in the same files: shorter phrasing such as *say what fails* and *one final phase*, and the short `step-title.mjs` name at `/plan`'s Finish, since its first line gives the full path; no rule is dropped.
- **2026-11-05** — Archived for publish as 48.4.1, after a second look found three problems (APPLY kept after a fix build inside a publish, PLAN shown only at the end of planning, no test that each step still sets its name), all fixed; seen live in this Paseo chat going SHIP, then back to APPLY.
