# A chat that asks you in plain text asks again with tap answers

**Status:** ready-to-ship
**Branch:** schedule-checker-recommended-questions
**Open questions:** none

## Why

While you are away, a chat sometimes stops on a question it wrote as plain text, such as *Should I keep the old page or remove it?*, with no answer buttons. The check-in leaves it for you, so you must type an answer when you come back. A question asked with answer buttons lets you answer with one tap.

## What Changes

- **A typed question comes back as tap answers.** When a chat stops on a question for you that it typed in plain text, the check-in sends it back once: *ask this with answer buttons, your recommended answer first*. The chat then asks with 2 to 4 short answers, one marked *Recommended*, and waits. You tap an answer, or type your own.
  ```mermaid
  sequenceDiagram
    participant C as Chat
    participant K as Check-in
    participant Y as You
    C->>K: stops on a typed question
    K->>C: ask it with answer buttons
    C->>Y: question, recommended first
    Y->>C: one tap
  ```
- **The check-in answers a small question itself.** A small, safe decision or an obvious question, such as *tabs or spaces in this new file?* or *should I run the tests?*, it answers with the plain best answer, even when the chat recommended none, and the chat goes on. Only a question with a real choice for you gets buttons. A risky question, such as *send this email?*, always gets buttons, and only your tap answers it.
- **Some stops stay as they are.** A finished plan waits on its review page. A sign-in, key or payment step waits for you to do it. A question that already has buttons waits for your tap. A chat that stops again with no buttons after the one send-back waits for you, so no chat goes around in a loop.

Non-goals: no change to *Keep going*; no change to the line-up's notes between chats; no new screen.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: the three-bucket requirement lets the helper answer a small, safe decision or an obvious question with no recommended option; a new requirement sends any other plain-text question back once, to ask it with the question tool and a recommended answer.

## Impact

- `.agents/skills/daily/scripts/stop-check.mjs`: a fourth judge bucket, `ask`; a fixed send-back text per agent; one send-back per stretch with no word from the person.
- `.agents/skills/daily/references/briefs/stop-judge.md`, `.agents/skills/daily/references/chief.md`: when to sort a stop as `ask`; a small, safe question with an obvious answer is a `pick`, recommended or not.
- Tests: `scripts/tests/daily-stop-check.test.mjs`.
- Docs: `wiki/development/daily.md` *Check-ins*; `CHANGELOG.md` (`minor`).

## What the build needs

Nothing from you: no key, no account.

## Decision log

- **2026-11-08** — Assumed: the check-in sends a fixed message and the chat writes the question, the answers and the recommendation, because the chat holds the whole work and the check-in reads only its last 40 messages.
- **2026-11-08** — Assumed: one send-back per stretch with no word from you, and it counts toward the five check-ins in a row, because a chat that can not show buttons would otherwise be sent back at each stop.
- **2026-11-08** — Assumed: a finished plan, a sign-in, key or payment step, and a question already asked with buttons keep waiting as today, because the plan's review page already has its buttons and the others need you to act, not pick.
- **2026-11-08** — Assumed: a risky question also gets buttons, because your tap is your own answer; the check-in still never picks it.
- **2026-11-08** — Asked on the review page whether the check-in may answer a question itself → chose it answers a small decision or an obvious question, safe and undoable, even with no recommended option; only a real choice gets buttons.
- **2026-11-08** — Assumed: it works in Claude Code and Codex, naming each one's question tool, because check-ins run in both and WongStack needs no single chat app.
- **2026-11-08** — Assumed: a tap on the chat's buttons also ends the one-send-back stretch, found by the second look, because a tap is not a typed message and the next typed question was otherwise held back.
- **2026-11-08** — Assumed: only check-ins change, not the line-up's notes, because the request names the checker of stopped chats.
- **2026-11-08** — Assumed: checkpointed for the live check of task 3.2, because it needs the saved build.
- **2026-11-08** — Assumed: the live check ran the check-in with a temporary state folder, because check-ins are off on this computer and turning them on would change the person's own setting.
- **2026-11-08** — Assumed: archived for /ship as 51.2.0, because the build, the second look and the live check were done.
- **2026-11-08** — Assumed: cut 4 words from the new `ask` line in `chief.md`, because 51.1.1 went live first and the two changes together passed the instruction-word budget.
