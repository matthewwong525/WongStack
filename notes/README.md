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
conversation ──▶ /save ──▶ notes/<slug>.md ──▶ git ──▶ /dream ──▶ wiki/
                 (capture)   committed              (consolidate)   (canonical)
                                    │
                                    └──────────────────▶ /continue
                                                         (cold resume)
```

`/save` is the **only** skill that reads the conversation. It writes the note as part of the
checkpoint. `/dream` never reads a conversation, scrollback, or transcript file — it reads committed
notes, which is what lets you capture on one machine and consolidate on another. `/continue` reads
the note alongside the change so a cold resume inherits the session's understanding, not just its
plan.

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

Notes are deliberately *unfiltered* relative to the wiki: `/save` compresses, `/dream` selects. The
durable-facts judgment happens at consolidation, where it stays repeatable — not once, on one
machine, unrecoverably.

## Frontmatter

```yaml
---
slug: add-po-search
started: 2026-07-28
updated: 2026-07-29
consolidated:            # date /dream folded this into wiki/; absent until then
---
```

`consolidated:` is the watermark, and it lives **in each note** rather than in a central ledger —
a shared file appended by every machine would merge-conflict in exactly the multi-machine case this
directory exists to serve.

## Lifecycle

Subsequent saves **update the same note in place**: revise what's now better understood, append
what's new. Never a new file per save.

Notes are **kept forever**, including after consolidation — they stay referenceable, and the wiki
only carries what survived the filter. `/dream` marks them rather than deleting them.

## Where a fact belongs

| Surface | Holds | Lifecycle |
|---|---|---|
| `openspec/changes/<slug>/proposal.md` | why **this change** is shaped this way | ships, then archives — immutable after |
| `notes/<slug>.md` | everything else the session produced | permanent, mutable |
| `wiki/` | what survived consolidation | canonical, curated |

Don't duplicate across them. If a fact is about why the change is shaped that way, it belongs in the
proposal's Decision log and the note doesn't repeat it. A conversation-only session writes only the
note; a code session writes both.

## Reaching `main`

Notes are inside the **prose allowlist**, so a `/save` whose entire diff sits in `notes/**` +
`wiki/**` commits **directly to the default branch** — no branch, no PR, no `/ship`. A
conversation-only session (just a note) takes that route, and so does a `/dream` run (wiki pages
plus the `consolidated:` stamps this directory's notes pick up).

What makes a note safe to send that way is what this page is about: it is one additive, slug-unique
file, raw and non-canonical by design, carrying no code, config, or spec — so there is nothing in it
to approve. The rule itself, its scope, and what stays gated live in
[the change loop](../wiki/development/the-change-loop.md#the-prose-allowlist).
