# Design

## Context

See [proposal.md](proposal.md) for why. `hand-over.mjs open` runs `agent-browser set viewport 1280 720` in `prepareBrowser`, so the live picture's size and the page's agree (the headless 1280×577 bug in memory). The hand-over page draws each `frame` onto a canvas sized to the frame's bitmap and maps a tap with `toPage`, by the bitmap's own pixels. The watcher's page server already runs keyed, serialized agent-browser calls for the field list (`fieldRoutes`).

Checked on 2026-09-29 with agent-browser 0.38.1 in a named session: after `set viewport 390 600`, `innerWidth × innerHeight` is `390x600` and the stream's frames are 390×600 JPEGs with `deviceWidth: 390`. So a resize mid-hand-over reaches the picture with no stream restart, and `toPage` needs no change.

## Goals / Non-Goals

**Goals:**
- A link opened in a narrow window shows the site's own narrow layout, sized to the picture's box.
- The agent gets its 1280×720 page back however the link ends.

**Non-Goals:**
- Any change to the page's layout, wording, or controls around the picture.
- Phone emulation beyond size: no mobile user agent, touch events, or 2× pixel density.
- A way for the agent to pick the size: it follows the person's window.

## Decisions

### The page asks for its size; the watcher only clamps and applies it

A pure `wantedSize(window)` in `hand-over-page.mjs` takes `{ width, height }` of the picture's box (`canvas` client width, window `innerHeight`) and returns:

- **width < 800:** `{ width: boxWidth, height: max(400, round(0.6 × innerHeight)) }`.
- **otherwise:** `{ width: 1280, height: 720 }`.

The page posts it to `POST /viewport` once on load, and again, debounced 300 ms, on a `resize` whose width differs from the last one sent. A height-only change (the phone keyboard) sends nothing, so the site never reflows mid-typing.

The watcher's `/viewport` takes `{ width, height }`, needs the `x-hand-over-key` header like the field routes, rejects non-integers with 400, clamps width to 320–1280 and height to 400–1280, and runs `set viewport <w> <h>` through the same serial queue as the field routes. It replies `{ width, height }` as applied. The picture's CSS `max-height: 75vh` stays; 60% of the height fits under it with no bars.

- *Rejected:* telling a phone by user agent or `pointer: coarse`, because width is what makes a desktop page unreadable, and it treats a narrow laptop window the same.
- *Rejected:* `agent-browser set device "iPhone 12"`, because it also changes the user agent, so a site may redirect to a different mobile address mid-login and break an `--until` finish.
- *Rejected:* a 2× scale for a sharper picture, because frames then come at device pixels and every tap would land at twice the spot unless `toPage` divided by the scale; 1× is readable, and a later change can add it.

### The watcher puts 1280×720 back on every ending

`teardown` runs `set viewport 1280 720` before it writes `result.json`, so `wait` returns only once the page is desktop-sized again. `teardown` covers done, timeout, close, a signal, a failed `open`, and `recoverStale`, so a watcher that died also restores it. It restores unconditionally: `open` already set 1280×720, so the call is a no-op when no phone asked.

### Last window wins

Two windows on one link (a phone, then a laptop) each post their size on load; the last post applies. A wide window posting 1280×720 is what lets a laptop take back a page a phone resized.

## Risks / Trade-offs

- **A site that lays out by device, not width, stays desktop-like.** → Rare; its picture is still full-width and zoomable as before.
- **The resize reflows the page once as the link opens.** → It happens before the person acts; a half-filled form keeps its values, since a resize doesn't reload the page.
- **The agent's snapshot after the hand-over** runs on the restored 1280×720 page, as today.
