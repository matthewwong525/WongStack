# Tasks

## 1. Refs in embedded frames

- [x] 1.1 In `.agents/skills/browser/scripts/browse.mjs`, copy camofox 1.18.1's interactive roles and `SKIP_PATTERNS` beside `CAMOFOX`, naming their sources, and add a pure exported `relabel(snapshot, refsCount)`: unchanged with no appended `- iframe "<label>":` block; else camofox's walk renumbered `e1…`; on a count mismatch or past 500, camofox's marks kept but removed from `role:name` keys in more than one section, plus the one `- note:` line. Verify with unit tests in `scripts/tests/browse.test.mjs` on the 2026-10-21 shape (main *Email*/*Full name*, Link frame *Email*/*Full name*, a card frame): each line's printed id equals its place in camofox's order; a name matching a date pattern gets no id; a page with no frame block is byte-identical; a mismatch drops only the shared names and adds the note.
- [x] 1.2 Use `relabel` in the client's `read()` after chunks join, passing the response's `refsCount`, so `snapshot`, `get value`, and hand-over's reads all see it. Teach `scripts/tests/fixtures/fake-camofox-server.mjs` to return `refsCount`. Verify with a test that `browse.mjs snapshot` on a frame page prints the renumbered refs and `get value e<frame-ref>` reads the frame box's text.

## 2. Tick boxes

- [x] 2.1 `snapshot()` writes the tab file's `refs` (check-like roles only, with `[checked]`); `click()` verifies a check-like ref or CSS selector, retries with keyboard-mode `type` `""` then `press Space`, and throws `the box did not change` when still unchanged. Verify with tests against the fake camofox: a box that ticks on click makes one click and one read; a box that ignores the click but takes Space ends ticked with calls `click, snapshot, type, press, snapshot`; a box nothing ticks prints `BROWSE_ERROR=the box did not change` and exits 1; a button click makes only `POST /tabs/:tab/click`; a tab file without `refs` clicks as today.

## 3. Docs

- [x] 3.1 `wiki/development/browsing.md`: under *Saved browser logins*, one line that same-named boxes in a payment box get their own refs, or none with a note when unsure, and that a tick-box click is read back and retried with Space. In `browse.mjs`, the `CAMOFOX` pin's comment says a move's real-camofox check also compares the two copied lists. Verify with `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check`.
- [x] 3.2 Add a `## Next (patch) — The browser types into the right box` entry at the top of `CHANGELOG.md`'s entries, in plain words. Verify it sits above `43.17.0`.

## 4. Verification

- [x] 4.1 On a real camofox, serve a local page with a main *Email* box, a cross-origin iframe (a second local port) holding *Email* and *Full name* boxes, and a React-style checkbox under a covering label. Type into each printed ref and confirm each lands in its own box with `get value`; click the checkbox by ref and confirm `[checked]`. Confirm the copied lists equal the installed `lib/interactive-roles.js` and `server.js` `SKIP_PATTERNS`.
- [x] 4.2 Run `node --test scripts/tests/browse.test.mjs`, `node .github/scripts/checks.mjs --worktree`, and `openspec validate browser-frame-refs-and-checkboxes --strict --no-interactive`, then `/save` for CI.
- [x] 4.3 Record a memory finding for camofox's makers: cross-frame `role:name:nth` key collision in `/snapshot`'s annotation (both routes), and clicks that return ok without toggling a checkbox. Post nothing; ask Matthew later.
