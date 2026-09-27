## 1. Builder

- [x] 1.1 `build-review.mjs`: write each drawing as `<details class="drawing">` with a summary (show and hide labels, a note-count slot) and the frame, placed after `.body` as a direct child of `li.item`.

## 2. Kit

- [x] 2.1 Layout: `.item` grid; drawings span the card edge to edge; fold row styling; `.art` sized by font size with `em` padding and `em` pins; an Enlarge control in each frame.
- [x] 2.2 Inline drawings: fit by font size on open, render, and resize; a click on the frame or Enlarge opens the viewer; remove the inline zoom bar, transform, and JS pan.
- [x] 2.3 Full-screen viewer: borrow the `pre`, native scroll, − / Fit / + buttons, pinch by touch events, Ctrl or Cmd wheel, Close and Escape with focus return, body scroll lock.
- [x] 2.4 Notes: Note buttons from `render()`, `.add` stripped from labels, fold-row note counts, chip only for mouse on text and any pointer on viewer lines, reveal a folded drawing before scrolling to or editing a line.
- [x] 2.5 Docked editor: place from the visual viewport's top with a height cap, one-line location, shrinking textarea, one button row, Discard label.

## 3. Tests

- [x] 3.1 `scripts/tests/review.test.mjs`: drawings render inside a closed `details.drawing` that is a child of the item, with lines still note targets.
- [x] 3.2 `app/review/review.test.mjs`: touch Note opens the editor in one tap and a touch tap on text shows no chip; mouse chip still works; a line note through the viewer; fold, fit, full width, viewer zoom and scroll, Escape focus return; a 260px-tall phone keeps the whole editor visible; no sideways overflow from 320px.

## 4. Docs and release

- [x] 4.1 Update `wiki/ux-principles.md`, `.agents/skills/plan/SKILL.md`, and the `README.md` caption for Note buttons and full-screen drawings.
- [x] 4.2 Bump `VERSION` to 24.1.0, add the `CHANGELOG.md` entry, and run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`.
