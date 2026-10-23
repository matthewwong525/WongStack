# Design

## Context

Plan items are opened by `reply-link.mjs` (`openInboxItem`) and served by its inbox helper (`serve-inbox`), which polls the app every 10 s in `inboxTick`: it re-uploads rebuilt plans, collects taps, wakes the chat, and reports each outcome. After a `sent` outcome it ends the item (`endItem`: removes the local item file and calls `closeItem` in the app), but skips `kind === 'plan'`. The app's list (`app/worker/apps/inbox/`) shows open items only, and `groupsOf` puts a chat with no agent status under *Needs you* whatever its taps say; that is why a sent plan never moved.

## Decisions

- **Close in `inboxTick`, not in the app.** Drop the `item.kind !== 'plan'` guard so every item ends on `sent`. Alternatives: hiding a plan with a sent tap in `groupsOf` (comes back once the rebuild changes its version, since the list joins only the current version's tap; and stays open in the app), or closing on the server's `tap-result` (the app would close items the computer still tracks, and the computer already owns closing).
- **The comeback needs no new code.** `endItem` removes the local item file, so the chat's next `build-review.mjs --link` finds no open item for the file and `openInboxItem` mints a new id and uploads it.
- **`PROTOCOL` 4 → 5.** `startInbox` swaps a running helper whose recorded protocol is lower, so the fix takes over on the next open. The page server swaps too and keeps its addresses, as in 44.9.1.

## Risks / Trade-offs

- [The person can't send a second round of notes on the same version] → they wait for the update, or say it in the chat; the closed plan's page already says to ask its chat for a new link.
- [A chat that answers notes without rebuilding leaves no plan in the inbox] → intended: nothing new to review; the chat's reply carries the answer.
