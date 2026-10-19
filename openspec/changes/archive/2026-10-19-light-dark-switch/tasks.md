# Tasks

## 1. Colours and the shared script

- [x] 1.1 Add shadcn's neutral `.dark { … }` set after `:root` in `app/src/index.css`, with `color-scheme: dark` on `.dark` and the comments updated (no longer "always light"). Add the same fallback `.dark` set to `look.css` between the token markers. Verify by reading both against `e6bd24e9:app/src/index.css`'s dark block.
- [x] 1.2 Extend `look.mjs` to read the `.dark` set with per-set fallback and emit `:root` then `.dark` in `lookCss`. Update `scripts/tests/look.test.mjs`: both sets come from the shipped file; a changed dark `--background` in a temp copy shows up under `.dark`; a missing dark set falls back. Verify with `node --test scripts/tests/look.test.mjs`.
- [x] 1.3 Write `.agents/skills/plan/references/theme.js` and the `.theme-toggle` rules in `look.css` per [design](design.md#one-script-for-the-standalone-pages). Verify with 2.x and 3.x tests.

## 2. The review page

- [x] 2.1 Inline `theme.js` into the built review page in `build-review.mjs` so the saved choice applies before paint; make room in the header for the button; check Pele's drawings use tokens. Update `scripts/tests/review.test.mjs`: the built page carries the dark set and the switch script, and still fetches nothing.
- [x] 2.2 Replace the dark-device browser case in `scripts/tests/review-browser.test.mjs` with: on a dark device with no saved choice the page is light; after clicking the switch the body, a card, and the bar are dark with contrast at least 4.5:1, the button's label says *Switch to light*; after a reload it stays dark; the button is at least 44px and doesn't overlap the header text on a phone viewport. Verify with the browser suite.

## 3. The private pages

- [x] 3.1 Serve `/theme.js` from `hand-over.mjs` and load it in the `<head>` of `keys-page.html`, `passwords-page.html`, `form-page.html`, and `view-page.html`; drop their fixed `color-scheme: light`. Leave the closed page light with no button. Verify in `scripts/tests/hand-over.test.mjs` that `/theme.js` is served, `/page.css` holds the `.dark` set and `.theme-toggle`, and each page links the script; and that any CSP still allows it.

## 4. The app

- [x] 4.1 Add the no-flash init to `app/index.html` per [design](design.md#no-flash-before-paint), checking the worker's headers for a CSP.
- [x] 4.2 Add `app/src/components/ThemeToggle.tsx` with `ThemeToggle.test.tsx` (starts light, click turns `.dark` on and saves, label and icon swap, a saved `dark` starts dark, a throwing storage still toggles), and place it in `Layout.tsx`'s bar beside *Sign out*. Update `app/src/style.test.ts` where it pins one colour set or `color-scheme: light`. Verify with `npm test` in `app/` (coverage stays 100%).

## 5. Docs and release

- [x] 5.1 Update `wiki/stack/mini-apps.md`'s shared-look paragraph (starts light, a switch top right turns any page dark and is remembered per site; a rebrand sets both sets) and `wiki/ux-principles.md`'s review-file line. Verify with the wiki checks.
- [x] 5.2 Add a `## Next (minor) — A light and dark switch on every page` entry at the top of `CHANGELOG.md` in plain words, with an **Updating** line: a rebranded `app/src/index.css` should add a `.dark` set, or it gets shadcn's neutral dark. Verify the payload checks pass.

## 6. Final checks

- [x] 6.1 Run `node scripts/payload-checks.mjs` and the changed suites, then take phone pictures of Home and a built review page in light and after switching to dark, and show them in the chat.
