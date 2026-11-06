# Tasks

## 1. Load a checked add-on in the browser

- [x] 1.1 Write `.agents/skills/browser/scripts/addons.mjs` (design decisions 1 and 4): `find`, `add`, `remove`, `status`, `decline`, the warning for an unpromoted add-on under 10,000 daily users, the sha256 check, `password-manager.json`, one add-on at a time, the weekly update with keep-on-failure, and removal of the add-on's stored data; route `browse.mjs addon <verb>` to it and add it to `browse.mjs`'s usage text. Write `scripts/tests/addons.test.mjs` against a stand-in add-on site (no network): a promoted add-on, an unpromoted one with 100,000 daily users and one with 4 daily users are added, only the last with a warning from `find`, and a wrong hash is refused, a second add swaps the first, `decline` and `remove` keep the no, a failed update keeps the old folder. Verify with `node --test scripts/tests/addons.test.mjs`.
- [x] 1.2 Pass the add-on at start (design decision 2): `browser-server.mjs` reads `password-manager.json` and passes `--addon <folder>`; `launch-config.py` adds `addons`, `allow_addon_new_tab=True` and the two keep-storage prefs; the start pins the add-on's button to the toolbar (design decision 3). `addons.mjs add` saves the add-on's own page for the tab. Extend `scripts/tests/launch-config.test.mjs` and `browser-server.test.mjs` for with and without an add-on. Verify with `node --test scripts/tests/{launch-config,browser-server}.test.mjs`.
- [x] 1.3 Make `view.mjs`'s `front()` keep the window the person last clicked in front and focused (design decision 3), with a case in `scripts/tests/view.test.mjs`. Verify with `node --test scripts/tests/view.test.mjs`.

## 2. The guard on the agent's reading and clicks

- [x] 2.1 In `browse.mjs` (design decision 5), leave every `moz-extension://` frame and its refs out of `snapshot`, and refuse `click`, `type`, `press` and `select` on a target inside one Add cases to `scripts/tests/browse.test.mjs` with a stand-in page holding a `moz-extension://` frame. Verify with `node --test scripts/tests/browse.test.mjs`.

## 3. The offer and the docs

- [x] 3.1 In `.agents/skills/browser/SKILL.md` (design decision 6): after `install`, or at the next errand when `status` prints `BROWSE_ADDON=none`, the once-only question, `find`, the name-and-maker yes, `add` or `decline`; *add my password manager* at any time; at a sign-in, as *The live view is the one place for sensitive input* left it, open the add-on's tab before the view; and the never-use rule. `browse.mjs install` and `status` print `BROWSE_ADDON=`, with a case in `scripts/tests/browse.test.mjs`. Keep the skill within its size check.
- [x] 3.2 Write `wiki/development/password-manager.md` (design decision 7): the offer, the checks, the safe setup (separate vault, 5-minute auto-lock), updates, removal and swap. Link it from `live-view.md` at the sign-in line, from `browsing.md` with an equal word cut so the page stays under 3,000 words, and from `wiki/development/README.md`.
- [x] 3.3 Add `## Next (minor) — Your password manager in the assistant's browser` to the top of `CHANGELOG.md`, its **Updating.** note in plain words: nothing to do; the assistant asks once which password manager you use at the next errand that uses its browser.

## 4. Check

- [x] 4.1 Run `node --test scripts/tests/{addons,browse,browser-server,launch-config,view}.test.mjs`, `node .github/scripts/checks.mjs --worktree`, and `openspec validate password-manager-in-the-browser --strict --no-interactive`; fix each failure this change caused.

## After it is live

Not a gate (the requester chose to publish first; see the Decision log). At the first real add of 1Password on this computer: add it through a live view, sign in once in its tab, fill a login from the in-page fill list, restart the browser and confirm it asks only to unlock, then fill again in a second live view. If filling needs the pop-up, report it and plan a fix.
