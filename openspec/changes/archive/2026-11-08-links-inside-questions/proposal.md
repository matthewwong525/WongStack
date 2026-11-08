# A question that needs you to open something shows its link inside the question

**Status:** ready-to-ship
**Branch:** print-plan-link-in-questions
**Open questions:** none

## Why

When a chat asks you something, such as *review the plan* or *sign in on this page*, the link is often missing. Today the rule says the link goes only on its own line above the question card. Some chat apps hide the text above the card, and sometimes the chat forgets to write the line. Then you see a question that asks you to open a page, with no page to open.

## What Changes

- **The link is also inside the question.** When a question needs you to open, read, or do something at a link, the question itself shows the full link. The link also stays on its own line above the card, so you can click it there. The answer buttons still only name the link, such as *Review the plan*.
  ```text
  Click here to see the plan: https://admin.example/r/abc

  ┌ Question ─────────────────────────────┐
  │ Look over the plan, then choose:      │
  │ https://admin.example/r/abc           │
  │ ( ) Build it (Recommended)            │
  │ ( ) Review the plan                   │
  │ ( ) Stop                              │
  └───────────────────────────────────────┘
  ```
- **A check catches a question with no link.** In Claude Code, just before a question goes out, a small check looks at the reply. If the reply has a link for you, or the plan or preview builder gave one, and the question does not show it, the check sends the question back once: *put the link in the question*. The chat then asks again with the link. It never sends the same question back twice.
  ```mermaid
  sequenceDiagram
    participant C as Chat
    participant K as Check
    participant Y as You
    C->>K: question, no link
    K->>C: put the link in it
    C->>Y: question with the link
  ```

Non-goals: no change to when a chat asks; no change to the plan's review page; other chat apps, such as Codex, get the written rule but no check.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: *Every reply that returns control ends with the next step*, *A changed plan's reply carries its link* and *A preview link opens the page that changed* now put the full link in the question text as well as on its own chat line; a new requirement adds the Claude Code check before a question goes out.

## Impact

- `.agents/skills/explore/references/asking-the-user.md`: *End every reply with the next step*, *Print the plan's link*, *Print the preview's link*.
- `.agents/skills/explore/scripts/ask-check.mjs`: a new `links` mode for a `PreToolUse` hook on `AskUserQuestion`; the compaction `REMINDER` names the link rule.
- `.agents/settings.json`: the `PreToolUse` entry.
- Tests: `scripts/tests/ask-check.test.mjs`.
- Docs: `CHANGELOG.md` (`minor`).

## What the build needs

Nothing from you: no key, no account.

## Decision log

- **2026-11-08** — Asked where the link goes when a question needs you to open something → chose both: its own line above the card and the full link inside the question text.
- **2026-11-08** — Asked whether a check should stop a question that is missing its link → chose to add a check.
- **2026-11-08** — Assumed: this replaces the 2026-10-15 rule that no link goes inside the question card, because the link above the card is kept, so a click still works there, and the copy in the question stays seen when an app hides the text above the card.
- **2026-11-08** — Assumed: the answer buttons still only name the link, never hold the address, because a long address makes a button hard to read and the question already shows it.
- **2026-11-08** — Assumed: the check runs only in Claude Code, because Codex's hooks in this repo watch file edits only and its question tool is not known to accept a hook; Codex follows the written rule.
- **2026-11-08** — Assumed: the check looks for links in the reply's own text and in the *Click here to see …* lines the plan and preview builders print, because those are the links a question asks you to open; it sends a question back once, then lets it go, so no chat loops.
- **2026-11-08** — Assumed: the check also reads a *Click here to see …* line the chat wrote itself, not only one a tool printed, because the person needs that link the same way.
- **2026-11-08** — Assumed: to keep the instruction word budget, *Write in plain words* now links the person page for a standing ask instead of restating that it is never guessed from one message; [the People rules](../../../wiki/wiki-style.md#people) already say so.
- **2026-11-08** — Assumed: `tools-on-path.test.mjs` now expects twelve node hooks and `pickup.test.mjs` nineteen, because both count every hook command and this change adds one.
- **2026-11-08** — Assumed: the check waits up to 2 seconds for the question's own row in the chat record before it reads, because the first live test showed Claude Code writes that row, and the text above it, just after the hook starts, so the check saw no link.
- **2026-11-08** — Assumed: the one failing script test, a password-manager view in `hand-over.test.mjs`, is flaky and not this change's, because it passed and failed on two runs alone and this change touches no browser file; CI decides.
- **2026-11-08** — Assumed: after you answer a question, the check counts only links shown after that answer, found by the second look, because an answer is not a typed message and a later, different question was otherwise sent back for an old link.
- **2026-11-08** — Assumed: archived for /ship as 51.4.0, because the build, the second look and the live check were done.
