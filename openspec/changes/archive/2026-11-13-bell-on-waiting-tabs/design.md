# Design

## Context

- The browser server ([`browser-server.mjs`](../../../.agents/plugins/browser/scripts/browser-server.mjs)) keeps one `turn` (`{id, until, before}`); `front({turn: true})` on a second tab answers 409 *the person is using the browser*.
- A window turn: [`hand-over.mjs`](../../../.agents/plugins/browser/skills/hand-over/scripts/hand-over.mjs) `startLink` runs a per-chat watcher that renews with `front({turn: true, raise: false})` and ends on `close` (the chat's *done*) as `handed-back`. `open` refuses a second window view through `refuseView(viewHolder())`.
- A link turn: one shared watcher (`openTurn` and the turns loop near `turnsOnDisk`) holds a server turn on its *shown* tab only, moves it on a tab switch, reselects it each poll, and serves [`view-page.mjs`](../../../.agents/plugins/browser/skills/hand-over/scripts/view-page.mjs)'s tab row (`tabsShow`) and per-tab *Hand back*.
- The live view shows the whole browser window over x11vnc, toolbar and tab strip included ([private-links: A live view shows the whole browser window](../../specs/private-links/spec.md)).
- Camoufox loads each add-on folder as a temporary add-on at every start ([`launch-config.py`](../../../.agents/plugins/browser/scripts/launch-config.py) `addon_options`), with no signing; [`addons.mjs`](../../../.agents/plugins/browser/scripts/addons.mjs) pins an add-on's button to the toolbar through `browser.uiCustomization.state`.
- Playwright can't tell which tab Firefox shows; a page's `document.visibilityState` can (a background tab reads `hidden`).

## Goals / Non-Goals

**Goals:** a bell on each open turn's tab; several turns at once in both modes; one toolbar *Hand back* that ends every turn and wakes each chat; no tab row and no bar *Hand back* on a turn view.

**Non-Goals:** the watch link; chat names; a sound or a notification.

## Decisions

1. **Turns become a set of shared turns.** The server's `turn` becomes `turns: Map<tabId, {until, before, shared}>`. `front` takes `shared: true`:
   - `{turn: true, shared: true}` joins the other shared turns; it raises its tab only when no other turn holds and `raise` isn't false. It is refused only beside a non-shared turn.
   - `{turn: true}` without `shared` keeps today's one-turn rule; the watch link still uses it.
   - `{turn: false}` ends only this tab's turn.
   - `otherTurn(tab)` means *some other tab holds a turn*, so clicks behind, a resize, and `show` keep today's rules against every open turn. `ownPageOpen` uses the union of the turns' `before` sets.
   Alternative: the client decides whether to raise. Rejected: two chats opening at once would both raise.
2. **The bell is the page title, kept by the server.** On a shared turn's hold and each renewal, the server runs a script on the page: prefix `document.title` with `🔔 ` when it lacks it, and a `MutationObserver` on `<title>` puts it back when the site changes the title; a `domcontentloaded` listener puts it back on a new page. The turn's end (`turn: false`, a lapse, a Hand back) disconnects the observer and strips the prefix. Alternatives: an add-on can't change a tab's title or badge one tab; tab colors need containers.
3. **The WongStack add-on is the toolbar *Hand back*.** A folder in `.agents/plugins/browser/addon/` (manifest v2 or v3, whichever Camoufox's Firefox loads unsigned): one `browser_action` button, *Hand back*, with a badge of the open turn count, disabled at 0. Every start loads it beside the person's add-ons and pins it to the nav bar, through the code that pins 1Password's button.
   - **Its route and key.** At each start the server writes `config.json` into a copy of the folder under `~/.wong-stack/browser/` (never in the repo): its port and a fresh *hand-back key* that opens only `GET /turns` (the count) and `POST /hand-back`. The file is not in `web_accessible_resources`, so no site reads it. The add-on polls `/turns` every 2 s and posts `/hand-back` on a click.
   - **`POST /hand-back`** marks every shared turn as handed back and takes their bells off. The next renewal of each turn answers `{ok: true, handedBack: true}`, and a `GET /turns?tabId=` answers it too.
   Alternatives: a bar injected into each page (sites see and can cover it); the blank first tab as a page (one more click, and it opens tabs).
4. **Window turns share.** `open` lets a window view open beside another chat's window view; a watch still refuses and is refused. The watcher sends `shared: true`; on `handedBack` it finishes `handed-back` with `ready: true`, so `publish` wakes its chat. `close` (the chat's *done*) ends only its own turn. `WINDOW_REMINDER` names the 🔔 tab and the toolbar *Hand back*.
5. **Link turns share.** The shared watcher holds every turn as a shared server turn, not only the shown one, and no longer reselects or switches tabs: the person picks tabs in the browser. It reads each turn page's `visibilityState` each poll to learn which bell tab shows, and fits that page to the view; other bell pages keep their fitted size once fitted. On `handedBack` it ends every turn as `handed-back` and wakes each chat, then the link closes. A chat link's `#chat` brings that chat's tab to the front once, on first load (`tabToOpen` stays).
6. **The view page loses the row and the turn's *Hand back*.** `tabsShow` becomes the list of each open turn's line with a bell, for the bar. The bar keeps the type box. The `turn` mode's button goes; the `person` and watch modes keep theirs.
7. **Docs.** [`live-view.md`](../../../.agents/plugins/browser/skills/hand-over/references/live-view.md) (*What you see*, *What the link can do*, *How the agent runs one*: lines end *then click Hand back at the top of the browser*), [`browser-window.md`](../../../.agents/plugins/browser/references/browser-window.md) (*A tab for each chat*, *Your turn in the window*, *Ask for the browser*), [`browsing.md`](../../../.agents/plugins/browser/references/browsing.md) where it names the turn's end, and the hand-over `SKILL.md`.

## Risks / Trade-offs

- **One Hand back for all.** A chat whose step isn't done is told too; it reads its page and asks first, as after any early *Hand back*.
- **The add-on loads at the next browser start.** The agent never restarts a running browser for it; until then, *done* in each chat ends turns. The changelog's *Updating* note says so.
- **The bell can blink** when a site rewrites its title often.
- **A mouse-only click waits longer**: until no turn is open.
- **The add-on's key is narrow**: it can only count turns and hand them back, so a leaked key can only end the person's turns early.
- **Overlap with the 1Password workspace** (decent-eel) in `browser-server.mjs`, `browse.mjs`, `addons.mjs`, and the module `VERSION`. Merge whichever ships second.

## Checks after release

- On the Mac: two chats each open a window turn; both tabs show 🔔, the button shows 2, one click wakes both chats. Matthew runs the extended [`browser-tabs-real.mjs`](../../../scripts/tests/manual/browser-tabs-real.mjs) there.
- On the server: a real two-chat live view, by [test a live view](../../../wiki/maintaining/test-a-live-view.md), with one toolbar *Hand back*.
