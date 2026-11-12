# Design

## Context

- `.agents/loop/ask-check.mjs` `stop` (Claude Code Stop hook) sends a turn back once when `endsWithChoices` sees 2 to 4 typed options under a question or a `(Recommended)` item, and the turn made no `AskUserQuestion` call. A lone typed question, such as *Close this chat?*, passes through.
- Daily's stop check-in (`stop-check.mjs`) sends a typed question back as an `ask`, but only after an AI judge run, and it skips while the person wrote in the last 15 minutes. It skips a turn `offeredChoices` (ask-check) already sent back.
- `D status` (`chief.mjs`) marks `finished` chats; the asking chat asks which to close and sends picks `/close` through `D reply --bucket person`. The worker sends no chat a message.

## Decisions

- **Detector:** `endsWithQuestion(text)` in `ask-check.mjs`: the last paragraph, with tap-link lines (`[👉 Tap here…](…)`) and Markdown marks dropped, holds a sentence that ends in `?`. `stopDecision` blocks on `endsWithChoices(text) || endsWithQuestion(text)`. The existing `stop_hook_active` guard keeps it to once a turn.
- **Send-back text** (one `REASON` for both): *Your reply ends with a question for the person. If you need their answer, ask it now with AskUserQuestion: 2 to 4 short options, recommended first. Don't repeat the report. If you need no answer, or AskUserQuestion isn't callable here, end the turn and say nothing more.*
- **Daily backstop:** `.agents/daily/profile.mjs` adds `askedInText: async text => …endsWithChoices(text) || endsWithQuestion(text)`, read through `slot`, so Daily alone (no loop) marks nothing new. In `status`, each watched agent that is stopped (`idle` or `error`) with no pending card gets one `readTurn`; when the slot says yes, the row gets `typedAsk: true` and `mark: turn.mark`, and loses `finished` and `covered`.
- **`D reask --agent <a> --mark <m>`:** new `reask` in `chief.mjs` builds the fixed text from the agent's Paseo `provider` (`claude` → `AskUserQuestion`, `codex` → `request_user_input`, else the first of `RUN_AGENTS`), as `askText` in `stop-check.mjs` does; reuse `askText`, moved to `chief.mjs` or exported. It calls `reply` with `bucket: 'person'`, `label: 'Asked again on a card: <title>'`, `mark`, and a new optional `kind: 'reask'`. A moved stop is refused.
- **Once:** after the send, the chat either has a card (pending, so no `typedAsk`) or ended its turn with no new words, so its last turn no longer ends on a question. The `mark` check covers two *what's going on?* calls at once. No new state.
- **Never answer a close card:** `answer` refuses a `text` equal to `Close it` or `Keep it open`, trimmed, case-insensitive, `(Recommended)` dropped, with `reason: 'close'`. `chief.md` *Sort each stop*: a close question waits for the person; never pick it.
- **SKILL.md:** the *What's going on?* bullet sends each `typedAsk` chat `D reask` and asks about the rest. Offset its words for `measure-context --check`.

## Risks

- A report that ends on a rhetorical question costs one short extra turn that ends silently.
- A Codex chat outside plan mode can not show a card; it ends silently and waits, as today.
- More stops send back: `offeredChoices` now also covers a typed question, so Daily's stop check-in skips those turns (`ask-check`) and spends no judge run on them.

## Checks after the merge

None run in the preview: it has no chats. The first real chat that ends on *Close this chat?* confirms the card; record it as an open thread.
