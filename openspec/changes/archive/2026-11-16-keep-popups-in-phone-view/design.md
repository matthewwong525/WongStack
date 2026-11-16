# Design

## Context

A phone's live view asks for the `phone` fit. `liveView` in `view.mjs` sizes the page to `PHONE_WIDTH` (480 px), and `describe()` reports `width: 480`. The view page (`view-page.mjs` `layout()`) scales the screen so that the left 480 px fill the phone, and the holder cuts off the rest.

Two things fall outside that strip:

- **The window's right end.** The browser's window stops near 500 px (the comment on `front()` says so), so the toolbar's last 20 px or so, the menu button, sit past 480.
- **A pop-up.** Firefox draws an add-on's toolbar pop-up or a menu as its own override-redirect window, X instance `Camoufox` (`popupOpen()`). It anchors the pop-up under its button and lets it run right, because the Xvfb screen (1280 px wide here) has room. Seen 2026-11-15 on this computer: 1Password's pop-up at x = 1202 under a 1920 px window; on the phone, it started near x = 400 and ran off the strip.

`front()` runs at each poll of the view (`hand-over.mjs`, both the one-chat link and the shared turn view) and returns at once while a pop-up shows, so it never covers or focuses one.

## Goals / Non-Goals

**Goals:** on a phone, a pop-up that fits the strip shows whole inside it; the strip covers the shown window's whole width; a wide view behaves as today.

**Non-Goals:** a zoom control; resizing a pop-up; pop-ups on a wide view (the screen already shows whole).

## Decisions

### 1. Move each shown pop-up into the strip, from `front()`

While `kind === 'phone'` and a pop-up shows, `front()` lists the visible `Camoufox` windows with their geometry (`getwindowgeometry --shell` gives `X`, `WIDTH`), and moves each whose right edge passes the strip: `xdotool windowmove <id> <max(0, strip − width)> <y>`, keeping its `y`. It still raises and focuses nothing, so the pop-up stays open and keeps its keys (the existing pop-up requirement). A pop-up already inside the strip gets no call, so a poll each second costs one search and one geometry read per pop-up.

A pop-up is override-redirect, so `windowmove` moves it with no window manager. Firefox gets the X `ConfigureNotify` and takes the new place as its own, so a tap in it lands where it shows. If Firefox moves it back (for example when the pop-up grows as its list loads), the next poll moves it again.

Alternative kept as a fallback: in a phone fit, place the browser window at the screen's right edge, so Firefox finds no room to the right and opens each pop-up leftward, inside the window. That needs the view page to crop the screen's right end, not its left, and changes how `layout()` and taps map. The build tries the move first, in the by-hand check (task 3.1); only if Firefox puts a moved pop-up back each time, or a tap misses, does it switch to the fallback and log why.

### 2. The strip is the shown window's width

In a phone fit, `front()` keeps the width of the window it raises (`keptWindow`'s pick), and `describe()` reports `width: min(screen.width, max(PHONE_WIDTH, that width))`. The view page then shows the whole window, about 500 px, scaled to the phone: a little smaller, nothing cut. The page itself is still sized to 480 px, so a site's phone layout is unchanged. Before the first `front()`, the width stays 480, as today.

The keep-alive fit runs only in the server, so the view page does not see it. The page reads the width at load and from its own fit answer (`report()`), and now also from each poll: `renderTabs` takes the `fit` of `/view`, and `render` takes the `fit` that `/watch` now carries. When the poll's fit has the page's shape and a new width, the page lays the screen out again, so the phone and the server's strip, where a pop-up moves to, agree within a second. A fit of the other shape, which another page asked for, leaves the page as it is.

## Risks / Trade-offs

- **A pop-up that Firefox keeps moving back** flickers once a second. → The by-hand check looks for it; the fallback in decision 1 avoids it.
- **A pop-up wider than the strip** (rare: Firefox's menu is about 400 px) starts at the strip's left edge and still loses its right part. → Out of scope; the proposal's non-goal.
- **The strip grows to the window's width** only when the browser refuses to narrow below it, so on a phone the page shows about 4% smaller. → Accepted: the menu button is worth it.

## Checks during the build

- **By hand, never in CI:** extend `scripts/tests/manual/live-view-popup.mjs` with a phone fit: open the stand-in add-on's toolbar pop-up, poll the view, and check the pop-up's right edge sits inside the strip, a tap in its box lands, and typing reaches it.
- **A real phone view, after release:** with 1Password in the agent's browser, open a live view on the iPhone and tap 1Password's button. Pass: its whole list shows, and the toolbar's menu button shows.
