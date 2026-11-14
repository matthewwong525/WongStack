# Design

## Context

The toolbar's *Hand back* comes from WongStack's own add-on in `.agents/plugins/browser/addon/`: `manifest.json` names `bell.svg` as its icon, and `background.js` sets the count badge, the hover title, and enables the button only while a turn is open. `addons.mjs` pins buttons with `pinnedLayout()`, which edits `browser.uiCustomization.state` in the stopped browser's `prefs.js` at each start. The live profile today has `ublock0_raymondhill_net-browser-action` in `nav-bar`, beside 1Password and Hand back: Camoufox ships uBlock Origin built in (`builtInGuids()`), and the browser pins its button itself.

The person-facing line comes from each caller's `--note` (`live-view.md` gives the examples), `connect-browser.mjs`'s sign-in note, and `hand-over.mjs`'s `WINDOW_REMINDER` for the window's chat message.

## Goals / Non-Goals

**Goals:** the button reads as *done* at a glance; every line names it by colour, shape and place; only the buttons the person uses stay on the toolbar.

**Non-Goals:** renaming *Hand back* in scripts, routes, specs or guides; the watch link's own *Hand back* in `view-page.mjs`; uninstalling or turning off uBlock.

## Decisions

- **Icon: a new `check.svg`, a green circle (`#1a7f37`) with a white check.** It replaces `bell.svg` in `manifest.json` (`browser_action.default_icon` and `icons`). The browser greys a disabled button by itself, so the "nothing waits" look needs no second icon. The count badge stays, with the browser's default badge colour, which reads against green. *Alternative:* a ✅ emoji drawn as text: emoji render differently per system, so an SVG is steadier.
- **Hover title:** `Done: give the browser back to the chat (N waiting)` while turns are open; `Nothing waits on you` otherwise.
- **One line shape, as short as possible:** `<what to do>, then tap ✅ at the top right.` The window's chat message uses *click*. `connect-browser.mjs`'s note and `WINDOW_REMINDER` change; the `live-view.md` and `browser-window.md` examples, which agents copy into `--note`, change with them. The ✅ is green like the icon, and *top right* carries it if the emoji renders differently.
- **Unpin built-in add-ons once.** A new `unpinnedLayout(prefs, guid)` beside `pinnedLayout()` moves the widget from `nav-bar` (or any other area) into `unified-extensions-area`, the puzzle-piece menu; null when the layout is unknown or the widget isn't on a toolbar. At each start, for each guid in `builtInGuids()` that is not yet in a marker file `wongstack-unpinned.json` in the profile, the start unpins it and, only once the layout was known and written, records the guid. A guid already recorded is never moved again, so a pin the person makes by hand stays. The start runs it next to the existing `pin()` calls, while the browser is stopped. *Alternative:* unpin at every start: it would undo the person's own pin. *Alternative:* `extensions.webextensions.*` prefs or a policy: Camoufox's built-in add-ons have no pref for placement, and the layout edit already works for pinning.
- **First start:** as with pinning, a brand-new profile has no saved layout yet, so uBlock leaves the toolbar from the second start. That matches when 1Password and Hand back get pinned.

## Risks / Trade-offs

- [A future Camoufox build adds another built-in add-on] → it is unpinned too, once; that is the intent.
- [The person cannot find uBlock] → it is one click away in the puzzle-piece menu; `password-manager.md` says so.
- [Agents keep old lines in other repos' skills] → the change is in the module's own docs and scripts, which ship with the update.

## Migration Plan

Ships with the browser module. The new icon and the unpin take effect at the browser's next start; nothing to do by hand. Rollback: the old icon and no unpin; the moved uBlock button stays in the menu until the person pins it.
