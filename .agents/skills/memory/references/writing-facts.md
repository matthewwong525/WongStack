# Writing facts

A fact is the least a cold reader needs to act as this session would: one or two sentences, at most 400 characters, reason included, and only what the transcript and Decision log make hard to find.

## Keep

- **What the user stated**: facts, constraints, preferences, corrections. Type `user` (who they are, private life included) or `feedback` (how they want work done). [Teammates never see these](../../../../wiki/development/memory.md#who-sees-what); the admin can.
- **Decisions with their reason**, and ruled-out options with theirs: *Rejected a Worker in front of the store: one more service to keep alive.* Type `project`.
- **Specifics**: names, repo-relative paths, numbers, versions, error strings. Tag a fact's code area; `memory.mjs areas <path>` prints it.
- **Pointers** to dashboards, tickets, external docs. Type `reference`.
- **Unanswered questions**. Type `thread`, tagged with the verb (`plan`) or area whose next run should check it, or it is refused. A fact answering a listed thread supersedes it, saying what it found.
- **Where the assistant struggled**, only when the chat shows one of four: a correction, an offered choice answered in the person's own words, a step failing repeatedly, a long hunt. One `thread` tagged `improve`: the moment, what it cost. Never private detail or a general tip; a smooth chat, showing none of the four, gets none. A repeat supersedes the earlier note, adding its date.

## Drop

- tool-call mechanics and file dumps, a struggle aside
- the assistant's route to a conclusion
- anything in the repo or the change's Decision log
- credential values, always: a fact may say `SERVICE_TOKEN` rotated and its source, never the value.

## One fact, one claim

Split a paragraph into facts that can each be superseded alone. Write absolute dates, never *yesterday*. Use the change's slug if the session had one, so `/continue` and `/ship` find it.

When the write gate shows close live facts, drop a candidate one already says; supersede one it corrects.
