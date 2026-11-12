# The password manager's page fits a phone in a live view

**Status:** ready-to-ship
**Branch:** bad-octopus
**Open questions:** none

## Why

On a phone, the live view of the password manager's own page (1Password) shows only a narrow strip at its left. The page stays as wide as the computer's screen, so the sign-in form sits off to the right, out of view. A person who opens the view to sign in to 1Password sees an empty corner and can't reach the form.

## What Changes

- **On a phone, the password manager's page narrows to fit, as a website already does.** The whole sign-in form shows, with its button. The pictures are what a phone shows, taken from the agent's real browser with a stand-in sign-in page.
  ```picture
  Today, on a phone: pictures/before-phone.png
  After, on a phone: pictures/after-phone.png
  1Password's own page after, at a phone's width (a throwaway copy of the browser): pictures/1password-phone.png
  ```
- **A laptop sees no change.** A wide view still shows the page at the screen's width.
- **The site gets its own size back, as today.** When you leave the password manager's page for the site, or the view ends, the site's page returns to the size it had.
- **A first fix was tried and dropped.** It made the browser's window narrow but left the page inside it wide, so the form stayed cut off. The tests showed that the browser does narrow the page when asked; it only never says that it did.

**Non-goals:** how the password manager is added or signed in to (the other part of this request); a change to how a website fits; the last few pixels of the toolbar's right edge on a phone, which a website loses the same way today.

## What the build needs

- **1Password in the agent's browser**: Ready, it is added on this computer. The build opens a live view over its page at a phone's width; when it is done, one look on your iPhone is welcome but not needed.

## Capabilities

### New Capabilities

### Modified Capabilities

- `private-links`: *A live view shows the whole browser window* gains a scenario: on a phone, the password manager's page fits the phone's width, as a site does.

## Impact

- `.agents/plugins/browser/browser/scripts/browser-server.mjs`: `keepForSite` also sends the asked width to the add-on page, without waiting for the answer that never comes, once per new size.
- `.agents/plugins/browser/browser/scripts/browse.mjs`: the `resize` doc comment.
- `.agents/plugins/browser/hand-over/scripts/view.mjs`: on the password manager's page, the fit reads no bar, so a keep-alive sends no new size; the bar is read once back on a site.
- `.agents/plugins/browser/browser/references/password-manager.md`: the line on the page's size in a live view.
- `scripts/tests/browser-server.test.mjs`, `scripts/tests/fixtures/fake-camofox.mjs` if needed, `scripts/tests/view.test.mjs`: the new behavior.
- `scripts/tests/manual/live-view-addon-fit.mjs` (new): the real-browser check, by hand, never in CI.
- `CHANGELOG.md`: a `patch` entry.
- Overlaps in file, not in function, with `fill-logins-from-1password` (workspace big-ladybug), which edits nearby lines of `browser-server.mjs` and its test.

## Decision log

- **2026-11-12** — Assumed: drop the first try at a fix (size the browser's window with xdotool), because on the real browser the window narrowed to 500 px but the add-on page inside stayed 1920 px wide, and the form stayed cut off.
- **2026-11-12** — Assumed: narrow the page through the driver's own resize, sent without waiting, because on the real browser that resize changed the add-on page to 480 px and back to 1200 px; only its answer never came, and the driver worked again once back on the site.
- **2026-11-12** — Assumed: keep the page's height on the add-on page as the browser server set it (the screen less the browser's bar), because the view reads no bar there and would ask for the screen's full height, which would push the page's bottom off the screen.
- **2026-11-12** — Assumed: send a size to the add-on page only when it differs from the last one sent there, because the view asks again each minute, and each send leaves one answer waiting.
- **2026-11-12** — Assumed: not opening the add-on page in a fresh tab, which also fits, because that changes how the agent opens it (the other part's code) and still stops at 500 px.
- **2026-11-12** — Assumed: raise the browser module's version to 1.0.1, because the module check fails when its folder changes and its version stays.
- **2026-11-12** — Assumed: the test stand-in browser server now narrows the password manager's page too, so the live-view tests follow the real server.
- **2026-11-12** — Assumed: the by-hand check keeps the site at the browser's own size before it opens the password manager's page, because the page's height comes from the bar, and a site sized by hand gives a wrong bar.
- **2026-11-12** — Asked whether to publish before a live view link at phone size was checked, since another chat held the computer's one live view → chose to publish now with the real-browser picture of 1Password's page at 480 px, and to check on the iPhone once it is live.
- **2026-11-12** — Check: task 4.2's live view link at 390×844 did not run; it was replaced by the real 1Password page, through the new code, at 480 px in a throwaway copy of the browser. The view's own fit code did not change, and the person checks on their iPhone after release.
- **2026-11-12** — Assumed: while the last answer came from the password manager's page, the view's fit sends only the fit's size and reads no bar, because a reading there widened the page to the screen's width each minute, then the fit narrowed it again, and left two unanswered calls each time.
- **2026-11-12** — Assumed: the view reads the bar at the first fit whose answer comes from a site, then sizes the page again, so the site still fits under the bar.
- **2026-11-12** — Assumed: the unit test and the by-hand check each catch a widening at the keep-alive; both failed on the old fit before the change and pass now.
- **2026-11-12** — Assumed: archived and saved for release as 55.2.1, after bringing in main's one-live-view-with-tabs change (55.2.0); the browser module goes to 1.1.1 on top of main's 1.1.0.
