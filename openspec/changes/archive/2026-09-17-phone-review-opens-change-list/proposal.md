# Open the change list first on a phone

**Status:** ready-to-ship
**Open questions:** none

## Why

A review page opened on a phone drops the reviewer straight into change 1, on a stage the width of
the screen, with the What Changes list hidden behind a button. They see one picture and no idea how
many more there are or what the argument was — the opposite of what the list-is-the-navigation
design promises. On a desktop the list sits beside the stage and that jump costs nothing; on a phone
the list and the stage cannot share the screen, so the first thing shown has to be the list.

## What Changes

- **At phone width, a review page opened with no fragment — or at `#/` — shows the What Changes sheet over the landing stage.** No bullet is selected, the counter reads `<n> changes`, and the reviewer taps a change to open it. (review.html#/phone-open/after/sheet)
- **`#/` always means "no change chosen" at phone width**, so closing a change or stepping back to `#/` reopens the sheet rather than leaving a near-empty stage. (review.html#/route-flow/after/list)
- **Desktop is unchanged** — with no fragment it still opens bullet 1 and selects it in the panel, because there the list is already on screen. (review.html#/desktop-open/panel)
- **A direct link keeps its target on a phone.** A fragment naming a visual, state, or mark opens that visual with the sheet closed, exactly as it does today. (review.html#/phone-open/direct/target)
- **Release the payload:** bump `VERSION`, add the newest-first `CHANGELOG.md` entry, and run the link check and the OpenSpec config check. (review.html#/files/release)

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: the no-fragment opening behaviour splits by width — "The What Changes list is the
  navigation" scopes its open-the-first-bullet rule to desktop, and "The page works on a phone"
  gains the phone rule that the sheet opens over the landing with nothing selected.

## Impact

- `.claude/skills/plan/references/review-kit.html` — the `fromHash` router and the phone sheet.
  Kit only; every page `/plan` draws from then on inherits it.
- Already-written `review.html` files, including archived ones, keep their own copy of the kit and
  so keep today's behaviour. Nothing rewrites them.
- `VERSION`, `CHANGELOG.md` — the payload release.

## Decision log

- Asked what sits behind the open sheet on first load → chose **the landing stage**, nothing
  pre-selected. A pre-selected change 1 behind the sheet is the same skipped-a-change-they-never-
  chose problem one layer down.
- Asked whether returning to the bare `#/` route on a phone reopens the sheet → chose **yes**, one
  rule rather than a first-load special case: back from a change lands on the list.
- Phone is decided by the `(max-width: 760px)` media query the kit already uses, not by the chrome's
  View toggle → assumed, because the toggle changes how a *screen visual* is drawn while the layout
  stays desktop; the sheet only exists below that breakpoint.
- No `## UX` section and no `screen` visual → assumed: this changes reviewer chrome, which the kit
  owns, not a product screen.

- **2026-09-17** — Implemented and verified. The branch `fromHash()` at `.claude/skills/plan/references/review-kit.html:571` is six lines: at phone width a route with no first segment shows `_landing` and calls `setMenu(true)`; every other route is untouched. Walked the edited kit in a browser at 390×844 and 1280×900 — phone with no fragment opens the sheet over the landing with `7 changes` and Previous disabled, tapping a bullet closes it onto that visual, returning to `#/` reopens it, Next from the empty selection opens bullet 1, a direct fragment opens with the sheet shut and no sideways overflow, and desktop still opens bullet 1 selected. Released as 15.1.0; both `scripts/check-payload-links.mjs` and `scripts/check-openspec-config.mjs` pass. The same six-line router patch was applied to this change's own `review.html` so the page under review demonstrates the behaviour it argues for — a deliberate exception to "existing pages keep their own copy", which is about pages written before this change.
- **2026-09-17** — Archived and checkpointed for the merge. Delta specs for `ux-wireframes` were already folded into `openspec/specs/` by the preceding save, so the archive move needed no further sync; `openspec validate --specs` passes 29/29 and the main spec carries no delta operation headers. The change now lives at `openspec/changes/archive/2026-09-17-phone-review-opens-change-list/`.
