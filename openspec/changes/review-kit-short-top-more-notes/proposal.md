# A review page opens with a short top, and a part takes more notes

**Status:** ready-to-ship
**Branch:** review-kit-short-top-more-notes
**Open questions:** none

## Why

On a phone, a review page's top fills half the screen before the first words: a *Review* label, the name, the note count, section links that wrap to two rows, and a three-line hint. And after you send notes and the plan comes back revised, a part you noted before takes no new note: *Note* opens the old, sent note, so you must clear it to add one. ClaymooApp fixed both on 2026-11-24, and every WongStack review page has the same top and the same notes.

## What Changes

- **The top is three short lines: the name, *Review · 0 notes*, and the section links in one row.** The *Review* label joins the note count. The links get smaller and stay on one row; on a narrow screen the row scrolls sideways. The how-to hint (*Tap Note to comment…*) moves into the empty *Your notes* section and goes when the first note comes. A finished build's page keeps its own words, the build's name and *Built: look, then publish?*, on the same short top. *Why* now starts about a third of the way down a phone, not half way.
  ```text
  Before                 After
  Review                 my-change
  my-change              Review · 0 notes
  0 notes                Why Changes Needs …
  Why Changes Needs …    Why
  Decisions Notes        ┌──────────────┐
  Tap Note to comment…
  (3 lines)
  Why
  ```
- **A part you noted before takes a new note.** A sent note stays on its part, marked *Sent*. Beside it, *+ Note* (or the card's *Note*) opens an empty note, and saving adds a second note on the same part. Only the new note goes with your next *Send notes*. Tap the *Sent* pin to read the old one. A note not yet sent opens again to edit, so one part never holds two open notes from *Note*.

**Non-goals:** no change to the Inbox, its Back row, or its light or dark look; no change to the cards, the bottom bar, or what a note says.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities
- `review-pages`: a review page's top is short, with the hint in the empty notes section; a sent note never blocks a new note on the same part.

## Impact

- `.agents/plugins/loop/skills/plan/references/review-kit.html`: the short top and its CSS; a `-more-k` note id in `where()`, `find()` and the Note buttons.
- `scripts/tests/review.test.mjs`, `scripts/tests/review-browser.test.mjs`.
- `wiki/review-pages.md`, `CHANGELOG.md`, `.agents/plugins/loop/VERSION`.

## Decision log

- **2026-11-24** — Assumed: port the review kit's short top and many notes on one part from ClaymooApp's `artifact-top-bar`, because both fix the shared kit and help every repo's review pages.
- **2026-11-24** — Assumed: a page in the Inbox keeps its own *Back* row and still follows the app's light or dark look, not ClaymooApp's change, because WongStack's Inbox relies on the page's *Back* (`data-own-back`) and its spec promises the app's look; ClaymooApp moved both into its own app bar, which stays in ClaymooApp.
- **2026-11-24** — Assumed: the hint shows only while *Your notes* is empty, because each card's *Note* and *OK* already name the action and a new reader still finds the hint there.
- **2026-11-24** — Assumed: a finished build's page keeps its name and *Built: look, then publish?* on the same short layout, because those words say what it asks.
- **2026-11-24** — Assumed: an unsent note or draft on a part is edited in place, not doubled, because two open notes on one part would split one thought; only a sent note makes room for a new one.
- **2026-11-24** — Assumed: editing a sent note's text from its pin still works and sends it again, because that was the only way before and someone may rely on it.
