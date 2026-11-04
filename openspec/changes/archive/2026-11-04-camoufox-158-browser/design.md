# Design

## Context

`browse.mjs` drove `@askjo/camofox-browser`, a REST server that launches Camoufox through `camoufox-js`. That library runs builds only up to Firefox 152, and it reads the reported version from the installed default build, so a forced newer build still told sites the old version. The official Python library `camoufox` 0.5.9 pins `v158.0.1-beta.41` and makes the disguise for it, but its own server can't keep a persistent profile. WongOS shipped this design first (its archived change `2026-11-03-camoufox-158-browser`).

## Goals / Non-Goals

**Goals:** run the pinned build with its own disguise and true version; keep every `browse.mjs` command, output line, ref format and hand-over link; one profile folder on disk with one kept identity; move old logins once, Meta left out.

**Non-Goals:** Chrome or Lightpanda; a proxy or country choice; new commands.

## Decisions

1. **Python makes the launch config; Node runs the browser.** `launch-config.py` calls `camoufox.utils.launch_options(...)` and prints JSON. `browser-server.mjs` passes it to `firefox.launchPersistentContext` from the Playwright driver that the Python `playwright` package ships, so the driver matches the build.
2. **`browser-server.mjs` keeps camofox's routes and shapes**, so `browse.mjs` and the hand-over scripts change only where they install, start or stop. It listens on `127.0.0.1` behind the existing key, one page per `userId` + `sessionKey`.
3. **Refs come from `ariaSnapshot()`** by camofox's rules, in `refs.mjs`, with credit to camofox (MIT).
4. **Headed on Xvfb on Linux, no window on a Mac.** The server writes `DISPLAY` to `server.json` for the live view.
5. **Pins.** `CAMOUFOX = { python: '0.5.9', build: 'v158.0.1-beta.41' }`. A start refuses a library and build that don't match; the old build stays until a new one starts. `/update-dependencies` surveys PyPI and hands a newer library to the person.
6. **One kept identity**, made once and kept in the profile's state, keyed by the pins, so sites see the same browser after a restart.
7. **Login move, once.** `login-move.mjs` copies cookies and `localStorage` from the old camofox storage state, except Meta's domains, then writes a `migrated` marker.

## Risks / Trade-offs

- **Python 3.10+ is a new need** for installs that browse. `required-tools.md` names it, and `install` stops with `BROWSE_NEEDS=python`.
- **Rebuilt routes can miss an edge.** The browse, browser-server, refs, launch-config, login-move and hand-over tests cover the contract; WongOS ran the live checks.
- **Meta can lock an account.** No Meta login is copied, and the browsing page forbids copying one for a test.
