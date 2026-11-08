# The line-up keeps every chat in line, in Paseo or not

**Status:** ready-to-ship
**Branch:** ruthless-bat
**Open questions:** none

## Why

The daily's line-up keeps your chats from doing the same work or working against each other. Today it sees and reaches only chats in Paseo. A chat in a plain terminal, or in another app, gets no notes, so it can build what another chat already dropped.

## What Changes

- **Two ways to get a note to a chat, Paseo first.**
  - **A chat in Paseo**, Claude Code or Codex: Paseo, as today. A working chat reads the note after its current step; an idle chat wakes and reads it at once.
  - **Any other chat**, or a note Paseo fails to send: a waiting note. The chat's own hooks hand it over at its next stop or with your next message.
  ```mermaid
  flowchart TD
    L["Line-up"] --> Q{"In Paseo?"}
    Q -->|yes| P["Paseo"]
    Q -->|no, or Paseo fails| W["Waiting note"]
  ```
- **The line-up sees every chat, not only Paseo ones.** Each chat writes a small status card from its own hooks at its start, each message and each stop: its name, folder, transcript, and Paseo id if it has one. The line-up reads the cards and the chats' transcripts.
- **Each note still starts *From the daily:*,** writes one journal line, and counts toward the 5 own actions in a row.
- **Some things stay on Paseo.** *Tell flashy-crab: yes, merge* sends your own words, and they must arrive as your message, so it still needs Paseo. Tap answers to a chat's question, closing a chat, and one line per chat in *what's going on?* also stay on Paseo.

Non-goals: no restart of a chat stopped by the Claude usage limit; no wake for an idle chat outside Paseo; no use of Claude Code's own messages between chats; no own or third-party AI tool; no change to the Inbox chat list.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: *Watched chats stay in line with each other* works in any app that runs Claude Code or Codex, not only in Paseo; a Paseo chat gets notes through Paseo, any other chat as a waiting note.

## Impact

- `.agents/skills/daily/scripts/line-up.mjs`: reads status cards and transcripts, not `paseo ls` and `paseo logs`; `tell` picks Paseo or a waiting note per chat.
- New `.agents/skills/daily/scripts/chat-list.mjs` (status cards) and `waiting-notes.mjs` (notes for chats outside Paseo).
- `.agents/skills/daily/scripts/stop-check.mjs`: a waiting note goes out before the judge runs.
- `.agents/skills/daily/scripts/daily.mjs`: `mark` writes the card; `D line-up`, `D tell` and `D map` work outside Paseo.
- `.agents/settings.json` and `.codex/hooks.json`: the card at `SessionStart` and `UserPromptSubmit`, and waiting notes at `UserPromptSubmit`.
- `.agents/skills/daily/references/briefs/line-up.md`: chats by key or name.
- Tests: new `scripts/tests/daily-chat-list.test.mjs`, `daily-waiting-notes.test.mjs`; `daily-line-up.test.mjs`, `daily-stop-check.test.mjs`, `daily.test.mjs`.
- Docs: new `wiki/development/chats-in-line.md`, `wiki/development/daily.md`; `CHANGELOG.md` (`minor`).

## What the build needs

Nothing from you: no key, no account.

## Decision log

