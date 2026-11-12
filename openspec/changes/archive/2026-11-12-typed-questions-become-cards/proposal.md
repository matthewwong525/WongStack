# Proposal

**Status:** ready-to-ship
**Branch:** daily-close-card
**Open questions:** none

## Why

Chats often ask you something in plain text: *Close this chat?*, *Should I keep the old page?*. You then have to type an answer, and the chat does not stand out as one that waits for you. You want every question for you on a card you answer with one tap.

## What Changes

- **A chat that ends its turn on a typed question asks it again on a card, at once.** Today only a typed list of choices comes back as a card. Now any question for you does: the chat gets one short message to ask it on a card, with a few short answers and its recommended one first. A question that needs no answer from you ends the turn with no new words. This works in Claude Code chats, while you are there or away.
  ```mermaid
  sequenceDiagram
    participant C as "Chat"
    participant You
    C->>C: "Ends on: Close this chat?"
    Note over C: "Sent back once"
    C->>You: "Card: Close it / Keep it open"
    You->>C: "Tap"
  ```
- **Daily catches the rest when you ask *what's going on?*** A chat that still waits on a typed question, such as a Codex chat, gets one fixed message from Daily to ask it again on a card. That chat then waits in its own tab, so Daily leaves it out of its own *which to close?* question.
- **Daily never answers a close card.** Daily's check-ins and helpers leave *Close it* / *Keep it open* for you, even when *Close it* is recommended.
- **One message for each question.** A chat that can not show a card ends its turn with no new words and waits for you, as today.

**Non-goals:** a finished plan still ends on its link, not a card. A waiting chat that goes on with your command when its wait ends is the next change in this chat.

## Capabilities

### New Capabilities

### Modified Capabilities

- `asking-the-user`: *A typed closing choice is sent back to the question tool* widens from a typed list to any typed question for the person.
- `daily-routine`: *Finished chats close only when the person picks them* adds the re-ask for any chat waiting on a typed question, and that the helper never answers a close question.

## Impact

- `.agents/loop/ask-check.mjs`: a typed-question detector beside `endsWithChoices`, and its send-back text.
- `.agents/daily/profile.mjs`: an `askedInText` slot that reads the detector.
- `.agents/plugins/daily/daily/scripts/chief.mjs`, `daily.mjs`: `status` marks `typedAsk` with the stop's mark; `D reask`; `answer` refuses a close answer.
- `.agents/plugins/daily/daily/SKILL.md`, `references/chief.md`, `wiki/development/daily.md`, `CHANGELOG.md`, `scripts/tests/ask-check.test.mjs`, `scripts/tests/daily-chief.test.mjs`.

## Decision log

- **2026-11-12** — Asked whether any request for an answer, not only *Close this chat?*, should become a card → chose any question for the person.
- **2026-11-12** — Asked how to plan this beside "a waiting chat goes on with my command when its wait ends" → chose both in this chat, one at a time: this change first, then that one.
- **2026-11-12** — Asked whether a chat whose wait ends goes on with the person's own command, even a risky one like `/ship` → chose yes: their typed command is their yes. Recorded here for the next change.
- **2026-11-12** — Assumed: the main fix widens the existing Claude Code stop check for typed lists, because it runs at every stop, while the person is there too, with no AI run.
- **2026-11-12** — Assumed: the chat decides whether its question needs an answer, because a plain question mark also ends some reports; the send-back tells it to end silently when it needs none.
- **2026-11-12** — Assumed: Daily's *what's going on?* re-asks for chats the stop check can not reach, such as Codex chats, and not the background worker, because the worker sends no chat a message by its own rule.
- **2026-11-12** — Assumed: Daily's answer command refuses *Close it* and *Keep it open* in code, because a written rule alone does not stop a helper that sees *(Recommended)*.
- **2026-11-12** — Assumed: a finished plan keeps ending on its link, because its review page carries the Build buttons.
- **2026-11-12** — Assumed: `wiki/development/daily.md` went over its 3,000-word cap, so the build cut four sentences that repeat a fact the same page states elsewhere, not split it: the intro's *with or without Paseo or a settings file* (Check-ins and Your settings file say it), the *Needs you* line in The daily on a computer (The journal owns it), and the *stop check-ins* lines in Ask in any chat and With no app (Check-ins owns it). Every other fact stays.
- **2026-11-12** — Assumed: the loop module's version is `2.0.1`, one patch over `main`'s `2.0.0`, because the change touches only one line in it.
- **2026-11-12** — Assumed: task 4.1 is ticked on every check but `payload:module-versions`, which fails only because `main` moved ahead, because `/ship prepare` merges `main` and reruns the full check before the save.
- **2026-11-12** — Assumed: archive checkpoint on branch `daily-close-card` after `main` (57.0.0) came in; Daily is now 2.1.0 and the loop 2.0.2, one step over `main`, and `wiki/development/daily.md` now says `/close` keeps unfinished work and closes the workspace, as 56.0.0 made it.
