# Tasks

## 1. Items know their app

- [x] 1.1 In `.agents/skills/hand-over/scripts/lib/inbox.mjs`, make `companyFor(cwd = process.cwd(), load)` sign in from `primaryRoot(cwd).root`, null outside a checkout; update its test in `scripts/tests/reply-link-inbox.test.mjs` for the moved loader and add a folder outside a checkout answering null.
- [x] 1.2 In `.agents/skills/hand-over/scripts/reply-link.mjs`, have `openInboxItem` call `clientFor(spec.cwd)` and store `app: {cwd, origin}` on the item, and `listPage` store the same `app` on a listed page; add one helper that reads an item's or page's app, falling back to `{cwd: target.cwd}` for older records. Test: an opened plan's kept item names its folder and origin.

## 2. Delivery per app

- [x] 2.1 In `reply-link.mjs`, change `inboxTick` to take `clientFor`: one client per folder per round, dropped when its `target()` differs from the recorded origin; one `checkin` per origin; re-uploads, `endItem` and the close after `sent` through the item's own client; each `reported` entry keeps its client; an unreachable item neither ready nor ended unless it ran out, lost its chat or its file; resolve to the count of reachable open items.
- [x] 2.2 In `reply-link.mjs`, change `serveInbox` to pass `companyFor` to `inboxTick`, drop its startup client, and stop once no reachable item is open and nothing is left to report.
- [x] 2.3 In `scripts/tests/reply-link-inbox.test.mjs`, switch the `tick` helper to `clientFor`, and test with two fake apps: taps on both apps' items in one round reach their chats, each `checkin` names only its own app's items, each result goes to the app that handed it out, an item from older code with no `app` is reached through its `target.cwd`, an unreachable app's item stays open while the other app's tap arrives, and a client signed in to a different origin is never sent the item.

## 3. Closing in the right app

- [x] 3.1 In `reply-link.mjs`, make `closeInboxItem` use the item's app, and `unlist` close each listed page through its own app's client, so `close` and the tunnel server's end reach the app that lists it.
- [x] 3.2 In `scripts/tests/reply-link-inbox.test.mjs`, test that `closeInboxItem` closes an item in its own app when called with a client for another folder, and that `unlist` closes two pages listed in two apps in each one.

## 4. Swap older helpers

- [x] 4.1 In `reply-link.mjs`, raise `PROTOCOL` from 5 to 7 and say in its comment that the number must pass every copy that shares the computer; update the `startInbox` tests' expected protocol to 7 and keep a current-helper test at 7.

## 5. Docs and release

- [x] 5.1 In `wiki/development/reply-links.md`'s server paragraph, say one inbox helper serves every company app on the computer, each item through its own app, and that a copy changing the helper or server raises `PROTOCOL` past every copy on the computer.
- [x] 5.2 Add a `## Next (patch) — Plan taps reach their chat from every company app` entry at the top of `CHANGELOG.md`'s entries, with an *Updating.* note that no hand step is needed: the next plan replaces the helper running on the computer.

## 6. Review fixes

- [x] 6.1 In `reply-link.mjs`'s `inboxTick` and `report`, handle each app's check-in, deliveries and results side by side (one `Promise.all` over the app groups), keeping each item's wakes paced as now; test in `scripts/tests/reply-link-inbox.test.mjs` that an app whose calls hang does not hold back another app's tap or its reported result.

## 7. Verification

- [x] 7.1 Run `node --test scripts/tests/reply-link.test.mjs scripts/tests/reply-link-inbox.test.mjs scripts/tests/hand-over.test.mjs scripts/tests/daily.test.mjs`.
- [x] 7.2 Run `node .github/scripts/checks.mjs --worktree` as a pre-check.
- [x] 7.3 After `/save`, open a WongStack plan from this computer while a ClaymooApp helper runs, and confirm the running helper was replaced (its `inbox.json` shows protocol 7) and a *Build it* tap on the WongStack plan reaches its chat.
