# Design

## Context

See proposal.md for why. `step-title.mjs` has two paths. A skill runs `set <STEP>` and writes the name to every host. The `UserPromptSubmit` hook stores task words from the first message and, in Claude Code, shows the stored name through `sessionTitle`. Today the hook's `stateFor` also gives a first message with no skill the step `PLAN`, and `hostTask(record)` takes Paseo's name as `taskFrom: 'name'`, which `nextState` never lets `--task` replace.

## Goals / Non-Goals

**Goals:** only `set` or a typed command gives a step; a Paseo name copied from the first message is weak.

**Non-Goals:** no change to `set`, `nextState`, the skills, or which chats keep their names; no rewrite of stored state files.

## Decisions

1. **A plain message gives no step.** In `stateFor`, a first plain message stores `{ step: null, task, taskFrom }`, as a first loop verb does today. `titleOf` gives `null` with no step, so the hook writes and shows nothing until a `set` gives a step. Alternative: guess PLAN only for messages that look like build requests. Rejected: a guess is wrong for some messages, and `/plan` sets PLAN first thing anyway.
2. **A copied Paseo name is weak.** A new `copiedName(name, prompt)` is true when the prompt, with whitespace collapsed and lowercased, starts with the name treated the same way. When the hook sees a copied name, it uses `clauseOf(prompt)`, or no words for a bare command such as `/email`, with `taskFrom: 'prompt'`; `nextState` then lets `/plan`'s `--task` replace it. A name that is not a prefix, such as one a person typed or `workspace.mjs --title` gave, stays `taskFrom: 'name'`. Alternative: compare only the first 60 characters. Rejected: the prefix test does not depend on Paseo's cut length.
3. **A typed command gives its step at once.** `stateFor` reads the skill name with the existing `SKILL` pattern. `explore` gives `EXPLORE`; `plan` and `improve-code` give `PLAN`; `apply`, `continue`, and `ship` give no step, so their skill sets it. Any other name gives its own word in capitals, with a leading `wong-` dropped, but only when `<top>/.claude/skills/<name>/SKILL.md` exists, so a host command such as `/compact` or a plugin skill (`a:b`) changes nothing. The new step goes through the same path as today: the hook writes it to Paseo and Codex and shows it in Claude Code through `sessionTitle`. The typed-skill state also takes task words like a plain message, so `/verify the invoice page` as a first message gives `VERIFY: The invoice page`. This replaces the 2026-11-04 rule that a first message naming another skill stores an empty state. Alternative: a `set` line in every skill. Rejected: it costs skill words in every file, shows in Claude Code only a message later, and renames on a nested `/save` or `/verify` inside `/ship`.
4. **`setStep` keeps `hostTask` as `name`** when no state exists. With no prompt it can not tell a copy, and in Paseo the hook runs before any step, so the state already exists.

## Risks / Trade-offs

- [In Claude Code alone, `/plan` from a plain message shows PLAN one message later] → accepted; Paseo and Codex show it at once.
- [A name a person typed that is also the start of their first message counts as copied] → rare, and the plan's title is a good name too.
- [A typed command leaves its word in the name after it ends, such as VERIFY after the check] → accepted: the name shows the last thing that ran until the next command or step.
- [The Codex hook test checks a write on a first plain message, which no longer happens] → the test runs a `set` first so the hook's write path is still covered.
