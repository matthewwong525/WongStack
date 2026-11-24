## 1. Review kit

- [x] 1.1 Short top in `review-kit.html`: `h1`, the `.kind` · `.note-count` line, a one-row `.jump`; the `.eyebrow` goes, the preview writes its name into `.kind`; the hint moves into `#notes` and shows only while it is empty. Verify the short-top test in `review.test.mjs` and the preview test.
- [x] 1.2 Many notes on one part: the `-more-k` id in `where()`, `find()` and `nextId()`; `noteFor()` for *Note*, *+ Note* and the chip; *+ Note* beside a sent pin. Verify the two new tests in `review-browser.test.mjs`.

## 2. Tests

- [x] 2.1 Point the browser tests that read `header .hint` or `.eyebrow` at the new places, and add a phone check that *Why* starts in the top third. Verify `node --test scripts/tests/review*.test.mjs scripts/tests/preview-review.test.mjs` with `CHROME_PATH` set.

## 3. Docs and release

- [x] 3.1 `wiki/review-pages.md`: the top and the sent-note rule. Verify `node scripts/check-payload-links.mjs`.
- [x] 3.2 Add the `## Next (minor)` entry to `CHANGELOG.md`, and raise the loop module's `VERSION` to 3.5.0. Verify `node scripts/check-module-versions.mjs`.

## 4. Checks

- [x] 4.1 Run `node scripts/payload-checks.mjs`; it passes.
