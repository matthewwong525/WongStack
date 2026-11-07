# Design: add-ons the agent installs work in its browser, and a live view shows them whole

## Context

Two faults met in one session on 2026-11-06/07:

1. **A self-added 1Password does not work in Camoufox.** Added through addons.mozilla.org's *Add to Firefox* button, Firefox installs the signed xpi into the profile (`profile/extensions/<guid>.xpi`, location `app-profile`). In Camoufox 158.0.1-beta.41 that copy opened no welcome page at install, and its toolbar button did nothing: the button turned pressed, and no panel window mapped. Its `app/app.html` drew blank at `#/`, and drew the setup page at `#/page/welcome`. After the setup steps the button still did nothing (not signed in). The agent's copy (`addAddon`: the same xpi, checked, unpacked into `~/.wong-stack/camoufox/addons/<guid>/`, loaded with `--addon` at each start) opened its welcome page from the button. Developer tools are off in Camoufox, so the inner error was not read.
2. **The live view's fit skips the add-on's page.** `liveView().fit` calls `page.resize`; on that page the server answers `keepForSite` (stores the size for the site, returns `addonPage: true`) and the window keeps its size. `measureBar` returns null there too. `front()` then finds no window as tall as the screen, so nothing raises. A browser started fresh, then sent to the add-on's page by `addon open` before any fit, kept the fingerprint's 1920×1036 window on the 1280×720 Xvfb: the toolbar's right part and the page's bottom were off screen.

The agent's path is the one that works, but today it holds one add-on, framed as the password manager: `addons.mjs` keeps one choice in `password-manager.json`, `addAddon` drops the last one, `startArgs` returns one `--addon`, and `launch-config.py` takes one. The person asked that the agent's add work for any add-on it helps install.

## Goals / Non-Goals

**Goals:** the agent adds any add-on from Firefox's add-on site with today's checks, and keeps several; its add leaves one working copy when the person had added their own; the vault advice goes only with a password manager; the view always shows the whole window; the help steers every add-on to the agent.

**Non-Goals:** the root cause inside Camoufox; testing every add-on; changing the page's own viewport on the add-on page (the server's refusal there stays); a reader or user of any add-on by the agent.

## Decisions

### A list of added add-ons

`~/.wong-stack/camoufox/addons.json` holds `{ added: [record, ...] }`, each record as today's choice (`slug`, `guid`, `name`, `maker`, `website`, `version`, `page`, `tags`, `checkedAt`, `addedAt`). `addAddon` replaces the record of the same guid, or appends one; it no longer calls `dropAddon` on another.

- **Migration:** reading the list when `addons.json` is missing and `password-manager.json` holds `state: 'added'` writes that record as the list's first item, then removes the old file. `password-manager.json` joins `scripts/retired-names.json` only if a check reports a live file still naming it after the build.
- `startArgs` returns `--addon <folder>` for each record whose folder exists; `launch-config.py` takes `--addon` with `action='append'` and passes every folder in camoufox's `addons` list. `browser-server.mjs` already spreads `addonArgs()` into the launch, so it needs no change.
- The weekly `update` runs per record; a failed update keeps that record's current copy, as today.
- `pin` and `pinnedLayout` pin every added add-on's button, so each shows in the toolbar.
- *Alternative:* keep one password manager and let other add-ons sit beside it. Rejected in the Decision log: a general add that silently removes the last one would surprise the person.

### Remove by name, status lists all

`addon remove <name>` matches a record by slug, guid, or a case-blind part of its name; no match or several matches is an error that names the added ones. Removing stops the browser as today (`stopForChange`), deletes that folder and its storage (`clearStorage`), and drops the record. `addon remove` with no word is an error while several are added, and removes the one when only one is added. `addon status` prints one `BROWSE_ADDON=<name>` line per record, or `BROWSE_ADDON=none`.

### The advice by tag

`addAddon` saves the site record's `tags`. `BROWSE_ADDON_TELL` prints today's vault-and-lock advice only when `tags` holds `password manager`; for any other add-on it says only that the add-on loads from the next start. `addon find` keeps listing any add-on, without today's password-manager framing.

### `addon open` and the guard

`addon open` and `pageUrl` use the newest record tagged `password manager`, else the newest record; with none, the error stays. The guard that keeps the agent out of add-on pages and frames already covers every extension page (`moz-extension:`), so it needs no change. `OWN_PAGES` keeps 1Password's welcome page; other add-ons open their `page` from the site record, as today.

