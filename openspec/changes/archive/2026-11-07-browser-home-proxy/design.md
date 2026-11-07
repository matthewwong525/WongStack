# Design

## Context

WongStack 50.5 made the forwarder a per-computer setting (`~/.wong-stack/browser-settings.json`, `proxy`), started in `browser-server.mjs` `startProxy(proxySetting())`. Its forwarder dials every site from this computer. WongOS, ClaymooApp and Relay Everything still run the 48.0-era forwarder with ordered routes; Relay Everything's copy (`/root/relay-ring/.agents/skills/browser/scripts/{forwarder,server}.mjs`, `wiki/development/browser-proxy.md`) is already generic. `launch-config.py` already asks for the country through `--proxy`, so the language and time zone follow the exit address once the forwarder chains.

The shared browser records its start in `~/.wong-stack/camoufox/server.json`; any repo's `browse.mjs` reuses a running server, so the repo that starts it picks the route.

## Goals / Non-Goals

**Goals:** WongStack's forwarder takes the saved first and upstream lines when the proxy setting is on; `status` names the route; downstream repos can drop their local forwarder forks at their next `/wong-sync`.

**Non-Goals:** ClaymooApp's sidecar route (its own sync decides whether to keep it behind the first proxy); `network off`; `BROWSE_LANGUAGE=`.

## Decisions

- **Port Relay Everything's forwarder, not WongOS's.** Same logic, no named home or account. Drop the `extra`/`language` field from `network.json`; `server.json` already has `locale`.
- **Line resolution in a new `proxy-lines.mjs`.** WongStack has no `server.mjs` (its server is `browser-server.mjs`), and a name that says what it holds avoids a clash with downstream forks during sync. Keep `parseUpstream`, `parseFirst`, `repoLine`, `resolveUpstream`, `resolveFirst`, the key names, and the four file paths (including the old `camofox` fallbacks) unchanged, so this computer's saved lines work with no step.
- **Lines only while the setting is on.** `startProxy(on)` resolves the lines only when `on`; off returns no forwarder as today. Alternative, a saved line turning routing on by itself, was rejected: two switches for one thing.
- **A failed first proxy is still a started proxy.** The routes fail per connection, never at start, so the existing rule (a forwarder that cannot listen stops the start) is unchanged.
- **`status` reads `network.json` against `server.json`'s pid**, as Relay Everything's `networkLine` does: a state from another start, or a browser that older code started, reads as `direct (no upstream proxy)`.

## Risks / Trade-offs

- [A downstream repo with an older forwarder starts the browser before it syncs] → It already routes the same way; only ClaymooApp differs, until its sync.
- [Plain requests are buffered (16 MB cap) to allow a retry] → Same cap as downstream; secure traffic, the bulk, streams through CONNECT.
- [A line in a repo `.env` overwrites the computer file] → Intended, so a rotated key spreads; documented on the new page.

## Migration Plan

Ship as `minor`. On this computer: after release, with the person's yes, stop the browser; the next errand starts it on the home proxy, `en-CA`. Then `/wong-sync` WongOS, ClaymooApp and Relay Everything, each in its own workspace, retiring their local forwarder forks. Rollback: `browse.mjs proxy off`.
