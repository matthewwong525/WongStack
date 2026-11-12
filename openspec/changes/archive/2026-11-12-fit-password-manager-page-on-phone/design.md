# Design

## Context

A live view fits the turn's page with `page.resize` (`browse.mjs`), which posts the `viewport` step to the browser server. On a site, the server sets the page's viewport (Playwright `setViewportSize`, an override the page keeps whatever the window's size). On the password manager's own page (`moz-extension://…`), `keepForSite` in `browser-server.mjs` only records the asked size as `tab.addon.own`, the size the site gets back, and answers `addonPage: true` with `tab.addon.size`: the size `openAddonPage` set before it opened the page, the screen's width, and its height less the browser's bar. So on a phone the page stays 1920 px wide, and the view page (`view-page.mjs` `layout()`) shows a 480 px strip of it.

`view.mjs` `fit()` then calls `fitWindows`, which only sizes page windows bigger than the screen to the screen (the browser-start case in the `private-links` spec).

### What the real browser showed (2026-11-12)

Run by hand in a throwaway Camoufox on its own Xvfb screen (1920×1080), with a small add-on whose own page reports its `innerWidth`, and with the real 1Password add-on:

| Try | Window | Page `innerWidth` | Result |
|---|---|---|---|
| Today: no resize on the add-on page | 1920 | 1920 | cut off |
| First try: `xdotool windowsize` to 480 (the scratch diff) | 480–500 | 1920 | still cut off: the viewport override holds |
| Driver `setViewportSize(480)` on the add-on page | 500 | 480 | fits; the call never resolves |
| A second driver resize there (1200) | — | 1200 | applies; never resolves |
| Back on the site (Back key) | — | — | `evaluate` and `setViewportSize` work again; some old calls resolve then |
| The add-on page in a new tab, window sized by xdotool | 500 | 500 | fits, but the window stops at 500 |

On the real 1Password page, the driver resize also sized the window (500 px wide at 480, 1920 at 1920) and stayed unanswered; 1Password drew a blank page there with no network, so its own layout needs the check in task 4.2.

## Goals / Non-Goals

**Goals:** on a phone, the add-on page narrows to the view's width; the site still gets its own size back; a wide view and every site fit as today.

**Non-Goals:** how the add-on page opens (`openAddonPage`, the other part's code); the bar's height on the add-on page; the browser's ~500 px window minimum.

## Decisions

### 1. Send the width to the add-on page through the driver, without waiting

`keepForSite(tab, body)` keeps recording `own`, and also sends `setViewportSize` to the tab, then answers with no wait for it.

- **The size sent** is `{ width: asked.width, height: tab.addon.size?.height ?? asked.height }`. The view reads no bar on the add-on page (`measureBar` returns null there), so it asks for the screen's full height; the server's own height, the screen less the bar, keeps the page's bottom on the screen. With no `tab.addon.size` (the window was no taller than its page at open), the asked height stands.
- **Once per size.** `tab.addon.shown` keeps the last size sent; the same size again (the view's keep-alive, once a minute) sends nothing. Each send leaves one answer waiting until the page goes back to a site, so this caps them at one per new size. The view's fit sends no bar reading there (decision 2), so a keep-alive sends no new size.
- **No unhandled rejection.** The promise gets a `.catch(() => {})`: a closed tab rejects it later.
- **A short settle**, `waitForTimeout(150)` as `viewport` and `openAddonPage` do, so the window has its new size before the view's `front()` reads the windows.
- **The answer** is `{ ok: true, width, height, addonPage: true }` with the size sent, so the view and `browse.mjs` see what the page shows now.
- **Comment the why** in two lines: the driver's resize reaches the add-on page, but its answer never comes (tried 2026-11-12).

Alternatives: size the window with xdotool (the scratch diff) — the page keeps its override, so it stays cut off; open the add-on page in a fresh tab with no override — fits, but changes how the agent opens the page, which the other part owns, and still stops at 500 px.

### 2. The view's fit reads no bar on the add-on page

`fit()` keeps whether the last answer said `addonPage`. While it did, the fit sends only its own size and reads no bar: a reading asks for the screen's full width, which `keepForSite` sends to the page, so each keep-alive would widen the page and the fit would narrow it again, with two unanswered calls a minute. The bar is read at the first fit whose answer comes from a site, and the page is then sized again under it. This is the only logic change in `view.mjs`; it sits in `fit()`.

`fit()` still calls `fitWindows` on `addonPage`, which still matters for a browser that starts bigger than the screen. After a phone fit, the window is about 500 × the screen's height, so `fitWindows` leaves it, and `front()` raises it (it is as tall as the screen and at least 480 wide). `describe()` keeps the fit's width: the page is 480 wide, so the view's 480 strip shows all of it. The scratch diff's `describe()` and `fitWindows` changes are dropped.

### 3. The site's size comes back as today

`own` is still the last size asked, and `onAddon` still restores it with `showAndSize` once a read gives a site. The view's end still asks for the size it read at open, which now also reaches the add-on page; harmless, as the site gets it back on return.

## Risks / Trade-offs

- **An answer that never comes, on purpose.** If a later browser answers the call, nothing changes: the promise resolves, and the next size sends as before. If a later browser drops the resize on extension pages, the page keeps its size, as today; the by-hand check in task 4.1 catches it.
- **Waiting answers pile up only per new size,** at most a few per view (phone and wide flips, the end's size).
- **The overlap** with `fill-logins-from-1password` is nearby lines of `browser-server.mjs` and its test, not the same functions; whichever merges second resolves it.

## Checks during the build

- **By hand, never in CI:** `node scripts/tests/manual/live-view-addon-fit.mjs`, modeled on `live-view-popup.mjs`: a throwaway home and Xvfb screen, a stand-in add-on with its own page that reports its width, the real `browser-server.mjs` `viewport` route or the same `keepForSite` path. Pass: at a phone fit the page reports 480 and a 480 crop of the screen shows its right edge; a wide fit gives 1920; back on the site, the site's size returns and the driver answers.
- **A real phone view, after release:** with 1Password added to the agent's browser, `browse.mjs addon open`, then `hand-over.mjs open --view`, and the person opens the link on their iPhone. Pass: 1Password's whole sign-in page shows, its right edge included. During the build another chat held the one live view, so the build checked 1Password's page at 480 px in a throwaway copy of the browser instead (Decision log).
