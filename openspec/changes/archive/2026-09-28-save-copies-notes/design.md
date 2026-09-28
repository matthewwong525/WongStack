# Design

## Context

`.agents/skills/plan/references/review-kit.html` is the fixed kit `build-review.mjs` fills. Its editor's Save pushes or updates a note in `data.notes`, drops the draft, closes the editor, and persists. The Copy notes button builds `notesText()`, writes it with `navigator.clipboard.writeText`, and falls back to selecting the hidden `#copybuf` and `document.execCommand('copy')`. Both toast through `toast()`.

## Goals / Non-Goals

**Goals:** Save leaves every saved note on the clipboard and says so; the page says it before the tap.

**Non-Goals:** copying on Delete or Discard; changing the copied text; a new setting to turn it off.

## Decisions

- **One copy routine for both.** Pull the button's body into `copyNotes(done, failed)`: fill `#copybuf`, try the Clipboard API, fall back to `execCommand`. Copy notes keeps its toasts; Save passes *Saved and copied N notes. Paste them into chat to update the plan.* and *Saved. Tap Copy notes to copy them.* A second copy of the fallback would drift.
- **Copy after the save lands.** Save runs `closeEditor(true); persist();` first, then copies, so the block includes the note just saved and a failed copy never loses it. The tap is still the user gesture the Clipboard API needs; the `execCommand` fallback selects `#copybuf` after the editor has closed, so it steals no typing focus.
- **Say it twice, briefly.** The header hint gains *Saving a note copies all your notes.* The editor gains a muted line under its buttons with the same words, next to the existing session-only line.

## Risks / Trade-offs

- Save overwrites whatever the reviewer had on the clipboard. The hint says so before the first save, and the request asks for it.
- Pages built before this release keep the old behavior until rebuilt; `/save` rebuilds active plans, and archived pages are never rebuilt.