### Remove the person's copy in `addon add`

In `addAddon`, after `stopForChange`, when `profile/extensions/<guid>.xpi` (or a folder of that name) exists for the add-on being added, remove it and run `clearStorage(profile, guid)`. Firefox drops a missing add-on from its database at the next start.

- The by-hand fix on 2026-11-07 also deleted `extensions.json` and `addonStartup.json.lz4` (Firefox rebuilds both). The build first tries the xpi alone in a throwaway profile copy, holding the person's copy beside the agent's `--addon` copy. It deletes those two files as well only when the xpi alone leaves the agent's copy not working, and it logs which in the Decision log.
- Only the same guid is removed. Another add-on the person added stays.
- `addon add` already stops the browser and refuses while a live view is open, so the removal never races a running browser.

### Fit the X window on the add-on page

In `view.mjs` `liveView().fit`, when `page.resize(...)` resolves with `addonPage: true`, size each page window (`pageWindows(display)`) that is wider or taller than the screen to the screen with one `xdotool windowsize <id> <w> <h> windowmove <id> 0 0`, then run `front()` as today. The width is the screen's (the *Phone* fit can't narrow a page the server will not resize), the height the screen's. A window already at or under the screen size is left alone.

- *Alternative:* let the server resize the viewport on the add-on page. Rejected: `keepForSite` exists so a view's end gives the site back its own size; a viewport change there would also be a step on the add-on's page, which the guard refuses by design.
- The keep-alive fit (`keepOpen`) runs the same path, so a window the person or the add-on enlarges is fitted again within a minute; a shown pop-up still skips the fit, as today.
- `endView` sets the page's first size back only when `view.size` is known. On the add-on page it is not, so the window stays screen-sized after the view: no one sees the virtual screen then, and the next fit on a site measures from there.

### Help

`password-manager.md` keeps its address. "Add it yourself" becomes "Ask the agent": say *add uBlock Origin* or *add my password manager*; the agent names the maker and waits for a yes. One line says what a self-added 1Password did (Camoufox 158.0.1-beta.41: no setup page, a dead button), and that the agent's add replaces such a copy. The "one at a time" line goes; the remove section says to name the add-on. The vault advice stays, scoped to a password manager. The `wiki/development/README.md` entry's summary follows. `browser/SKILL.md` line 18 covers any add-on, with the advice only when `BROWSE_ADDON_TELL` gives it. `live-view.md` gets nothing new unless it describes the add-on page's size; the build checks.

## Risks / Trade-offs

- **[Removing the person's copy deletes its data]** → The person said yes to the agent's add of the same add-on; a self-added copy that never worked holds no sign-in in practice. The proposal carries the can't-be-undone line.
- **[Several add-ons slow the start, or clash]** → Each one is the person's yes; the status lists them, and remove takes one out by name.
- **[An add-on that needs a page the site record does not name]** → `addon open` opens the record's `page`; the person can open the add-on from its toolbar button in the live view.
- **[A future Camoufox fixes self-added add-ons]** → The help says what was seen, with the version, not that it can never work.
- **[`windowsize` on a window the fingerprint spoofs]** → Measured on display `:0`: the window took 1280×720 on the first try with no snap back.

## Verification

- Unit, `addons.test.mjs`: a second `addAddon` keeps the first record and folder; `startArgs` returns both folders; the same guid replaces its record; `removeAddon(name)` removes only the named one and its storage, and errors on no or several matches; status lists all; the advice prints for a `password manager` tag and not for another; `addon open` picks the newest password manager; an old `password-manager.json` migrates once; `addAddon` in a temp profile holding `extensions/<guid>.xpi` and its storage removes both, and another guid's xpi stays.
- Unit, `launch-config.test.mjs`: two `--addon` arguments give both folders in `addons`.
- Unit, `browse.test.mjs`: the help text, the `addon remove <name>` word count, and the status lines.
- Unit, `view.test.mjs` with the fake tools: a fit whose `resize` reports `addonPage` sizes a too-big window to the screen and then raises it; a window that already fits gets no `windowsize`. The fake records `windowsize`/`windowmove` and changes the geometry it reports.
- By hand, in a throwaway browser on a private Xvfb: a profile with a site-installed 1Password, then `addAddon` for 1Password and for uBlock Origin; after two starts both buttons show, and 1Password's opens its welcome page. And a fresh start sent to the add-on page with the window at 1920×1036 on a 1280×720 screen: after one fit, the whole toolbar shows.
