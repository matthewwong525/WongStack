## Context

See [proposal.md](proposal.md) — Why. The kit routes from the fragment in one place:
`fromHash()` in `.claude/skills/plan/references/review-kit.html`, whose first line reads
*no fragment and there are bullets → `goBullet(0)`*. `goBullet` calls `setMenu(false)`, so today the
sheet is shut before the reviewer ever sees it. Everything the phone rule needs is already there:
`phoneMedia` (the `(max-width: 760px)` match the sheet CSS uses), `setMenu(open)`, the `_landing`
stage with its "Choose a change" copy, and `renderCount()`, which already prints `<n> changes` and
disables Previous when no bullet is current.

## Goals / Non-Goals

**Goals:**

- One branch, in the router, so every route into `#/` behaves the same — first load, back button, a
  change closing.
- Leave the desktop path byte-identical.

**Non-Goals:**

- Restyling the sheet, the landing, or the toolbar.
- Rewriting review pages already drawn from the kit, archived or live.

## Decisions

**The branch lives in `fromHash`, not in `goBullet`.** `fromHash` is the only place that turns
"no fragment" into a destination, and it is also the `hashchange` handler — so putting the branch
there covers first load and every later return to `#/` with one line, which is exactly the rule the
Decision log settled. The alternative, teaching `goBullet` to leave the sheet open, would fire on
every bullet tap too and would need a second flag to tell the two callers apart.

**Phone is `phoneMedia.matches`, not `body[data-viewport]`.** The two look interchangeable and are
not: `data-viewport` is the chrome's View toggle, which redraws a *screen visual* at phone width
while the page layout — the sheet included — stays desktop. A desktop reviewer toggling View to
Phone must not lose the panel they are reading. `phoneMedia` is the same media query the sheet's own
CSS keys off, so the router and the layout can never disagree.

**The landing stays behind the sheet.** `show('_landing', …)` already clears marks, sets the hash to
`#/`, and leaves `current.id === '_landing'` so no panel bullet reads as current. The counter then
falls to its existing `<n> changes` branch and Previous to its existing disabled branch — the
no-bullet-selected state the kit already renders, now reachable on a phone.

**A direct link is untouched.** The branch is guarded by *no first segment*, so any fragment naming
a visual still routes to `show(...)` with the sheet shut. Alternatives considered: opening the sheet
on every phone load regardless of fragment — rejected, it would bury the target of a link someone
sent you.

## Risks / Trade-offs

- A reviewer who wants change 1 on a phone now taps twice, not once → Next from the empty selection
  opens bullet 1, so the second tap is one thumb-reach away and always in the same place.
- Rotating a phone to landscape can cross the 760px breakpoint mid-review → the branch only runs on
  a `#/` route, so a chosen change survives the rotation; only an untouched landing re-resolves.
- Existing review pages keep the old behaviour, so two pages open differently on a phone for as long
  as both are around → accepted: rewriting committed and archived pages would edit the record of
  what was planned, which the pages exist to preserve.

## UX

### Use-case brief

**Who:** a reviewer who opens a review link on a phone, usually from chat, away from the desk.
**Job:** find out what the change proposes, read each change, and leave notes.
**Done:** every change is seen and the notes are copied back as a `/continue` command.
**Context of use:** one hand, a screen below 760px. The What Changes list and the stage cannot
share that width, so one of them is always hidden. This is the same screen the kit already draws —
the chrome row (Changes · Prev · count · Next · Tools), the full-screen sheet, and the stage — and
this change moves nothing in it.
**Common case:** a link with no fragment. The reviewer wants the whole list first.
**Edge case:** a deep link to one visual, state, or mark. That link keeps its target.
**Frequency (assumed, to be challenged):** a few reviews a day per reviewer, most of them on a
desktop. The phone read is rare, but it is the one that fails today, and the desktop path is the one
that must not change.

### Flow

Open the link → the list over the landing → tap a change → its picture on the stage. Two taps to a
chosen change, against one tap to a change nobody chose. Next from the empty selection opens change
1, so the reviewer who wants the first change keeps a one-tap path, in the same place as every other
step. Back to `#/` — a closed change or the back button — returns to the list. A fragment that names
a visual skips the list and opens the target with the sheet shut.

### Hierarchy

**Phone, at `#/`:** the primary action is to choose a change. The sheet holds the screen, so the
rows are the only target; the chrome keeps no filled button. Behind the sheet the landing is muted
("Choose a change"), the counter reads `<n> changes`, and Previous is disabled — the kit's existing
no-selection state, now reachable.
**Phone, with a change open:** the visual is the content and the chrome stays one row.
**Desktop:** unchanged. The panel is always on screen, so change 1 opens and is marked current.

### Review

The picture is [review.html](review.html).

- `review.html#/phone-open/after/sheet` — the sheet over the landing, counter `5 changes`,
  Previous disabled
- `review.html#/phone-open/today` — what a phone shows today: change 1 on the stage, sheet shut
- `review.html#/phone-open/direct/target` — a fragment link opens its target, sheet shut
- `review.html#/route-flow/after/list` — today's lane against the new lane, including the return
  to `#/`
- `review.html#/desktop-open/panel` — desktop width, panel beside the stage, bullet 1 current
- `review.html#/files/release` — the files this change touches

### Components

Nothing new. The change composes parts the kit already has: `phoneMedia`, `setMenu(open)`, the
`_landing` stage, `show()`, and `renderCount()`'s existing `<n> changes` and disabled-Previous
branches. The review page uses kit primitives only — topbar, tag, box, table, input, hero,
skeleton, lane/step/arrow, tree list, callout and notes.
