# Design

## Context

A plan sits in a sandboxed frame that does its own scrolling. Its page (`review-kit.html`) posts `inbox:scroll { down }` to the inbox: `down` turns true past 48 px going down, and false on an 8 px turn up or at the top. `PlanView` keeps one `tucked` flag. Tucked, it hides the `Top` row, sets `data-bars="tucked"` on the root (Layout's header hides), and grows the column to `h-dvh`. Untucking reverses all three, so the frame shrinks by the header and the row, and the plan jumps down.

## Goals / Non-Goals

**Goals:** on a turn up mid-plan, the frame keeps its size and the header overlays it; the row returns only at the top.

**Non-Goals:** changing the 48 px and 8 px thresholds, or the header on other pages.

## Decisions

- **The page says when it is at its top.** `inbox:scroll` gains an optional `top: boolean` (`y <= 48`), posted whenever `down` or `top` changes. The alternative, the inbox guessing the top from `down: false`, can't tell a turn up from the top. It stays optional so plans built before this change still parse; for them, a missing `top` is read as `!down`, today's behavior.
- **Three states in `PlanView`:** `top` (the row and header in flow, column `h-[calc(100dvh-5.5rem)]`), `down` (all hidden, `-mt-8 h-dvh`), and `up` (the row hidden, column still `-mt-8 h-dvh`, header shown over it).
- **`tuckBars` takes the mode.** `tuckBars('tucked' | 'over' | null)` sets `data-bars` to the mode, or clears it. Layout's header adds `in-data-[bars=over]:fixed inset-x-0 top-0 z-40`, so it overlays the frame without changing the column's size. It already has `bg-background`, so the plan doesn't show through.

## Risks / Trade-offs

- [The overlaid header covers the plan's top 3.5 rem while shown] → it only shows after a turn up, and hides on the next read down.
- [Reaching the top still resizes the frame once] → the content there is already at the top, so the reader sees the row appear above the title, not a jump in mid-text.

## UX

- **Brief:** Matt reads a plan in the inbox on his iPhone, scrolling up and down to compare sections. Done is reading without the text jumping. Mirrors common mobile browsers, whose bar returns over the page.
- **Flow:** read down → everything hides; turn up → the app's bar slides over; reach the top → *Back* and the plan's name show above it.
- **Hierarchy:** the plan's text stays primary; the bar is for leaving.
- **Components:** Layout's header, `PlanView`'s `Top` row, the frame.

### Review

[review.html](review.html) sketches it under the only What Changes item.
