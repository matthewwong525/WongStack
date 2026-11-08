# Design

## Context

A plan's Inbox item (`kind = 'plan'`) leaves *Needs you* when `closed_at` is set (`POST item-close`) or `closes_at` passes (`app/worker/apps/inbox/chats.ts` `waitingPages`). The computer sets `closed_at` in two places: a tap the chat received, and the helper's `readyApps` round, which calls `endItem` for an item that ran out, lost its chat, or lost its file (`isEnded`).

Seen on 2026-11-08: the only waiting page was `Review · browser-home-proxy` (id `44e731db…`, workspace `rapid-dolphin`, closes 2026-11-08T05:36Z), with no local record in `~/.wong-stack/reply-link/items/` and no chat row. The plan was saved unbuilt at `/close`, then built and shipped from another workspace.

Inferred path: `/close` removed the `rapid-dolphin` worktree; the helper's next round found the file gone, and `endItem` removed the record. `clientsFor` signs in through `appOf(record).cwd`, the deleted worktree, so `companyFor` threw inside `primaryRoot` and returned null, and `endItem` skipped `closeItem`. The app item stayed open until its deadline.

## Decisions

### Close on ship, through the app, by title

`ship.mjs finish`, after `merged=yes`, calls `closePlanPages(root, name)` from `reply-link.mjs`:

1. End each local record whose `title` is `Review · <name>` with `endItem`.
2. Ask the app for waiting reviews (`GET reviews?q=<name>`) and `item-close` each one whose title is exactly `Review · <name>`.

It returns `closed=<n>` or a reason, printed as `PLAN_PAGE=`. Nothing it does fails the ship. `finish` gets the name from `prepare` through the branch's archive folder, the same way `prepare` reruns pick it (`archiveFolders`/evidence), so `finish` keeps taking no options.

A `reply-link.mjs close-plan <name>` command wraps it, for a hand close and for tests.

Rejected: closing at `prepare`'s archive. A ship that stops before the merge would leave a live plan with no page.

### An item whose folder is gone still closes

`clientsFor`: when the record's folder can't sign in, try each folder `readApps` remembers whose client `target()` equals the record's `app.origin`. A record with no origin (older code) keeps today's behavior.

`endItem` removes the local record only after `closeItem` answers, or once the item's deadline has passed (the app hides it by then). Otherwise the record stays, and the next round tries again.

### `--link` on an archived change prints the file

`build-review.mjs --link` on a change root under `openspec/changes/archive/` returns the file path without `openReplyLink`. This closes thread #2247.

## Risks

- **A stale copy on another computer.** That computer's helper still holds its record. If its file is rebuilt, `item-put` reopens the item (`closed_at = NULL`). A shipped change's old folder is rarely rebuilt; accepted.
- **Same title in two repos on one app.** Both close. Accepted, by the Decision log.
