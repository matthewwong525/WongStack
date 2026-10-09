# Browse through a local proxy automatically

**Status:** ready
**Branch:** track-ups-package
**Open questions:** none

## Why

In our UPS test, the page loaded through a local forwarding proxy and failed without it, on the same connection with WARP off. Make that setup automatic for people installing WongStack, without another account or VPN.

## What Changes

- **Personal browsing starts its own local proxy.** There is nothing extra to install or configure after the browser is installed.
  ```text
  Personal browser
         │
         ▼
    Local proxy
         │  same computer's connection
         ▼
       Website
  ```
- The proxy uses the computer running the assistant. A Canadian laptop uses its Canadian connection; a Finland server uses its Finland connection. It does not depend on Paseo's relay or WARP, or choose a country.
- Logins and separate task pages stay as they are. An already-running browser keeps its pages until the person stops it; its next start uses the proxy.
- The proxy keeps no browsing logs and does not decrypt secure website traffic. A startup failure is reported rather than silently opening a browser without the proxy.

Non-goals: a US proxy service, VPN installation, using the phone's connection, changes to preview browsing, or a promise that every blocked site will load.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: personal browsing automatically starts a local forwarding proxy using the host's own network, preserving privacy and existing sessions.

## Impact

The browser helper and its tests, the browsing wiki, and the payload changelog. Use Node builtins and the existing pinned Camofox package; no new dependencies or credentials. The browser skill directory already ships through the payload manifest.

## Decision log

- **2026-10-09** — Asked whether future browsing should use the tested local proxy or a supplied US proxy → the person asked for our recommendation for installs.
- **2026-10-09** — Assumed: use an automatically managed local forwarder on the installer's own connection, because the successful test needed no US exit and an upstream service would add an account and setup.
- **2026-10-09** — Assumed: the local proxy needs no Paseo relay, because Paseo's documented relay connects the phone to the assistant's computer and our tested forwarder uses the computer's own network.
- **2026-10-09** — Assumed: retain the person's earlier `/ship` authorization and exclude WARP, because the later questions clarify the same requested default.
- **2026-10-09** — Assumed: retain the requested local default despite the final UPS tracking error, because real Camofox proved proxy routing with WARP off and listener shutdown, and the agreed scope does not promise universal site access. The initial UPS capture was still loading; the settled observation refused tracking. No shared browser was restarted.
- **2026-10-09** — Build verification timing: all forwarding, launcher and fixture tests are authored with source and docs before the required local checks; isolated real-browser acceptance remains the parent's final check.
- **2026-10-09** — Local pre-check: the app's 415 tests and payload release checks passed. The first run found the wiki word cap and inconsistent parser-error response text; both were repaired. The prescribed wiki/script-suite rerun ended `LOCAL_CHECKS=pass`. Shellcheck was unavailable locally and remains in CI; no shell files changed. Live browser acceptance remains task 3.2.
- **2026-10-09** — Assumed: checkpoint the exact archived handoff after merging current main, because `/ship` retains both shipped live-view behavior and this proxy change. The combined app's 361 tests and payload script suite passed; the retired-name check caught an incidental fragment in one test URL, reworded without changing the tested behavior or weakening the check. Real-browser acceptance is recorded in task 3.2; UPS remained refused in its settled capture.
