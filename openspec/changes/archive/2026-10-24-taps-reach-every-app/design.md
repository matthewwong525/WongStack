# Design

## Context

See [proposal.md](proposal.md) for why. The state today, in `.agents/skills/hand-over/scripts/reply-link.mjs`:

- Every project on the computer shares one folder, `~/.wong-stack/reply-link/`: one `items/` folder, one `inbox.json` helper record, one tunnel server.
- `openInboxItem` gets its client from `companyFor()` (`lib/inbox.mjs`), which signs in from `process.cwd()`. `startInbox` then returns early when a helper at the current `PROTOCOL` already runs, so a second project's item joins a helper bound to the first project's app.
- `serveInbox` builds one client, from its own folder, and `inboxTick` uses it for every item: re-upload, `checkin`, `tapResult` and `closeItem`. The other app never hears from the computer, and the first app is sent ids it never had.
- `companyClient` (`scripts/company-api.mjs`) keys a sign-in by the checkout's top level, `primaryRoot(cwd).root`.
- Both callers open items from the folder whose sign-in they use: `openLink` passes `cwd`, and `daily.mjs` passes its own `cwd`. Each item's `target.cwd` is that same folder, so an item from older code still names its project.
- The tunnel server's `serve` ends with `unlist(openPages(state))`, from its own folder: a form listed in another app stays there until its time runs out.
- Live on 2026-10-23: `inbox.json` held `{pid, protocol: 6}`, a helper started from ClaymooApp worktree `rabid-whale`. WongStack's `PROTOCOL` is 5; ClaymooApp's copy raised its own to 6.

## Goals / Non-Goals

**Goals:** every call the helper and the link server make about an item goes to that item's own app; an older helper anywhere on the computer is replaced by the next open from updated code.

**Non-Goals:** no change to the app's inbox routes or screens, the tap rules in `deliver`, or what opens in the inbox. No list of apps kept anywhere: items already know theirs.

## Decisions

1. **Each item records its app: `app: {cwd, origin}`.** `openInboxItem` calls `clientFor(spec.cwd)` and stores the folder it signed in from with the origin `probe` returned. A listed tunnel page stores the same `app` beside `listed: true`. An item or page from older code has no `app`; it is read as `{cwd: target.cwd}` with no origin to check, because both callers set `target.cwd` to the folder they signed in from.
2. **`companyFor(cwd = process.cwd(), load)` signs in from a folder:** `companyClient({ root: primaryRoot(cwd).root })`. A folder outside a checkout, or a deleted worktree, answers null as a signed-out one does. The loader moves to the second argument; its tests follow.
3. **A round builds one client per folder, then groups by origin.** `inboxTick({ clientFor, … })` replaces its `client` option. Each round resolves every open item's client once (a `Map` by folder) and drops one whose `target()` is not the item's recorded origin: a sign-in moved to another app must never be sent this app's ids. Ready items are grouped by origin, with one `checkin` per origin naming only that app's items.
   - Re-uploads, closes (`endItem`) and the close after a `sent` tap use the item's own client.
   - Each `reported` entry keeps the client that handed the tap out, so `report` sends every result to its own app.
   - An item whose app can't be reached this round is neither ready nor ended, unless its time ran out, its chat closed or its file is gone. Then it closes here, and in its app only where that app answers.
4. **The helper stops once nothing it can reach is open.** `inboxTick` resolves to the count of open items whose app answered, not of all open items. `serveInbox` loops while that count, or an unreported outcome, is non-zero, and drops its single startup client. This keeps today's "signed out ends it at once" rule, applied per app. An item that becomes reachable after the helper stopped is picked up by the next open, as today.
5. **Closing uses the item's app.** `closeInboxItem` builds its client from the item's `app`, so `daily.mjs` and `close` reach the right app from any folder. `unlist` groups pages by their `app` and closes each group through its own client; the tunnel server's final `unlist` is then correct too.
6. **`PROTOCOL` 5 → 7.** The swap in `startInbox` and `ensureServer` keys on this number, and ClaymooApp's copy already runs at 6. At 6, a WongStack open would see ClaymooApp's helper as current and leave it running. The constant's comment says the number must pass every copy that shares the computer.

**Alternative rejected: one helper per app,** with `inbox.json` keyed by origin and each helper serving only its origin's items. It runs each project's own code, but it needs a second record format and a second swap rule. An older, unrenamed `inbox.json` helper from a project not yet updated would also keep running beside the new ones, claiming every item it sees.

## Risks / Trade-offs

- [One checkout's helper code serves every project's items, so a project's local edits to delivery don't apply to the others' taps] → ClaymooApp's only local edits today are the `PROTOCOL` line and its link path, which the opener writes, not the helper. The wiki line on `PROTOCOL` tells a copy that changes the helper to raise the number past every other copy.
- [A deleted worktree's items can no longer sign in] → their plan file is gone too, so they close here at once; the app's copy closes at its own `closesAt`, as today.
- [A tap collected during the swap is lost] → accepted for 44.9.1's swap (`page-sends-come-from-the-person`); the inbox shows it did not arrive after 2 minutes.

## Migration Plan

No hand step. The next plan opened from updated code ends the running helper and tunnel server and starts the new ones. Items already open are read through their `target.cwd`. Rolling back leaves a helper at 7 that older code won't replace; it handles a superset and stops once its items close, within 24 hours.
