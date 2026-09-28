# Tasks

## 1. Hand-over tool (`hand-over.mjs`)

- [x] 1.1 Add the `FIELD_SCAN` constant by the design (top document, DOM order, skip rules, 40-field cap, label order, per-field selector) and a `scanFields()` that runs it through `agent-browser eval --json` and keeps `ref → selector` in memory; verify a test with a fake agent-browser gets the fields back and that `FIELD_SCAN` contains none of `.value`, `.checked`, `.selectedIndex`, `.selected`, `.defaultValue`.
- [x] 1.2 Add the exported pure `autofillToken(field)` and the box `type` and `inputmode` it implies, by the design's order and table; verify a table test covering each token, a page `autocomplete` winning (with `section-*`/`billing` prefixes and `off` ignored), the input-type fallback, and ekashu-style names such as `ekashu_card_number` and an expiry month and year select.
- [x] 1.3 Add the keyed `GET /fields`, `POST /focus`, `POST /select`, and `POST /check` routes to `servePage` (header key via `keyMatches`, 4 KB JSON bodies, `ref` from the current scan only, `select` values from the scanned options, one serial command queue, 409 on a stale `ref`, no logging); verify tests for 403 without the key, 400 on a bad body or unknown option, 409 on a stale ref, and the exact agent-browser calls each route records.
- [x] 1.4 Update the file's header comment to say what the watcher now reads (field labels, kinds, choices, never values) and sends (focus, clear, select, check); verify it matches the routes by reading it back.

## 2. Hand-over page (`hand-over-page.mjs`, `hand-over-page.html`)

- [x] 2.1 Render the field list as a `<form id="fields" autocomplete="on">` of `<label for>` and control rows: text boxes with the token's `autocomplete`, `name`, `type`, and `inputmode`; selects with an empty *Choose…* option then the page's options; checkboxes; verify by the live check in 4.1 that the rows match the fixture page.
- [x] 2.2 Add the exported pure `sendPlan(sent, now, focused)` and a page-level serial queue: append-only sends the new characters as key presses; anything else calls `/focus` then presses every character; Enter presses Enter; a tap or click on the picture forgets the focused field; verify unit tests for append, deletion, a whole value dropped in, and an unfocused field.
- [x] 2.3 Send a select's `change` to `/select` and a checkbox's to `/check`, then rescan at once; poll `/fields` every 3 seconds while visible, redraw only on a new `signature`, carry box contents over by `ref` and label, retry once after a 409 then show *Tap it on the page instead*, and stop when the link closes; verify in the live check that picking a month makes the year dropdown appear.
- [x] 2.4 Move the *Type here* box and its keys into a `<details>` named *Other typing*, open by default only when the list is empty, with the line *No fields found on this page. Tap one above and type here.*; verify the existing `typedKeys` and `toPage` tests still pass and the live check shows both states.

## 3. Docs and release

- [x] 3.1 Update `wiki/development/home.md` *Hand the browser over*: the field list with dropdowns, password-manager fill, *Other typing* as the fallback, and *Is the link safe?* saying the page reads field labels and choices but never what's in them, and the agent still reads only the address or a count; verify `node scripts/check-payload-links.mjs` passes.
- [x] 3.2 Add a `## Next (minor) — Fill a handed-over form from a list of its fields` entry at the top of `CHANGELOG.md` in plain words, with **Updating.** *Nothing to do by hand.*; verify `node scripts/check-openspec-config.mjs` and `node scripts/measure-context.mjs --check` pass.

## 4. Integration

- [x] 4.1 Live check: serve a local card-form fixture (card number, expiry month and year selects with the year disabled until a month is picked, security code, a checkbox), run `hand-over.mjs open --local`, and drive the hand-over page from a second agent-browser session emulating an iPhone: fill the boxes, pick 03 and 2028, tick the box; then `close` and confirm with agent-browser that the fixture's fields hold those values and that no recorded agent-browser call held the typed card number. Repeat the page open over a real quick tunnel.
- [ ] 4.2 Run `/save` so CI runs `npm test` on the branch; verify the gate passes, and record open memory threads for a real phone hand-over and a real 1Password fill of the list.
