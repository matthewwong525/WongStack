# Saving a note copies all your notes

**Status:** ready-to-ship
**Branch:** clipboard-on-save
**Open questions:** none

## Why

On a plan's review page, you save each note, then must remember to tap Copy notes before you paste them into chat. Forget that step and the chat gets old notes, or none.

## What Changes

- **Save copies every saved note, ready to paste.** Each time you save a note, the page puts all your saved notes on the clipboard in the same message Copy notes makes, and says so: *Saved and copied 3 notes. Paste them into chat to update the plan.* Drafts still stay out.
  ```text
  type a note
      │
      ▼
  tap Save
      │
      ▼
  all saved notes
  on the clipboard
      │
      ▼
  "Saved and copied 3 notes.
   Paste them into chat…"
  ```
- **The page tells you before you save.** The hint at the top and the line under the Save button both say saving copies all your notes. The Copy notes button stays, for copying again after you delete one.
  ```text
  ┌──────────────────────────────┐
  │ #/2 · item "Item two …"      │
  │ ┌──────────────────────────┐ │
  │ │ What should change here? │ │
  │ └──────────────────────────┘ │
  │ [Save] Discard  Close        │
  │ Saving copies all your notes.│
  └──────────────────────────────┘
  ```
- **If the copy fails, the note is still saved.** The page says *Saved. Tap Copy notes to copy them.*

Non-goals: no change to the copied message's wording, no auto-copy on delete or discard, no change to drafts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: saving a note also copies every saved note, and the page says so before and after.

## Impact

- `.agents/skills/plan/references/review-kit.html`: the editor's Save copies with the same text and fallback as Copy notes; the header hint and a new editor line say so.
- `scripts/tests/review-browser.test.mjs`: coverage for the copy on save and its toast.
- `wiki/ux-principles.md`: *The review file* says Save copies too.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-28** — Assumed: copy on Save only, not on Delete, because the request names saving, and Copy notes still copies after a delete.
- **2026-09-28** — Assumed: keep the Copy notes button, because it recopies after a delete and after a failed copy.
- **2026-09-28** — Assumed: the copied block is the one Copy notes makes, saved notes only, because that is what the plan update reads.
- **2026-09-28** — Assumed: say it in the header hint, a line under Save, and the toast after, because the request asks the page to say it will copy.
- **2026-09-28** — Assumed: a minor release, because reviewers get a new behavior.
- **2026-09-28** — Built: Save and Copy notes share one copy routine; Save copies every saved note and toasts the result; the header hint and a line under Save say so; the fallback copy hands focus back. A new browser test covers it; the four payload checks and both review test files pass.
- **2026-09-28** — Distilled: no repeatable fact beyond `wiki/ux-principles.md`'s *The review file*, which now says Save copies too; the session wrote none.
- **2026-09-28** — Archived and checkpointed for merge by `/ship`.
