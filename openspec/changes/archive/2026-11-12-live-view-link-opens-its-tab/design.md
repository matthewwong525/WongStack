# Design

## Context

See proposal.md - Why. Today `addressOf(origin, key)` in `hand-over.mjs` builds `${origin}/#key=${key}`, and `open --view`, `joinView`, and `listingOf` all use it, so every chat's link is identical. The view page (`view-page.mjs` `start`) reads `key` from the `#` part, clears the `#` part with `history.replaceState`, loads `/view`, and renders what the watcher calls `shown`. The watcher already serves `/show` (`viewRoutes` → `onShow(chat)`), which the tab buttons call; it shows an open tab and answers 409 for a missing or ending one.

## Goals / Non-Goals

**Goals:** a link opens its own chat's tab on first load, with no new route and no change to the key.

**Non-goals:** a per-chat key or address; a switch on reload or poll; a change to the watch link or the inbox entry.

## Decisions

1. **The chat rides in the `#` part: `#key=<key>&chat=<CHAT>`.** `addressOf(origin, key, chat)` appends `&chat=${encodeURIComponent(chat)}` when given. `open --view` and `joinView` pass `CHAT`; `listingOf` and the watch link pass none. Alternative: a query string (`?chat=`): it reaches the tunnel and the server's request log, and the server would need to read it. The `#` part stays in the browser.
2. **The page asks `/show` once, before its first render.** A pure helper `linkOf(hash)` returns `{ key, chat }`; a pure helper `tabToOpen(view, chat)` returns `chat` when the view is a turn view, `chat` has a tab in `view.tabs`, and `chat !== view.shown`, else `null`. In `start`, after the first `/view` answer on a turn view, a non-null `tabToOpen` calls `/show` and renders its answer; a 409 or a failed call renders the first `/view` answer as today. Alternative: switch on the server when the page connects with a chat: it needs the server to trust a name the page sends at connect, and it adds a path beside `/show`, which already carries the same rule.
3. **The first load is the only switch.** The page clears the `#` part on load as today, so a reload, a poll, or a reconnect keeps the tab you chose.

## Risks / Trade-offs

- [Two pages of the view are open, such as an old phone tab and the new one] → both follow `/view`, so both show the tab the new link opened; this is the same as a tap on one of them today.
- [A chat's name holds characters a URL can't carry] → `encodeURIComponent` on write, `URLSearchParams` on read.
- [A link copied from the inbox has no chat] → it opens the view as it is, as today.

## Migration Plan

None. An old link without `chat` opens as today; a view open across the update keeps working, since the server does not change.
