# Phone-friendly review page

**Status:** ready-to-ship
**Branch:** improve-review-mobile
**Open questions:** none

## Why

The review page is hard to use on an iPhone. Adding a note takes two taps, and the second one is easy to miss. Drawings are squeezed into a narrow column. Dragging a zoomed drawing opens the Paseo sidebar instead of moving the drawing. When the keyboard opens, the top of the note box is cut off.

## What Changes

- **A Note button on everything you can comment on.** Every paragraph, item, and decision shows a small "Note" button. One tap opens the note box. Once a note exists, its number takes the button's place. On a computer, clicking the text still offers "Add note" as before.
  ```text
  ┌──────────────────────────────────┐
  │ 2  The wiki says each thing      │
  │    once. About 3,000 words go.   │
  │                         [+ Note] │
  ├──────────────────────────────────┤
  │ ▸ Show drawing                   │
  └──────────────────────────────────┘
  ```
- **Drawings fold away and use the full width.** Each drawing starts folded under its item as a "Show drawing" row. Opened, it spans the whole card and scrolls with the page, with no zoom buttons in the way. The row says how many notes sit on the drawing, so a folded note is never lost.
- **Tap a drawing to see it full screen.** The drawing fills the screen, bigger than on the page. Pinch or use + and − to zoom, and move it with your finger, the way you scroll any page. Tap a line to note it. Close takes you back where you were.
  ```text
  ┌──────────────────────────────────┐
  │ Fit · 120%    [−] [Fit] [+] Close│
  ├──────────────────────────────────┤
  │ before            after          │
  │ ship ── rule      ship ─┐        │
  │ save ── rule      save ─┼▶ one   │
  │ apply ─ rule      apply ┘  rule  │
  │                                  │
  │   drag to move · pinch to zoom   │
  └──────────────────────────────────┘
  ```
- **Moving a drawing no longer opens the sidebar.** The full-screen view moves the drawing with the phone's own scrolling, so the app should no longer mistake your drag for a swipe. This needs a check on a real iPhone.
- **The note box always fits above the keyboard.** It is shorter: the "where" line is one line, and the buttons sit in one row. It never rises past the top of the visible screen, however little room the keyboard leaves.

**Non-goals:** No change to what gets copied, how notes are saved, or the page's order. Already-shipped review pages stay as they are. No change to the Paseo app itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: a visible Note button replaces tap-then-chip on touch; drawings fold, span the card, and open a full-screen viewer that owns zoom and pan; the docked editor stays inside the visual viewport.

## Impact

- **Kit:** `.agents/skills/plan/references/review-kit.html` (layout, Note buttons, folded drawings, full-screen viewer, docked editor placement).
- **Builder:** `.agents/skills/plan/scripts/build-review.mjs` (drawing markup: a `<details>` outside the item's text column).
- **Tests:** `scripts/tests/review.test.mjs`, `app/review/review.test.mjs`.
- **Docs:** `wiki/ux-principles.md`, `.agents/skills/plan/SKILL.md`, `README.md` caption.
- **Release:** `VERSION` 25.1.0 and `CHANGELOG.md`. Active changes pick the new kit up on their next page build; archived pages are not rebuilt.

## Decision log

- **2026-09-26** — Asked how a phone tap should start a note → chose a visible Note button on each item, paragraph, and decision.
- **2026-09-26** — Asked how drawings should show → chose folded by default, full width when opened, and a tap for full screen with zoom.
- **2026-09-26** — Assumed: zoom and drag happen only in the full-screen view, using the phone's native scrolling, because a JavaScript-driven drag lets the host app read the gesture as a sidebar swipe.
- **2026-09-26** — Assumed: notes on single drawing lines stay, made by tapping a line in the full-screen view, and existing note locations are unchanged, because saved notes must stay attached after a rebuild.
- **2026-09-26** — Assumed: clicking text with a mouse still shows "Add note", and a touch tap on text does nothing extra, because the Note button now covers touch and a stray tap while scrolling should do nothing.
- **2026-09-26** — Assumed: the docked note box is placed from the top of the visible screen and capped at its height, because placing it from the bottom pushed its top under the host's header when the keyboard was open.
- **2026-09-26** — Assumed: the Discard draft button is renamed Discard to keep the buttons on one row at 320px, because the requirement names the action, not the label.
- **2026-09-26** — Assumed: this ships as a minor release (planned as 24.1.0), a new feature with no breaking change.
- **2026-09-26** — Changed during apply: the Full screen button sits on the drawing's fold row, not over the drawing, because over the drawing it hid the top-right characters. The README screenshot is retaken with the new kit from the `lighten-the-loop` proposal.
- **2026-09-26** — Tested locally with a borrowed Playwright 1.61 and Chromium: `node --test scripts/tests/*.test.mjs` 259 pass, `app/review/review.test.mjs` 9 pass. A 260px-tall screen keeps the whole note box visible. Not tested: a real iPhone inside the Paseo app, so whether a drag in the full-screen view still opens Paseo's sidebar is for the user to check on their next review page.
- **2026-09-26** — Distilled facts before the archive: the store holds no facts for this change or branch yet, so no repeatable fact.
- **2026-09-26** — Archive checkpoint: saved the archived change with the kit, builder, tests, docs, and 24.1.0 release for CI.
- **2026-09-26** — Merged main (25.0.0, 24.0.2) into the branch before the merge; CHANGELOG and VERSION conflicted, so this release is renumbered 25.1.0.
