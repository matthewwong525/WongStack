# Design

## Context

`PlanView` renders the plan's sealed `review.html` in an `iframe` sized `h-[80svh] w-full rounded-md border`, inside `Layout`'s `main` (`mx-auto max-w-[60rem] px-4 my-8`, under a `h-14` sticky header). The review page pins its bar, docked note editor, toast and full-screen viewer with `position: fixed`, so they sit on the frame's edges, not the window's.

## Goals / Non-Goals

**Goals:** the frame fills the window from below the Back row and tap line to the bottom, full width, with no border, and the outer page never scrolls.

**Non-Goals:** changing `Layout` for other pages, or the review kit.

## Decisions

- **The frame keeps its own scroll and grows to fill the window, not to its content.** Sizing the frame to the page's height would let the app scroll it, but every `position: fixed` part of the review page would then pin to the bottom of a very tall frame, off screen. Filling the window keeps them on the window's edges.
- **`PlanView` sizes itself as a column filling the rest of the window.** The loaded view's root becomes `flex flex-col` with `h-[calc(100dvh-5.5rem)]` (the `3.5rem` header plus `main`'s `2rem` top margin) and `-mb-8` to cancel `main`'s bottom margin. The Back row and tap line take their height; the frame takes `min-h-0 flex-1`. `dvh`, not `svh`, so on a phone the bar sits on the real bottom as the address bar hides. Alternative: `position: fixed` under the header; rejected, because it drops out of `main`'s column and the Back row would need the frame's width copied.
- **The frame breaks out of the 60rem column to the window's width** with `w-screen` and `ml-[calc(50%-50vw)]` (`max-w-none`), and drops `rounded-md border`. Alternative: widen `Layout` for this route; rejected, because `Layout` gives every page one width and only this view needs to escape it. The outer page doesn't scroll, so `100vw` carries no scrollbar width.
- **The loading and closed states keep their current shape**: only the loaded plan fills the screen.

## Risks / Trade-offs

- [The header's height or `main`'s margin changes] → the calc drifts and the page scrolls a little. Mitigation: a comment names both numbers' source, and the preview check measures `scrollHeight` against `clientHeight`.
- [A plan built before this change] → it has the same fixed bar, so it fills the screen the same way; no migration.

## UX

- **Brief.** Matthew, on a phone or laptop, opens a plan from the inbox to read it, add notes and tap *Build it*. Done is one tap on the bar at the bottom of the screen. Common case: a long plan read top to bottom. Mirrors the review page opened on its own from its private link, which already fills its window.
- **Flow.** Inbox → tap a plan → read and note → tap the bar → *Back*.
- **Hierarchy.** The plan is the screen; its bar holds the primary action. *Back* stays small at the top.
- **Components.** The existing `Back` button, the workspace name, `TapLine`, and the frame; nothing new.

### Review

[review.html](review.html) sketches the screen before and after in the What Changes item *The plan is the page*.
