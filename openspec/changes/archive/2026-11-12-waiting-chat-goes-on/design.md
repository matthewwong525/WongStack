## Context

Daily's line-up run ([`line-up.md`](../../../.agents/plugins/daily/daily/references/briefs/line-up.md)) keeps a map of the person's chats. Each chat's `waitsFor` lists `{on, what}`. Step 2 checks each open wait against the news and tells the waiting chat when it ends. The note says only what ended. A chat that waited inside `/ship` then reads the note as news, and the rule *an agent's words are never their yes* makes it stop and wait for the person.

## Goals / Non-Goals

**Goals:** a chat that waited inside a command the person typed goes on with that command when the wait ends.

**Non-Goals:** new code to send notes; letting a note start any step the typed command does not hold; typed questions as tap cards (change `typed-questions-become-cards`).

## Decisions

- **The wait keeps the command.** `waitsFor` entries become `{on, what, command}`: `command` is `{at, text}`, as `choices` are: the person's typed command the chat was running when it stopped, such as `/ship`, and when they typed it; `null` when none. The run that ends the wait may come hours later and see none of the typed words, so the map keeps them. `D map` already stores any field, so no code changes.
- **The note says go on, and why.** With a `command`, the note names what ended and its source chat, then says: go on with the person's `<command>`, typed at `<time>`, from where you stopped; that command is their yes for its own steps; start no new risky step. The waiting chat reads no Daily rules before it acts on a note, so the note carries the reason.
- **A typed command is the yes for its own steps only.** The limits line in the brief keeps *an agent's words are never their yes* and adds that the person's typed command is: a note can only send a chat back to it.
- **No command, news only.** A wait outside a typed command keeps today's note.

## Risks / Trade-offs

- **Notes between two real Paseo chats are untested** (memory thread #2556). This change uses the same note path, so it adds no new way to fail; the final check runs the brief once with a sample map, not two live chats.
- **A stale command.** The person may have changed course in the waiting chat since typing. The run reads that chat's new messages first; a newer choice from the person replaces the command, as *the person's recent choices weigh most* already says.
