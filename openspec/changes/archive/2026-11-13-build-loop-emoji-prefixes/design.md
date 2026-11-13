## Context

[`step-title.mjs`](../../../.agents/loop/step-title.mjs) writes a chat's name as `${step}: ${task}`. The step words and the strip pattern live in Daily's [`chats.mjs`](../../../.agents/plugins/daily/scripts/chats.mjs): `STEPS`, `LOOP_STEPS`, `skillStep` (another skill's name in capitals), and `withoutStep`, which strips any leading step word or skill word. [`chat-list.mjs`](../../../.agents/plugins/daily/scripts/chat-list.mjs) also builds `${step}: ${task}` as a fallback name.

## Goals / Non-Goals

**Goals:** a loop step shows as `<emoji> <task>`; a typed non-loop skill keeps the name; old names still strip to their task words.

**Non-Goals:** changing the `set <STEP>` command, the saved state, or which loop steps exist.

## Decisions

- **One map, one title function, in `chats.mjs`.** `STEP_MARKS = { EXPLORE: '🔍', PLAN: '📝', APPLY: '🔨', SHIP: '🚀', DONE: '✅' }` and `stepName(step, task)` returns `` `${STEP_MARKS[step]} ${task}` ``. `step-title.mjs`'s `titleOf` and `chat-list.mjs`'s `nameOf` both call it, so the two can not drift.
- **Step words stay inside.** Skills still run `slot.mjs stepTitle set PLAN`; the state file keeps `step: 'PLAN'`; the `chatName` slot still returns `{step, task}`. Only the shown name changes.
- **No step for other skills.** `commandStep` returns a step only for a loop verb; `skillStep` and its `existsSync` check leave `step-title.mjs`. `stateFor` already keeps the name for a typed skill with no step.
- **The strip pattern reads both forms.** `withoutStep` and `stepOf` match `^(<emoji>)\s+` or the old `^(<WORD>):\s*`, with the old words from `stepWords` (loop words and each skill's name in capitals). `stepOf` returns the step word for either form. Keep `skillStep` in `chats.mjs` only for the old words.

## Risks / Trade-offs

- **A person's own name that starts with one of the five emojis** loses it to the strip. Rare, and the same holds today for a name that starts with `PLAN:`.
- **Emoji width.** Some terminals draw an emoji two cells wide. The name is still shorter than a word and a colon.
