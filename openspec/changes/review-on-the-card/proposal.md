# Question cards show what you must review

**Status:** ready-to-ship
**Branch:** review-on-the-card
**Open questions:** none

## Why

Some chat apps hide the text a chat writes above a question card. So the person often asks the chat to write a draft, a table or a report again before they can answer. The rules already keep a link on the card, but nothing keeps the draft or the table there, and nothing checks it.

## What Changes

- **Every card holds what you must read to answer.** A draft, a table, a list of changes or a report goes in the card's question text, not only in the chat above it. You answer without asking for a reprint.
  ```text
  ┌ Send this reply to Dana? ─────────────┐
  │ Hi Dana,                              │
  │ Your kit ships tomorrow. …            │
  │                                       │
  │ ( ) Send it (Recommended)             │
  │ ( ) Change it                         │
  │ ( ) Don't send                        │
  │ [ Your own answer ]                   │
  └───────────────────────────────────────┘
  ```
- **Too long for a card → a page or file you can open, with its link on the card.** When the thing to review is longer than about a phone screen (40 lines), the card gives a short summary and the full link.
  ```mermaid
  flowchart TD
    A["Something to review"] --> B{"Longer than 40 lines?"}
    B -- No --> C["Whole text on the card"]
    B -- Yes --> D["A page or file you can open"]
    D --> E["Card: short summary + its full link"]
  ```
- **A check sends a card back once when it leaves the review out.** In Claude Code, when the chat wrote a draft, a table or a quote above a card, and the card holds neither that text nor a link, the card goes back to the chat once, with the reason and how the text begins. The chat then asks again with the text on the card. Lists, drawings and *Close this chat?* cards are not checked.
  ```mermaid
  sequenceDiagram
    participant C as Chat
    participant K as Check
    participant Y as You
    C->>K: Card with no draft (draft was above)
    K-->>C: Sent back: put the draft on the card
    C->>K: Card with the draft
    K->>Y: Card shows the draft
  ```
- **The other send-backs say the same.** When the chat types a question instead of a card, and when Daily's check-in sends a chat back to ask on a card, the reason now says "Put in the question what they must read to answer", not "Don't repeat the report". The reminder after a long chat is shortened says it too.

**Non-goals:** a new kind of page; changing which steps ask a question; a check for apps with no card tool (a numbered chat question hides nothing).

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `asking-the-user`: a question carries what the person must review to answer, in its text or, when too long, as a page or file linked in its text; the Claude Code check sends back once a question that leaves out a review block printed above it.

## Impact

- `.agents/plugins/loop/skills/explore/references/asking-the-user.md`: new section *Put the review on the card*; *End every reply with the next step* points at it.
- `.agents/loop/ask-check.mjs`: the `links` PreToolUse mode also checks review blocks (`reviewBlocks`, `turnReview`); new `REVIEW_REASON`; one send-back per turn shared with the link check; `REASON` and `REMINDER` reworded. No new hook.
- `.agents/plugins/daily/scripts/chief.mjs` (`askText`): the same rewording as `REASON`.
- `scripts/tests/ask-check.test.mjs`: tests for the review check and the new wording.
- Offsetting cuts for `measure-context.mjs --check`: `asking-the-user.md`, `plan/references/new-workspace.md`, `wong-sync/references/payload-manifest.md`, `wong-setup/references/cloudflare.md`.
- `.agents/plugins/loop/VERSION` 3.5.0, `.agents/plugins/daily/VERSION` 4.2.0.
- `CHANGELOG.md`: a `## Next (minor)` entry.

## Decision log

- **2026-11-24** — Assumed: this is ClaymooApp's `review-on-the-card` change (ClaymooApp PR #2488), ported so the next `/wong-sync` brings nothing different; `ask-check.mjs` is taken as is, because both repos held the same file.
- **2026-11-24** — Assumed: the long-item line says "a page or file the person can open", not ClaymooApp's `/page`, because WongStack has no page skill.
- **2026-11-24** — Assumed: the check counts only code fences (not drawings), tables and quotes since the person last spoke or answered, and skips lists and *Close this chat?* cards. ClaymooApp's 7-day backtest (1,365 questions) found lists sent back 77 of 129 cards at about 3 reports per real miss; without them, 44 were sent back (3%), about 28 real misses.
- **2026-11-24** — Assumed: a table row that the card names only by one cell is still sent back, because ClaymooApp's backtest found that exception dropped 8 real misses for 3 noise.
- **2026-11-24** — Assumed: the skill page leaves out ClaymooApp's paragraph that describes the `links` hook, because the hook enforces it and its send-back reason explains itself, and the new section needed an offsetting cut.
- **2026-11-24** — Assumed: the other offsetting cuts drop lines a script or another page already owns: the stop-hook note, the hidden-text reason now in the new section, the new workspace's start branch and technical-reader line, three payload-manifest paragraphs that `payload-files.json` and the link check own, the catch-up line the preflight section repeats, the mini-apps line, and two provision-report details the script prints.
- **2026-11-24** — Assumed: Daily's check-in prompt (`askText`) gets the same rewording as `REASON`, so no send-back still says "Don't repeat the report".
