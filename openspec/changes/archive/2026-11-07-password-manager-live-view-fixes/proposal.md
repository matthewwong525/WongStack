# Add-ons the agent installs work in its browser, and a live view shows them whole

**Status:** ready-to-ship
**Branch:** little-alpacka
**Open questions:** none

## Why

You added 1Password from Firefox's add-on site, and in the assistant's browser it never worked: it never opened its setup page, and its button did nothing. The copy the agent adds works. But the agent adds only one add-on, a password manager, and a second one replaces the first; the help page tells you to add every other add-on yourself, the path that failed. Then, in the live view of 1Password's own page, the right side and bottom of the browser were cut off, toolbar included.

## What Changes

- **The agent adds any add-on you ask for, with the same checks**, not only a password manager: Dark Reader, a translator, anything on Firefox's add-on site. It names the maker, website, and daily users, warns on a little-used one, checks the file, and waits for your yes, as it does for 1Password today. For an add-on the browser already ships, such as uBlock Origin, it says the add-on is built in and adds nothing.
- **Your add-ons stay side by side.** Adding a second one no longer removes the first. You can ask what's added, and remove one by name. Each still updates once a week.
- **Asking the agent to add an add-on replaces a copy of it you added yourself.** Today the two copies clash, and neither works. It can't be undone: anything saved in your own copy goes. A copy that doesn't work never got your sign-in, so in practice nothing is lost.
  ```mermaid
  flowchart TD
    A["You: add Dark Reader, or 1Password"] --> B["Agent names maker, users; you say yes"]
    B --> C{"Your own copy in the browser?"}
    C -- yes --> D["Removed"]
    C -- no --> E["Agent adds the checked copy"]
    D --> E
    E --> F["Loads at every start, beside the others"]
  ```
- **The safety advice goes only with a password manager.** "Keep a separate vault, lock after 5 minutes" makes no sense for Dark Reader, so the agent says it only for an add-on Firefox's site tags as a password manager.
- **A live view always shows the whole browser window**, on 1Password's own page too. Today the view leaves that page at whatever size the browser started with, which can be bigger than the screen you see.
- **The help page says to ask the agent for an add-on**, not to add it yourself. It says what happened with 1Password added from Firefox's site: no setup page, and a button that does nothing.

**Non-goals:** finding why Camoufox breaks an add-on added from Firefox's site; testing every add-on; the agent using any add-on; any change to the window on a Mac or a Linux desktop.

## What the build needs

- **A throwaway copy of the browser on its own virtual screen**: Ready. The checks run on this computer, not in your browser.
- **Two add-ons from Firefox's add-on site**: Ready. 1Password and uBlock Origin download with no account; the test never signs in.

## Capabilities

### New Capabilities

### Modified Capabilities

- `password-manager-add-on`: the agent adds any add-on after the person's yes and keeps several; its add replaces a copy the person added; the safety advice is for a password manager only; the help points every add-on to the agent.
- `private-links`: a live view fits the browser window to its screen on an add-on's own page too.

## Impact

- `.agents/skills/browser/scripts/addons.mjs`: a list of added add-ons in place of one choice, with migration of the old `password-manager.json`; `addAddon` keeps the others and removes the person's copy of the same add-on; `removeAddon(name)`; `addonStatus` lists all; the advice only for a `password manager` tag; `pageUrl`/`addon open` for the newest password manager.
- `.agents/skills/browser/scripts/launch-config.py`: `--addon` repeats; every folder loads.
- `.agents/skills/browser/scripts/browse.mjs`: the `addon` verbs' help and `status` lines; `addon remove <name>`.
- `.agents/skills/browser/SKILL.md`: the add line covers any add-on.
- `.agents/skills/hand-over/scripts/view.mjs`: the fit sizes the page's window to the screen on an add-on's page.
- `scripts/tests/addons.test.mjs`, `browse.test.mjs`, `view.test.mjs`, `fixtures/fake-view-tools.mjs`, and the `launch-config.py` test if one exists: tests.
- `wiki/development/password-manager.md`, `wiki/development/README.md`, `wiki/development/browsing.md` if it names the one-add-on rule: the help.
- `CHANGELOG.md`: a minor entry.

## Decision log

