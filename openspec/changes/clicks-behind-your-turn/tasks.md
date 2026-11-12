# Tasks

## 1. The browser server: key clicks and the waiting click

- [x] 1.1 In `.agents/skills/browser/scripts/browser-server.mjs`, take `click` out of `SHOWS_TAB` and route a click during another tab's turn to a key path: read the target's key (Enter or Space by the design's list, none for anything else, disabled, or unreachable), `focus()` then `keyboard.press()`, answer `via: 'key'`; a failed focus counts as none. Verify with the tests in 1.3.
- [x] 1.2 Add the waiting click: `tab.waiting`, an at-once `{queued: true}` answer, a 250 ms watcher that runs waiting clicks oldest first through the tab's step queue once no other turn holds, a 409 on every other route of a tab with a waiting click, `GET /tabs/:id/click` long-polling up to 25 s, the reaper skipping such a tab, and a close dropping it. Verify with the tests in 1.3.
- [x] 1.3 In `scripts/tests/browser-server.test.mjs`, replace the *a click selects its tab* refusal with tests that a button, a link, a tick box (Space), and a marked custom button press by key during another turn with no front call; a plain element, and a target whose focus fails, queue; other routes on that tab get 409 while it waits; the click runs after `front {turn: false}` and after a lapsed lease; the long poll returns its result; a closed tab drops it; with no turn, the click is the mouse click as before; a resize still refuses after the wait. Verify with `node --test scripts/tests/browser-server.test.mjs`.
- [x] 1.4 In `scripts/tests/browser-server.test.mjs`, add a case with two tabs each holding a waiting click, checking they run oldest first after the turn ends, and a case checking a click that ran but is unclaimed keeps refusing its tab's other steps until `GET /tabs/:id/click` claims it. Verify with `node --test scripts/tests/browser-server.test.mjs`.

## 2. The browse command

- [x] 2.1 In `.agents/skills/browser/scripts/browse.mjs`, print `BROWSE_CLICK=key` after a key click, `BROWSE_CLICK=queued` with the one stderr note for a waiting click, and add `wait-click` (`BROWSE_CLICK=mouse|forced|script`, `BROWSE_ERROR=` exit 1, or `BROWSE_CLICK=none`), with its usage line. Keep the tick-box read and Space retry for a key click. Verify with 2.2.
- [x] 2.2 In `scripts/tests/browse.test.mjs` (with the fake server in `scripts/tests/fixtures/` as needed), test each printed outcome, `wait-click` with and without a waiting click, and that a queued click skips the tick-box retry. Verify with `node --test scripts/tests/browse.test.mjs`.
- [x] 2.3 In `browse.mjs`, keep `clickQueued` in the session's tab file when `click` answers queued, and clear it once `wait-click` reports. On a 404, `wait-click` prints `BROWSE_CLICK=none` when no click was queued, such as an idle tab the reaper closed, and the closed-tab error only when one was. Test both 404 paths in `scripts/tests/browse.test.mjs`. Verify with `node --test scripts/tests/browse.test.mjs`.
- [x] 2.4 In `.agents/skills/connect/scripts/browser.mjs`, a `click` that answers queued waits through `waitClick()` before it says `Done`, or fails with the click's error, so the connect flow's next step never meets the waiting click. Test it in `scripts/tests/connect-browser.test.mjs`. Verify with `node --test scripts/tests/connect-browser.test.mjs`.
- [x] 2.5 In `.agents/skills/connect/scripts/browser.mjs`, a `click` that answers queued says at once that the click waits for the person's turn in another chat's tab, and to run connect's own `wait-click` in the background and take no other step until it ends; add `wait-click` (`Done`, the click's error with exit 1, or `No click waits.`), exempt from the watch link's hold. Make the server's 409 text for a tab with a waiting click name `wait-click` alone, so it fits both commands. List `wait-click` in `wiki/stack/connect-your-tools.md`. Test in `scripts/tests/connect-browser.test.mjs` that the queued click answers at once and `wait-click` reports the ran click, its error, and nothing waiting. Verify with `node --test scripts/tests/connect-browser.test.mjs scripts/tests/browse.test.mjs scripts/tests/browser-server.test.mjs` and `node scripts/check-payload-links.mjs`.

## 3. Words and the manual check

- [x] 3.1 Update `wiki/development/browser-window.md` *Your turn keeps its tab in front*: a click goes on by key behind your tab; only a mouse-only target waits for your turn to end. Add one line to `.agents/skills/browser/SKILL.md` for `BROWSE_CLICK=queued` → `wait-click` in the background, with an offsetting cut. Verify with `node scripts/measure-context.mjs --check` and `node scripts/check-payload-links.mjs`.
- [x] 3.2 In `scripts/tests/manual/browser-tabs-real.mjs`, replace *a click in a tab behind waits, then is refused* with: a button click behind lands by key and the turn's tab stays shown; a plain clickable element queues and lands by mouse after the turn ends. Run it on this server under Xvfb and verify every line prints `ok`.
- [x] 3.3 Add a `## Next (minor) — Another chat's click goes on behind your turn` entry at the top of `CHANGELOG.md`, in plain words, with no hand step. Verify with `node scripts/check-payload-links.mjs`.

## 4. Checks and release

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree` and verify it passes.
- [ ] 4.2 `/save`, and verify CI passes on the pull request.
- [x] 4.3 At `/ship`, record an open thread: run `node scripts/tests/manual/browser-tabs-real.mjs` on a Mac, and confirm the key click leaves the person's tab in front there. Verify the thread shows in `memory.mjs search --type thread --tag browser`.
