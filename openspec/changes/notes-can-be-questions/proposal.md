# Review notes can be questions

**Status:** in-progress
**Branch:** copy-notes-for-questions
**Open questions:** none

## Why

When you copy notes from a plan's review page, the pasted text starts *Update the plan … with these notes*. A note that only asks a question still reads as a change request, so the assistant may edit the plan when you just wanted an answer.

## What Changes

- **The copied text just says these are notes.** It starts *Notes on the plan \<name\> from the review page. Don't build yet.* Each note says for itself whether it asks or changes something. The rest of the copy stays the same: one line per note, with its place and a short quote.
  ```text
     BEFORE
  Update the plan my-plan with these
  notes from the review page. Don't
  build yet.
  - Change #2 ("…"): Why two steps?

     AFTER
  Notes on the plan my-plan from the
  review page. Don't build yet.
  - Change #2 ("…"): Why two steps?
  ```
- **A question gets an answer, not an edit.** The assistant answers a question note in chat and leaves the plan alone. It changes the plan only for a note that asks for a change. When an answer shows the plan should change, it offers that in its closing question instead of editing.
  ```text
          pasted notes
               │
         ┌─────┴─────┐
         ▼           ▼
     a question   a change
         │           │
         ▼           ▼
    answered in   plan updated,
    chat, plan    page rebuilt
    unchanged
  ```
- **The page's words stop assuming a change.** The note box says *A question or a change*, not *What should change here?* After a copy, the page says *Paste them into chat*, not *… to update the plan*.
  ```text
     BEFORE                 AFTER
  ┌──────────────────┐  ┌──────────────────┐
  │ What should      │  │ A question or a  │
  │ change here?     │  │ change           │
  │ [Save] Discard   │  │ [Save] Discard   │
  └──────────────────┘  └──────────────────┘
  ```
- **Older review pages keep working.** Notes copied from a page built before this change still start *Update the plan …*, and the assistant treats them the same way.

Non-goals: no Question / Change switch on each note, no change to how notes are saved, placed, or quoted, and no new place to ask questions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: the copied block's first line and the page's note and copy wording.
- `asking-the-user`: pasted review notes update the plan only where a note asks for a change; a question gets an answer in chat.

## Impact

- `.agents/skills/plan/references/review-kit.html`: the copy header, the editor placeholder, and both copy toasts.
- `.agents/skills/plan/SKILL.md`: *Review notes* recognizes the new first line and the old one, answers questions, and edits only for change notes.
- `scripts/tests/review-browser.test.mjs`: expected header and toasts.
- `wiki/ux-principles.md`: *The review file* describes the copy as notes, not an update request.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-28** — Asked how the assistant tells a question note from a change note → chose neither a switch nor labels: the copied text just says these are notes, vaguer than now, and the details are in each note.
- **2026-09-28** — Assumed: the new first line is *Notes on the plan \<name\> from the review page. Don't build yet.*, because it keeps the plan's name and the no-build guard while dropping *update*.
- **2026-09-28** — Assumed: a question note gets no Decision-log line and no page rebuild, because it changes nothing in the plan; a mix of questions and changes rebuilds for the changes.
- **2026-09-28** — Assumed: when an answer shows the plan should change, the assistant offers the edit in its closing question rather than making it, because the person asked, not told.
- **2026-09-28** — Assumed: `/plan` still recognizes the old *Update the plan …* line, because pages built before this change keep copying it until rebuilt.
- **2026-09-28** — Assumed: the note box placeholder reads *A question or a change*, and the toasts end *Paste them into chat.*, because the old words assumed a change; a reviewer can reword them cheaply.
- **2026-09-28** — Assumed: a minor release, because reviewers see new wording and the assistant answers questions differently.
- **2026-09-28** — Assumed: `/plan` still rebuilds the page after a question-only paste, a no-op, and names the old first line by its prefix, because the release must not grow the skills' instruction text past its measured baseline.
- **2026-09-28** — Assumed: `asking-the-user.md`'s finished-plan line says the person may paste notes, not notes *to change the plan*, because a note may be a question.
- **2026-09-28** — Built: the review page copies *Notes on the plan …*, its note box and toasts no longer assume a change, and `/plan` answers question notes without editing. The browser tests' expectations are updated; the payload-link, OpenSpec-config, retired-name, and context-size checks pass.
- **2026-09-28** — Checkpointed so CI runs the review browser tests (task 4.4); the spec deltas are reconciled into `ux-wireframes` and `asking-the-user`.
