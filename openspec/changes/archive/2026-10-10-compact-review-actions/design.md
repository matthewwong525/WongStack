# Compact review controls

## Context

See [proposal.md](proposal.md) for motivation. The standalone review kit currently uses wrapping flex rows and separate `sending` and `acting` guards. Reply requests wait for chat acknowledgement. The page has no progress UI and can issue a notes send alongside an action.

## Goals / Non-Goals

**Goals:** keep the fixed footer one row from 320px up, expose loading immediately, and retain existing reply acknowledgements, notes fallback, rate-limit behavior, and stale-plan checks.

**Non-Goals:** server or wake changes, client timeouts, automatic retries, external assets, rebuilding archived pages.

## Decisions

- Keep the note count, notes button, and a 44px minimum More actions trigger on a non-wrapping footer. Move storage notices out of the row or abbreviate them without losing their accessible explanation. Keep Send notes as its visible primary button.
- Use a small anchored popover above the footer, hidden initially, rather than a full-screen modal. Both actions remain one extra tap away without scrolling. Put the confirmation in the same popover and outcomes above the footer so it never grows. Use ordinary buttons and group semantics rather than ARIA menu roles requiring a custom menu keyboard model. Escape and outside click close it; restore focus to its trigger; close when focus leaves as appropriate.
- Share one pending request state across notes and actions. Set it synchronously before requesting; show spinner and text on the relevant control, disable send/build/publish while waiting, and mark busy accessibly. Keep progress in view even if the popover closes. Restore controls on every response or rejection. Do not claim success before `sent: true`.
- Show Connecting… while checking a reply link; only enable sending after its JSON is read. Check failures retain offline Copy notes. Do not add a timeout to POST requests: their delivery may have succeeded despite a delayed answer, and a forced retry could duplicate intent.
- Extend browser fixtures to hold responses until explicitly released. Test observable busy state, one POST across repeated/cross-action clicks, response handling, keyboard dismissal and focus, footer geometry at 320px and desktop, and unchanged offline notes behavior.

## UX

### Use-case brief

A person reviews a plan on a phone or laptop, sends comments, and occasionally starts the build. Done means they know a tap was received and can read more of the plan above a compact footer. Mirror the existing review page's native buttons and neutral styling. No recurrence beyond the existing review workflow is assumed.

### Flow

Read → save notes → Send notes → immediate progress → acknowledged result. Build path: More actions → Build it → progress → result. Publish path: More actions → Build and publish → confirm or cancel → progress → result. Unsent notes and changed plans stop the action; rate limits offer a retry; closed links copy notes.

### Hierarchy

Send notes is the persistent main button. More actions is secondary. Build it is the main choice in the opened popover; Cancel receives focus in the publish question. Progress and outcome are status text above the row.

### Review

[review.html](review.html), What Changes item 1 sketches the footer, menu, and publish question; item 2 sketches connection, send, and outcome states.

### Components

Reuse the review kit's buttons, status text, toast, and notes counter. Add an anchored action popover and a CSS spinner with reduced-motion support; no dependencies.

## Risks / Trade-offs

- The connection may remain slow → immediately show what is happening and block duplicate requests; no speed guarantee.
- Popover could cover notes → constrain its width and height, allow dismissal, preserve page padding based only on the footer row.
- Existing tests assume direct visible build buttons → update their interactions while retaining all safety cases; changing layout expectations does not remove those checks.

## Migration Plan

The kit reaches installs through a minor payload release. Rebuild active review pages from the kit; historical archives remain unchanged. Rollback restores the prior kit. Saved note storage and reply APIs do not change.
