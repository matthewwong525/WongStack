# A waiting chat goes on with your command

**Status:** ready-to-build
**Open questions:** none

## Why

You type `/ship` in a chat, and it stops to wait for another chat's work, a merge, its checks, or your answer elsewhere. When that wait ends, Daily tells the chat only the news. The chat then stops again and waits for you to say *go on*, though you already said so when you typed `/ship`.

## What Changes

- **The note tells the chat to go on with your command.** When a chat waited in the middle of a command you typed, such as `/ship`, Daily's note says what ended and tells it to go on with that command from where it stopped. Your typed command is your yes, so even `/ship` goes on to publish.
  ```mermaid
  sequenceDiagram
    participant You
    participant B as Chat B
    participant D as Daily
    participant A as Chat A
    You->>B: /ship
    B->>B: waits for chat A's change
    A->>D: change is live
    D->>B: "A's change is live. Go on with your /ship."
    B->>B: goes on and publishes
  ```
- **The chat starts no new risky step of its own.** The note only lets the chat finish the command you typed. A step outside it, such as a merge you never asked for, still waits for you.
- **A wait with no command stays news.** A chat that waited outside a command you typed gets the news only, as today.

**Non-goals:** turning a typed question into a tap card (its own chat, *Every question for you comes on a card*); a new way to send notes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: "Watched chats stay in line with each other" adds that a note for an ended wait tells the chat to go on with the person's typed command, and that this is the person's yes for that command only.

## Impact

- `.agents/plugins/daily/daily/references/briefs/line-up.md`: the map keeps each wait's typed command; an ended wait's note tells the chat to go on with it.
- `wiki/development/chats-in-line.md`: the *Waits* line.
- `CHANGELOG.md`: a `## Next` entry.

## Decision log

- **2026-11-12** — Asked (in the request) whether a waiting chat may go on with a risky command such as `/ship` → chose yes: the command the person typed is their yes; the chat never starts a new risky step of its own.
- **2026-11-12** — Assumed: the map keeps the typed command on each wait, as `waitsFor[].command`, because the run that ends the wait may be hours later and no longer see the command in the new messages.
- **2026-11-12** — Assumed: the note itself says why going on is allowed (the person typed the command), because the waiting chat reads no Daily rules before it acts on a note.
- **2026-11-12** — Assumed: no code change, because `D map` already keeps any field a wait carries, and the line-up run writes the note's words.
- **2026-11-12** — Assumed: CI runs the full checks, because another chat held the shared local check turn for over 10 minutes twice, and CI is the gate.
- **2026-11-12** — Assumed: `command` is `{at, text}`, like `choices`, because the note must give the time the person typed it (review finding).
