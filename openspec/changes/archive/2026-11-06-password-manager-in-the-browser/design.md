# Design

## Context

The shared browser is Camoufox (Firefox 158, pinned in `browse.mjs` as `CAMOUFOX`), started by `browser-server.mjs` with options from `launch-config.py`, on a persistent profile in `~/.wong-stack/camoufox/profile`. The live view is `x11vnc` of the browser's whole Xvfb screen (`hand-over/scripts/view.mjs`), and `liveView().fit` sizes the page to the screen minus the bar above it, so the toolbar shows in the view. Today the browser starts with no add-on of ours; Camoufox's library has an `addons` launch option that takes extracted add-on folders.

*The live view is the one place for sensitive input* (workspace `outgoing-flamingo`, in APPLY) makes every sign-in a live view and removes the password page. At /ship that change was still unsaved, so this one builds on today's live view (stuck login, `--sign-in`) and goes live first; that change merges it in when it next takes main. Motivation: see proposal.md.

Checked on 2026-11-05: `https://addons.mozilla.org/api/v5/addons/search/?q=<name>&type=extension&app=firefox` answers from this server with each add-on's `guid`, `promoted` category, `average_daily_users`, `authors`, `homepage`, and `current_version.file.{url,hash}` (`sha256:...`). A search for `1password` lists Bitwarden first and the real 1Password third. Promoted: 1Password, Bitwarden, LastPass, RoboForm. Not promoted, with 67,000 to 194,000 daily users each: Dashlane, Proton Pass, Keeper, NordPass. A look-alike (`boltwarden`) is not promoted and has 4.

Tried on 2026-11-05 on this server, with a test copy of the pinned Camoufox on its own Xvfb screen and profile (Bitwarden 2026.10.2, 1Password 8.12.41.1, both sha256-checked):

- Both load through `addons=[folder]`. With the two keep-storage prefs, Bitwarden kept its internal address and a skipped setup screen through a restart.
- An unpinned add-on sits behind the toolbar's extensions menu. The menu opens, but a click on the add-on there opens nothing: a panel opened from a panel closes at once on this screen.
- Pinned to the toolbar (its widget moved into `nav-bar` in `browser.uiCustomization.state`), Bitwarden's button opens its pop-up. The pop-up closes at the first click inside it, unless `ui.popup.disable_autohide` is true. Then clicks work, but typing does not reach the pop-up, even after `xdotool windowfocus` on its window.
- The add-on's pages work as a normal tab or window: Bitwarden's `popup/index.html` in a tab, its *pop out* window once focused (typing reached it), and 1Password's `app/app.html#/page/welcome` in a tab.
- 1Password opens its sign-in in a new tab, which Camoufox blocks unless `allow_addon_new_tab=True`: with the default, clicking it did nothing.

## Goals / Non-Goals

**Goals:** one checked add-on per computer, loaded at every start; storage kept across starts; a once-only offer; a hard guard so the agent's own clicks and readings skip the add-on.

**Non-Goals:** any other add-on (ad blockers, and so on); the agent filling from the vault; Chrome-only add-ons; a change to the live view's page or controls.

## Decisions

### 1. A deterministic `addons.mjs`, not agent steps

Finding, checking, downloading, and swapping an add-on repeats the same way each time, so it is code ([the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai)): `.agents/skills/browser/scripts/addons.mjs`, run as `browse.mjs addon <find|add|remove|status|decline>`. `browse.mjs` is already 900 lines, so the logic lives in its own module and `browse.mjs` only routes to it.

- `find <name>` prints up to three Firefox extensions from the search, each as `BROWSE_ADDON_FOUND=<slug> | <name> | <maker> | <website> | <daily users> | <featured or not>`, plus `BROWSE_ADDON_WARN=<slug>` for one that is not promoted and has under 10,000 daily users. The agent picks the one whose maker and website match the person's manager, says the warning when there is one, and asks them. A search with no match prints `BROWSE_ADDON_FOUND=none`.
- `add <slug>` reads the add-on's own record (`/api/v5/addons/addon/<slug>/`), refuses one that is not an extension (`BROWSE_ERROR=<reason>`), downloads the `.xpi` to the browser's `tmp`, checks its sha256 against `file.hash`, and unzips it to `~/.wong-stack/camoufox/addons/<guid>/`. It writes `password-manager.json` (`{state: 'added', slug, guid, name, maker, version, checkedAt}`), removing any other add-on first: one at a time. It then restarts the browser the way `stop` does, once no live view is open, so the next command starts with it.
- `status` prints `BROWSE_ADDON=none|declined|<name>`; `decline` writes `{state: 'declined'}`; `remove` deletes the folder, writes `{state: 'declined'}` (no offer again until asked), and clears the add-on's stored data (decision 4).

The person's yes decides, not a floor: the requester asked that a person can add any add-on they want. A look-alike can still read every page of a browser signed in as the person, so `find` gives the facts that tell one apart (maker, website, daily users, featured), and the warning marks the risky case: not promoted and under 10,000 daily users. On 2026-11-05 every big manager cleared that line (Dashlane, Proton Pass, Keeper and NordPass at 67,000 to 194,000) and the look-alike `boltwarden` had 4. `add` still refuses a file whose sha256 does not match.

### 2. Load it through Camoufox's `addons` option, keep its storage with prefs

`browser-server.mjs` reads `password-manager.json` and passes `--addon <folder>` to `launch-config.py`, which adds `addons=[folder]` to `launch_options` and, through `firefox_user_prefs`, `extensions.webextensions.keepStorageOnUninstall` and `extensions.webextensions.keepUuidOnUninstall` set to true. Camoufox loads an `addons` folder as a temporary add-on each start, and a temporary add-on gets a new internal address and loses its storage at shutdown without these two prefs; with them, the add-on finds its sign-in again.

