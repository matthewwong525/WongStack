# Design

## Context

The review kit (`.agents/plugins/loop/skills/plan/references/review-kit.html`) makes every review page. Its `<header>` holds an `.eyebrow` (*Review*, or the build's name on a preview), the `h1`, a `.muted` note count, a wrapping `.jump` row and a `.hint`. A part's note id is its `data-note` id (`item-2`), and `noteOf(id)` returns the first note with that id, so a sent note opens again and *Save* overwrites it. Words and spots already take a fresh `-words-k` / `-spot-k` id by `nextId()`.

## Goals / Non-Goals

**Goals:** a short top on every review page, standalone and in the Inbox; a sent note never blocks a new note on its part.

**Non-Goals:** the Inbox frame's Back row and its `inbox:theme` look, which WongStack's Inbox relies on; the app.

## Decisions

### The short top

- Markup: `<header>` holds `h1`, then `<p class="muted"><span class="kind">Review</span> · <span class="note-count">0 notes</span></p>`, then `nav .jump`, then `#script-error`. The `.eyebrow` goes; the `PREVIEW` branch writes the build's name into `header .kind`.
- CSS: `header { padding:12px 48px 0 0 }` (the 48 px still clears the standalone theme switch), `h1 { margin:0 }`, `.jump { flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; gap:0 14px }`, `.jump a { font-size:14px; padding:6px 0 }` (16 px at 701 px and wider), `header + section { margin-top:12px }`.
- The `.hint` moves to the end of `#notes`; `render()` hides it unless `#note-list` holds the *No notes yet.* line. The `PREVIEW` / `REVIEW` hint swaps follow it. Read-only pages already hide `.hint`.
- The Inbox frame's `backRow()` still prepends `.back` to the header, so a hosted page shows *Back* above the name; its CSS stays.

### Many notes on one part

- Add a third suffix kind, `-more-k`, to `where()`, `find()` and `nextId()`; `where()` and `find()` treat it as its base (same label, same place).
- `noteFor(base)`: an unsent note or draft on the base or on any `-more-k` of it → that id; else, when the base holds a note (so a sent one) → `nextId(base, 'more')`; else the base id.
- A *Note* / *+ Note* / chip tap resolves through `noteFor()`. A pin or a notes-list entry still opens its exact note, sent ones included (editing a sent note's text clears `sent`, as before).
- `render()`: skip *+ Note* only while the part holds an unsent pin, so *+ Note* sits beside a sent pin.
- Sending, acknowledging and stored-notes checks need no change: each note keeps its own id, and a `-more-k` id passes the stored-id check.

## Risks / Trade-offs

- **Pages built before the update keep the tall top** → the kit is sealed into each page; a page built again gets the short top.
- **A new reader misses the hint at the top** → each card's *Note* and *OK* name the action; the hint still shows under *Your notes*.
- **A pin edit of a sent note can leave two unsent notes on one part** → both still send; *Note* never starts a second open note.

## UX

### Use-case brief
A person reviews a plan, a build, or other work on a review page, often on a phone, and may note the same part again after a revision. Done = *Why* shows high on the first screen, and a part takes a new note after a send. Mirrors today's review page.

### Flow
Open the page → read → *Note* on a card → *Save* → *Send notes* → the plan comes back revised → *Note* on the same card → an empty note → *Save* → *Send notes* sends only the new note.

### Hierarchy
The page's words are the content; the top is a name, one line, and one row of links. *Send notes* stays the bar's one primary action.

### Review
- The short top: review.html#/1
- Many notes on one part: review.html#/2

### Components
Existing kit parts only: `.muted`, `.jump`, `.hint`, `.pin`, `.add`, the verdict's *Note*.
