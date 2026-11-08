# A shipped plan leaves Needs you

**Status:** in-progress
**Branch:** browser-home-proxy-review-status
**Open questions:** none

## Why

The browser home proxy change is live, but its plan still waits under *Needs you* in the Inbox with a *Review* badge. A plan's page leaves *Needs you* only when you answer on the page, or 24 hours after it was last built. Two gaps keep a finished plan there:

- **Shipping closes nothing.** When you type `/ship` in the chat, not tap *Build and publish* on the page, the page stays open.
- **A closed chat loses its page.** Closing a chat deletes its folder. The computer then forgets the page, but it can't tell the Inbox, because it reached the Inbox through that folder. This is what happened to browser home proxy: its plan was made in a chat that was closed, then built and shipped in another.

## What Changes

- **Shipping a change closes its plan page.** Once the change is live, the page moves from *Needs you* to the Archive, read-only, wherever the plan was made: another chat, folder, or computer. A failed close is one line in the ship report, and the ship goes on.
  ```mermaid
  flowchart LR
    P[Needs you] --> S[You ship]
    S --> L[Live]
    L --> A[Archive]
  ```

- **A closed chat's plan still closes.** When a chat's folder is gone, the computer closes its pages in the Inbox through another folder that uses the same app. If no folder can reach the app, it tries again on each round until the page's time runs out.

- **Asking for a shipped plan's link opens nothing new.** A shipped plan's link is its saved page, never a new page waiting under *Needs you* with build buttons.

**Non-goals:** closing a plan you dropped without shipping; a *Close* button on a plan in the Inbox; any change to the 24-hour time.

## What the build needs

- **Nothing from you.** The Inbox already has a way to close a page; this change only calls it at the right times.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reply-links`: a plan's Inbox page closes when its change ships, and an item whose folder is gone still closes in its app.

## Impact

- `.agents/skills/hand-over/scripts/reply-link.mjs`: a new `close-plan <name>` command and exported `closePlanPages`; `clientsFor` falls back to a remembered app folder (`readApps`) with the same origin; `endItem` keeps the local record while the app close fails and the deadline is ahead.
- `.agents/skills/hand-over/scripts/lib/inbox.mjs`: a `waitingReviews(client, q)` call on `GET reviews`.
- `.agents/skills/ship/scripts/ship.mjs`: `finish` closes the change's plan pages after the merge and prints `PLAN_PAGE=`; the change name is carried from `prepare`.
- `.agents/skills/plan/scripts/build-review.mjs`: `--link` on a change under `openspec/changes/archive/` prints the file.
- `.agents/skills/ship/SKILL.md` (one report line), `wiki/development/reply-links.md`.
- Tests: `scripts/tests/reply-link-inbox.test.mjs`, `scripts/tests/ship-commands.test.mjs`, the build-review test.
- Release: a `patch` CHANGELOG entry; no hand step.

## Decision log

- **2026-11-08** — Asked whether to plan a fix for a shipped plan still waiting in the Inbox → chose plan the fix.
- **2026-11-08** — Assumed: the page closes after the merge, not at the archive, because a ship that stops before the merge leaves the plan unfinished, and its page should still wait.
- **2026-11-08** — Assumed: the ship finds the page by its title, `Review · <change name>`, through the app, not by this computer's own records, because the page may have been opened on another computer or in a deleted folder, as browser home proxy's was.
- **2026-11-08** — Assumed: a page that waits and has the same title in the same app is the same plan, because change names are unique in a repo, and two repos sharing one app with the same change name is rare.
- **2026-11-08** — Assumed: the fix for asking a shipped plan's link (open thread #2247) rides along, because it makes the same symptom: a shipped plan waiting under *Needs you*.
- **2026-11-08** — Assumed: browser home proxy's own page needs no hand close, because its time runs out at 05:36 UTC today.
- **2026-11-08** — Assumed: an item whose close fails stays on this computer marked ended, so it takes no tap and each round tries the close again, because a kept record with no mark would still take taps after a close.
- **2026-11-08** — Assumed: the inbox helper's `PROTOCOL` rises from 13 to 15, not 14, because two other copies on this computer already run 14, and a lower number would leave an older helper running without the new close.
- **2026-11-08** — Assumed: the four cut facts on `wiki/development/reply-links.md` go back where they were, and tighter wording elsewhere on the page keeps it under 3,000 words with no page split, because the page was at its word limit and these facts still hold.
- **2026-11-08** — Built: `/ship` closes the shipped plan's Inbox page after the merge, a closed chat's page still closes through another folder for the same app, and `--link` on an archived plan opens nothing. The second look found four fixes, all made; local checks pass.
