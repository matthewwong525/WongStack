## 1. The review kit router

- [x] 1.1 In `.claude/skills/plan/references/review-kit.html`, branch `fromHash()` so a route with no first segment opens the What Changes sheet at phone width instead of `goBullet(0)`: show the `_landing` stage and call `setMenu(true)` when `phoneMedia.matches`, and keep `goBullet(0)` otherwise — per `review.html#/phone-open/after/sheet`.
- [x] 1.2 Confirm the branch is guarded by *no first segment*, so a fragment naming a visual, state, or mark still routes to `show(...)` with the sheet shut — per `review.html#/phone-open/direct/target`.
- [x] 1.3 Confirm the desktop path is untouched: with no fragment at desktop width the stage still opens bullet 1 and the panel still marks it current — per `review.html#/desktop-open/panel`.
- [x] 1.4 Confirm the `#/` rule holds on every arrival, not only the first: `fromHash` is also the `hashchange` handler, so a back navigation to `#/` on a phone reopens the sheet — per `review.html#/route-flow/after/list`.
- [x] 1.5 Add no CSS, colour, font, or network reference, and leave the `proposal:start` / `proposal:end` markers and the sheet's own styles as they are.

## 2. Evidence

- [x] 2.1 Open the edited kit in a browser at 390px with no fragment and confirm the sheet is open over the landing, no bullet is current, the counter reads `<n> changes`, and Previous is disabled.
- [x] 2.2 At 390px, tap a bullet and confirm the sheet closes onto that visual; return to `#/` and confirm the sheet opens again.
- [x] 2.3 At 390px, tap Next from the empty selection and confirm it opens bullet 1.
- [x] 2.4 At 390px, open a fragment naming a visual and confirm it opens with the sheet shut.
- [x] 2.5 At desktop width, open with no fragment and confirm bullet 1 opens and is marked current, exactly as before the change.

## 3. Release

- [x] 3.1 Bump `VERSION` (minor — new behaviour, no break).
- [x] 3.2 Add the newest-first `CHANGELOG.md` entry for that version, saying a phone opens on the change list, `#/` means no change chosen, desktop is unchanged, and existing review pages keep their own copy of the kit — per `review.html#/files/release`.
- [x] 3.3 Run `node scripts/check-payload-links.mjs` and fix anything it reports dead.
- [x] 3.4 Run `node scripts/check-openspec-config.mjs` and fix anything it reports.
