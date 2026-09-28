# Design

## Context

`review-kit.html`'s `notesText()` writes the copied block, and `/plan`'s *Review notes* section recognizes a message by its first line. Both assume every note is a change: the header says *Update the plan*, the editor placeholder asks *What should change here?*, the toasts end *to update the plan*, and *Review notes* logs a Decision-log line per note. See proposal.md for why.

## Goals / Non-Goals

**Goals:** a neutral header, and a *Review notes* flow that answers questions without editing.

**Non-Goals:** classifying notes on the page, or changing a note's bullet shape, place names, or quotes.

## Decisions

- **The header stays a fixed, recognizable line.** `Notes on the plan <name> from the review page. Don't build yet.` keeps what `/plan` matches on (the plan's name, *from the review page*) and the no-build guard that stopped `/continue` from building (review-notes-stop-at-plan). A free-form header would be vaguer still, but nothing could recognize it.
- **The assistant reads each note's intent.** The user chose no switch and no labels: the note's own words say whether it asks or changes. A note that both asks and requests is a change.
- **`/plan` keeps both first lines.** Pages built before this release copy the old header until rebuilt; *Review notes* names both so either routes the same way. No retired-name entry for the old line, because `/plan` still names it on purpose.
- **Questions leave no trace in the plan.** A question-only paste edits and logs nothing, so the page rebuild changes nothing, and the reply prints no plan link, because the plan did not change ([print the plan's link](../../../.agents/skills/explore/references/asking-the-user.md#print-the-plans-link)).

## Risks / Trade-offs

- [A request phrased as a question, such as *Could this be one step?*, gets an answer instead of an edit] → the closing question offers the edit, so one tap applies it.
