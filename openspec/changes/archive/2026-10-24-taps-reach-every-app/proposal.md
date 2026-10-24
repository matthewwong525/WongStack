# Plan taps reach their chat from every company app

**Status:** planned
**Branch:** bad-warthog
**Open questions:** none

## Why

Your computer runs one small helper that picks up your inbox taps and hands them to the right chat. It only asks the company app of the project that started it. On 2026-10-23 a ClaymooApp chat had started it, so Matthew's *Build and publish* tap on a WongStack plan, whose inbox lives in the WongStack app, was never picked up and had to be passed on by hand.

## What Changes

- **One helper asks every app.** Each item remembers which company app it was put in. The helper asks each app for the taps on its own items and reports each result back to that app, so a tap reaches its chat whichever project made the plan.
  ```mermaid
  flowchart TD
    ca["ClaymooApp's app"] --> helper["Your computer's helper"]
    wa["WongStack's app"] --> helper
    helper --> chats["Each plan's own chat"]
  ```
- **Closing goes to the right app too.** A plan, approval or form closes in the app that lists it, not in whichever app the helper or link server happens to know. Today a closed WongStack form could stay listed in the WongStack app until it ran out.
- **Older helpers are replaced, even from a project not yet updated.** The next plan opened from an updated project replaces the helper already running. Until ClaymooApp updates, its own plans are still picked up: the new helper finds their app from the chat's folder.
- **A project you're signed out of doesn't stop the rest.** If one app can't be reached, its items wait while the other apps' taps still go through. The helper stops once nothing it can reach is open, as now.
- **The reply-links page says so.** [Reply links](../../../wiki/development/reply-links.md) says one helper serves every app on the computer.

Non-goals: no change to the inbox's screens, to how a tap is delivered, or to which page opens in the inbox. No second helper per app.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reply-links`: the computer collects, delivers, reports and closes each inbox item through the app that holds it, whichever project opened it.

## Impact

- `.agents/skills/hand-over/scripts/lib/inbox.mjs`: `companyFor` signs in from a given folder.
- `.agents/skills/hand-over/scripts/reply-link.mjs`: items record their app (`app: {cwd, origin}`); `inboxTick` and `serveInbox` build a client per app, check in and report per app; `closeInboxItem`, `listPage`, `unlist` use the item's or page's app; `PROTOCOL` 5 → 7.
- Tests: `scripts/tests/reply-link-inbox.test.mjs` (two apps in one round, an unreachable app, an item from older code, closing in the right app, the helper swap at 7).
- Wiki: `wiki/development/reply-links.md`, the server paragraph.
- `CHANGELOG.md`: a patch entry, no hand step. ClaymooApp gets it on its next update.

## Decision log

- **2026-10-23** — Assumed: Matthew wants it fixed, not only noted, as the request settled.
- **2026-10-23** — Assumed: one helper that asks each item's own app, over one helper per app, because the existing swap of an older helper covers it with no second record, and it serves a project not yet updated: per app, an older ClaymooApp helper would keep running beside the new one and only its own app's items would be served by new code.
- **2026-10-23** — Assumed: an item from older code, which names no app, is reached through its chat's folder, because both callers open items from the chat's own folder; a WongStack helper then serves ClaymooApp's plans before ClaymooApp updates.
- **2026-10-23** — Assumed: `PROTOCOL` goes to 7, not 6, because ClaymooApp's copy already runs a helper at 6 (seen live on 2026-10-23); at 6 a WongStack plan would leave ClaymooApp's helper running and its own taps uncollected.
- **2026-10-23** — Assumed: forms listed in the inbox close in their own app too, because the shared link server has the same one-app flaw and the fix is the same few lines.
- **2026-10-23** — Assumed: an app the computer can't reach keeps its items open and the helper running only while another app's items are reachable, because that is today's "signed out stops it" rule applied per app.
- **2026-10-23** — Assumed: a patch release, because it fixes a bug and adds nothing new to do.
- **2026-10-24** — Assumed, after the second look: each round checks in, delivers and reports for every app side by side, not one after another, because an app that hangs without answering would otherwise hold the other apps' taps past their 90-second window, against the promise that one app never stops the rest.
