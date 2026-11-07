## 1. Browser: the agent adds any add-on and keeps several

- [x] 1.1 In `.agents/skills/browser/scripts/addons.mjs`, keep a list in `addons.json` in place of the one choice; migrate an old `password-manager.json` once and remove it; save the site record's `tags`. Update `FILES` in `browse.mjs` to match.
- [x] 1.2 `addAddon` replaces the same guid's record or appends one, and no longer drops another add-on; after `stopForChange`, it removes `profile/extensions/<guid>` (xpi or folder) for the add-on being added and runs `clearStorage(profile, guid)`.
- [x] 1.3 `startArgs` returns `--addon <folder>` for each added add-on; `pin`/`pinnedLayout` pin each button; the weekly update runs per add-on.
- [x] 1.4 `removeAddon(name)` by slug, guid, or part of the name, with clear errors on no or several matches; `addonStatus` lists all; `ADDON_VERBS.remove` takes an optional name.
- [x] 1.5 `BROWSE_ADDON_TELL` gives the vault-and-lock advice only for a `password manager` tag; `pageUrl`/`addon open` use the newest password manager, else the newest add-on.
- [x] 1.6 `.agents/skills/browser/scripts/launch-config.py`: `--addon` repeats (`action='append'`), and every folder goes into camoufox's `addons`.
- [x] 1.7 `.agents/skills/browser/scripts/browse.mjs`: the `addon` help lines for any add-on, `remove <name>`, and the status lines.
- [x] 1.8 Tests: `scripts/tests/addons.test.mjs` (two add-ons side by side, replace by guid, remove by name and its errors, status, advice by tag, `addon open` choice, migration, the person's copy removed and another guid's kept), `launch-config.test.mjs` (two `--addon`), `browse.test.mjs` (help, words, status).

## 2. Live view: fit the window on the add-on's page

- [x] 2.1 In `.agents/skills/hand-over/scripts/view.mjs` `liveView().fit`, when `page.resize` resolves with `addonPage: true`, size each page window bigger than the screen to the screen (`xdotool windowsize` + `windowmove 0 0`), then `front()`.
- [x] 2.2 Extend `scripts/tests/fixtures/fake-view-tools.mjs` to record `windowsize`/`windowmove` and report the new geometry; add `scripts/tests/view.test.mjs` cases: a too-big window on the add-on page is sized and raised; a fitting window gets no `windowsize`.

## 3. Docs

- [x] 3.1 `wiki/development/password-manager.md`: "Ask the agent" for any add-on; one line on what a self-added 1Password did (Camoufox 158.0.1-beta.41: no setup page, a button that does nothing) and that the agent's add replaces such a copy; drop "one at a time"; remove by name; the vault advice for a password manager only.
- [x] 3.2 `.agents/skills/browser/SKILL.md` line 18: the add covers any add-on; tell the person `BROWSE_ADDON_TELL`; keep the never-use rule.
- [x] 3.3 `wiki/development/README.md`: the password-manager entry's summary follows 3.1. Check `wiki/development/live-view.md` and `browsing.md` for a line about one add-on or the add-on page's size, and update it.
- [x] 3.4 `CHANGELOG.md`: a `## Next (minor)` entry, plain words, no hand step.

## 4. Checks

- [x] 4.1 By hand on a private Xvfb (`.scratch/`, not the person's browser): in a throwaway profile copy holding a site-installed 1Password, check whether removing the xpi alone leaves the agent's copy working after two starts; if not, also delete `extensions.json` and `addonStartup.json.lz4` in 1.2, and log the result in the proposal's Decision log. Then add 1Password and uBlock Origin: both buttons show, and 1Password's opens its welcome page. And a fresh start sent to the add-on page at 1920×1036 on a 1280×720 screen shows the whole toolbar after one fit.
- [x] 4.2 Run `node .github/scripts/checks.mjs --worktree` and fix what it reports (payload links, retired names such as `password-manager.json`, context size).

## 5. Review fixes

- [x] 5.1 `addons.mjs`: the record moved from the old file gets `tags: ['password manager']`, and the weekly `update` takes the site record's `tags`; the migration test checks that `addon open` picks the moved record over a later add-on with other tags, and that a weekly check refreshes its tags.
- [x] 5.2 `addons.test.mjs`: with no own copy of the add-on, `extensions.json` and `addonStartup.json.lz4` stay after `addAddon`.
- [x] 5.3 Examples that offered uBlock Origin, which Camoufox ships under the same id, use Dark Reader: `password-manager.md`, both specs' scenarios ("A second add-on joins the first", "No vault advice for another add-on"), the changelog entry, the proposal's What Changes, and the design's help line.

## 6. An add-on the browser ships

- [x] 6.1 `addons.mjs`: `builtInGuids()` reads the ids of the add-ons the active Camoufox build ships (`<cache>/camoufox/config.json` `active_version`, then each `addons/<name>/manifest.json`); `addon find` prints `BROWSE_ADDON_BUILT_IN=<slug>` for one, and `addAddon` refuses one before any download (`<name> is built into the browser already; nothing to add.`). The `addon` help lines and `.agents/skills/browser/SKILL.md` tell the agent to say it is built in, before it asks, and add nothing. Docs: `password-manager.md`, both specs, the changelog entry.
- [x] 6.2 Tests: `addons.test.mjs`: a built-in add-on is found as built in, its add is refused with no list entry and no download, and an add-on the browser does not ship still adds.
- [x] 6.3 `addons.mjs`: `builtInGuids()` also reads a Mac build's add-ons, at `<active_version>/Camoufox.app/Contents/Resources/addons/` (the camoufox package's `build_file`/`get_path`). Test: `shipInBrowser` takes `{ mac: true }`, and a Mac build's add-on counts as built in.
- [x] 6.4 `addons.mjs`: `startArgs` skips a record whose guid the browser ships (no update check, no pin, no `--addon`), so an add made before the install, or before a later build shipped it, never loads beside the browser's own copy; `removeAddon` drops that record but keeps its stored data, which is the browser's own copy's. Tests: such a record gets no `--addon`, and its remove keeps the data.
