# Make the browser look American

**Status:** parked
**Branch:** us-proxy-access
**Open questions:** none

## Why

The assistant's computer sits in Germany, so websites show the browser German pages: GoDaddy's sign-in came up as *Anmelden*. You want sites to treat the browser as American, without asking each time and without paying for a US address.

## What Changes

- **The browser looks American by default.** From its next start, it speaks US English and keeps US Eastern time, with nothing to ask for. Sites still see a German address, so a site that sorts by address may stay German, and a refused sign-in may still be refused.
  ```mermaid
  flowchart TD
    next["next browser start"]
    next --> us["US English, Eastern time"]
    us --> site["site sees German address"]
  ```
- **Nothing stops under you.** A browser already open keeps its pages and logins. The agent asks before restarting it, since a restart closes other chats' pages.
- **Say *look local* to switch it off.** The browser goes back to matching the computer's own place at its next start; *look American* switches it back.
- **Every install gets it, this one and new ones.** A browser already running changes at its next start.

Non-goals: a real US address (a paid US home address or a US server with WARP), choosing a city, or a promise that any refused site lets the browser in.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: personal browsing starts with a US look (`en-US`, `America/New_York`) by default, without the local forwarding proxy; a saved local look keeps today's proxy.

## Impact

`.agents/skills/browser/scripts/browse.mjs` and `server.mjs`, `scripts/tests/browse.test.mjs` and its fake camofox fixture, `wiki/development/browsing.md`, `.agents/skills/browser/SKILL.md`, and the payload changelog. No camofox code change, no new dependency, account, or key.

## Decision log

- **2026-10-21** — Asked which way to get the browser a US address: a paid US home address, a small US server with WARP, faking US in the browser, or not now → chose faking US in the browser.
- **2026-10-21** — Assumed: free WARP can't be pointed at the US, because consumer WARP exits at the nearest Cloudflare site (this host's exit is Leipzig) and offers no country choice.
- **2026-10-21** — Assumed: the US look starts the browser without the local forwarding proxy, because camofox ignores a set language and clock whenever any proxy is set and matches them to the exit address instead (`lib/browser-identity.js`), and camofox's code stays unpatched as Matthew prefers.
- **2026-10-21** — Assumed: US Eastern time (`America/New_York`) and `en-US`, because Eastern is the most common US clock and the closest to Toronto.
- **2026-10-21** — Assumed: the look is a per-computer setting kept beside the browser's logins, because one browser serves every task on the computer.
- **2026-10-21** — Asked, mid-build, whether the US look should need asking for → chose US by default for every install, with no request ("it should by default look american; we shouldn't need to tell it to"); `look local` opts out.
- **2026-10-21** — Assumed: a changed look waits for the next start, because stopping the browser closes other tasks' pages and the agent stops it only when asked.
- **2026-10-21** — Asked, after the US-by-default build passed its local checks, whether to go ahead → Matthew chose not to go forward with this plan. Saved parked and unpublished at /close: tasks 5.2 (restart the real browser and check a real page) and 5.3 (publish) stay unticked. Pick it up with `/continue browser-us-look` only if he asks again.
