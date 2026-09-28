# Type into the agent's browser during a hand-over

**Status:** ready-to-ship
**Branch:** fast-crab
**Open questions:** none

## Why

When the agent hands you its browser, you can see the page but not use it. A WongOS agent paying a parking ticket handed over the card form: the first link showed a blank page, and on the second, clicking the card box did nothing and nothing could be typed. The hand-over exists so you can enter a password or a card, so right now it fails at its one job.

## What Changes

- **Clicks land where you tap.** The picture you saw was drawn at one size while your clicks were worked out at another, so every click landed about a quarter lower than you aimed and missed the box. The agent now fixes the page's size before it sends the link, so the picture and your clicks agree.
- **A hand-over page that works on a phone.** The link now opens a small page of our own instead of agent-browser's control panel. It shows the live page, and under it a *Type here* box. Tap a field on the live page, then tap the box: your phone's keyboard opens, and what you type goes into that field. On a laptop you can also just click and type on the live page.
  ```text
  ┌──────────────────────────┐
  │ City of Markham payment  │
  │ ┌──────────────────────┐ │
  │ │ Card number [______] │ │
  │ │ Expiry      [__/__]  │ │
  │ │        [ Pay ]       │ │
  │ └──────────────────────┘ │
  │  tap a field above, then │
  │ ┌──────────────────────┐ │
  │ │ Type here…           │ │
  │ └──────────────────────┘ │
  │  ⌫   Tab   Enter         │
  └──────────────────────────┘
  ```
- **You land on the right tab.** Before sending the link, the agent closes blank tabs and brings the real page to the front, so the link never opens on an empty page.
- **The link shows only the task.** agent-browser's panel also showed every other browser session on the computer and a chat box. The new page shows only the page you're handed. The link stays as safe as before: a new random address and a secret key each time, closed when you're past the step, when you say *done*, or after 10 minutes.

Non-goals: no pinch-free phone layout of the site itself (the page keeps its desktop size, and you can zoom the picture); no copy and paste into the page; no change to when the agent hands over or how it knows you're done.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: a hand-over link opens a page where the person can click and type into the handed page from a phone or a computer, on the page the task was using.

## Impact

- `.agents/skills/verify/scripts/hand-over.mjs`: `open` pins the viewport, tidies tabs, and starts our own page server in the detached watcher instead of `agent-browser dashboard`; the tunnel points at that server.
- New `.agents/skills/verify/scripts/hand-over-page.html`: the hand-over page (live view, pointer and key forwarding, *Type here* box).
- `scripts/tests/hand-over.test.mjs`: tab tidying, coordinate mapping, key translation, the key check on the page server, and the live-feed proxy.
- `wiki/development/home.md` *Hand the browser over*: the new page, and *Is the link safe?* no longer mentions other sessions.
- `openspec/specs/browser-logins/spec.md` via a delta.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-28** — Asked how the person should type from a phone → chose our own hand-over page with a real text box, over patching agent-browser's panel or telling phone users to switch to a laptop.
- **2026-09-28** — Assumed: the click bug is agent-browser 0.38.1's, because its headless page is 1280×577 while its live feed and panel report 1280×720; `agent-browser set viewport 1280 720` made clicks and typing work locally and over a real tunnel, so `open` runs it every time.
- **2026-09-28** — Assumed: the tunnel, origin, and cookie checks were not the cause, because mouse and key events reached the page over a real `trycloudflare.com` link once the size matched.
- **2026-09-28** — Assumed: the page maps clicks from the frame's own picture size, not the size the feed reports, so a future size mismatch can't send clicks astray again.
- **2026-09-28** — Assumed: blank tabs (`about:blank`, a new-tab page, no address) are closed only when a real page is open, and the newest real page becomes the front tab, because the agent's page is the one it last opened.
- **2026-09-28** — Assumed: a minor release, because the hand-over gains phone typing and a new page.
- **2026-09-28** — Assumed: the agent-browser click bug is not reported upstream in this change; the closing reply offers it, because filing an issue is an outward action.
- **2026-09-28** — Assumed: a real phone test stays an open memory thread written at `/save`, because no phone is reachable from here; the build checks an emulated phone over a real tunnel.
- **2026-09-28** — Built: `toPage` also handles a picture with bars around it (the canvas scaled to fit), and ignores a tap on a bar; with no bars it is the design's formula.
- **2026-09-28** — Built: the watcher calls agent-browser without blocking, so its 2-second checks never freeze the page server it now hosts.
- **2026-09-28** — Built: `state.json`, which now holds the key, is written readable by its owner only.
- **2026-09-28** — Built: the live check passed through real quick tunnels: at the default 1280×577 with two blank tabs in front, `open` resized the page and brought the card page forward; an emulated iPhone 14 tapped the card box and typed `4111 1111 1111` through *Type here*; a desktop-sized viewer clicked and typed on the view; after `close` the link answered 530 and the page said the link had closed.
- **2026-09-28** — Distilled: no repeatable fact; the change has no memory facts, and the viewport quirk is handled in `hand-over.mjs`, whose header says why.
- **2026-09-28** — Archived and checkpointed for merge by `/ship` as 26.25.0, after merging `main` (26.24.0).
