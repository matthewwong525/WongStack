# Design

## Context

`review-kit.html` copies `/continue <name>` then `Review notes from review.html (<n>):`. `/continue` recaps, folds the block in by [`/plan`'s review-notes step](../../../.agents/skills/plan/SKILL.md#review-notes) "before implementing", and that step itself ends "Rebuild the page before implementing". Both texts read as *reconcile, then build*, so an agent sometimes runs `/apply` straight after. No text anywhere says to stop.

## Goals / Non-Goals

**Goals:**
- A pasted block ends at the rebuilt review link and the *build it now?* question.
- The block names its own intent, so even an agent that skims the skill reads "don't build yet".

**Non-Goals:**
- The note UI, note storage, locations, and labels.
- Blocks copied from pages built before this release, and notes pasted where the change is not checked out (both dropped at review).

## Decisions

- **The block is a plain request, with no command.** The user's own message carries the intent, the strongest instruction an agent reads. The plan skill's `description` names "notes pasted from a review page", so the skill loads without `/plan`. A `/plan <name>` start was dropped at review: it adds a command the person doesn't need.
- **Block format:**
  ```
  Update the plan <name> with these notes from the review page. Don't build yet.
  - Why, paragraph 1 ("<quote>"): <text>
  - Change #2 ("<quote>"): <text>
  - Change #1, drawing line 3 ("<quote>"): <text>
  - Decision #2 ("<quote>"): <text>
  ```
  `notesText()` derives the place from the note id and takes the quote from the saved label (the label minus its kind prefix). Saved labels keep their format, so stored notes stay attached. `/plan` recognizes the new header only.
- **`/plan` Review notes section** becomes the one owner of the stop:
  - A pasted block skips `/explore`: the notes are the reviewer's answers, and the exit round is spent.
  - The change is read from this checkout by `openspec status --change <name>`; if it is absent, say so and stop.
  - After the rebuild, finish as standalone `/plan` does: a few plain lines on what the notes changed, *Click here to see the plan:* with the builder's path, and the next-step question. Never invoke `/apply` from here.
- **`/continue` step 4** drops its pasted-review-block bullet: new pages never produce one. `Review notes from review.html` goes into `scripts/retired-names.json`, pointing at the new header, so no live file keeps the old marker.
- **Toast**: `Copied <n> notes. Paste them into chat to update the plan.`
- **The PR body requirement** drops "paste the notes into `/continue`"; `render-pr-body.mjs` already writes only "open from a clone to view and annotate offline", so no code changes there.
- **Release**: 25.3.0 → 25.4.0. The copy format is observable behavior, and the notes flow changes its stop.

## Risks / Trade-offs

- An agent may still over-reach despite the skill text. The third line of the block is the second guard: it sits in the user's own message, the strongest instruction the agent reads.
- A block copied from an older page still starts with `/continue` and may still build. Accepted at review: those pages are rare and short-lived.
- Notes pasted where the change is not checked out stop with a message rather than loading it; notes are usually pasted in the session that made the plan.