- **2026-11-07** — Asked whether to plan both the screen fit and the help-page fix → chose plan both.
- **2026-11-07** — Asked whether to check first that 1Password from Firefox's site works after its setup steps → chose check first. Result: in a clean throwaway browser, 1Password 8.12.41.1 added through the site's *Add to Firefox* button opened no setup page. Its button did nothing. Its setup page drew when opened by address (`app/app.html#/page/welcome`), and its steps worked. After those steps, the button still did nothing (not signed in; no account to test sign-in).
- **2026-11-07** — Asked whether `addon add` removes a copy the person added themselves → chose yes, remove it.
- **2026-11-07** — Assumed: the agent's add is the fix, because the same add-on loaded through `browse.mjs addon add` (unpacked, `--addon`) opened its setup page from the button, on a fresh profile and on a copy of the person's profile with their copy removed. Their copy failed even in a profile copy holding only the extension files.
- **2026-11-07** — Assumed: on the password manager's page the fit sizes the X window with `xdotool windowsize` and `windowmove`, because the server refuses a viewport change there (`keepForSite`). On display `:0`, `windowsize 1280 720` on the 1920×1036 window showed the whole page and toolbar.
- **2026-11-07** — Assumed: other add-ons the person adds stay promised, and only a password manager goes through the agent, because only 1Password was measured failing, and uBlock, Camoufox's own add-on, works.
- **2026-11-07** — Assumed: the plan stays on branch `live-view-popups`, whose remote is gone after its merge, and `/save` cuts a fresh branch from `main`, because `/plan` changes no git state.
- **2026-11-07** — Asked (in chat) to make the agent's add general for any extension it helps install → chose any add-on from Firefox's site, with the same checks. This replaces the earlier entry that kept only a password manager on the agent's path.
- **2026-11-07** — Assumed: several add-ons stay side by side, with no limit of one password manager, because a general add that removes the last one would surprise the person, and the person chooses each one with a yes.
- **2026-11-07** — Assumed: the vault-and-lock advice prints only for an add-on whose site record carries the tag `password manager`, because the site tags 1Password and Bitwarden that way and uBlock Origin not (checked 2026-11-07), and the advice is about a vault.
- **2026-11-07** — Assumed: `addon open` opens the newest added password manager's own page, because the sign-in turn needs one page, and a person rarely keeps two password managers.
- **2026-11-07** — Assumed: the list moves to `~/.wong-stack/camoufox/addons.json`, read from the old `password-manager.json` once and then that file removed, because the old name says one password manager; the old name joins `scripts/retired-names.json` where a live file names it.
- **2026-11-07** — Assumed: the help stays on `password-manager.md`, with a short section for other add-ons, because moving the page changes its address in every installed repo; the release is `minor`, because the agent gains new behavior.
- **2026-11-07** — Assumed: the bar is read only from a window taller than the screen, not one as tall, because a window the add-on-page fit sized to the screen has no bar to read, and counting it read a bar of 0 back on the site (a `view.test.mjs` case found it).
- **2026-11-07** — Assumed: the fit sizes every page window bigger than the screen on the add-on page, other chats' windows included, as the design says; one window holds every chat's tab since 50.5.0, so another window is rare.
- **2026-11-07** — Assumed: `addon add` removes the person's copy by its xpi (or folder) alone, without `extensions.json` and `addonStartup.json.lz4`, as the design's first try; task 4.1's check in a throwaway browser confirms it or adds the two files.
- **2026-11-07** — Assumed: `password-manager.json` joins `scripts/retired-names.json`, allowed only in `addons.mjs` (its one-time move) and `addons.test.mjs`, so no doc names the old file again. The 50.5.0 changelog entry's link to the old `#add-it-yourself` heading now points at `#ask-the-agent`.
- **2026-11-07** — Checked: `wiki/development/live-view.md` and `browsing.md` name no one-add-on rule and no add-on page size, so neither changed.
- **2026-11-07** — Built tasks 1–3 and 4.2 on branch `little-alpacka`; saved before task 4.1, the by-hand check in a throwaway browser on a private Xvfb, which stays open.
- **2026-11-07** — Checked (task 4.1, throwaway home and browser): with only the person's xpi removed, the agent's 1Password showed no button and did not open its page on the first start; it worked from the second. So `removeOwnCopy` also deletes `extensions.json` and `addonStartup.json.lz4`; from a fresh profile, both starts then work. 1Password with uBlock Origin and Dark Reader shows each button; one fit sizes a 1920×1036 window on 1Password's page to 1280×720 with the whole toolbar.
- **2026-11-07** — Found: Camoufox ships its own uBlock Origin under the same id, so the agent's add of uBlock is not the copy that runs, and its dashboard loaded blank with both in place. Open for the person: warn on, or refuse, an add-on Camoufox already ships.
- **2026-11-07** — Review fix: the record moved from `password-manager.json` gets the tag `password manager`, because the old file only held a password manager, and with no tag `addon open` showed a later add-on instead; the weekly update also takes the site's current tags.
- **2026-11-07** — Review fix: a test checks that `extensions.json` and `addonStartup.json.lz4` stay when the person has no own copy of the add-on.
- **2026-11-07** — Review fix: the help, both specs, the changelog, and What Changes give Dark Reader as the example in place of uBlock Origin and "an ad blocker", because Camoufox ships its own uBlock Origin, so the agent's add of it is not the copy that runs. No warn or refuse is built; that stays the open question.
- **2026-11-07** — Asked what the agent does when asked for an add-on Camoufox already ships (uBlock Origin) → chose say it is built in and add nothing.
- **2026-11-07** — Built: `addon find` marks an add-on the browser ships (`BROWSE_ADDON_BUILT_IN`), read from the active Camoufox build's `addons/<name>/manifest.json` ids (today only uBlock Origin, `uBlock0@raymondhill.net`), and `addon add` refuses it before any download: *uBlock Origin is built into the browser already; nothing to add.* (tasks 6.1–6.2).
- **2026-11-07** — Review fix: the built-in check also reads a Mac build's add-ons, which Camoufox keeps in `Camoufox.app/Contents/Resources/addons/`, not beside the binary as on Linux (task 6.3).
- **2026-11-07** — Review fix: the check also runs at each start, because it finds nothing before the browser is installed: `startArgs` skips a record the browser ships, and `removeAddon` keeps that add-on's stored data, since the browser's own copy uses it (task 6.4).
- **2026-11-07** — Archive checkpoint: archived for ship as 50.7.0, after bringing in `main` (50.6.2); the `launch-config.py` help, its test, and the changelog merged by hand, both sides kept.
