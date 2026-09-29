# Tasks

## 1. Hand-over page

- [x] 1.1 Add and export a pure `wantedSize({ boxWidth, innerHeight })` to `hand-over-page.mjs`: under 800 wide, the box width by `max(400, round(0.6 × innerHeight))`; else 1280×720.
- [x] 1.2 Post it to `/viewport` with the key header on load, and again, debounced 300 ms, on a `resize` whose width changed; a height-only resize sends nothing. Update the file's header comment.

## 2. Watcher

- [x] 2.1 Add a keyed `POST /viewport` route in `hand-over.mjs`: 403 without the key, 400 unless width and height are integers, clamp to 320–1280 × 400–1280, run `set viewport <w> <h>` through the field routes' serial queue, reply the applied size.
- [x] 2.2 Make `teardown` run `set viewport 1280 720` before writing `result.json`; update the header comment to name the route and the restore.

## 3. Tests

- [x] 3.1 In `scripts/tests/hand-over.test.mjs`: `/viewport` refuses without the key and on a bad body, clamps 200×90000 to 320×1280, and records `set viewport 390 600` for a phone's size.
- [x] 3.2 Each ending (done, timeout, close) records `set viewport 1280 720` after any phone size, before the result.
- [x] 3.3 `wantedSize` gives the box width for a 390-wide window, 1280×720 at 800 and above, and at least 400 tall on a short window.

## 4. Docs and release

- [x] 4.1 `wiki/development/browsing.md` *Hand the browser over*: one line that a narrow window gets the site's phone layout, back to desktop size when the link closes.
- [x] 4.2 Add a `## Next (minor) — A handed-over page fits your phone` entry to `CHANGELOG.md`.
- [x] 4.3 Live check before `/save`: a real hand-over opened at a phone width in a named agent-browser session shows a 390-wide page, a tap lands where aimed, and `close` puts 1280×720 back.
