# Tasks

## 1. The page picture

- [x] 1.1 Add a full-page option to `browse.mjs`'s `screenshot()` (camofox `fullPage=true`) and a `screenshot --full-page` flag; cover the query string in `scripts/tests/browse.test.mjs`.
- [x] 1.2 In `hand-over.mjs open`, take the picture after `pageFault` and before the tunnel for `--form`, and for `--passwords --site` when `--session`'s page is on the site's host; write `picture.png` (0600) in the hand-over folder, remove it in `clearLink`, and carry on with no picture when the shot fails. Let `--session` go with `--passwords`. Cover form, matching host, other host, no page, and failed shot in `scripts/tests/hand-over.test.mjs`.
- [x] 1.3 Serve a key-guarded `GET /picture` for the form and password modes, and say whether a picture exists in `/form` and the password page's start; cover 403 without the key, 404 with no picture, and `no-store` in `hand-over.test.mjs`.
- [x] 1.4 Write `picture-view.mjs` (thumbnail button, full-screen dialog, fit to width, pinch, drag, `+`/`−` to 4×, Close and Escape returning focus), serve it at `/picture-view.mjs`, and style it in `private-page.css` for light and dark; cover open, zoom steps, and close in `scripts/tests/form-page.test.mjs`.
- [x] 1.5 Show the picture above the boxes in `form-page.html`/`.mjs` and under the promise line in `passwords-page.html`/`.mjs`, with nothing drawn when there is none; cover both in `form-page.test.mjs` and `scripts/tests/passwords-page.test.mjs`.

## 2. The password page order

- [x] 2.1 Move the drop box, file input, file error, and its hint below `#add-form` in `passwords-page.html` with the *Or drop your password export here, or tap to pick it* wording, and drop the reorder from `prefill`; update `passwords-page.test.mjs` to check the order with and without a site.

## 3. Saved details

- [x] 3.1 Write `details.mjs` (read, atomic 0600 write, `list`, `save`, `forget`, hints, kind matching, dropdown normalising); cover in a new `scripts/tests/details.test.mjs`, including that `list` never prints a private value and a repeat save replaces.
- [x] 3.2 Add *Save for next time* (unticked) to `form-page.html`/`.mjs`, accept `save` in `/send` via `form.mjs`, and save a private set only on `done`; carry the saved name and hint in the receipt and `wait`'s output. Cover save-on-done, nothing on `not-accepted`, and a bad `save` → 400 in `scripts/tests/form.test.mjs` and `form-page.test.mjs`.
- [x] 3.3 Add `hand-over.mjs fill --form --use --until|--until-gone [--session]`, reusing `sendForm` with values by kind, the private-link lock, and `missing` before any typing; cover done, not-accepted with boxes emptied, missing kind, unmatched dropdown, and no value in output in `hand-over.test.mjs`.
- [x] 3.4 Pick a dropdown by its choice's text in `form.mjs`'s `fillField`, since camofox waits out its 30 s timeout on a text miss before it tries the value, and read a selector dropdown's picked text in `browse.mjs`'s `value()`, as a ref's snapshot does; cover in `form.test.mjs`, `hand-over.test.mjs`, and `browse.test.mjs`.
- [x] 3.5 Register a dropdown's put-back before its pick, so a pick that timed out yet landed is undone, and put a placeholder back by its text; cover in `form.test.mjs` and `hand-over.test.mjs`.
- [x] 3.6 Keep the view's centre still on `+`/`−` and the fingers' midpoint on a pinch in `picture-view.mjs`; cover in `form-page.test.mjs`.

## 4. Docs and release

- [x] 4.1 Move the private form procedure to a new `wiki/development/private-form.md` (the picture and save tick; a *Saved details* section owning the chat asks, `fill`, and forgetting), leaving `wiki/development/browsing.md` a short stub that links there; update `wiki/development/passwords.md` (picture, `--session`, page order), and `.agents/skills/hand-over/SKILL.md` (`fill`, `details.mjs`, never read `details.json`); run the wiki checks.
- [x] 4.2 Add a `## Next (minor) — See the page, and save what you fill` entry to `CHANGELOG.md`.

## 5. Verification

- [x] 5.1 Run the payload and script tests locally as a pre-check and fix failures.
- [x] 5.2 Walk it for real: open a private form and a one-site password link, zoom the picture, tick *Save for next time* on a pretend card page, then pay again with *Use card ending 4242* through `fill`. Pinch on a phone waits for the next real form, as Matthew chose at publish.
