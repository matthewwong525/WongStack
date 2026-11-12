## 1. Browser server

- [x] 1.1 In `.agents/plugins/browser/browser/scripts/browser-server.mjs` `keepForSite`, record `own` as today, then send `setViewportSize({ width: asked.width, height: tab.addon.size?.height ?? asked.height })` to the tab without awaiting it, with `.catch(() => {})`, only when that size differs from `tab.addon.shown`; keep it in `tab.addon.shown`, wait 150 ms, and answer `{ ok: true, width, height, addonPage: true }` with the size sent (design decision 1). Make the step async where it is called. Add the two-line why comment.
- [x] 1.2 In `scripts/tests/browser-server.test.mjs` (and its stub page at line ~88), let the stub's `setViewportSize` never resolve while on the add-on page, and change the add-on test: a phone fit answers at once with `{ ok: true, width: 480, height: 635, addonPage: true }` and reaches the page as `['viewport', { width: 480, height: 635 }]`; the same size again reaches it no more; a new size does; a stub that rejects late leaves no unhandled rejection; back on the site, the site gets the size last asked for, as today.
- [x] 1.3 In `.agents/plugins/browser/browser/scripts/browse.mjs`, reword the `resize` doc comment: on the password manager's page the width applies, and the answer says `addonPage`.

## 2. Live view

- [x] 2.1 In `.agents/plugins/browser/hand-over/scripts/view.mjs`, reword the comments on `fitWindows` and `measureBar` that say the add-on page keeps its size; no logic change (design decision 2).
- [x] 2.2 In `scripts/tests/view.test.mjs`, make `fakePage`'s add-on answer follow the server's new one (the asked width, the kept height) and update the add-on tests' messages; add a case: a phone fit on the add-on page describes width 480, sizes no window that already fits the screen, and raises the page's window.

## 3. Docs and release

- [x] 3.1 In `.agents/plugins/browser/browser/references/password-manager.md`, replace the line on the page's size in a live view: the page fits your phone or laptop, as a site does, and the view keeps the whole toolbar on the screen.
- [x] 3.2 Add a `## Next (patch) — The password manager's page fits a phone in a live view` entry at the top of `CHANGELOG.md`, with no hand step.

## 4. Checks

- [x] 4.1 Write `scripts/tests/manual/live-view-addon-fit.mjs` (by hand, never in CI; modeled on `live-view-popup.mjs`) and run it: at a phone fit the stand-in add-on page reports 480 and a 480 crop of the screen shows its right edge; a wide fit gives 1920; back on the site, the driver answers and the site's size returns.
- [x] 4.2 Open 1Password's own page through the new code at a phone fit (480 px) in a real throwaway copy of the browser: its whole page shows, its right edge included; the picture is in the proposal's first What Changes bullet. The live view link at 390×844 did not run: another chat held the one live view, and the person chose to check on their iPhone after release (Decision log).
- [x] 4.3 Run `node .github/scripts/checks.mjs --worktree` (the browser-server, view, and payload checks) and fix what fails.

## 5. Review fixes

- [x] 5.1 In `.agents/plugins/browser/hand-over/scripts/view.mjs` `liveView`, keep whether the last answer came from the password manager's page; while it did, `fit()` sends only the fit's size and reads no bar, and it reads the bar at the first fit whose answer comes from a site, then sizes the page again (design decision 2). The test "the first fit back on the site reads it" still passes.
- [x] 5.2 In `scripts/tests/view.test.mjs`, the phone case on the password manager's page: a second `fit()` adds only `[480, 720]` to the page's calls, and the page stays `[480, 663]`. It failed on the old fit (a `[1280, 720]` reading came first).
- [x] 5.3 In `scripts/tests/manual/live-view-addon-fit.mjs`, read every width the page reports during the keep-alive and 2 s after it, and check it is only 480; run it in a real throwaway browser. On the old fit it read `[480,1280]` (fail); on the new fit `[480]`, and every other line passed.
- [x] 5.4 Rerun the local checks for the touched files.
