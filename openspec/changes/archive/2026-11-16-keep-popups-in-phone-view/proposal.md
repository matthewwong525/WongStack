# Everything fits in the live view on a phone

**Status:** planned
**Open questions:** none

## Why

On a phone, the live view shows only a narrow strip at the left of the browser's screen. A pop-up, such as 1Password's list from its toolbar button, opens to the right of that strip, so you see only its left edge and can't use it. The toolbar's right end is cut off too.

## What Changes

- **A pop-up moves into view.** When a pop-up opens past the right edge of your phone's view, the live view moves it left until its right edge sits inside the view. 1Password's list, the browser's menu, and other add-ons' lists all show in full. The picture is what your phone shows today.
  ```picture
  Today, on a phone: pictures/today-phone.webp
  ```
  ```svg
  <svg viewBox="0 0 560 190">
    <text x="8" y="18" fill="muted">today</text>
    <rect x="8" y="28" width="250" height="150" fill="card" stroke="line"/>
    <rect x="8" y="28" width="96" height="150" fill="none" stroke="fg"/>
    <text x="14" y="172" fill="muted">your phone</text>
    <rect x="84" y="44" width="70" height="90" fill="card" stroke="danger"/>
    <text x="96" y="94">pop-up</text>
    <text x="300" y="18" fill="muted">after</text>
    <rect x="300" y="28" width="250" height="150" fill="card" stroke="line"/>
    <rect x="300" y="28" width="96" height="150" fill="none" stroke="fg"/>
    <text x="306" y="172" fill="muted">your phone</text>
    <rect x="320" y="44" width="70" height="90" fill="card" stroke="fg" stroke-width="2"/>
    <text x="332" y="94">pop-up</text>
  </svg>
  ```
- **The whole toolbar shows.** The browser can't get narrower than about 500 px, so the window is a little wider than the strip you see today. The view now shows the window's full width, so the menu button at the right end shows.
- **A laptop sees no change.** A wide view already shows the whole screen.

**Non-goals:** a zoom-out button (you chose to only make things fit); a pop-up wider than your phone's view, which still starts at the left edge; how a site's own page fits.

## What the build needs

- **1Password in the agent's browser**: Ready, it is added on this computer. The build checks a pop-up in a throwaway copy of the browser; one look on your iPhone after release is welcome but not needed.

## Capabilities

### New Capabilities

### Modified Capabilities

- `private-links`: a new requirement, *On a phone, a live view cuts off no pop-up or toolbar*: a pop-up shows whole inside a phone's view, and so does the toolbar's right end.

## Impact

- `.agents/plugins/browser/skills/hand-over/scripts/view.mjs`: `liveView` moves a visible pop-up window into the phone strip; `describe()` gives the strip as the shown window's width; the `/watch` route also gives the fit, so a watch link's poll carries the width.
- `.agents/plugins/browser/skills/hand-over/scripts/hand-over.mjs`: the poll calls the pop-up move while a pop-up shows.
- `.agents/plugins/browser/skills/hand-over/scripts/view-page.mjs`: each poll takes the fit's new width and lays the screen out again.
- `scripts/tests/view.test.mjs`: the new behavior with a stand-in `xdotool`, and the fit in a watch link's poll.
- `scripts/tests/view-page.test.mjs`: a poll that brings a new width lays the screen out again.
- `scripts/tests/manual/live-view-popup.mjs`: a phone-fit case.
- `.agents/plugins/browser/references/password-manager.md` or `browsing.md`: the line on a live view on a phone, if one names the cut-off.
- `.agents/plugins/browser/VERSION`, `CHANGELOG.md`: a `patch` entry.

## Decision log

- **2026-11-15** — Asked whether to also add a zoom-out button for a phone live view → chose no: only make every part fit in the view, nothing cut off.
- **2026-11-15** — Assumed: move the pop-up window into the strip, not move the browser window to the screen's right edge, because the move needs no change to how the view page crops the screen; the right-edge window stays the fallback if the browser moves the pop-up back.
- **2026-11-15** — Assumed: the strip takes the shown window's real width (about 500 px) on a phone, not a fixed 480 px, because the browser stops near 500 px and the extra 20 px is the menu button.
- **2026-11-16** — Assumed: a window as wide as the screen, as the fit leaves one on the password manager's page, keeps the 480 px strip on a phone, because shown whole it would shrink the page to a third; only a narrower window widens the strip.
- **2026-11-16** — Assumed: `hand-over.mjs` needs no edit, because both of its polls already call the view's `front()` each time, pop-up or not, and the move runs there.
- **2026-11-16** — Assumed: the one line goes in `password-manager.md`'s pop-up paragraph, which already sends a pop-up to the live view; `browsing.md` names no phone view.
- **2026-11-16** — The by-hand check passed in a throwaway browser on its own screen: the window was 500 px, so the strip was 500. Firefox opened the stand-in pop-up inside the narrow window, so the run moved it out to x 400 first. One poll moved it to x 182, it stayed there for 5 s of polls, and a tap and typing reached it. The fallback is not needed.
- **2026-11-16** — Review finding, built: the phone page and the server could disagree on the strip width. Each poll's `front()` changes the width, and a pop-up moves to that width, but the page read the width only at load, on its own fit, and on a resize. Example: the view opens on the password manager's page (strip 480), the site comes back (strip 500), and the phone still shows 480, so the moved pop-up's last 20 px and the menu button were cut off. Now each poll's fit reaches the page: `/view` already carried it, and `/watch` now carries it too, because a watch link polls only `/watch`. Design decision 2's sentence that the keep-alive fit reaches the page was wrong, and is corrected.
- **2026-11-16** — Assumed: a poll's fit of the other shape (phone or wide), which another page on the same link asked for, does not change this page's layout, because taken it would crop a laptop to a phone's strip or show a phone the whole screen.
