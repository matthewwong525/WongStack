# Tasks

## 1. The green check button

- [x] 1.1 Add `.agents/plugins/browser/addon/check.svg` (green circle `#1a7f37`, white check), remove `bell.svg`, and point `manifest.json`'s `browser_action.default_icon` and `icons` at it; update the manifest's description. Check: `node --test scripts/tests/addons.test.mjs` still copies the add-on, and a test asserts the copied manifest names `check.svg`, which exists.
- [x] 1.2 In `addon/background.js`, set the hover title to `Done: give the browser back to the chat (N waiting)` while turns are open and `Nothing waits on you` otherwise. Check: read the file; the count badge and enable/disable logic are unchanged.

## 2. Lines that name the green check

- [x] 2.1 Keep `connect-browser.mjs`'s watch-link sign-in note (its own *Hand back* ends that turn; see the Decision log), and change `hand-over.mjs`'s `WINDOW_REMINDER` to tell the person to click ✅ at the top right; update `hand-over.test.mjs` assertions. Check: `connect-browser.test.mjs` and `hand-over.test.mjs` pass.
- [x] 2.2 Update the person-facing lines and descriptions in `live-view.md` (table, drawing, `--note` examples, the rule on how to end a note), `browser-window.md`, `browsing.md`, `hand-over/SKILL.md`, the browser `SKILL.md`: each line ends `, then tap ✅ at the top right.` (*click* in the window); the button is the green check, *Hand back*, at the top right; the 🔔 stays on the waiting tab. Check: `grep -rn "tap Hand back at the top\|click Hand back at the top\|bell button" .agents wiki` finds nothing.

## 3. uBlock off the toolbar

- [x] 3.1 In `addons.mjs`, add `unpinnedLayout(prefs, guid)` and an `unpinBuiltIns(profile)` step that moves each `builtInGuids()` button into `unified-extensions-area` once, recorded in the profile's `wongstack-unpinned.json`; call it at start beside `pin()`. Check: new tests in `addons.test.mjs` — a nav-bar uBlock moves to the menu while 1Password and Hand back stay; a second start with the person's re-pin leaves it; an unknown layout writes no marker.
- [x] 3.2 In `password-manager.md`, say that uBlock Origin is built in and its button is in the puzzle-piece menu. Check: the page reads right and `node scripts/check-payload-links.mjs` passes.

## 4. Release and checks

- [x] 4.1 Add a `## Next (minor) — A green check you click when you're done` entry to `CHANGELOG.md` with an Updating note (nothing to do; shows at the browser's next start), and raise `.agents/plugins/browser/VERSION` to 3.4.0. Check: `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check` pass.
- [x] 4.2 Run the browser tests: `node --test scripts/tests/addons.test.mjs scripts/tests/connect-browser.test.mjs scripts/tests/hand-over.test.mjs scripts/tests/browser-server.test.mjs scripts/tests/view-page.test.mjs`. Check: all pass.
- [x] 4.3 After implementation, `/save`, then restart the agent's browser on this computer and take a screenshot of its toolbar: the green check shows at the right end, uBlock is in the puzzle-piece menu, 1Password stays. Check: the screenshot shows it.