The alternative is a permanent install: the signed `.xpi` in the profile's `extensions/<guid>.xpi` with `extensions.autoDisableScopes` cleared. It keeps storage with no prefs, but goes around Camoufox's supported route. The test copy kept Bitwarden's storage through a restart with the prefs. A real account's sign-in through a restart is checked at the first real add (tasks.md, *After it is live*); if the prefs do not keep it, a fix switches to this route.

### 3. The person uses the add-on as a tab, not as a pop-up

The test showed the toolbar pop-up can't take typing on this screen, and `ui.popup.disable_autohide` would also keep every page menu open, which breaks the agent's own clicks. So:

- `launch-config.py` sets `allow_addon_new_tab=True`, so the add-on's own sign-in and unlock tabs open.
- `browser-server.mjs` pins the add-on's button to the toolbar at start (its widget into `nav-bar` in `browser.uiCustomization.state`, by the profile's `user.js`), so it is one click, not behind the extensions menu.
- At a sign-in, the agent opens the add-on's own page as a tab before the live view (`moz-extension://<uuid>/<page>`, the page saved by `add`: the `default_popup` from the manifest, or a page the add-on names, such as 1Password's `app/app.html#/page/welcome`). The person signs in or unlocks there, then goes back to the site's tab and fills from the add-on's in-page fill list, which sits in the page and takes typing.
- The live view's `front()` raises a window by size today. An add-on window (Bitwarden's *pop out*) has the same size as the page window, so `front()` must keep the window the person last clicked in front and focused, not the first match.

`ui.popup.disable_autohide` stays off.

### 4. Updates and removal

At each browser start, when `checkedAt` is over 7 days old, `addons.mjs` checks the add-on's record for a newer version and swaps it in by the same checks before launch; any failure keeps the working folder and moves `checkedAt` on, so a dead network never blocks a start. A password manager refuses to work at a version far behind, so a stale copy would break quietly.

`remove` also deletes the add-on's storage under the profile (`storage/default/moz-extension+++<uuid>*` and its `browser-extension-data/<guid>/` folder), found through `extensions.webextensions.uuids` in `prefs.js`, with the browser stopped first, so no unlocked vault session stays.

### 5. The guard: the agent's reading and clicks skip the add-on

A password manager draws its fill list in the page as a `moz-extension://` frame or an element it injects. `browse.mjs` already walks frames for its snapshot (`frameOf`, refs per frame). It leaves out every frame whose address starts with `moz-extension://`, and any ref inside one, and `click`, `type`, `press` and `select` refuse a target inside one with `BROWSE_ERROR=that is the password manager's own; the person uses it in the live view`. Screenshots stay as they are: they already stop while a live view is open ([browsing](../../../wiki/development/browsing.md)).

The guard catches the agent's routine reading; the advice (a separate vault and a short auto-lock) covers what a guard can't, such as a script the agent runs in the page. The skill says the agent never unlocks or opens the add-on.

### 6. The offer sits in the browser skill, after its install

The browser installs at the first errand that needs it (`browse.mjs install`, asked first; [why](../../../wiki/development/required-tools.md#installing-camoufox)), not in `/wong-setup`. So the offer lives in the browser skill, right after install: `browse.mjs install` ends with `BROWSE_ADDON=none` when no choice is saved, and the skill then asks which password manager the person uses (options from the common ones, plus *Other* and *None*), then `find`, the name-and-maker yes, and `add`. *None* runs `decline`. Then the errand goes on.

A computer whose browser was installed before this change gets the same once-only question: its first `browse.mjs open`, the start of every errand, prints `BROWSE_ADDON=none` while no choice is saved, as `status` does, and the skill asks then. Printing it saves nothing: the offer counts as made only when the agent asks the person in a chat and runs `addon asked`, so a run with no person never uses it up; after any answer the file holds `added` or `declined`, and the agent never offers again; *add my password manager* runs `find` and `add` at any time. The once-per-computer memory is the file, not the memory store: the browser is per computer, and code can read a file.

### 7. One new wiki page

`browsing.md` is at 2,990 of 3,000 words, so the how goes on a new `wiki/development/password-manager.md` (the offer, the checks, the safe setup, removal), linked from `live-view.md` at its sign-in line, from `browsing.md` in one short clause with an equal cut, and from `wiki/development/README.md`.

## Risks / Trade-offs

- [The agent drives a browser with an unlocked vault] → the frame guard, the never-use rule, and the advice of a separate vault and a 5-minute auto-lock.
- [An add-on changes the browser's fingerprint, so a site sees a new device] → add-ons are common on real Firefox, and the saved fingerprint does not change; a site that asks again gets a live view as today.
- [The toolbar pop-up takes no typing on this screen (tested)] → the add-on's pages open as a tab (decision 3); the in-page fill list needs no pop-up.
- [An add-on's in-page fill list, unlock or sign-in, was not tried with a real account] → checked at the first real add of 1Password (tasks.md, *After it is live*); if filling needs the pop-up, that is reported and planned as a fix.
- [`add` restarts the shared browser while another chat works] → it stops at once while a live view is open, and pages come back from the saved tabs, as after `stop`.
- [The other change rewrites the same browser files (`browse.mjs`, `browser-server.mjs`, `launch-config.py`, the browser skill)] → this change keeps its edits small and in their own functions, so that change's merge of main stays simple.

## Migration Plan

Nothing to move: a computer with no `password-manager.json` gets the one question at its next errand that uses the browser. Rollback: `browse.mjs addon remove`, or delete `~/.wong-stack/camoufox/addons/` and `password-manager.json`.
