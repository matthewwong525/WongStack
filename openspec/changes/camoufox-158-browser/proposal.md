# Proposal

**Status:** ready-to-ship
**Branch:** camoufox-158-browser
**Open questions:** none

## Why

The personal browser runs an old Camoufox build through camofox. camofox can't run a newer build, and it tells sites a Firefox version that is not the one that runs. Sites that check the version, such as an online store's admin, show an "unsupported browser" page. WongOS moved to Camoufox 158 first and tested it live; this change brings the general part to every WongStack repo.

## What Changes

- **The browser runs Camoufox 158 and tells sites its true version.** It runs the build that the official Camoufox library pins, with a disguise made for that build. A site that checks the version sees the version that really runs.
  ```mermaid
  flowchart LR
    now["old build, wrong version"] --> new["Camoufox 158, true version"]
    new --> s["no unsupported-browser page"]
  ```
- **Our own small browser server replaces camofox.** You and the agent use the same commands as before. Only the program behind them changes. It keeps the browser open between commands, gives each task its own page, and keeps one profile folder on disk with one kept identity.
  ```mermaid
  flowchart TB
    cmd["same commands"] --> ours["our server"] --> cf["Camoufox 158"]
    py["official library"] -. disguise .-> ours
  ```
- **Your logins move over once, and Meta logins never move.** The first start copies the old browser's site logins one time. It leaves out Facebook, Messenger, Instagram and other Meta logins, because Meta can lock an account when its login shows up in another browser. You sign in to those again yourself.
- **A test never copies a Facebook or Messenger login** to another browser or network, for the same reason. The browsing page says so.
- **The install needs Python 3.10 or newer.** Without it, the install says how to get it. `/update-dependencies` tells you when a newer Camoufox library is out, and never moves the pin itself.

Non-goals: no new commands, no proxy or country choice, no change to saved passwords.

## Capabilities

### New Capabilities

- `browser-engine`: which Camoufox build the browser runs, how its disguise matches that build, how it keeps pages and logins between commands and restarts, and how logins move from the old browser.

### Modified Capabilities

None.

## Impact

- `.agents/skills/browser/scripts/`: `browse.mjs`; new `browser-server.mjs`, `refs.mjs`, `launch-config.py`, `login-move.mjs`; `server.mjs` goes away.
- `.agents/skills/hand-over/scripts/` (`form.mjs`, `view.mjs`, `hand-over.mjs`): same calls, new server.
- `.agents/skills/update-dependencies/scripts/update.mjs`: surveys the `camoufox` pin on PyPI.
- New dependency: the `camoufox` Python package 0.5.9, in its own venv under `~/.wong-stack/camoufox/`. `@askjo/camofox-browser` goes away (`scripts/retired-names.json`).
- Wiki: `wiki/development/browsing.md`, `wiki/development/required-tools.md`.
- Spec: new `browser-engine`; `CHANGELOG.md` `Next (major)` entry.

## Decision log

- **2026-11-02** — Asked: Matthew asked WongStack to use WongOS's new browser, after WongOS shipped it, with no Canadian proxy.
- **2026-11-03** — Assumed: port only the general part of WongOS's change (server, install, pins, refs, login move, wiki); its proxy, language and email-browser parts stay in WongOS, because they need WongOS's own setup.
- **2026-11-04** — Asked: Matthew asked to add WongOS's general browsing rule that a test never copies a Facebook or Messenger login to another browser or network, without WongOS's account details.
- **2026-11-04** — Assumed: this plan was written at ship time from WongOS's archived plan and this branch's diff, because the branch came from WongOS with no plan folder.