- **2026-11-08** — Asked why the plan worked only in Paseo, and whether the daily should use hooks instead → chose hooks inside each chat.
- **2026-11-08** — Asked whether to keep Claude Code's background wake (`asyncRewake`) and the restart after the usage limit → chose to drop both. The request this plan began with, restarting a chat after the limit, is no longer part of it.
- **2026-11-08** — Asked whether the mailbox and status cards are too much, given that Claude Code 2.1.310 already keeps a list of open chats and sends messages between them (`ListAgents`, `SendMessage`) → chose Claude Code's own messages for Claude chats; the custom mailbox and cards stay only where a tool has nothing of its own.
- **2026-11-08** — Asked whether to move to an own or open-source AI tool, so one way works everywhere → chose to stay on Claude Code and Codex: a Claude plan covers only Claude Code and Claude.ai, so another tool needs paid API use ([The Register](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/)), and WongStack must not need one named tool.
- **2026-11-08** — Asked which shape: one command with each tool's own way, Claude Code only, or one mailbox for all → chose one command with each tool's own way.
- **2026-11-08** — Assumed: *Tell flashy-crab* stays a Paseo message, because the person's own words must arrive as the person's message, and a message from another chat never counts as the person's yes.
- **2026-11-08** — Assumed: the watch, the Inbox chat list, *what's going on?* and closing chats keep reading Paseo, because they need Paseo's own list and controls, and moving them would double the plan.
- **2026-11-08** — Assumed: kept the change name `restart-after-limit`, because the review page is already open under it, and a new name would leave a second page waiting.
- **2026-11-08** — Assumed: status cards and waiting notes sit in `~/.local/state/wongstack/`, one folder for the computer, filtered by repo, not in the daily's state folder, because a hook reads no daily settings.
- **2026-11-08** — Assumed: the line-up check fires only for a chat that is idle and has new lines, so a chat that is still working does not start a run every 5 minutes.
- **2026-11-08** — Assumed: the line-up section moved to its own page, `wiki/development/chats-in-line.md`, because `daily.md` went over the 3,000-word cap; `daily.md` keeps a short summary that links it.
- **2026-11-08** — Assumed: `SKILL.md` stays as it is, because it holds no line-up text to change.
- **2026-11-08** — Assumed: the stop check hands over waiting notes even when the person is in the chat, because the note is for the chat, and the person sees it in the chat too.
- **2026-11-08** — Asked, after the first build, whether to make Paseo the default and a simple waiting note the fallback, because supporting many ways may break things → chose Paseo first and a waiting note otherwise, for Claude Code and Codex alike; Claude Code's own messages between chats are dropped, because they rest on an undocumented session file and address, and a run that records a note and then sends it in a second step.
- **2026-11-08** — Assumed: a note that Paseo fails to send waits as a waiting note, so a note is never lost.
- **2026-11-08** — Assumed: every chat, Claude Code or Codex, writes a status card from its own hooks, so the line-up has one list of chats, not Claude Code's session files beside Paseo's list.
- **2026-11-08** — Assumed: a card holds no `repo` field; the list matches each card's folder to the project, as the watch does, so the card keeps one fact less to go stale.
- **2026-11-08** — Assumed: a card is written only on `SessionStart`, `UserPromptSubmit` and `Stop`; Claude Code's `Notification` hook keeps only Paseo's stop mark, because a notice says nothing about whether the chat works.
- **2026-11-08** — Assumed: a Paseo note whose chat is gone from Paseo is dropped with one journal line, as today, not moved to waiting notes, because no hook of a closed chat would hand it over.
- **2026-11-08** — Check: `scripts/tests/daily-journal.test.mjs` now forbids only a `daily.mjs" journal` prompt hook in the Claude Code settings, not every `daily.mjs` prompt hook, because `mark` on `UserPromptSubmit` is the waiting notes' hand-over.
- **2026-11-08** — Assumed, after the second-look review: `stop-check.mjs` writes the stop's card after its checks, not `mark`, and a stop that it or the ask check sends back keeps the card `working`, because a sent-back chat keeps working with no new message, and hooks of one event run side by side, so a separate `mark` card could land after it.
- **2026-11-08** — Assumed, after the second-look review: the worker sends a Paseo note to any chat with a card, not only to one in the watch list, and checks again for check-ins off and a *Needs you* card before it sends; the streak stays in the send.
- **2026-11-08** — Assumed, after the second-look review: the worker's note delivery starts an older map fresh too, and only a new map gets the chat-key mark, so no write marks an older map as new.
- **2026-11-08** — Assumed, after the second-look review: `D tell --drop` and the waiting notes take only a chat key or an open chat's name, so a name such as `../x` never reaches outside the notes folder.
- **2026-11-08** — Saved the build for the live check: every task but 6.3 is done, the second-look review is clean, and the local checks pass.
- **2026-11-08** — Archived as 51.3.0 after the live check passed: an idle Paseo chat woke with its note, and a terminal chat got its note at its next stop, with one journal line each.
