# `notes/` — session capture

Conversations hold understanding that no diff can express: why an option was rejected, what the user
said the constraint actually is, the dead end that cost an hour. That understanding used to live in
one machine's scrollback and die there. This directory is where it enters the repo.

**One note per line of work, at `notes/<slug>.md`** — keyed by the same slug as the branch and the
OpenSpec change, so `notes/add-po-search.md` sits parallel to `openspec/changes/add-po-search/`.
A conversation that produced no change still gets a note, named for its topic.

No date in the filename. A note that spans three days shouldn't be stamped with the first one —
dates live in the frontmatter and in the entries.

## Who writes it, who reads it

```
conversation ──▶ /save ──▶ notes/<slug>.md ──▶ git ──▶ /continue
                 (capture)   committed                 (cold resume)
```

`/save` is the **only** skill that reads the conversation. It writes the note as part of the
checkpoint. `/continue` reads the committed note alongside the change, so a cold resume on another
machine inherits the session's understanding, not only its plan. An explicit wiki task can use notes
as ordinary repo context when reusable documentation needs an update; no automatic consolidation
step owns that transfer.

## The bar: concise, without losing context

A note is a **compression, not a summary**. Summaries drop the "why," and the why is the whole
payload. Write so a cold reader on another machine reaches the same understanding you have now,
without the transcript.

**Keep:**
- what the user stated — facts, constraints, preferences, corrections
- decisions and their rationale, including what was ruled out and *why*
- specifics: names, repo-relative paths, numbers, versions, error strings
- open threads and unresolved questions

**Drop:**
- tool-call mechanics and file dumps
- the assistant's reasoning-out-loud
- the back-and-forth shape of arriving somewhere — keep the destination and the why
- anything already true in the repo

Notes are deliberately *unfiltered* relative to the wiki. `/save` keeps the context a cold reader
needs. A later wiki task makes its own durable-facts judgment instead of changing the note into a
queue for another command.

Credential **context** is kept; credential **values** are not. A note may record that
`SERVICE_TOKEN` rotated, what it is for, and where it comes from. It never records the old or new
value, even when the user pasted that value into the conversation. The same exclusion applies to the
change's Decision log, commit message, pull-request body, and checkpoint report.

## Frontmatter

```yaml
---
slug: add-po-search
started: 2026-07-28
updated: 2026-07-29
---
```

## Lifecycle

Subsequent saves **update the same note in place**: revise what's now better understood, append
what's new. Never a new file per save.

Notes are **kept forever**. They stay referenceable as the session record and remain available to
`/continue` and later explicit work.

## Where a fact belongs

| Surface | Holds | Lifecycle |
|---|---|---|
| `openspec/changes/<slug>/proposal.md` | why **this change** is shaped this way | ships, then archives — immutable after |
| `notes/<slug>.md` | everything else the session produced | permanent, mutable |
| `wiki/` | reusable process and conventions | canonical, curated |

Don't duplicate across them. If a fact is about why the change is shaped that way, it belongs in the
proposal's Decision log and the note doesn't repeat it. A conversation-only session writes only the
note; a code session writes both.

## Reaching `main`

Notes are inside the **prose allowlist**, so a `/save` whose entire diff sits in `notes/**` +
`wiki/**` commits **directly to the default branch** — no branch, no PR, no `/ship`. A
conversation-only session (just a note) takes that route, as does explicit wiki-only work.

What makes a note safe to send that way is what this page is about: it is one additive, slug-unique
file, raw and non-canonical by design, carrying no code, config, or spec — so there is nothing in it
to approve. The rule itself, its scope, and what stays gated live in
[the change loop](../wiki/development/the-change-loop.md#the-prose-allowlist).
