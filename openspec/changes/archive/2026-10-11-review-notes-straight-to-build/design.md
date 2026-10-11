# Design

## Context

See proposal.md for the problem. The offline review kit also runs on authenticated reply links. `act` currently accepts a registered action and current file version; `send` accepts notes under a fixed stop-before-build header. The kit blocks building when unsent notes exist and hides build choices in a three-dot popover.

## Goals / Non-Goals

Use the existing kit and endpoint, without a new service or dependency. Preserve offline copying, version checks, request locking, rate/size limits, publish confirmation, and note/draft storage.

## Decisions

- Put Send notes, Build it, and Build and publish directly in the footer. Use a responsive three-column layout and allow labels to wrap on small phones. Keep one primary action, Send notes, with the build choices outlined. Note counts remain visible in the header. The publish confirmation stays above the footer and is dismissible with Escape or an outside tap, returning focus appropriately.
- Desktop widths above 700px use 20px reading text and larger supporting labels, with 18px footer labels in 44px-tall buttons. The three equal-width buttons span the document's inner content width, using the same 700px maximum and 12px padding. Confirmation and status align to that same right edge.
- Extend the action request with optional `text` containing saved unsent note bullets. Validate its type and limit before consuming the action; append it beneath the registered fixed instruction. Empty or omitted text keeps today's action-only behavior. An invalid non-string or oversized text must never wake the chat. The client cannot replace the action message, header, or chat target.
- Snapshot notes at the moment of sending. Send exactly one action request rather than sending notes first: a separate note send could cause a rebuild and invalidate the action's version. Mark only acknowledged snapshot notes as sent, leaving drafts and later edits unsent. On rate limiting, a changed version, an unconfirmed send or a closed link, retain the notes for retry/copy and do not claim success.
- The builder's registered build and publish messages explicitly tell the assistant to apply attached review notes before `/apply` or `/ship`, without stopping for another build choice. Update `/plan`'s review-note handling to return to an already authorized caller; update `/apply` to process attached notes before readiness selection. Question notes receive an answer, without invented plan edits; a missing plan or real blocker still stops. Standalone Send notes keeps the existing header and plan-only reach.
- Keep historical review pages unchanged. Regenerate this active page after the kit changes. Add a minor Next changelog entry; VERSION is left for delivery.

## UX

### Use-case brief

The owner reviews a plan on a phone or laptop, leaves notes, and chooses whether to update it, build a preview, or publish. Done means the assistant receives both the requested action and the saved changes in one step. Assume this happens once per reviewed change. The common case is saved notes followed by a build; old tabs, closed links and draft-only text are edge cases. Mirror the current review page, keeping its notes editor and document intact.

### Flow

Save notes, then tap one of the three footer buttons. Build it sends notes with build authorization. Build and publish opens the current confirmation; confirming sends notes with publish authorization. Send notes updates only the plan. A waiting request disables other reply actions immediately. Failure leaves notes available; changed content asks for reload.

### Hierarchy

Send notes retains the single filled button. Both build choices are outlined and directly visible. Confirmation has one filled Yes, publish button and Cancel. Progress and results remain above the footer without changing its height.

### Review

[review.html](review.html), What Changes item 1, sketches the footer before and after and its confirmation/waiting/closed states. Item 2 compares the note-to-build flow. Item 4 sketches the larger desktop text and buttons aligned with the content.

### Components

Use the kit's existing footer, note button, ready controls, spinner, confirmation group and status region. Remove the menu toggle and build-choice popover; retain a panel only for publish confirmation.

## Risks / Trade-offs

- Three full labels need more height on 320px phones → let labels wrap within equal-width columns, preserve 44px targets, test no overflow and footer stability during progress.
- Notes changing while the request is pending → mark only the exact submitted note content, keep any newer edit unsent.
- Stale tabs or unconfirmed delivery → preserve version checks, bounded request locks and acknowledgement; never mark notes sent on failure.
- Skill text has a strict context budget → trim replaced instructions and run the context check; do not loosen its limits.

## Migration Plan

Rebuild active review pages with the updated kit and action registration. Archived pages and saved note storage stay intact. No manual credential or data migration.
